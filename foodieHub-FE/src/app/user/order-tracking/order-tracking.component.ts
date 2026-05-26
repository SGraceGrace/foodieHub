import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Order, OrderStatus } from '../../model/order.model';
import { OrderService } from '../../core/shared/order.service';
import { HomeService } from '../../home/home.service';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';

const STATUS_ORDER: Partial<Record<OrderStatus, number>> = {
  PLACED: 0, CONFIRMED: 1, PREPARING: 2, READY: 3,
  OUT_FOR_DELIVERY: 4, DELIVERED: 5, CANCELLED: -1,
};

// Restaurant owns ranks 1-3
const RESTAURANT_RANK: Partial<Record<OrderStatus, number>> = {
  CONFIRMED: 1, PREPARING: 2, READY: 3, CANCELLED: -1,
};

// Driver sub-status ranks — 4 steps, independent of main status field
const DRIVER_RANK: Partial<Record<OrderStatus, number>> = {
  DRIVER_ASSIGNED: 1, PICKED_UP: 2, OUT_FOR_DELIVERY: 3, DELIVERED: 4,
};

type StepState = 'completed' | 'active' | 'pending';

@Component({
  selector: 'app-order-tracking',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-tracking.component.html',
  styleUrl: './order-tracking.component.scss',
})
export class OrderTrackingComponent implements OnInit, OnDestroy {
  order: Order | null = null;
  loading = true;

  // ── Rating modal ──────────────────────────────────────────────────
  stars = [1, 2, 3, 4, 5];
  showRating = false;

  // Restaurant rating
  selectedStar = 0;
  hoverStar = 0;

  // Driver rating
  selectedDriverStar = 0;
  hoverDriverStar = 0;

  submitting = false;

  private statusSub: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    private homeService: HomeService,
    private toastr: ToastrService,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.orderService.getOrder(id).subscribe({
      next: res => {
        this.order = res.data ?? null;
        this.loading = false;
        // Auto-show rating popup if already delivered and not yet rated
        if (this.order?.status === 'DELIVERED' && !this.order?.rated) {
          this.openRating();
        }
      },
      error: () => {
        this.loading = false;
        this.toastr.error('Could not load order.');
        this.router.navigateByUrl('/user/orders');
      },
    });

