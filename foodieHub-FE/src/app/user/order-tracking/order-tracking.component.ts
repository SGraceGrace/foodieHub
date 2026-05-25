import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Order, OrderStatus } from '../../model/order.model';
import { OrderService } from '../../core/shared/order.service';
import { HomeService } from '../../home/home.service';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';

const STATUS_ORDER: Record<OrderStatus, number> = {
  PLACED: 0, CONFIRMED: 1, PREPARING: 2, READY: 3,
  OUT_FOR_DELIVERY: 4, DELIVERED: 5, CANCELLED: -1,
};

// Restaurant owns ranks 1-3, driver owns ranks 4-5
const RESTAURANT_RANK: Partial<Record<OrderStatus, number>> = {
  CONFIRMED: 1, PREPARING: 2, READY: 3, CANCELLED: -1,
};
const DRIVER_RANK: Partial<Record<OrderStatus, number>> = {
  OUT_FOR_DELIVERY: 4, DELIVERED: 5,
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

  // ── Rating widget ──────────────────────────────────────────────────
  stars = [1, 2, 3, 4, 5];
  showRating = false;
  selectedStar = 0;
  hoverStar = 0;
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
      },
      error: () => {
        this.loading = false;
        this.toastr.error('Could not load order.');
        this.router.navigateByUrl('/user/orders');
      },
    });

    // Live status updates from the header's SSE connection
    this.statusSub = this.orderService.orderStatusUpdate$.subscribe(update => {
      // DRIVER_ASSIGNED is notification-only — don't update the tracking timeline
      if (!this.order || update.orderId !== this.order.id || !update.newStatus) return;
      if ((update.newStatus as string) === 'DRIVER_ASSIGNED') return;

      const driverStatuses: OrderStatus[] = ['OUT_FOR_DELIVERY', 'DELIVERED'];
      const byDriver = driverStatuses.includes(update.newStatus);
      this.order = {
        ...this.order,
        status: update.newStatus,
        ...(byDriver
          ? { driverStatus: update.newStatus }
          : { restaurantStatus: update.newStatus }),
      };
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
    // Once driver has taken over, all restaurant steps are complete
    if (this.order?.driverStatus) return 'completed';
    const r = this.order?.restaurantStatus
      ? (RESTAURANT_RANK[this.order.restaurantStatus] ?? 0) : 0;
    if (r > requiredRank) return 'completed';
    if (r === requiredRank) return 'active';
    return 'pending';
  }

  // Driver timeline — driven by order.driverStatus directly
  driverStep(requiredRank: number): StepState {
    const r = this.order?.driverStatus
      ? (DRIVER_RANK[this.order.driverStatus] ?? 0) : 0;
    if (r > requiredRank) return 'completed';
    if (r === requiredRank) return 'active';
    return 'pending';
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

  // ── Rating ─────────────────────────────────────────────────────────

  openRating() { this.showRating = true; this.selectedStar = 0; this.hoverStar = 0; }
  cancelRating() { this.showRating = false; }
  selectStar(n: number) { this.selectedStar = n; }
  hoverRating(n: number) { this.hoverStar = n; }
  activeStar() { return this.hoverStar || this.selectedStar; }

  submitRating() {
    if (!this.order || this.selectedStar === 0 || this.submitting) return;
    this.submitting = true;
    forkJoin([
      this.homeService.rateRestaurant(this.order.restaurantId!, this.selectedStar, this.order.id),
      this.orderService.markOrderRated(this.order.id),
    ]).subscribe({
      next: () => {
        this.order = { ...this.order!, rated: true };
        this.showRating = false;
        this.submitting = false;
        this.toastr.success('Thanks for rating! ⭐');
      },
      error: () => {
        this.toastr.error('Could not submit rating.');
        this.submitting = false;
      },
    });
  }
}
