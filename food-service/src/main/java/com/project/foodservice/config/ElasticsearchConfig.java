package com.project.foodservice.config;

import org.apache.http.HttpRequestInterceptor;
import org.apache.http.HttpResponseInterceptor;
import org.apache.http.auth.AuthScope;
import org.apache.http.auth.UsernamePasswordCredentials;
import org.apache.http.impl.client.BasicCredentialsProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.elasticsearch.RestClientBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.net.URI;

@Configuration
public class ElasticsearchConfig {

    @Value("${spring.elasticsearch.uris}")
    private String rawUri;

    @Bean
    public RestClientBuilderCustomizer elasticsearchCredentialsCustomizer() {
        return builder -> {
            try {
                URI uri = URI.create(rawUri);
                String userInfo = uri.getUserInfo();

                builder.setHttpClientConfigCallback(httpClientBuilder -> {
                    // Credentials from URI (user:pass@host)
                    if (userInfo != null && userInfo.contains(":")) {
                        String[] parts = userInfo.split(":", 2);
                        BasicCredentialsProvider cp = new BasicCredentialsProvider();
                        cp.setCredentials(
                            new AuthScope(uri.getHost(), uri.getPort() == -1 ? 443 : uri.getPort()),
                            new UsernamePasswordCredentials(parts[0], parts[1])
                        );
                        httpClientBuilder.setDefaultCredentialsProvider(cp);
                    }

                    // Bonsai runs Elasticsearch 7.x which rejects the 8.x client's
                    // "compatible-with=8" Content-Type with 406. Replace both headers
                    // with plain application/json so ES 7.x accepts the requests.
                    httpClientBuilder.addInterceptorFirst(
                        (HttpRequestInterceptor) (request, context) -> {
                            request.setHeader("Content-Type", "application/json");
                            request.setHeader("Accept", "application/json");
                        }
                    );

                    // elasticsearch-java 8.x checks every response for the
                    // X-Elastic-Product header that ES 7.x doesn't send — inject it.
                    httpClientBuilder.addInterceptorLast(
                        (HttpResponseInterceptor) (response, context) -> {
                            if (response.getFirstHeader("X-Elastic-Product") == null) {
                                response.addHeader("X-Elastic-Product", "Elasticsearch");
                            }
                        }
                    );

                    return httpClientBuilder;
                });
            } catch (Exception ignored) {
            }
        };
    }
}
