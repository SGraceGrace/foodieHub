package com.project.foodservice.messaging;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.DefaultJackson2JavaTypeMapper;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE = "foodiehub.exchange";

    // ── existing queue (owner approval status) ──────────────────────
    public static final String OWNER_STATUS_QUEUE = "foodiehub.owner.status.food-service";
    public static final String OWNER_STATUS_RKEY  = "owner.status";

    // ── new queue: order.placed → increment menu item order counts ───
    public static final String ORDER_PLACED_RKEY       = "order.placed";
    public static final String ORDER_PLACED_FOOD_QUEUE = "order.placed.food.queue";

    @Bean
    public TopicExchange foodiehubExchange() {
        return new TopicExchange(EXCHANGE);
    }

    @Bean
    public Queue ownerStatusQueue() {
        return new Queue(OWNER_STATUS_QUEUE, true);
    }

    @Bean
    public Queue orderPlacedFoodQueue() {
        return new Queue(ORDER_PLACED_FOOD_QUEUE, true);
    }

    @Bean
    public Binding ownerStatusBinding(Queue ownerStatusQueue, TopicExchange foodiehubExchange) {
        return BindingBuilder.bind(ownerStatusQueue).to(foodiehubExchange).with(OWNER_STATUS_RKEY);
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

        // Map the order-service canonical class name to our local copy of the event DTO
        Map<String, Class<?>> idClassMapping = new HashMap<>();
        idClassMapping.put("com.project.orderservice.messaging.OrderPlacedEvent", OrderPlacedEvent.class);
        typeMapper.setIdClassMapping(idClassMapping);

        converter.setClassMapper(typeMapper);
        return converter;
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory,
                                         Jackson2JsonMessageConverter messageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter);
        return template;
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
