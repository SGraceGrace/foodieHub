import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { CartService, Cart, CartItem, RestaurantCart } from '../../core/shared/cart.service';
import { DeliveryAddressService } from '../../core/shared/delivery-address.service';
import { PaymentService } from '../../core/shared/payment.service';
import { TokenService } from '../../core/shared/token.service';
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

  /** restaurantId currently being processed — used to disable button & show spinner */
  placingOrder: string | null = null;

  /** Error message shown below the Pay button if payment/verification fails */
  paymentError: string | null = null;

  private subs = new Subscription();

  constructor(
    public cartService: CartService,
    private deliveryAddressService: DeliveryAddressService,
    private paymentService: PaymentService,
    private tokenService: TokenService,
    private router: Router
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

  // ── Razorpay payment flow ─────────────────────────────────────────

  async onPlaceOrder(rc: RestaurantCart) {
    if (!this.deliveryAddress || this.placingOrder) return;

    const user = this.tokenService.userInfo;
    const customerName = user
      ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Customer'
      : 'Customer';

    this.placingOrder = rc.restaurantId;
    this.paymentError = null;

    try {
      // ── Step 1: Load Razorpay checkout.js (cached after first load) ──
      await this.paymentService.loadRazorpayScript();

      // ── Step 2: Backend creates a Razorpay order (reads cart → amount) ──
      const initRes = await firstValueFrom(
        this.paymentService.initiatePayment(rc.restaurantId)
      );
      const { razorpayOrderId, amount, currency, keyId } = initRes.data;

      // ── Step 3: Open Razorpay checkout modal ──────────────────────────
      const rzpResponse = await this.paymentService.openCheckout({
        key:         keyId,
        amount,
        currency,
        name:        'FoodieHub',
        description: `Order from ${rc.restaurantName}`,
        order_id:    razorpayOrderId,
        prefill: {
          name:  customerName,
          email: user?.email ?? '',
        },
        theme: { color: '#F9B303' },
      });

      // ── Step 4: Verify payment on backend → place the food order ─────
      const verifyRes = await firstValueFrom(
        this.paymentService.verifyPayment({
          razorpayOrderId:   rzpResponse.razorpay_order_id,
          razorpayPaymentId: rzpResponse.razorpay_payment_id,
          razorpaySignature: rzpResponse.razorpay_signature,
          restaurantId:      rc.restaurantId,
          deliveryAddress:   this.deliveryAddress!.addressText,
          customerName,
        })
      );

      this.placingOrder = null;
      this.cartService.loadCart();                                        // Refresh local cart state
      this.router.navigate(['/user/orders', verifyRes.data.id]);  // Navigate to order tracking page

    } catch (err: unknown) {
      this.placingOrder = null;

      // User closed the modal — not an error, just re-enable the button silently
      if (err instanceof Error && err.message === 'cancelled') return;

      console.error('Payment failed', err);
      this.paymentError = 'Payment failed. Please try again.';
    }
  }
}
