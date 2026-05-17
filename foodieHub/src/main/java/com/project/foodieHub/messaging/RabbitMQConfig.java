package com.project.foodieHub.messaging;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE         = "foodiehub.exchange";
    public static final String PARTNER_QUEUE    = "partner.registered.queue";
    public static final String PARTNER_RKEY     = "partner.registered";

    @Bean
    public TopicExchange foodiehubExchange() {
        return new TopicExchange(EXCHANGE);
    }

    @Bean
    public Queue partnerRegisteredQueue() {
        return new Queue(PARTNER_QUEUE, true);
    }

    @Bean
    public Binding partnerRegisteredBinding(Queue partnerRegisteredQueue, TopicExchange foodiehubExchange) {
        return BindingBuilder.bind(partnerRegisteredQueue).to(foodiehubExchange).with(PARTNER_RKEY);
    }

    @Bean
    public Jackson2JsonMessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
