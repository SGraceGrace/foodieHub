import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { CartService, Cart, CartItem } from '../../core/shared/cart.service';
import { DeliveryAddressService } from '../../core/shared/delivery-address.service';
import { UserAddress } from '../../model/address.model';

const DELIVERY_FEE = 30;
const GST_RATE = 0.05;
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

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  // ── Qty controls ──────────────────────────────────────────────────
  add(item: CartItem) {
    if (!this.cart) return;
    this.cartService.addItem(this.cart.restaurantId, this.cart.restaurantName, { ...item, qty: 1 });
  }

  remove(item: CartItem) {
    if (!this.cart) return;
    this.cartService.removeItem(this.cart.restaurantId, item.name);
  }

  clearCart() {
    this.cartService.clearCart();
  }

  // ── Bill calculations ─────────────────────────────────────────────
  get subtotal(): number {
    return this.cartService.totalAmount;
  }

  get deliveryFee(): number {
    return this.subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
  }

  get freeDeliveryThreshold(): number {
    return FREE_DELIVERY_ABOVE;
  }

  get gst(): number {
    return Math.round(this.subtotal * GST_RATE);
  }

  get grandTotal(): number {
    return this.subtotal + this.deliveryFee + this.gst;
  }

  get amountToFreeDelivery(): number {
    return FREE_DELIVERY_ABOVE - this.subtotal;
  }

  get canPlaceOrder(): boolean {
    return !!this.cart && this.cart.items.length > 0 && !!this.deliveryAddress;
  }

  onPlaceOrder() {
    // TODO: wire to order service API
    alert('Order flow coming soon!');
  }
}
