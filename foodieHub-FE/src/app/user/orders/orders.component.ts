import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Order, OrderStatus } from '../../model/order.model';
import { ToastrService } from 'ngx-toastr';
import { OrderService } from '../../core/shared/order.service';
import { TokenService } from '../../core/shared/token.service';
import { HomeService } from '../../home/home.service';
import { CartService } from '../../core/shared/cart.service';
import { forkJoin, Subscription, from } from 'rxjs';
import { concatMap } from 'rxjs/operators';

// The header component owns the single SSE connection and broadcasts updates
// via OrderService.orderStatusUpdate$. This page subscribes to that Subject
// to update the order tracker live — no second SSE connection needed.

type Tab = 'ALL' | 'ACTIVE' | 'DELIVERED' | 'CANCELLED';

const ACTIVE_STATUSES: OrderStatus[] = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'];

const TRACK_STEPS = ['Placed', 'Confirmed', 'Prepared', 'Ready', 'On the Way', 'Delivered'];

const STATUS_ORDER: Partial<Record<OrderStatus, number>> = {
  PLACED: 0, CONFIRMED: 1, PREPARING: 2, READY: 3, OUT_FOR_DELIVERY: 4, DELIVERED: 5, CANCELLED: -1,
};

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss',
})
export class OrdersComponent implements OnInit, OnDestroy {
  allOrders: Order[] = [];
  filtered: Order[] = [];
  loading = false;
  activeTab: Tab = 'ALL';
  tabs: { key: Tab; label: string }[] = [
    { key: 'ALL',       label: 'All Orders' },
    { key: 'ACTIVE',    label: 'Active' },
    { key: 'DELIVERED', label: 'Delivered' },
    { key: 'CANCELLED', label: 'Cancelled' },
  ];

  trackSteps = TRACK_STEPS;
  stars = [1, 2, 3, 4, 5];

  // ── Reorder state ─────────────────────────────────────────────────
  reorderingId: string | null = null;   // orderId currently being re-added to cart

  // ── Rating widget state ───────────────────────────────────────────
  ratingTarget: Order | null = null;   // which order's rating panel is open
  selectedStar     = 0;                // restaurant star (0 = none selected)
  hoverStar        = 0;
  selectedDriverStar = 0;              // driver star (0 = none selected / skipped)
  hoverDriverStar    = 0;
  submitting       = false;
  readonly starLabels = ['', '😞 Poor', '😐 Fair', '🙂 Good', '😊 Great', '🤩 Excellent'];

  private statusSub: Subscription | null = null;

  constructor(
    private toastr: ToastrService,
    private orderService: OrderService,
    private tokenService: TokenService,
    private homeService: HomeService,
    private cartService: CartService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadOrders();
    // Subscribe to the shared Subject that the header feeds from its SSE connection.
    // No second SSE connection needed — the header is the single SSE owner.
    this.statusSub = this.orderService.orderStatusUpdate$.subscribe(update => {
      // DRIVER_ASSIGNED is a notification-only signal — do not update the order status card
      if (update.newStatus && update.newStatus !== ('DRIVER_ASSIGNED' as any)) {
        this.allOrders = this.allOrders.map(o =>
          o.id === update.orderId ? { ...o, status: update.newStatus } : o
        );
        this.applyTab(this.activeTab);
      }
    });
  }

  ngOnDestroy() {
    this.statusSub?.unsubscribe();
  }

  // ── Order loading ─────────────────────────────────────────────────────────────

