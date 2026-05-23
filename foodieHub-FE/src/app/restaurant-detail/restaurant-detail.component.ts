import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HomeService } from '../home/home.service';
import { Restaurant, MenuCategory, MenuItem } from '../model/restaurant.model';
import { getCuisineEmoji, getCuisineBg } from '../core/constants/cuisine.constants';

@Component({
  selector: 'app-restaurant-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './restaurant-detail.component.html',
  styleUrl: './restaurant-detail.component.scss',
})
export class RestaurantDetailComponent implements OnInit {
  restaurant: Restaurant | null = null;
  loading = true;
  error = false;
  activeCategory: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private homeService: HomeService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.homeService.getRestaurantById(id).subscribe({
      next: (res) => {
        this.restaurant = res.data ?? null;
        this.activeCategory = this.restaurant?.menu?.[0]?.category ?? null;
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      }
    });
  }

  get categories(): MenuCategory[] {
    return this.restaurant?.menu ?? [];
  }

  activeItems(): MenuItem[] {
    return this.categories.find(c => c.category === this.activeCategory)?.items ?? [];
  }

  setCategory(cat: string) {
    this.activeCategory = cat;
  }

  getEmoji(): string { return getCuisineEmoji(this.restaurant?.cuisine?.[0]); }
  getBg():    string { return getCuisineBg(this.restaurant?.cuisine?.[0]); }

  starsArray(rating: number): boolean[] {
    return Array.from({ length: 5 }, (_, i) => i < Math.round(rating));
  }
}
