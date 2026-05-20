import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HomeService } from './home.service';
import { Slide, Restaurant } from '../model/restaurant.model';
import { CUISINE_EMOJI, getCuisineEmoji, getCuisineBg } from '../core/constants/cuisine.constants';

interface FoodCard {
  emoji: string; name: string; price: number;
  rating: number; reviews: number; badge?: string; bg: string;
}

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
    this.cuisineFilters = Object.keys(CUISINE_EMOJI).filter(k => k !== 'default');
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

  selectCuisine(cuisine?: string) {
    this.selectedCuisine = cuisine ?? 'All';
    this.homeService.getRestaurants(cuisine).subscribe({
      next: (res) => {
        this.restaurants = res.data?.content ?? [];
        this.buildPopularDishes(this.restaurants);
      },
    });
  }

  loadRestaurants(cuisine?: string) {
    this.selectedCuisine = cuisine ?? 'All';
    this.homeService.getRestaurants(cuisine).subscribe({
      next: (res) => {
        this.restaurants = res.data?.content ?? [];
        if (!cuisine) this.buildPopularDishes(this.restaurants);
      },
    });
  }

  private buildPopularDishes(restaurants: Restaurant[]) {
    const dishes: FoodCard[] = [];
    for (const r of restaurants) {
      const firstItem = r.menu?.[0]?.items?.[0];
      if (!firstItem) continue;
      const cuisine = r.cuisine?.[0];
      dishes.push({
        emoji: getCuisineEmoji(cuisine),
        name: firstItem.name,
        price: firstItem.price,
        rating: r.rating ?? 0,
        reviews: Math.floor(Math.random() * 300 + 100),
        badge: dishes.length === 0 ? 'Bestseller' : undefined,
        bg: getCuisineBg(cuisine),
      });
      if (dishes.length === 4) break;
    }
    this.popularDishes = dishes;
  }

  getEmoji(r: Restaurant): string { return getCuisineEmoji(r.cuisine?.[0]); }
  getBg(r: Restaurant): string    { return getCuisineBg(r.cuisine?.[0]); }
  getCuisineEmoji(c: string): string { return getCuisineEmoji(c); }
  getCuisineBg(c: string): string    { return getCuisineBg(c); }

  starsArray(rating: number): boolean[] {
    return Array.from({ length: 5 }, (_, i) => i < Math.round(rating));
  }
}
