import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HomeService } from './home.service';
import { Slide, Restaurant } from '../model/restaurant.model';

interface FoodCard {
  emoji: string; name: string; price: number;
  rating: number; reviews: number; badge?: string; bg: string;
}

const CUISINE_EMOJI: Record<string, string> = {
  Indian: '🍛', Biryani: '🍛', Italian: '🍕', Pizza: '🍕',
  Burgers: '🍔', 'Fast Food': '🍔', Japanese: '🍣', Sushi: '🍣',
  Chinese: '🥢', Asian: '🥡', Healthy: '🥗', Salads: '🥗',
  Mexican: '🌮', default: '🍽️',
};

const CUISINE_BG: Record<string, string> = {
  Indian: 'linear-gradient(135deg,#fff3cd,#ffe082)',
  Biryani: 'linear-gradient(135deg,#fff3cd,#ffe082)',
  Italian: 'linear-gradient(135deg,#fce4ec,#f8bbd9)',
  Pizza: 'linear-gradient(135deg,#fce4ec,#f8bbd9)',
  Burgers: 'linear-gradient(135deg,#fbe9e7,#ffccbc)',
  'Fast Food': 'linear-gradient(135deg,#fbe9e7,#ffccbc)',
  Japanese: 'linear-gradient(135deg,#e3f2fd,#bbdefb)',
  Sushi: 'linear-gradient(135deg,#e3f2fd,#bbdefb)',
  Chinese: 'linear-gradient(135deg,#fff3e0,#ffe0b2)',
  Asian: 'linear-gradient(135deg,#fff3e0,#ffe0b2)',
  Healthy: 'linear-gradient(135deg,#e8f5e9,#c8e6c9)',
  Salads: 'linear-gradient(135deg,#e8f5e9,#c8e6c9)',
  default: 'linear-gradient(135deg,#f5f5f5,#eeeeee)',
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit, OnDestroy {
  slides: Slide[] = [];
  activeSlide = 0;

  restaurants: Restaurant[] = [];
  cuisineFilters: string[] = [];
  selectedCuisine = 'All';
  popularDishes: FoodCard[] = [];

  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private homeService: HomeService) {}

  ngOnInit() {
    this.loadSlides();
    this.loadCuisines();
    this.loadRestaurants();
  }

  ngOnDestroy() {
    this.clearTimer();
  }

  private loadSlides() {
    this.homeService.getSlides().subscribe({
      next: (res) => {
        this.slides = res.data ?? [];
        if (this.slides.length > 1) this.startTimer();
      },
    });
  }

  private startTimer() {
    this.timer = setInterval(() => {
      this.activeSlide = (this.activeSlide + 1) % this.slides.length;
    }, 5000);
  }

  private clearTimer() {
    if (this.timer) clearInterval(this.timer);
  }

  goToSlide(index: number) {
    this.activeSlide = index;
    this.clearTimer();
    if (this.slides.length > 1) this.startTimer();
  }

  prevSlide() {
    this.goToSlide((this.activeSlide - 1 + this.slides.length) % this.slides.length);
  }

  nextSlide() {
    this.goToSlide((this.activeSlide + 1) % this.slides.length);
  }

  loadRestaurants(cuisine?: string) {
    this.selectedCuisine = cuisine ?? 'All';
    this.homeService.getRestaurants(cuisine).subscribe({
      next: (res) => {
        this.restaurants = res.data ?? [];
        if (!cuisine) this.buildPopularDishes(this.restaurants);
      },
    });
  }

  loadCuisines() {
    this.homeService.getCuisines().subscribe({
      next: (res) => (this.cuisineFilters = res.data ?? []),
    });
  }

  private buildPopularDishes(restaurants: Restaurant[]) {
    const dishes: FoodCard[] = [];
    for (const r of restaurants) {
      const firstItem = r.menu?.[0]?.items?.[0];
      if (!firstItem) continue;
      const cuisine = r.cuisine[0] ?? 'default';
      dishes.push({
        emoji: CUISINE_EMOJI[cuisine] ?? CUISINE_EMOJI['default'],
        name: firstItem.name,
        price: firstItem.price,
        rating: r.rating,
        reviews: Math.floor(Math.random() * 300 + 100),
        badge: dishes.length === 0 ? 'Bestseller' : undefined,
        bg: CUISINE_BG[cuisine] ?? CUISINE_BG['default'],
      });
      if (dishes.length === 4) break;
    }
    this.popularDishes = dishes;
  }

  getEmoji(r: Restaurant): string {
    return CUISINE_EMOJI[r.cuisine[0]] ?? CUISINE_EMOJI['default'];
  }

  getBg(r: Restaurant): string {
    return CUISINE_BG[r.cuisine[0]] ?? CUISINE_BG['default'];
  }

  starsArray(rating: number): boolean[] {
    return Array.from({ length: 5 }, (_, i) => i < Math.round(rating));
  }
}
