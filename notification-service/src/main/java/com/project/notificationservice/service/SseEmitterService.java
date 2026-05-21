package com.project.notificationservice.service;

import com.project.notificationservice.dto.NotificationDTO;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Predicate;

@Service
public class SseEmitterService {

    private final List<AdminSession> sessions = new CopyOnWriteArrayList<>();

    record AdminSession(String email, String role, SseEmitter emitter) {}

    public SseEmitter subscribe(String adminEmail, String adminRole) {
        SseEmitter emitter = new SseEmitter(0L);
        AdminSession session = new AdminSession(adminEmail, adminRole, emitter);
        sessions.add(session);

        Runnable remove = () -> sessions.remove(session);
        emitter.onCompletion(remove);
        emitter.onTimeout(remove);
        emitter.onError(e -> sessions.remove(session));

        return emitter;
    }

    public void pushToAllAdmins(NotificationDTO dto) {
        push(dto, s -> true);
    }

    public void pushToSuperAdmins(NotificationDTO dto) {
        push(dto, s -> s.role().contains("SUPER_ADMIN"));
    }

    private void push(NotificationDTO dto, Predicate<AdminSession> filter) {
        List<AdminSession> dead = new ArrayList<>();
        for (AdminSession session : sessions) {
            if (!filter.test(session)) continue;
            try {
                session.emitter().send(SseEmitter.event().data(dto, MediaType.APPLICATION_JSON));
            } catch (Exception e) {
                dead.add(session);
            }
        }
        sessions.removeAll(dead);
    }
}
