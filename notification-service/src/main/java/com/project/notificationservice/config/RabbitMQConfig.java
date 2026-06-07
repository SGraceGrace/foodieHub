package com.project.notificationservice.config;

import com.project.notificationservice.event.ActivityLoggedEvent;
import com.project.notificationservice.event.ContactMessageEvent;
import com.project.notificationservice.event.DriverRegisteredEvent;
import com.project.notificationservice.event.OrderCancelledEvent;
import com.project.notificationservice.event.OrderPlacedEvent;
import com.project.notificationservice.event.OrderStatusUpdatedEvent;
import com.project.notificationservice.event.OwnerStatusEvent;
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

    public static final String EXCHANGE              = "foodiehub.exchange";
    public static final String PARTNER_QUEUE         = "partner.registered.queue";
    public static final String PARTNER_RKEY          = "partner.registered";
    public static final String OWNER_STATUS_QUEUE    = "owner.status.queue";
    public static final String OWNER_STATUS_RKEY     = "owner.status";
    public static final String ORDER_PLACED_QUEUE    = "order.placed.queue";
    public static final String ORDER_PLACED_RKEY     = "order.placed";
    public static final String DRIVER_QUEUE          = "driver.registered.queue";
    public static final String DRIVER_RKEY           = "driver.registered";
    public static final String ACTIVITY_QUEUE        = "activity.logged.queue";
    public static final String ACTIVITY_RKEY         = "activity.logged";
    public static final String CONTACT_QUEUE                = "contact.message.queue";
    public static final String CONTACT_RKEY                 = "contact.message";
    public static final String ORDER_STATUS_UPDATED_QUEUE   = "order.status.updated.queue";
    public static final String ORDER_STATUS_UPDATED_RKEY    = "order.status.updated";
    public static final String ORDER_CANCELLED_QUEUE        = "order.cancelled.queue";
    public static final String ORDER_CANCELLED_RKEY         = "order.cancelled";

    /**
     * Separate queue bound to the SAME order.placed routing key as ORDER_PLACED_QUEUE.
     * RabbitMQ delivers one copy of each event to every bound queue, so the restaurant
     * listener (ORDER_PLACED_QUEUE) and driver listener (DRIVER_ORDER_PLACED_QUEUE) both
     * receive every order.placed event independently — neither steals messages from the other.
     */
    public static final String DRIVER_ORDER_PLACED_QUEUE = "driver.order.placed.queue";

    @Bean public TopicExchange foodiehubExchange() { return new TopicExchange(EXCHANGE); }

    @Bean public Queue partnerRegisteredQueue()  { return new Queue(PARTNER_QUEUE, true); }
    @Bean public Queue ownerStatusQueue()        { return new Queue(OWNER_STATUS_QUEUE, true); }
    @Bean public Queue orderPlacedQueue()        { return new Queue(ORDER_PLACED_QUEUE, true); }
    @Bean public Queue driverRegisteredQueue()   { return new Queue(DRIVER_QUEUE, true); }
    @Bean public Queue activityLoggedQueue()     { return new Queue(ACTIVITY_QUEUE, true); }
    @Bean public Queue contactMessageQueue()           { return new Queue(CONTACT_QUEUE, true); }
    @Bean public Queue orderStatusUpdatedQueue()       { return new Queue(ORDER_STATUS_UPDATED_QUEUE, true); }
    @Bean public Queue driverOrderPlacedQueue()        { return new Queue(DRIVER_ORDER_PLACED_QUEUE, true); }
    @Bean public Queue orderCancelledQueue()           { return new Queue(ORDER_CANCELLED_QUEUE, true); }

    @Bean
    public Binding partnerRegisteredBinding(Queue partnerRegisteredQueue, TopicExchange foodiehubExchange) {
        return BindingBuilder.bind(partnerRegisteredQueue).to(foodiehubExchange).with(PARTNER_RKEY);
    }
    @Bean
    public Binding ownerStatusBinding(Queue ownerStatusQueue, TopicExchange foodiehubExchange) {
        return BindingBuilder.bind(ownerStatusQueue).to(foodiehubExchange).with(OWNER_STATUS_RKEY);
    }
    @Bean
    public Binding orderPlacedBinding(Queue orderPlacedQueue, TopicExchange foodiehubExchange) {
        return BindingBuilder.bind(orderPlacedQueue).to(foodiehubExchange).with(ORDER_PLACED_RKEY);
    }
    @Bean
    public Binding driverRegisteredBinding(Queue driverRegisteredQueue, TopicExchange foodiehubExchange) {
        return BindingBuilder.bind(driverRegisteredQueue).to(foodiehubExchange).with(DRIVER_RKEY);
    }
    @Bean
    public Binding activityLoggedBinding(Queue activityLoggedQueue, TopicExchange foodiehubExchange) {
        return BindingBuilder.bind(activityLoggedQueue).to(foodiehubExchange).with(ACTIVITY_RKEY);
    }
    @Bean
    public Binding contactMessageBinding(Queue contactMessageQueue, TopicExchange foodiehubExchange) {
        return BindingBuilder.bind(contactMessageQueue).to(foodiehubExchange).with(CONTACT_RKEY);
    }
    @Bean
    public Binding orderStatusUpdatedBinding(Queue orderStatusUpdatedQueue, TopicExchange foodiehubExchange) {
        return BindingBuilder.bind(orderStatusUpdatedQueue).to(foodiehubExchange).with(ORDER_STATUS_UPDATED_RKEY);
    }
    @Bean
    public Binding driverOrderPlacedBinding(Queue driverOrderPlacedQueue, TopicExchange foodiehubExchange) {
        // Same routing key as orderPlacedBinding — each queue gets its own independent copy of the event.
        return BindingBuilder.bind(driverOrderPlacedQueue).to(foodiehubExchange).with(ORDER_PLACED_RKEY);
    }
    @Bean
    public Binding orderCancelledBinding(Queue orderCancelledQueue, TopicExchange foodiehubExchange) {
        return BindingBuilder.bind(orderCancelledQueue).to(foodiehubExchange).with(ORDER_CANCELLED_RKEY);
    }

    @Bean
    public Jackson2JsonMessageConverter messageConverter() {
        Jackson2JsonMessageConverter converter = new Jackson2JsonMessageConverter();
        DefaultJackson2JavaTypeMapper typeMapper = new DefaultJackson2JavaTypeMapper();
        typeMapper.setTrustedPackages("*");

        Map<String, Class<?>> idClassMapping = new HashMap<>();
        idClassMapping.put("com.project.foodieHub.messaging.PartnerRegisteredEvent",  PartnerRegisteredEvent.class);
        idClassMapping.put("com.project.foodieHub.messaging.OwnerStatusEvent",        OwnerStatusEvent.class);
        idClassMapping.put("com.project.orderservice.messaging.OrderPlacedEvent",          OrderPlacedEvent.class);
        idClassMapping.put("com.project.orderservice.messaging.OrderStatusUpdatedEvent",   OrderStatusUpdatedEvent.class);
        idClassMapping.put("com.project.orderservice.messaging.OrderCancelledEvent",       OrderCancelledEvent.class);
        idClassMapping.put("com.project.foodieHub.messaging.DriverRegisteredEvent",   DriverRegisteredEvent.class);
        idClassMapping.put("com.project.foodieHub.messaging.ActivityLoggedEvent",     ActivityLoggedEvent.class);
        idClassMapping.put("com.project.foodieHub.messaging.ContactMessageEvent",     ContactMessageEvent.class);
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
