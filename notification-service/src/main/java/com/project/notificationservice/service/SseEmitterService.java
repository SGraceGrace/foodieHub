package com.project.notificationservice.service;

import com.project.notificationservice.dto.CustomerOrderUpdateDTO;
import com.project.notificationservice.dto.NotificationDTO;
import com.project.notificationservice.dto.RestaurantNotificationDTO;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Predicate;

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

    // ── Admin subscribe ───────────────────────────────────────────────

    public SseEmitter subscribe(String adminEmail, String adminRole) {
        SseEmitter emitter = new SseEmitter(0L);
        AdminSession session = new AdminSession(adminEmail, adminRole, emitter);
        adminSessions.add(session);

        Runnable remove = () -> adminSessions.remove(session);
        emitter.onCompletion(remove);
        emitter.onTimeout(remove);
        emitter.onError(e -> adminSessions.remove(session));
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
        SseEmitter emitter = new SseEmitter(0L);
        RestaurantSession session = new RestaurantSession(restaurantId, emitter);
        restaurantSessions.add(session);

        Runnable remove = () -> restaurantSessions.remove(session);
        emitter.onCompletion(remove);
        emitter.onTimeout(remove);
        emitter.onError(e -> restaurantSessions.remove(session));
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
        SseEmitter emitter = new SseEmitter(0L);
        CustomerSession session = new CustomerSession(userId, emitter);
        customerSessions.add(session);

        Runnable remove = () -> customerSessions.remove(session);
        emitter.onCompletion(remove);
        emitter.onTimeout(remove);
        emitter.onError(e -> customerSessions.remove(session));
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
}
