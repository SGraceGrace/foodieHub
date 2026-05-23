import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { CartService, Cart, CartItem, RestaurantCart } from '../../core/shared/cart.service';
import { DeliveryAddressService } from '../../core/shared/delivery-address.service';
import { UserAddress } from '../../model/address.model';

const DELIVERY_FEE        = 30;
const GST_RATE            = 0.05;
const FREE_DELIVERY_ABOVE = 500;

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.scss',
})
export class CartComponent implements OnInit, OnDestroy {
  cart: Cart | null = null;
  deliveryAddress: UserAddress | null = null;

  private subs = new Subscription();

  constructor(
    public cartService: CartService,
    private deliveryAddressService: DeliveryAddressService
  ) {}

  ngOnInit() {
    this.subs.add(this.cartService.cart$.subscribe(c => (this.cart = c)));
    this.subs.add(this.deliveryAddressService.selected$.subscribe(a => (this.deliveryAddress = a)));
  }

  ngOnDestroy() { this.subs.unsubscribe(); }

  // ── Item controls ─────────────────────────────────────────────────
  add(rc: RestaurantCart, item: CartItem) {
    this.cartService.addItem(rc.restaurantId, rc.restaurantName, { ...item, qty: 1 }).subscribe();
  }

  remove(rc: RestaurantCart, item: CartItem) {
    this.cartService.removeItem(rc.restaurantId, item.name).subscribe();
  }

  clearRestaurant(rc: RestaurantCart) {
    this.cartService.clearRestaurant(rc.restaurantId).subscribe();
  }

  clearCart() {
    this.cartService.clearCart().subscribe();
  }

  // ── Per-restaurant bill ───────────────────────────────────────────
  subtotal(rc: RestaurantCart): number {
    return rc.items.reduce((s, i) => s + i.price * i.qty, 0);
  }

  deliveryFee(rc: RestaurantCart): number {
    return this.subtotal(rc) >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
  }

  gst(rc: RestaurantCart): number {
    return Math.round(this.subtotal(rc) * GST_RATE);
  }

  grandTotal(rc: RestaurantCart): number {
    return this.subtotal(rc) + this.deliveryFee(rc) + this.gst(rc);
  }

  itemCount(rc: RestaurantCart): number {
    return rc.items.reduce((s, i) => s + i.qty, 0);
  }

  amountToFreeDelivery(rc: RestaurantCart): number {
    return FREE_DELIVERY_ABOVE - this.subtotal(rc);
  }

  get hasItems(): boolean {
    return !!this.cart && this.cart.restaurants.length > 0;
  }

  onPlaceOrder(rc: RestaurantCart) {
    // TODO: wire to order service API — pass restaurantId + items + address
    alert(`Order flow coming soon!\n${rc.restaurantName} · ₹${this.grandTotal(rc)}`);
  }
}
