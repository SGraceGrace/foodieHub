import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HomeService } from './home.service';
import { Slide, Restaurant } from '../model/restaurant.model';
import { CUISINE_EMOJI, getCuisineEmoji, getCuisineBg } from '../core/constants/cuisine.constants';
import { DeliveryAddressService } from '../core/shared/delivery-address.service';

interface FoodCard {
  emoji: string; name: string; price: number;
  rating: number; bg: string;
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

  private userLat: number | undefined;
  private userLng: number | undefined;
  hasDeliveryAddress = false;
  deliveryAddressText = '';
  deliveryAddressLabel = '';

  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private homeService: HomeService,
    private deliveryAddressService: DeliveryAddressService
  ) {}

  ngOnInit() {
    this.loadSlides();
    this.cuisineFilters = Object.keys(CUISINE_EMOJI).filter(k => k !== 'default');
    this.deliveryAddressService.selected$.subscribe(addr => {
      this.userLat = addr?.location?.lat ?? undefined;
      this.userLng = addr?.location?.lng ?? undefined;
      this.hasDeliveryAddress = !!addr;
      this.deliveryAddressText = addr?.addressText ?? '';
      this.deliveryAddressLabel = addr?.label ?? '';
      this.loadRestaurants();
    });
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
    this.homeService.getRestaurants(cuisine, this.userLat, this.userLng).subscribe({
      next: (res) => {
        this.restaurants = res.data?.content ?? [];
        this.buildPopularDishes(this.restaurants);
      },
    });
  }

  loadRestaurants(cuisine?: string) {
    this.selectedCuisine = cuisine ?? 'All';
    this.homeService.getRestaurants(cuisine, this.userLat, this.userLng).subscribe({
      next: (res) => {
        this.restaurants = res.data?.content ?? [];
        if (!cuisine) this.buildPopularDishes(this.restaurants);
      },
    });
  }

  private buildPopularDishes(restaurants: Restaurant[]) {
    const dishes: FoodCard[] = [];
    outer: for (const r of restaurants) {
      const cuisine = r.cuisine?.[0];
      for (const category of r.menu ?? []) {
        for (const item of category.items ?? []) {
          dishes.push({
            emoji: getCuisineEmoji(cuisine),
            name: item.name,
            price: item.price,
            rating: r.rating ?? 0,
            bg: getCuisineBg(cuisine),
          });
          if (dishes.length === 4) break outer;
        }
      }
    }
    this.popularDishes = dishes;
  }

  getEmoji(r: Restaurant): string { return getCuisineEmoji(r.cuisine?.[0]); }
  getBg(r: Restaurant): string    { return getCuisineBg(r.cuisine?.[0]); }
  getCuisineEmoji(c: string): string { return getCuisineEmoji(c); }
  getCuisineBg(c: string): string    { return getCuisineBg(c); }
  getDistanceLabel(r: Restaurant): string {
    if (r.distanceKm == null) return '';
    return r.distanceKm < 1 ? `${Math.round(r.distanceKm * 1000)}m` : `${r.distanceKm.toFixed(1)}km`;
  }

  starsArray(rating: number): boolean[] {
    return Array.from({ length: 5 }, (_, i) => i < Math.round(rating));
  }
}
