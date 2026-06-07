import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { HomeService } from '../home/home.service';
import { CartService, RestaurantCart } from '../core/shared/cart.service';
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
  menu: MenuCategory[] = [];         // loaded separately from menu_items collection
  menuLoading = true;
  loading = true;
  error = false;
  activeCategory: string | null = null;

  restaurantCart: RestaurantCart | null = null;

  private cartSub!: Subscription;

  constructor(
    private route: ActivatedRoute,
    private homeService: HomeService,
    public cartService: CartService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;

    // Load restaurant info
    this.homeService.getRestaurantById(id).subscribe({
      next: (res) => {
        this.restaurant = res.data ?? null;
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      }
    });

    // Load menu separately from menu_items collection
    // Items in the response have `id` set — this is menuItemId used when adding to cart
    this.homeService.getMenuByRestaurant(id).subscribe({
      next: (res) => {
        this.menu = res.data ?? [];
        this.activeCategory = this.menu[0]?.category ?? null;
        this.menuLoading = false;
      },
      error: () => {
        this.menuLoading = false;
      }
    });

    this.cartSub = this.cartService.cart$.subscribe(() => {
      this.restaurantCart = this.restaurant
        ? this.cartService.getRestaurantCart(this.restaurant.id)
        : null;
    });
  }

  ngOnDestroy() {
    this.cartSub?.unsubscribe();
  }

  get categories(): MenuCategory[] {
    return this.menu;
  }

  activeItems(): MenuItem[] {
    return this.menu.find(c => c.category === this.activeCategory)?.items ?? [];
  }

  setCategory(cat: string) {
    this.activeCategory = cat;
  }

  getQty(item: MenuItem): number {
    return this.cartService.getQty(this.restaurant!.id, item.name);
  }

  get thisRestaurantItemCount(): number {
    return this.restaurantCart?.items.reduce((s, i) => s + i.qty, 0) ?? 0;
  }

  get thisRestaurantAmount(): number {
    return this.restaurantCart?.items.reduce((s, i) => s + i.price * i.qty, 0) ?? 0;
  }

  onAdd(item: MenuItem) {
    if (!this.restaurant) return;
    this.cartService.addItem(this.restaurant.id, this.restaurant.name, {
      menuItemId: item.id,      // item.id comes from menu_items collection — used for order-count tracking
      name: item.name,
      price: item.price,
      qty: 1,
      isVeg: item.isVeg,
      description: item.description,
      imageUrl: item.imageUrl,
    }).subscribe();
  }

  onRemove(item: MenuItem) {
    if (!this.restaurant) return;
    this.cartService.removeItem(this.restaurant.id, item.name).subscribe();
  }

  getEmoji(): string { return getCuisineEmoji(this.restaurant?.cuisine?.[0]); }
  getBg():    string { return getCuisineBg(this.restaurant?.cuisine?.[0]); }
}
