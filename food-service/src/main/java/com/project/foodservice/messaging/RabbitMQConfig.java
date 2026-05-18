package com.project.foodservice.messaging;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE = "foodiehub.exchange";
    public static final String OWNER_STATUS_QUEUE = "foodiehub.owner.status.food-service";
    public static final String OWNER_STATUS_RKEY = "owner.status";

    @Bean
    public TopicExchange foodiehubExchange() {
        return new TopicExchange(EXCHANGE);
    }

    @Bean
    public Queue ownerStatusQueue() {
        return new Queue(OWNER_STATUS_QUEUE, true);
    }

    @Bean
    public Binding ownerStatusBinding(Queue ownerStatusQueue, TopicExchange foodiehubExchange) {
        return BindingBuilder.bind(ownerStatusQueue).to(foodiehubExchange).with(OWNER_STATUS_RKEY);
    }

    @Bean
    public Jackson2JsonMessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory,
                                         Jackson2JsonMessageConverter messageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter);
        return template;
    }
}
