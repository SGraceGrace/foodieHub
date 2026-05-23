import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { HomeService } from '../home/home.service';
import { CartService, Cart } from '../core/shared/cart.service';
import { Restaurant, MenuCategory, MenuItem } from '../model/restaurant.model';
import { getCuisineEmoji, getCuisineBg } from '../core/constants/cuisine.constants';

@Component({
  selector: 'app-restaurant-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './restaurant-detail.component.html',
  styleUrl: './restaurant-detail.component.scss',
})
export class RestaurantDetailComponent implements OnInit, OnDestroy {
  restaurant: Restaurant | null = null;
  loading = true;
  error = false;
  activeCategory: string | null = null;

  cart: Cart | null = null;
  showClearCartDialog = false;
  pendingItem: MenuItem | null = null;

  private cartSub!: Subscription;

  constructor(
    private route: ActivatedRoute,
    private homeService: HomeService,
    public cartService: CartService
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

    this.cartSub = this.cartService.cart$.subscribe(c => (this.cart = c));
  }

  ngOnDestroy() {
    this.cartSub?.unsubscribe();
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

  getQty(item: MenuItem): number {
    return this.cartService.getQty(this.restaurant!.id, item.name);
  }

  onAdd(item: MenuItem) {
    if (!this.restaurant) return;
    const cartItem = {
      name: item.name,
      price: item.price,
      qty: 1,
      isVeg: item.isVeg,
      description: item.description,
      imageUrl: item.imageUrl,
    };
    const added = this.cartService.addItem(this.restaurant.id, this.restaurant.name, cartItem);
    if (!added) {
      // Different restaurant — show confirm dialog
      this.pendingItem = item;
      this.showClearCartDialog = true;
    }
  }

  onRemove(item: MenuItem) {
    if (!this.restaurant) return;
    this.cartService.removeItem(this.restaurant.id, item.name);
  }

  confirmClearCart() {
    if (!this.restaurant || !this.pendingItem) return;
    const cartItem = {
      name: this.pendingItem.name,
      price: this.pendingItem.price,
      qty: 1,
      isVeg: this.pendingItem.isVeg,
      description: this.pendingItem.description,
      imageUrl: this.pendingItem.imageUrl,
    };
    this.cartService.clearAndAdd(this.restaurant.id, this.restaurant.name, cartItem);
    this.showClearCartDialog = false;
    this.pendingItem = null;
  }

  cancelClearCart() {
    this.showClearCartDialog = false;
    this.pendingItem = null;
  }

  getEmoji(): string { return getCuisineEmoji(this.restaurant?.cuisine?.[0]); }
  getBg():    string { return getCuisineBg(this.restaurant?.cuisine?.[0]); }
}
