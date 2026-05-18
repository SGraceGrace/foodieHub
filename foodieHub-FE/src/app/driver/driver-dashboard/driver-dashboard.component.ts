import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { DriverHeaderComponent } from '../driver-header/driver-header.component';

export type DashboardTab = 'dashboard' | 'orders' | 'active' | 'history' | 'earnings' | 'profile';

export interface DriverOrder {
  id: string;
  restaurantName: string;
  restaurantAddress: string;
  deliveryAddress: string;
  distanceKm: number;
  estimatedMinutes: number;
  earnAmount: number;
  items: string[];
  placedAt: Date;
}

export interface DeliveryHistoryItem {
  id: string;
  restaurantName: string;
  deliveryAddress: string;
  distanceKm: number;
  timeTakenMinutes: number;
  earnAmount: number;
  deliveredAt: Date;
  status: 'DELIVERED' | 'CANCELLED';
}

export interface DriverStats {
  totalDeliveries: number;
  completionRate: number;
  cancellationRate: number;
  avgDeliveryMinutes: number;
  rating: number;
  ratingCount: number;
}

export interface DriverEarnings {
  todayAmount: number;
  todayDeliveries: number;
  weekAmount: number;
  weekDeliveries: number;
  weekBonus: number;
  nextPayoutAmount: number;
  nextPayoutDate: string | null;
  baseFeeTotal: number;
  tipsTotal: number;
  bonusTotal: number;
}

export interface DriverProfile {
  fullName: string;
  phone: string;
  email: string;
  vehicleType: string;
  licenseNumber: string;
  verificationStatus: string;
}

@Component({
  selector: 'app-driver-dashboard',
  standalone: true,
  imports: [CommonModule, DriverHeaderComponent],
  templateUrl: './driver-dashboard.component.html',
  styleUrl: './driver-dashboard.component.scss',
})
export class DriverDashboardComponent implements OnInit {
  activeTab: DashboardTab = 'dashboard';
  isOnline = false;

  // Available orders (loaded from API when online)
  availableOrders: DriverOrder[] = [];
  selectedOrder: DriverOrder | null = null;
  showOrderModal = false;

  // Active delivery
  activeOrder: DriverOrder | null = null;
  activeStep: 'pickup' | 'delivery' | null = null;

  // History
  deliveryHistory: DeliveryHistoryItem[] = [];
  historyPagination = { currentPage: 0, totalPages: 0, totalElements: 0, pageSize: 10 };

  // Earnings
  earnings: DriverEarnings = {
    todayAmount: 0, todayDeliveries: 0,
    weekAmount: 0, weekDeliveries: 0, weekBonus: 0,
    nextPayoutAmount: 0, nextPayoutDate: null,
    baseFeeTotal: 0, tipsTotal: 0, bonusTotal: 0,
  };

  // Stats
  stats: DriverStats = {
    totalDeliveries: 0, completionRate: 0,
    cancellationRate: 0, avgDeliveryMinutes: 0,
    rating: 0, ratingCount: 0,
  };

  // Profile
  profile: DriverProfile = {
    fullName: '', phone: '', email: '',
    vehicleType: '', licenseNumber: '', verificationStatus: 'PENDING',
  };

  constructor(private toastr: ToastrService) {}

  ngOnInit() {
    // TODO: load driver profile, earnings, stats from API
    const info = localStorage.getItem('driverInfo');
    if (info) {
      const stored = JSON.parse(info);
      this.profile.fullName = `${stored.firstName ?? ''} ${stored.lastName ?? ''}`.trim();
      this.profile.phone = stored.phone ?? '';
      this.profile.email = stored.email ?? '';
      this.profile.vehicleType = stored.vehicleType ?? '';
      this.profile.licenseNumber = stored.licenseNumber ?? '';
      this.profile.verificationStatus = stored.status === 'ACTIVE' ? 'APPROVED' : (stored.status ?? 'PENDING');
    }
  }

  get profileInitials(): string {
    return (this.profile.fullName || 'DR')
      .split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  goTab(tab: DashboardTab) {
    this.activeTab = tab;
    if (tab === 'orders' && !this.isOnline) {
      this.toastr.info('Go online to see available orders.');
    }
    if (tab === 'history') {
      // TODO: load delivery history from API
    }
    if (tab === 'earnings') {
      // TODO: load earnings from API
    }
  }

  goOnline() {
    this.isOnline = true;
    this.toastr.success('You are now online. Receiving orders...');
    // TODO: notify server driver is online
  }

  goOffline() {
    this.isOnline = false;
    this.availableOrders = [];
    this.toastr.info('You are now offline.');
    // TODO: notify server driver is offline
  }

  openOrderModal(order: DriverOrder) {
    this.selectedOrder = order;
    this.showOrderModal = true;
  }

  closeOrderModal() {
    this.showOrderModal = false;
    this.selectedOrder = null;
  }

  acceptOrder() {
    if (!this.selectedOrder) return;
    this.activeOrder = this.selectedOrder;
    this.activeStep = 'pickup';
    this.availableOrders = this.availableOrders.filter(o => o.id !== this.selectedOrder!.id);
    this.closeOrderModal();
    this.activeTab = 'active';
    this.toastr.success('Order accepted! Navigate to restaurant.');
    // TODO: call API to accept order
  }

  rejectOrder() {
    this.closeOrderModal();
    this.toastr.info('Order skipped.');
    // TODO: call API to reject/skip order
  }

  markPickedUp() {
    this.activeStep = 'delivery';
    this.toastr.success('Order picked up! Heading to customer.');
    // TODO: update order status via API
  }

  markDelivered() {
    if (!this.activeOrder) return;
    this.toastr.success('Order delivered! Great work.');
    this.activeOrder = null;
    this.activeStep = null;
    this.activeTab = 'dashboard';
    // TODO: update order status via API, refresh earnings
  }

  prevHistoryPage() {
    if (this.historyPagination.currentPage > 0) {
      this.historyPagination.currentPage--;
      // TODO: load history page
    }
  }

  nextHistoryPage() {
    if (this.historyPagination.currentPage < this.historyPagination.totalPages - 1) {
      this.historyPagination.currentPage++;
      // TODO: load history page
    }
  }
}