    // Live status updates from the header's SSE connection
    this.statusSub = this.orderService.orderStatusUpdate$.subscribe(update => {
      if (!this.order || update.orderId !== this.order.id || !update.newStatus) return;

      const allDriverStatuses: OrderStatus[] = ['DRIVER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'];
      const byDriver = allDriverStatuses.includes(update.newStatus);

      if (byDriver) {
        // Always store the driver sub-status
        // DRIVER_ASSIGNED: main status unchanged (order stays at READY)
        // PICKED_UP: backend already wrote OUT_FOR_DELIVERY to main status — mirror it here
        // OUT_FOR_DELIVERY / DELIVERED: main status advances normally
        const mainStatusPatch: Partial<Order> =
          update.newStatus === 'DRIVER_ASSIGNED' ? {} :
          update.newStatus === 'PICKED_UP'       ? { status: 'OUT_FOR_DELIVERY' } :
                                                   { status: update.newStatus };
        this.order = { ...this.order, driverStatus: update.newStatus, ...mainStatusPatch };

        // Auto-show rating popup when order is delivered via live SSE
        if (update.newStatus === 'DELIVERED' && !this.order.rated) {
          this.openRating();
        }
      } else {
        this.order = { ...this.order, status: update.newStatus, restaurantStatus: update.newStatus };
      }
    });
  }

  ngOnDestroy() {
    this.statusSub?.unsubscribe();
  }

  // ── Helpers ────────────────────────────────────────────────────────

  get statusRank(): number {
    return this.order ? (STATUS_ORDER[this.order.status] ?? 0) : 0;
  }

  // Restaurant timeline — driven by order.restaurantStatus directly
  restaurantStep(requiredRank: number): StepState {
    if (this.order?.status === 'CANCELLED') return 'pending';
    // Only shortcut to "all done" when the driver has physically collected the food.
    // DRIVER_ASSIGNED means driver accepted, NOT that restaurant is finished.
    const driverHasFood = ['PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED']
      .includes(this.order?.driverStatus ?? '');
    if (driverHasFood) return 'completed';
    const r = this.order?.restaurantStatus
      ? (RESTAURANT_RANK[this.order.restaurantStatus] ?? 0) : 0;
    if (r > requiredRank) return 'completed';
    if (r === requiredRank) return 'active';
    return 'pending';
  }

  // Driver timeline — 4 steps: DRIVER_ASSIGNED(1) → PICKED_UP(2) → OUT_FOR_DELIVERY(3) → DELIVERED(4)
  driverStep(requiredRank: number): StepState {
    const r = this.order?.driverStatus
      ? (DRIVER_RANK[this.order.driverStatus] ?? 0) : 0;
    if (r > requiredRank) return 'completed';
    if (r === requiredRank) return 'active';
    return 'pending';
  }

  /** True once any driver status is set (driver accepted = DRIVER_ASSIGNED or beyond). */
  get hasDriverAssigned(): boolean {
    return !!this.order?.driverStatus;
  }

  /** True if a driver was physically assigned to this order (driverEmail is set). */
  get hasDriver(): boolean {
    return !!this.order?.driverEmail;
  }

  get driverCardMessage(): string {
    switch (this.order?.driverStatus) {
      case 'DRIVER_ASSIGNED':  return 'Driver is heading to the restaurant!';
      case 'PICKED_UP':        return 'Your food has been picked up!';
      case 'OUT_FOR_DELIVERY': return 'Driver is on the way to you! 🛵';
      default:                 return 'Your food is on the way!';
    }
  }

  get currentStatusLabel(): string {
    const map: Partial<Record<OrderStatus, string>> = {
      PLACED:           'Order Placed',
      CONFIRMED:        'Order Confirmed',
      PREPARING:        'Preparing Food',
      READY:            'Ready for Pickup',
      OUT_FOR_DELIVERY: 'Out for Delivery',
      DELIVERED:        'Delivered',
      CANCELLED:        'Cancelled',
    };
    return this.order ? (map[this.order.status] ?? this.order.status) : '';
  }

  get isActive(): boolean {
    return !!this.order &&
      ['PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'].includes(this.order.status);
  }

  get isDelivered(): boolean {
    return this.order?.status === 'DELIVERED';
  }

  get isCancelled(): boolean {
    return this.order?.status === 'CANCELLED';
  }

  goBack() {
    this.router.navigateByUrl('/user/orders');
  }

  // ── Rating modal ───────────────────────────────────────────────────

  openRating() {
    this.showRating = true;
    this.selectedStar = 0;
    this.hoverStar = 0;
    this.selectedDriverStar = 0;
    this.hoverDriverStar = 0;
  }

  cancelRating() { this.showRating = false; }

  // Restaurant stars
  selectStar(n: number)  { this.selectedStar = n; }
  hoverRating(n: number) { this.hoverStar = n; }
  activeStar()           { return this.hoverStar || this.selectedStar; }

  // Driver stars
  selectDriverStar(n: number)  { this.selectedDriverStar = n; }
  hoverDriverRating(n: number) { this.hoverDriverStar = n; }
  activeDriverStar()           { return this.hoverDriverStar || this.selectedDriverStar; }

  readonly starLabels = ['', '😞 Poor', '😐 Fair', '🙂 Good', '😊 Great', '🤩 Excellent'];

  submitRating() {
    if (!this.order || this.selectedStar === 0 || this.submitting) return;
    this.submitting = true;

    // Driver rating is optional — only send if user selected stars and a driver was assigned
    const driverRating = (this.hasDriverAssigned && this.selectedDriverStar > 0)
      ? this.selectedDriverStar
      : undefined;

    forkJoin([
      // Stores restaurant rating + driverEmail + driverRating in the ratings collection (food-service)
      this.homeService.rateRestaurant(
        this.order.restaurantId!, this.selectedStar, this.order.id,
        this.order.driverEmail,   // who was rated — comes from the order document
        driverRating
      ),
      // Marks the order as rated and persists driverRating on the order document (order-service)
      this.orderService.markOrderRated(this.order.id, driverRating),
    ]).subscribe({
      next: () => {
        this.order = { ...this.order!, rated: true };
        this.showRating = false;
        this.submitting = false;
        this.toastr.success('Thanks for your rating! ⭐');
      },
      error: () => {
        this.toastr.error('Could not submit rating. Please try again.');
        this.submitting = false;
      },
    });
  }
}
