package com.project.api_gateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.List;
import java.util.Map;

@Component
@Order(1)
public class RateLimitFilter implements Filter {

    private record RateLimit(double replenishRate, int burstCapacity) {}

    // replenishRate = tokens refilled per second; burstCapacity = max tokens the bucket holds
    private static final Map<String, RateLimit> ROUTE_LIMITS = Map.of(
            "/api/v1/auth",        new RateLimit(10.0 / 60,  10),  // 10 req/min, burst 10
            "/api/orders",         new RateLimit( 5.0 / 60,   5),  //  5 req/min, burst  5
            "/api/cart",           new RateLimit(20.0 / 60,  20),  // 20 req/min, burst 20
            "/api/search",         new RateLimit(30.0 / 60,  30),  // 30 req/min, burst 30
            "/api/v1/restaurants", new RateLimit(30.0 / 60,  30)   // 30 req/min, burst 30
    );
    private static final RateLimit DEFAULT_LIMIT = new RateLimit(1.0, 60); // 60 req/min, burst 60

    private static final Map<String, String> ROUTE_KEYS = Map.of(
            "/api/v1/auth",        "auth",
            "/api/orders",         "orders",
            "/api/cart",           "cart",
            "/api/search",         "search",
            "/api/v1/restaurants", "restaurants"
    );

    // TTL longer than the full refill time (burst / rate) so idle keys expire cleanly
    private static final int KEY_TTL_SECONDS = 120;

    /**
     * Atomic token bucket — executes as a single Lua script so concurrent requests
     * never race on read-modify-write.
     *
     * KEYS[1] = Redis hash key for this client+route
     * ARGV[1] = replenish rate  (tokens/sec, decimal string)
     * ARGV[2] = burst capacity  (max tokens)
     * ARGV[3] = current time    (Unix ms)
     * ARGV[4] = TTL             (seconds)
     *
     * Returns: { allowed (1|0), remaining_tokens (floor) }
     */
    private static final String TOKEN_BUCKET_SCRIPT = """
            local data     = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
            local last_tok = tonumber(data[1])
            local last_ts  = tonumber(data[2])
            local rate     = tonumber(ARGV[1])
            local capacity = tonumber(ARGV[2])
            local now_ms   = tonumber(ARGV[3])
            local ttl      = tonumber(ARGV[4])

            local tokens
            if last_tok == nil then
                tokens = capacity
            else
                local elapsed = math.max(0, now_ms - last_ts)
                tokens = math.min(capacity, last_tok + elapsed * rate / 1000.0)
            end

            local allowed = 0
            if tokens >= 1 then
                tokens  = tokens - 1
                allowed = 1
            end

            redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now_ms)
            redis.call('EXPIRE', KEYS[1], ttl)
            return {allowed, math.floor(tokens)}
            """;

    @SuppressWarnings("rawtypes")
    private final DefaultRedisScript<List> bucketScript;
    private final StringRedisTemplate      redis;

    @Value("${jwt.secret.key}")
    private String secretKey;

    @SuppressWarnings("rawtypes")
    public RateLimitFilter(StringRedisTemplate redis) {
        this.redis        = redis;
        this.bucketScript = new DefaultRedisScript<>(TOKEN_BUCKET_SCRIPT, List.class);
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest  req = (HttpServletRequest)  request;
        HttpServletResponse res = (HttpServletResponse) response;

        // Skip CORS preflight and health checks — these must not be rate-limited
        if ("OPTIONS".equalsIgnoreCase(req.getMethod()) || req.getRequestURI().startsWith("/actuator")) {
            chain.doFilter(request, response);
            return;
        }

        String    path     = req.getRequestURI();
        String    clientId = resolveClientId(req);
        RateLimit limit    = resolveLimit(path);
        String    key      = "rate:" + clientId + ":" + resolveRouteKey(path);

        @SuppressWarnings("unchecked")
        List<Long> result = redis.execute(
                bucketScript,
                List.of(key),
                String.valueOf(limit.replenishRate()),
                String.valueOf(limit.burstCapacity()),
                String.valueOf(System.currentTimeMillis()),
                String.valueOf(KEY_TTL_SECONDS)
        );

        boolean allowed   = result != null && result.get(0) == 1L;
        long    remaining = result != null ? result.get(1) : 0L;

        res.setHeader("X-RateLimit-Limit",     String.valueOf(limit.burstCapacity()));
        res.setHeader("X-RateLimit-Remaining", String.valueOf(remaining));

        if (!allowed) {
            addCorsHeaders(req, res);
            // Time (seconds) until the bucket refills one token at this route's rate
            long retryAfter = (long) Math.ceil(1.0 / limit.replenishRate());
            res.setHeader("Retry-After", String.valueOf(retryAfter));
            res.setStatus(429);
            res.setContentType(MediaType.APPLICATION_JSON_VALUE);
            res.getWriter().write(
                    "{\"status\":429,\"error\":\"Too many requests. Retry after " + retryAfter + " seconds.\"}");
            return;
        }

        chain.doFilter(request, response);
    }

    private String resolveClientId(HttpServletRequest request) {
        // Use userId from JWT for per-user precision; fall back to IP for public routes
        String auth = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (auth != null && auth.startsWith("Bearer ")) {
            try {
                Key    signingKey = Keys.hmacShaKeyFor(secretKey.getBytes(StandardCharsets.UTF_8));
                Claims claims     = Jwts.parserBuilder()
                        .setSigningKey(signingKey)
                        .build()
                        .parseClaimsJws(auth.substring(7))
                        .getBody();
                return "user:" + claims.getSubject();
            } catch (Exception ignored) {}
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return "ip:" + forwarded.split(",")[0].trim();
        }
        return "ip:" + request.getRemoteAddr();
    }

    private String resolveRouteKey(String path) {
        return ROUTE_KEYS.entrySet().stream()
                .filter(e -> path.startsWith(e.getKey()))
                .map(Map.Entry::getValue)
                .findFirst()
                .orElse("default");
    }

    private RateLimit resolveLimit(String path) {
        return ROUTE_LIMITS.entrySet().stream()
                .filter(e -> path.startsWith(e.getKey()))
                .map(Map.Entry::getValue)
                .findFirst()
                .orElse(DEFAULT_LIMIT);
    }

    // Mirror JwtAuthFilter's defensive pattern: always add CORS headers on error responses
    // so Angular receives the real status code instead of a status-0 network error
    private void addCorsHeaders(HttpServletRequest request, HttpServletResponse response) {
        String origin = request.getHeader(HttpHeaders.ORIGIN);
        if (origin != null) {
            response.setHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, origin);
            response.setHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true");
            response.setHeader(HttpHeaders.VARY, HttpHeaders.ORIGIN);
        }
    }
}
