package com.project.notificationservice.service;

import com.project.notificationservice.dto.CustomerOrderUpdateDTO;
import com.project.notificationservice.dto.DriverOrderNotificationDTO;
import com.project.notificationservice.dto.NotificationDTO;
import com.project.notificationservice.dto.RestaurantNotificationDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Predicate;

@Slf4j
@Service
public class SseEmitterService {

    // ── Admin SSE sessions ────────────────────────────────────────────
    private final List<AdminSession> adminSessions = new CopyOnWriteArrayList<>();
    record AdminSession(String email, String role, SseEmitter emitter) {}

    // ── Restaurant SSE sessions ───────────────────────────────────────
    private final List<RestaurantSession> restaurantSessions = new CopyOnWriteArrayList<>();
    record RestaurantSession(String restaurantId, SseEmitter emitter) {}

    // ── Customer SSE sessions ─────────────────────────────────────────
    private final List<CustomerSession> customerSessions = new CopyOnWriteArrayList<>();
    record CustomerSession(String userId, SseEmitter emitter) {}

    // ── Driver SSE sessions ───────────────────────────────────────────
    private final List<DriverSession> driverSessions = new CopyOnWriteArrayList<>();
    record DriverSession(String driverEmail, SseEmitter emitter) {}

    // ── Admin subscribe ───────────────────────────────────────────────

    public SseEmitter subscribe(String adminEmail, String adminRole) {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        AdminSession session = new AdminSession(adminEmail, adminRole, emitter);
        adminSessions.add(session);

        Runnable remove = () -> adminSessions.remove(session);
        emitter.onCompletion(remove);
        emitter.onTimeout(remove);
        emitter.onError(e -> adminSessions.remove(session));
        try { emitter.send(SseEmitter.event().comment("connected")); } catch (Exception e) { adminSessions.remove(session); }
        return emitter;
    }

    public void pushToAllAdmins(NotificationDTO dto) {
        pushAdmin(dto, s -> true);
    }

    public void pushToSuperAdmins(NotificationDTO dto) {
        pushAdmin(dto, s -> s.role().contains("SUPER_ADMIN"));
    }

    private void pushAdmin(NotificationDTO dto, Predicate<AdminSession> filter) {
        List<AdminSession> dead = new ArrayList<>();
        for (AdminSession session : adminSessions) {
            if (!filter.test(session)) continue;
            try {
                session.emitter().send(SseEmitter.event().data(dto, MediaType.APPLICATION_JSON));
            } catch (Exception e) {
                dead.add(session);
            }
        }
        adminSessions.removeAll(dead);
    }

    // ── Restaurant subscribe ──────────────────────────────────────────

    public SseEmitter subscribeRestaurant(String restaurantId) {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        RestaurantSession session = new RestaurantSession(restaurantId, emitter);
        restaurantSessions.add(session);

        Runnable remove = () -> restaurantSessions.remove(session);
        emitter.onCompletion(remove);
        emitter.onTimeout(remove);
        emitter.onError(e -> restaurantSessions.remove(session));
        try { emitter.send(SseEmitter.event().comment("connected")); } catch (Exception e) { restaurantSessions.remove(session); }
        return emitter;
    }

    public void pushToRestaurant(String restaurantId, RestaurantNotificationDTO dto) {
        List<RestaurantSession> dead = new ArrayList<>();
        for (RestaurantSession session : restaurantSessions) {
            if (!session.restaurantId().equals(restaurantId)) continue;
            try {
                session.emitter().send(SseEmitter.event().data(dto, MediaType.APPLICATION_JSON));
            } catch (Exception e) {
                dead.add(session);
            }
        }
        restaurantSessions.removeAll(dead);
    }

    // ── Customer subscribe ────────────────────────────────────────────

    public SseEmitter subscribeCustomer(String userId) {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        CustomerSession session = new CustomerSession(userId, emitter);
        customerSessions.add(session);

        Runnable remove = () -> customerSessions.remove(session);
        emitter.onCompletion(remove);
        emitter.onTimeout(remove);
        emitter.onError(e -> customerSessions.remove(session));
        try { emitter.send(SseEmitter.event().comment("connected")); } catch (Exception e) { customerSessions.remove(session); }
        return emitter;
    }

    public void pushToCustomer(String userId, CustomerOrderUpdateDTO dto) {
        List<CustomerSession> dead = new ArrayList<>();
        for (CustomerSession session : customerSessions) {
            if (!session.userId().equals(userId)) continue;
            try {
                session.emitter().send(SseEmitter.event().data(dto, MediaType.APPLICATION_JSON));
            } catch (Exception e) {
                dead.add(session);
            }
        }
        customerSessions.removeAll(dead);
    }

    // ── Driver subscribe ──────────────────────────────────────────────

    public SseEmitter subscribeDriver(String driverEmail) {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        DriverSession session = new DriverSession(driverEmail, emitter);
        driverSessions.add(session);

        Runnable remove = () -> driverSessions.remove(session);
        emitter.onCompletion(remove);
        emitter.onTimeout(remove);
        emitter.onError(e -> driverSessions.remove(session));
        try { emitter.send(SseEmitter.event().comment("connected")); } catch (Exception e) { driverSessions.remove(session); }
        return emitter;
    }

    public void pushToDriver(String driverEmail, DriverOrderNotificationDTO dto) {
        List<DriverSession> dead = new ArrayList<>();
        for (DriverSession session : driverSessions) {
            if (!session.driverEmail().equals(driverEmail)) continue;
            try {
                session.emitter().send(SseEmitter.event().data(dto, MediaType.APPLICATION_JSON));
            } catch (Exception e) {
                dead.add(session);
            }
        }
        driverSessions.removeAll(dead);
    }
}
