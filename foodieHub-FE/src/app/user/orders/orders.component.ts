import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CustomerOrderUpdate, Order, OrderStatus } from '../../model/order.model';
import { ToastrService } from 'ngx-toastr';
import { OrderService } from '../../core/shared/order.service';
import { TokenService } from '../../core/shared/token.service';

// The header component handles the global SSE connection for push notifications
// and the bell badge. The orders page opens its OWN SSE connection solely to
// patch the order tracker in real-time while the user is watching this page.

type Tab = 'ALL' | 'ACTIVE' | 'DELIVERED' | 'CANCELLED';

const ACTIVE_STATUSES: OrderStatus[] = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY'];

const TRACK_STEPS = ['Placed', 'Confirmed', 'Prepared', 'Ready', 'Delivered'];

const STATUS_ORDER: Record<OrderStatus, number> = {
  PLACED: 0, CONFIRMED: 1, PREPARING: 2, READY: 3, DELIVERED: 4, CANCELLED: -1,
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

  private sseController: AbortController | null = null;

  constructor(
    private toastr: ToastrService,
    private orderService: OrderService,
    private tokenService: TokenService
  ) {}

  ngOnInit() {
    this.loadOrders();
    this.connectSSE();
  }

  ngOnDestroy() {
    this.sseController?.abort();
    this.sseController = null;
  }

  // ── Real-time tracker update via SSE ─────────────────────────────
  // Header component handles the bell badge, toast, and browser push.
  // This SSE connection only patches the status in the order list/tracker.

  private connectSSE(): void {
    const token = this.tokenService.getAccessToken();
    if (!token) return;
    this.sseController = this.orderService.connectCustomerSSE(token, (update) => {
      this.allOrders = this.allOrders.map(o =>
        o.id === update.orderId ? { ...o, status: update.newStatus } : o
      );
      this.applyTab(this.activeTab);   // keep active/delivered tabs in sync
    });
  }

  // ── Order loading ─────────────────────────────────────────────────

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
    const orderStep = STATUS_ORDER[order.status];
    if (orderStep < 0) return 'pending';
    if (stepIndex < orderStep) return 'done';
    if (stepIndex === orderStep) return 'curr';
    return 'pending';
  }

  statusBadgeClass(status: OrderStatus): string {
    const map: Record<OrderStatus, string> = {
      PLACED:    'sb-placed',
      CONFIRMED: 'sb-confirmed',
      PREPARING: 'sb-preparing',
      READY:     'sb-onway',
      DELIVERED: 'sb-delivered',
      CANCELLED: 'sb-cancelled',
    };
    return map[status] ?? '';
  }

  statusLabel(status: OrderStatus): string {
    const map: Record<OrderStatus, string> = {
      PLACED:    '🕐 Placed',
      CONFIRMED: '✅ Confirmed',
      PREPARING: '👨‍🍳 Preparing',
      READY:     '🛵 On the way',
      DELIVERED: '✓ Delivered',
      CANCELLED: '✕ Cancelled',
    };
    return map[status] ?? status;
  }

  trackOrder(order: Order) {
    this.toastr.info(`Tracking order #${order.id}`);
  }

  reorder(order: Order) {
    this.toastr.success(`Added items from ${order.restaurantName} to cart!`);
  }

  rateOrder(order: Order) {
    this.toastr.info('Rating feature coming soon!');
  }
}
