package com.project.foodservice.config;

import com.project.foodservice.messaging.OrderPlacedEvent;
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

/**
 * food-service subscribes to the same exchange as order-service and notification-service.
 * It uses its OWN queue (order.placed.food.queue) so it gets its own copy of each
 * order.placed message — notification-service keeps receiving from its queue unaffected.
 */
@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE                = "foodiehub.exchange";
    public static final String ORDER_PLACED_RKEY       = "order.placed";
    public static final String ORDER_PLACED_FOOD_QUEUE = "order.placed.food.queue";

    @Bean
    public TopicExchange foodiehubExchange() {
        return new TopicExchange(EXCHANGE);
    }

    @Bean
    public Queue orderPlacedFoodQueue() {
        return new Queue(ORDER_PLACED_FOOD_QUEUE, true);
    }

    @Bean
    public Binding orderPlacedFoodBinding(Queue orderPlacedFoodQueue, TopicExchange foodiehubExchange) {
        return BindingBuilder.bind(orderPlacedFoodQueue).to(foodiehubExchange).with(ORDER_PLACED_RKEY);
    }

    @Bean
    public Jackson2JsonMessageConverter messageConverter() {
        Jackson2JsonMessageConverter converter = new Jackson2JsonMessageConverter();
        DefaultJackson2JavaTypeMapper typeMapper = new DefaultJackson2JavaTypeMapper();
        typeMapper.setTrustedPackages("*");

        // Map the order-service class name to our local copy of the event DTO
        Map<String, Class<?>> idClassMapping = new HashMap<>();
        idClassMapping.put("com.project.orderservice.messaging.OrderPlacedEvent", OrderPlacedEvent.class);
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
