import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, EMPTY } from 'rxjs';
import { TokenService } from './token.service';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../model/apiResponse.model';

export interface CartItem {
  name: string;
  price: number;
  qty: number;
  isVeg: boolean;
  description?: string;
  imageUrl?: string;
}

export interface RestaurantCart {
  restaurantId: string;
  restaurantName: string;
  items: CartItem[];
}

export interface Cart {
  id?: string;
  userId?: string;
  restaurants: RestaurantCart[];
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private base = environment.apiBaseUrl;
  private _cart$ = new BehaviorSubject<Cart | null>(null);
  readonly cart$ = this._cart$.asObservable();

  constructor(private http: HttpClient, private tokenService: TokenService) {
    // Auto-load from backend when user logs in; clear when they log out
    this.tokenService.userInfo$.subscribe(user => {
      if (user) {
        this.loadCart();
      } else {
        this._cart$.next(null);
      }
    });
  }

  // ── Sync accessors (read from local cache) ────────────────────────

  get cart(): Cart | null { return this._cart$.value; }

  get totalItems(): number {
    return this.cart?.restaurants?.reduce(
      (sum, r) => sum + r.items.reduce((s, i) => s + i.qty, 0), 0
    ) ?? 0;
  }

  get totalAmount(): number {
    return this.cart?.restaurants?.reduce(
      (sum, r) => sum + r.items.reduce((s, i) => s + i.price * i.qty, 0), 0
    ) ?? 0;
  }

  getQty(restaurantId: string, itemName: string): number {
    const rc = this.cart?.restaurants?.find(r => r.restaurantId === restaurantId);
    return rc?.items?.find(i => i.name === itemName)?.qty ?? 0;
  }

  /** Returns the cart bucket for a specific restaurant, or null if not in cart */
  getRestaurantCart(restaurantId: string): RestaurantCart | null {
    return this.cart?.restaurants?.find(r => r.restaurantId === restaurantId) ?? null;
  }

  // ── Backend calls ─────────────────────────────────────────────────

  loadCart(): void {
    this.http.get<ApiResponse<Cart>>(`${this.base}/api/cart`).pipe(
      catchError(() => EMPTY)
    ).subscribe(res => {
      this._cart$.next(res.data?.restaurants?.length ? res.data : null);
    });
  }

  addItem(restaurantId: string, restaurantName: string, item: CartItem): Observable<ApiResponse<Cart>> {
    const body = {
      restaurantId,
      restaurantName,
      name: item.name,
      price: item.price,
      isVeg: item.isVeg,
      description: item.description ?? null,
      imageUrl: item.imageUrl ?? null,
    };
    return this.http.post<ApiResponse<Cart>>(`${this.base}/api/cart/add`, body).pipe(
      tap(res => this._cart$.next(res.data))
    );
  }

  removeItem(restaurantId: string, itemName: string): Observable<ApiResponse<Cart>> {
    const body = { restaurantId, name: itemName };
    return this.http.post<ApiResponse<Cart>>(`${this.base}/api/cart/remove`, body).pipe(
      tap(res => {
        const cart = res.data;
        this._cart$.next(cart?.restaurants?.length ? cart : null);
      })
    );
  }

  clearRestaurant(restaurantId: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.base}/api/cart/restaurant/${restaurantId}`).pipe(
      tap(() => {
        const current = this.cart;
        if (!current) return;
        const remaining = current.restaurants.filter(r => r.restaurantId !== restaurantId);
        this._cart$.next(remaining.length ? { ...current, restaurants: remaining } : null);
      })
    );
  }

  clearCart(): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.base}/api/cart/clear`).pipe(
      tap(() => this._cart$.next(null))
    );
  }
}
