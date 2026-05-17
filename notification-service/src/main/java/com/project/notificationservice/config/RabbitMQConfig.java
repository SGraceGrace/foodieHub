package com.project.notificationservice.config;

import com.project.notificationservice.event.OrderPlacedEvent;
import com.project.notificationservice.event.PartnerRegisteredEvent;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.support.converter.DefaultJackson2JavaTypeMapper;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE            = "foodiehub.exchange";
    public static final String PARTNER_QUEUE       = "partner.registered.queue";
    public static final String PARTNER_RKEY        = "partner.registered";
    public static final String ORDER_PLACED_QUEUE  = "order.placed.queue";
    public static final String ORDER_PLACED_RKEY   = "order.placed";

    @Bean
    public TopicExchange foodiehubExchange() {
        return new TopicExchange(EXCHANGE);
    }

    @Bean
    public Queue partnerRegisteredQueue() {
        return new Queue(PARTNER_QUEUE, true);
    }

    @Bean
    public Queue orderPlacedQueue() {
        return new Queue(ORDER_PLACED_QUEUE, true);
    }

    @Bean
    public Binding partnerRegisteredBinding(Queue partnerRegisteredQueue, TopicExchange foodiehubExchange) {
        return BindingBuilder.bind(partnerRegisteredQueue).to(foodiehubExchange).with(PARTNER_RKEY);
    }

    @Bean
    public Binding orderPlacedBinding(Queue orderPlacedQueue, TopicExchange foodiehubExchange) {
        return BindingBuilder.bind(orderPlacedQueue).to(foodiehubExchange).with(ORDER_PLACED_RKEY);
    }

    @Bean
    public Jackson2JsonMessageConverter messageConverter() {
        Jackson2JsonMessageConverter converter = new Jackson2JsonMessageConverter();
        DefaultJackson2JavaTypeMapper typeMapper = new DefaultJackson2JavaTypeMapper();
        typeMapper.setTrustedPackages("*");

        // Map producer class names → local event classes
        Map<String, Class<?>> idClassMapping = new HashMap<>();
        idClassMapping.put("com.project.foodieHub.messaging.PartnerRegisteredEvent", PartnerRegisteredEvent.class);
        idClassMapping.put("com.project.orderservice.messaging.OrderPlacedEvent",    OrderPlacedEvent.class);
        typeMapper.setIdClassMapping(idClassMapping);

        converter.setClassMapper(typeMapper);
        return converter;
    }

    @Bean
    public SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(
            ConnectionFactory connectionFactory,
            Jackson2JsonMessageConverter messageConverter) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(messageConverter);
        return factory;
    }
}
