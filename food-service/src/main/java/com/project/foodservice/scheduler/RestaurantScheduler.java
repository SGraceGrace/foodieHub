package com.project.foodservice.scheduler;

import com.project.foodservice.document.DaySchedule;
import com.project.foodservice.document.Restaurant;
import com.project.foodservice.repo.RestaurantRepo;
import com.project.foodservice.service.impl.RestaurantServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class RestaurantScheduler {

    private final RestaurantRepo restaurantRepo;

    @Scheduled(fixedRate = 60_000)
    public void syncOpenStatus() {
        List<Restaurant> all = restaurantRepo.findAll();
        List<Restaurant> toUpdate = new ArrayList<>();

        for (Restaurant r : all) {
            List<DaySchedule> hours = r.getOperatingHours();
            if (hours == null || hours.isEmpty()) continue;

            boolean shouldBeOpen = RestaurantServiceImpl.computeIsOpen(r);
            if (r.isOpen() != shouldBeOpen) {
                r.setOpen(shouldBeOpen);
                toUpdate.add(r);
            }
        }

        if (!toUpdate.isEmpty()) {
            restaurantRepo.saveAll(toUpdate);
            log.debug("syncOpenStatus: updated {} restaurant(s)", toUpdate.size());
        }
    }
}
