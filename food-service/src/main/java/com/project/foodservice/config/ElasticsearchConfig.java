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
                if (userInfo == null || !userInfo.contains(":")) return;
                String[] parts = userInfo.split(":", 2);
                BasicCredentialsProvider cp = new BasicCredentialsProvider();
                cp.setCredentials(
                    new AuthScope(uri.getHost(), uri.getPort() == -1 ? 443 : uri.getPort()),
                    new UsernamePasswordCredentials(parts[0], parts[1].toCharArray())
                );
                builder.setHttpClientConfigCallback(
                    httpClientBuilder -> httpClientBuilder.setDefaultCredentialsProvider(cp)
                );
            } catch (Exception ignored) {
            }
        };
    }
}
