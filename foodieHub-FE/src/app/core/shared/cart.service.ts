import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface CartItem {
  name: string;
  price: number;
  qty: number;
  isVeg: boolean;
  description?: string;
  imageUrl?: string;
}

export interface Cart {
  restaurantId: string;
  restaurantName: string;
  items: CartItem[];
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private _cart$ = new BehaviorSubject<Cart | null>(null);
  readonly cart$ = this._cart$.asObservable();

  get cart(): Cart | null { return this._cart$.value; }

  get totalItems(): number {
    return this.cart?.items.reduce((sum, i) => sum + i.qty, 0) ?? 0;
  }

  get totalAmount(): number {
    return this.cart?.items.reduce((sum, i) => sum + i.price * i.qty, 0) ?? 0;
  }

  getQty(restaurantId: string, itemName: string): number {
    if (this.cart?.restaurantId !== restaurantId) return 0;
    return this.cart?.items.find(i => i.name === itemName)?.qty ?? 0;
  }

  /** Returns true if cart was cleared (different restaurant) — caller shows confirm dialog */
  addItem(restaurantId: string, restaurantName: string, item: CartItem): boolean {
    const current = this.cart;

    // Different restaurant — clear first
    if (current && current.restaurantId !== restaurantId) {
      return false; // caller must confirm, then call clearAndAdd
    }

    const existing = current?.items.find(i => i.name === item.name);
    if (existing) {
      existing.qty++;
      this._cart$.next({ ...current! });
    } else {
      this._cart$.next({
        restaurantId,
        restaurantName,
        items: current ? [...current.items, { ...item, qty: 1 }] : [{ ...item, qty: 1 }],
      });
    }
    return true;
  }

  clearAndAdd(restaurantId: string, restaurantName: string, item: CartItem) {
    this._cart$.next({
      restaurantId,
      restaurantName,
      items: [{ ...item, qty: 1 }],
    });
  }

  removeItem(restaurantId: string, itemName: string) {
    const current = this.cart;
    if (!current || current.restaurantId !== restaurantId) return;

    const existing = current.items.find(i => i.name === itemName);
    if (!existing) return;

    if (existing.qty > 1) {
      existing.qty--;
      this._cart$.next({ ...current });
    } else {
      const items = current.items.filter(i => i.name !== itemName);
      this._cart$.next(items.length ? { ...current, items } : null);
    }
  }

  clearCart() {
    this._cart$.next(null);
  }
}
