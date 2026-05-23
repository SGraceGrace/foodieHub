import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Order, OrderStatus } from '../../model/order.model';
import { ToastrService } from 'ngx-toastr';

type Tab = 'ALL' | 'ACTIVE' | 'DELIVERED' | 'CANCELLED';

const ACTIVE_STATUSES: OrderStatus[] = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY'];

const TRACK_STEPS = ['Placed', 'Confirmed', 'Prepared', 'Ready', 'Delivered'];

const STATUS_ORDER: Record<OrderStatus, number> = {
  PLACED: 0, CONFIRMED: 1, PREPARING: 2, READY: 3, DELIVERED: 4, CANCELLED: -1,
};

// Mock data — will be replaced with real API call
const MOCK_ORDERS: Order[] = [
  {
    id: 'FH-2025-4821',
    restaurantName: 'Spice Garden',
    items: [
      { name: 'Butter Chicken', qty: 2, price: 340 },
      { name: 'Naan', qty: 1, price: 50 },
      { name: 'Mango Lassi', qty: 1, price: 100 },
    ],
    status: 'READY',
    totalAmount: 730,
    createdAt: 'Today, 2:30 PM',
  },
  {
    id: 'FH-2025-4790',
    restaurantName: 'Bella Italia',
    items: [
      { name: 'Margherita Pizza', qty: 1, price: 349 },
      { name: 'Garlic Bread', qty: 2, price: 99 },
    ],
    status: 'DELIVERED',
    totalAmount: 548,
    createdAt: 'Yesterday, 7:45 PM',
  },
  {
    id: 'FH-2025-4756',
    restaurantName: 'Burger Bros',
    items: [
      { name: 'Classic Burger', qty: 2, price: 199 },
      { name: 'Fries', qty: 2, price: 99 },
      { name: 'Coke', qty: 2, price: 60 },
    ],
    status: 'DELIVERED',
    totalAmount: 798,
    createdAt: 'Dec 10, 1:20 PM',
  },
  {
    id: 'FH-2025-4700',
    restaurantName: 'Tokyo Bites',
    items: [
      { name: 'Dragon Roll', qty: 1, price: 450 },
      { name: 'Miso Soup', qty: 2, price: 80 },
    ],
    status: 'CANCELLED',
    totalAmount: 530,
    createdAt: 'Dec 8, 6:10 PM',
  },
];

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss',
})
export class OrdersComponent implements OnInit {
  allOrders: Order[] = MOCK_ORDERS;
  filtered: Order[] = [];
  activeTab: Tab = 'ALL';
  tabs: { key: Tab; label: string }[] = [
    { key: 'ALL',       label: 'All Orders' },
    { key: 'ACTIVE',    label: 'Active' },
    { key: 'DELIVERED', label: 'Delivered' },
    { key: 'CANCELLED', label: 'Cancelled' },
  ];

  trackSteps = TRACK_STEPS;

  constructor(private toastr: ToastrService) {}

  ngOnInit() {
    this.applyTab('ALL');
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
