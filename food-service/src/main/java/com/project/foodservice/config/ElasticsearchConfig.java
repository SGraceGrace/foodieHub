package com.project.foodservice.config;

import org.apache.hc.client5.http.auth.AuthScope;
import org.apache.hc.client5.http.auth.UsernamePasswordCredentials;
import org.apache.hc.client5.http.impl.auth.BasicCredentialsProvider;
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
                            new UsernamePasswordCredentials(parts[0], parts[1].toCharArray())
                        );
                        httpClientBuilder.setDefaultCredentialsProvider(cp);
                    }

                    // Bonsai runs Elasticsearch 7.x which rejects the 8.x client's
                    // "application/vnd.elasticsearch+json; compatible-with=8" header with 406.
                    // Replace both Content-Type and Accept with plain application/json so
                    // ES 7.x accepts the requests while the 8.x client handles responses normally.
                    httpClientBuilder.addRequestInterceptorFirst((request, entity, context) -> {
                        request.setHeader("Content-Type", "application/json");
                        request.setHeader("Accept", "application/json");
                    });

                    return httpClientBuilder;
                });
            } catch (Exception ignored) {
            }
        };
    }
}