  loadOrders(): void {
    this.loading = true;
    this.orderService.getOrders().subscribe({
      next: res => {
        this.allOrders = res.data ?? [];
        this.applyTab(this.activeTab);
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  applyTab(tab: Tab) {
    this.activeTab = tab;
    switch (tab) {
      case 'ACTIVE':
        this.filtered = this.allOrders.filter(o => ACTIVE_STATUSES.includes(o.status));
        break;
      case 'DELIVERED':
        this.filtered = this.allOrders.filter(o => o.status === 'DELIVERED');
        break;
      case 'CANCELLED':
        this.filtered = this.allOrders.filter(o => o.status === 'CANCELLED');
        break;
      default:
        this.filtered = [...this.allOrders];
    }
  }

  isActive(order: Order): boolean {
    return ACTIVE_STATUSES.includes(order.status);
  }

  stepState(order: Order, stepIndex: number): 'done' | 'curr' | 'pending' {
    const orderStep = STATUS_ORDER[order.status] ?? 0;
    if (orderStep < 0) return 'pending';
    if (stepIndex < orderStep) return 'done';
    if (stepIndex === orderStep) return 'curr';
    return 'pending';
  }

  statusBadgeClass(status: OrderStatus): string {
    const map: Partial<Record<OrderStatus, string>> = {
      PLACED:            'sb-placed',
      CONFIRMED:         'sb-confirmed',
      PREPARING:         'sb-preparing',
      READY:             'sb-ready',
      OUT_FOR_DELIVERY:  'sb-onway',
      DELIVERED:         'sb-delivered',
      CANCELLED:         'sb-cancelled',
    };
    return map[status] ?? '';
  }

  statusLabel(status: OrderStatus): string {
    const map: Partial<Record<OrderStatus, string>> = {
      PLACED:            '🕐 Placed',
      CONFIRMED:         '✅ Confirmed',
      PREPARING:         '👨‍🍳 Preparing',
      READY:             '📦 Ready for pickup',
      OUT_FOR_DELIVERY:  '🛵 On the way',
      DELIVERED:         '✓ Delivered',
      CANCELLED:         '✕ Cancelled',
    };
    return map[status] ?? status;
  }

  trackOrder(order: Order) {
    this.router.navigateByUrl(`/user/orders/${order.id}`);
  }

  reorder(order: Order): void {
    if (!order.restaurantId || order.items.length === 0 || this.reorderingId) return;

    this.reorderingId = order.id;

    // Build one addItem call per unit of qty so the cart accumulates correctly.
    // e.g. Butter Chicken x2 → two sequential addItem calls (backend adds +1 each time).
    const calls = order.items.flatMap(item =>
      Array.from({ length: item.qty }, () =>
        this.cartService.addItem(order.restaurantId!, order.restaurantName, {
          menuItemId: item.menuItemId,
          name:  item.name,
          price: item.price,
          qty:   1,
          isVeg: item.isVeg ?? false,
        })
      )
    );

    from(calls).pipe(
      concatMap(call => call)   // sequential — avoids cart race-conditions
    ).subscribe({
      error: () => {
        this.toastr.error('Could not add items to cart. Please try again.');
        this.reorderingId = null;
      },
      complete: () => {
        const total = order.items.reduce((s, i) => s + i.qty, 0);
        this.toastr.success(
          `${total} item${total > 1 ? 's' : ''} added from ${order.restaurantName}`,
          '🛒 Reorder successful'
        );
        this.reorderingId = null;
        this.router.navigateByUrl('/user/cart');
      },
    });
  }

  // ── Rating widget ─────────────────────────────────────────────────────────────

  openRating(order: Order): void {
    this.ratingTarget      = order;
    this.selectedStar      = 0;
    this.hoverStar         = 0;
    this.selectedDriverStar = 0;
    this.hoverDriverStar    = 0;
  }

  cancelRating(): void {
    this.ratingTarget      = null;
    this.selectedStar      = 0;
    this.hoverStar         = 0;
    this.selectedDriverStar = 0;
    this.hoverDriverStar    = 0;
  }

  // Restaurant stars
  selectStar(n: number):  void { this.selectedStar = n; }
  hoverRating(n: number): void { this.hoverStar = n; }
  activeStar(): number         { return this.hoverStar || this.selectedStar; }

  // Driver stars
  selectDriverStar(n: number):  void { this.selectedDriverStar = n; }
  hoverDriverRating(n: number): void { this.hoverDriverStar = n; }
  activeDriverStar(): number         { return this.hoverDriverStar || this.selectedDriverStar; }

  /** True if a driver was assigned to this order (driverStatus is set). */
  hasDriverAssigned(order: Order): boolean {
    return !!order.driverStatus;
  }

  submitRating(): void {
    if (!this.ratingTarget || this.selectedStar === 0 || this.submitting) return;
    const order = this.ratingTarget;
    this.submitting = true;

    const driverRating = (this.hasDriverAssigned(order) && this.selectedDriverStar > 0)
      ? this.selectedDriverStar
      : undefined;

    forkJoin([
      // Stores restaurant rating + driverEmail + driverRating in ratings collection (food-service)
      this.homeService.rateRestaurant(
        order.restaurantId!, this.selectedStar, order.id,
        order.driverEmail,
        driverRating
      ),
      // Marks rated=true and stores driverRating on the order document (order-service)
      this.orderService.markOrderRated(order.id, driverRating),
    ]).subscribe({
      next: () => {
        this.allOrders = this.allOrders.map(o =>
          o.id === order.id ? { ...o, rated: true } : o
        );
        this.applyTab(this.activeTab);
        this.toastr.success(
          `Thanks for rating ${order.restaurantName}! ${this.starLabels[this.selectedStar]}`,
          'Rating submitted'
        );
        this.cancelRating();
        this.submitting = false;
      },
      error: () => {
        this.toastr.error('Could not submit rating. Please try again.');
        this.submitting = false;
      },
    });
  }
}
