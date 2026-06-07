package com.project.foodservice.config;

import com.project.foodservice.document.Slide;
import com.project.foodservice.repo.SlideRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class SlideDataSeeder implements CommandLineRunner {

    private final SlideRepo slideRepo;

    @Override
    public void run(String... args) {
        if (slideRepo.count() > 0) return;

        slideRepo.saveAll(List.of(
                slide("Delicious Food Delivered to", "Your Door",
                        "Order from the best local restaurants with easy, on-demand delivery. Fresh, hot, and right to your doorstep.",
                        "🍽️ Explore Food", "🔍 Search Dishes", "🍛", "⚡", "Delivery · 30 min avg", 0),

                slide("Hot Meals in", "Minutes",
                        "Experience lightning-fast delivery with real-time tracking. Know exactly when your food arrives.",
                        "⚡ Order Now", "📍 Track Orders", "⚡", "🚗", "Live Tracking", 1),

                slide("Great Offers &", "Discounts",
                        "Get amazing deals on your favorite restaurants. Save more with exclusive offers and loyalty rewards.",
                        "🎉 View Offers", "🎟️ Use Coupon", "🎉", "💰", "Save Up To 40%", 2)
        ));
    }

    private Slide slide(String title, String highlightWord, String description,
                        String btn1, String btn2, String emoji, String badgeIcon,
                        String badgeText, int order) {
        Slide s = new Slide();
        s.setTitle(title);
        s.setHighlightWord(highlightWord);
        s.setDescription(description);
        s.setBtn1Text(btn1);
        s.setBtn2Text(btn2);
        s.setEmoji(emoji);
        s.setBadgeIcon(badgeIcon);
        s.setBadgeText(badgeText);
        s.setDisplayOrder(order);
        return s;
    }
}
