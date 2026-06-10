package com.project.api_gateway.filter;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;

/**
 * Spring Cloud Gateway MVC rejects Accept: text/event-stream with 406 before
 * the proxy route handler runs (and before Zipkin tracing starts).
 * Rewriting to wildcard lets the gateway proxy the request through;
 * the downstream notification-service still serves text/event-stream correctly.
 */
@Component
@Order(0)
public class SseAcceptHeaderFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) request;
        String accept = req.getHeader("Accept");

        if (MediaType.TEXT_EVENT_STREAM_VALUE.equalsIgnoreCase(accept)) {
            chain.doFilter(new AcceptRewriteWrapper(req), response);
        } else {
            chain.doFilter(request, response);
        }
    }

    private static class AcceptRewriteWrapper extends HttpServletRequestWrapper {
        AcceptRewriteWrapper(HttpServletRequest request) {
            super(request);
        }

        @Override
        public String getHeader(String name) {
            if ("Accept".equalsIgnoreCase(name)) return "*/*";
            return super.getHeader(name);
        }

        @Override
        public Enumeration<String> getHeaders(String name) {
            if ("Accept".equalsIgnoreCase(name)) return Collections.enumeration(List.of("*/*"));
            return super.getHeaders(name);
        }
    }
}
