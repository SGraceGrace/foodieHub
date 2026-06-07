package com.project.orderservice.config;

import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(RazorpayProperties.class)
@RequiredArgsConstructor
public class RazorpayClientConfig {

    private final RazorpayProperties props;

    @Bean
    public RazorpayClient razorpayClient() {
        try {
            return new RazorpayClient(props.getKeyId(), props.getKeySecret());
        } catch (RazorpayException e) {
            throw new RuntimeException("Failed to initialize Razorpay client: " + e.getMessage(), e);
        }
    }
}
