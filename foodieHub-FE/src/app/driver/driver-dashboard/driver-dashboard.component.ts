import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { DriverHeaderComponent } from '../driver-header/driver-header.component';
import { DriverService, DriverProfileData, DriverOrderNotification, DriverEarnings, DayEarning } from '../driver.service';
import { Order } from '../../model/order.model';

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
  /** Order lifecycle status — PLACED means restaurant hasn't confirmed yet */
  status: string;
}

export interface DeliveryHistoryItem {
  id: string;
  restaurantName: string;
  deliveryAddress: string;
  items: string[];
  earnAmount: number;
  totalAmount: number;
  completedAt: Date;
  status: 'DELIVERED' | 'CANCELLED';
  driverRating?: number;
}

export interface DriverStats {
  totalDeliveries: number;
  completionRate: number;
  cancellationRate: number;
  rating: number;
  ratingCount: number;
}

export interface DriverProfile {
  fullName: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  vehicleType: string;
  licenseNumber: string;
  bankAccount: string;
  verificationStatus: string;
}

@Component({
  selector: 'app-driver-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, DriverHeaderComponent],
  templateUrl: './driver-dashboard.component.html',
  styleUrl: './driver-dashboard.component.scss',
})
export class DriverDashboardComponent implements OnInit, OnDestroy {
  activeTab: DashboardTab = 'dashboard';
  isOnline = false;

  // Available orders
  availableOrders: DriverOrder[] = [];
  loadingOrders = false;
  selectedOrder: DriverOrder | null = null;
  showOrderModal = false;

  // Active delivery
  activeOrder: DriverOrder | null = null;
  activeStep: 'pickup' | 'enroute' | 'delivery' | null = null;

  // History
  deliveryHistory: DeliveryHistoryItem[] = [];
  historyLoading = false;
  historyPagination = { currentPage: 0, totalPages: 0, totalElements: 0, pageSize: 10 };

  // Recent deliveries — shown on earnings tab (last 5, loaded separately)
  recentDeliveries: DeliveryHistoryItem[] = [];
  recentLoading = false;

  // Earnings
  earnings: DriverEarnings = {
    todayAmount: 0, todayDeliveries: 0,
    weekAmount: 0, weekDeliveries: 0,
    allTimeAmount: 0, allTimeDeliveries: 0,
    avgEarningPerDelivery: 0,
    weeklyBreakdown: [],
    cancelledDeliveries: 0,
    completionRate: 0,
    avgRating: 0,
    ratingCount: 0,
  };
  earningsLoading = false;

  // Stats — derived from earnings after API load
  stats: DriverStats = {
    totalDeliveries: 0, completionRate: 0,
    cancellationRate: 0, rating: 0, ratingCount: 0,
  };

  // Profile
  profile: DriverProfile = {
    fullName: '', firstName: '', lastName: '', phone: '', email: '',
    vehicleType: '', licenseNumber: '', bankAccount: '', verificationStatus: 'PENDING',
  };
  editingProfile = false;
  savingProfile = false;
  profileSaveMsg = '';
  profileDraft = { firstName: '', lastName: '', phone: '', vehicleType: '', licenseNumber: '', bankAccount: '' };

  togglingAvailability = false;

  // Location tracking
  private locationWatchId: number | null = null;
  private lastLocationSentAt = 0;
  private lastReverseGeocodedAt = 0;
  private readonly LOCATION_THROTTLE_MS = 10_000;
  private readonly GEOCODE_THROTTLE_MS  = 30_000;
  locationError = '';
  currentLat: number | null = null;
  currentLng: number | null = null;
  currentAddress = '';
  locationUpdatedAt: Date | null = null;

  constructor(
    private toastr: ToastrService,
    private driverService: DriverService,
    private http: HttpClient,
  ) {}

  ngOnInit() {
    const info = localStorage.getItem('driverInfo');
    if (info) {
      const stored = JSON.parse(info);
      this.profile.firstName = stored.firstName ?? '';
      this.profile.lastName  = stored.lastName  ?? '';
      this.profile.fullName  = `${stored.firstName ?? ''} ${stored.lastName ?? ''}`.trim();
      this.profile.phone     = stored.phone  ?? '';
      this.profile.email     = stored.email  ?? '';
      this.profile.verificationStatus = stored.status === 'ACTIVE' ? 'APPROVED' : (stored.status ?? 'PENDING');
    }
    this.loadProfile();
    // Always load earnings and recent deliveries on init — not just when going online
    this.loadDriverEarnings();
    this.loadRecentDeliveries();
  }

  ngOnDestroy() {
    this.stopLocationTracking();
  }

  // ── Computed getters ──────────────────────────────────────────────

  get profileInitials(): string {
    return (this.profile.fullName || 'DR')
      .split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  weeklyBarHeight(day: DayEarning): number {
    const max = Math.max(...this.earnings.weeklyBreakdown.map(d => d.amount), 1);
    return Math.round((day.amount / max) * 100);
  }

  get historyDeliveredCount(): number {
    return this.deliveryHistory.filter(h => h.status === 'DELIVERED').length;
  }
  get historyCancelledCount(): number {
    return this.deliveryHistory.filter(h => h.status === 'CANCELLED').length;
  }
  get historyPageInfo(): string {
    const { currentPage, pageSize, totalElements } = this.historyPagination;
    const from = currentPage * pageSize + 1;
    const to   = Math.min((currentPage + 1) * pageSize, totalElements);
    return `Showing ${from}–${to} of ${totalElements}`;
  }

  // ── Navigation ────────────────────────────────────────────────────

  goTab(tab: DashboardTab) {
    this.activeTab = tab;
    if (tab === 'orders') {
      if (!this.isOnline) {
        this.toastr.info('Go online to see available orders.');
      } else {
        this.loadAvailableOrders();
      }
    }
    if (tab === 'history') {
      this.historyPagination.currentPage = 0;
      this.loadDriverHistory();
    }
    if (tab === 'earnings') {
      this.loadDriverEarnings();
      this.loadRecentDeliveries();
    }
    if (tab === 'profile') {
      this.loadProfile();
      this.editingProfile = false;
    }
  }

  // ── Available orders ──────────────────────────────────────────────

  loadAvailableOrders() {
    if (!this.isOnline) return;
    this.loadingOrders = true;
    this.driverService.getAvailableOrders().subscribe({
      next: res => {
        this.loadingOrders = false;
        const orders: Order[] = res.data ?? [];
        const existingIds = new Set(this.availableOrders.map(o => o.id));
        const fetched: DriverOrder[] = orders
          .filter(o => !existingIds.has(o.id))
          .map(o => ({
            id:                o.id,
            restaurantName:    o.restaurantName,
            restaurantAddress: '',
            deliveryAddress:   o.deliveryAddress ?? '',
            distanceKm:        0,
            estimatedMinutes:  0,
            earnAmount:        Math.round((o.totalAmount ?? 0) * 0.15),
            items:             o.items.map(i => `${i.name} ×${i.qty}`),
            placedAt:          new Date(o.createdAt),
            status:            o.status as string,
          }));
        this.availableOrders = [...this.availableOrders, ...fetched];
      },
      error: () => { this.loadingOrders = false; },
    });
  }

  // ── Online / offline ──────────────────────────────────────────────

  goOnline() {
    if (!navigator.geolocation) {
      this.toastr.error('Your browser does not support location. Cannot go online.');
      return;
    }
    this.togglingAvailability = true;
    this.locationError = '';
    navigator.geolocation.getCurrentPosition(
      () => {
        this.driverService.setAvailability(true).subscribe({
          next: () => {
            this.isOnline = true;
            this.togglingAvailability = false;
            this.toastr.success('You are now online. Receiving orders...');
            this.startLocationTracking();
            this.loadAvailableOrders();
          },
          error: () => {
            this.togglingAvailability = false;
            this.toastr.error('Failed to go online. Please try again.');
          },
        });
      },
      (err) => {
        this.togglingAvailability = false;
        if (err.code === err.PERMISSION_DENIED) {
          this.locationError = 'Location permission denied. Please allow location access to go online.';
          this.toastr.error('Location permission required to go online.');
        } else {
          this.locationError = 'Unable to get location. Please check your device settings.';
          this.toastr.error('Could not get your location. Please try again.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  goOffline() {
    this.togglingAvailability = true;
    this.driverService.setAvailability(false).subscribe({
      next: () => {
        this.isOnline = false;
        this.availableOrders = [];
        this.togglingAvailability = false;
        this.locationError = '';
        this.stopLocationTracking();
        this.toastr.info('You are now offline.');
      },
      error: () => {
        this.togglingAvailability = false;
        this.toastr.error('Failed to go offline. Please try again.');
      },
    });
  }

  // ── Location ──────────────────────────────────────────────────────

  private startLocationTracking() {
    this.stopLocationTracking();
    this.locationWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        const { latitude, longitude } = pos.coords;
        this.currentLat        = latitude;
        this.currentLng        = longitude;
        this.locationUpdatedAt = new Date();
        if (now - this.lastReverseGeocodedAt >= this.GEOCODE_THROTTLE_MS) {
          this.lastReverseGeocodedAt = now;
          this.reverseGeocode(latitude, longitude);
        }
        if (now - this.lastLocationSentAt < this.LOCATION_THROTTLE_MS) return;
        this.lastLocationSentAt = now;
        this.driverService.updateLocation(latitude, longitude).subscribe({
          error: () => console.warn('Location update failed — will retry on next position change.')
        });
      },
      (err) => console.warn('Location watch error:', err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  }

  private stopLocationTracking() {
    if (this.locationWatchId !== null) {
      navigator.geolocation.clearWatch(this.locationWatchId);
      this.locationWatchId = null;
    }
    this.currentLat        = null;
    this.currentLng        = null;
    this.currentAddress    = '';
    this.locationUpdatedAt = null;
  }

  private reverseGeocode(lat: number, lng: number) {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    this.http.get<any>(url).subscribe({
      next: (res) => {
        if (res?.display_name) {
          const parts: string[] = res.display_name.split(',').map((s: string) => s.trim());
          this.currentAddress = parts.slice(0, 3).join(', ');
        }
      },
      error: () => {}
    });
  }

  // ── Profile ───────────────────────────────────────────────────────

  loadProfile() {
    this.driverService.getProfile().subscribe({
      next: res => { if (res.data) this.applyProfileFromApi(res.data); },
    });
  }

  private applyProfileFromApi(d: DriverProfileData) {
    this.profile = {
      firstName:          d.firstName  ?? '',
      lastName:           d.lastName   ?? '',
      fullName:           `${d.firstName ?? ''} ${d.lastName ?? ''}`.trim(),
      phone:              d.phone      ?? '',
      email:              d.email      ?? '',
      vehicleType:        d.vehicleType   ?? '',
      licenseNumber:      d.licenseNumber ?? '',
      bankAccount:        d.bankAccount   ?? '',
      verificationStatus: d.status === 'ACTIVE' ? 'APPROVED' : (d.status ?? 'PENDING'),
    };
    const wasOnline = this.isOnline;
    this.isOnline = d.online ?? false;
    if (this.isOnline && !wasOnline) {
      if (navigator.geolocation) this.startLocationTracking();
      this.loadAvailableOrders();
      this.loadActiveOrder();
      this.loadDriverEarnings();
      this.loadRecentDeliveries();
    }
  }

  loadActiveOrder() {
    this.driverService.getActiveOrder().subscribe({
      next: res => {
        const order = res.data;
        if (!order) return;
        this.activeOrder = {
          id:                order.id,
          restaurantName:    order.restaurantName,
          restaurantAddress: '',
          deliveryAddress:   order.deliveryAddress ?? '',
          distanceKm:        0,
          estimatedMinutes:  0,
          // Use stored driverEarnings if set, fall back to 15% estimate for legacy orders
          earnAmount:        order.driverEarnings ?? Math.round((order.totalAmount ?? 0) * 0.15),
          items:             order.items.map(i => `${i.name} ×${i.qty}`),
          placedAt:          new Date(order.createdAt),
          status:            order.status as string,
        };
        switch (order.driverStatus as string) {
          case 'DRIVER_ASSIGNED':  this.activeStep = 'pickup';   break;
          case 'PICKED_UP':        this.activeStep = 'enroute';  break;
          case 'OUT_FOR_DELIVERY': this.activeStep = 'delivery'; break;
          default:                 this.activeStep = 'pickup';   break;
        }
      },
      error: () => {}
    });
  }

  openEditProfile() {
    this.profileDraft = {
      firstName:     this.profile.firstName,
      lastName:      this.profile.lastName,
      phone:         this.profile.phone,
      vehicleType:   this.profile.vehicleType,
      licenseNumber: this.profile.licenseNumber,
      bankAccount:   this.profile.bankAccount,
    };
    this.profileSaveMsg = '';
    this.editingProfile = true;
  }

  cancelEditProfile() {
    this.editingProfile = false;
    this.profileSaveMsg = '';
  }

  saveProfile() {
    this.savingProfile = true;
    this.profileSaveMsg = '';
    this.driverService.updateProfile(this.profileDraft).subscribe({
      next: res => {
        if (res.data) this.applyProfileFromApi(res.data);
        this.savingProfile  = false;
        this.editingProfile = false;
        this.profileSaveMsg = 'Profile updated successfully.';
        setTimeout(() => { this.profileSaveMsg = ''; }, 3000);
      },
      error: () => {
        this.savingProfile  = false;
        this.profileSaveMsg = 'Failed to save. Please try again.';
        setTimeout(() => { this.profileSaveMsg = ''; }, 3000);
      },
    });
  }

  // ── Order accept / status ─────────────────────────────────────────

  onNewOrderAlert(notification: DriverOrderNotification) {
    if (this.availableOrders.find(o => o.id === notification.orderId)) return;
    const order: DriverOrder = {
      id:                notification.orderId,
      restaurantName:    notification.restaurantName,
      restaurantAddress: '',
      deliveryAddress:   notification.deliveryAddress ?? '',
      distanceKm:        0,
      estimatedMinutes:  0,
      earnAmount:        notification.earnAmount,
      items:             notification.itemNames ?? [],
      placedAt:          new Date(notification.createdAt),
      status:            'PLACED',
    };
    this.availableOrders = [order, ...this.availableOrders];
  }

  openOrderModal(order: DriverOrder) {
    this.selectedOrder  = order;
    this.showOrderModal = true;
    // Silently refresh status — PLACED may have become CONFIRMED by now
    this.driverService.getAvailableOrders().subscribe({
      next: res => {
        const fresh = (res.data ?? []).find(o => o.id === order.id);
        if (fresh && this.selectedOrder?.id === order.id) {
          this.selectedOrder    = { ...this.selectedOrder, status: fresh.status as string };
          this.availableOrders  = this.availableOrders.map(o =>
            o.id === fresh.id ? { ...o, status: fresh.status as string } : o
          );
        }
      },
    });
  }

  closeOrderModal() {
    this.showOrderModal = false;
    this.selectedOrder  = null;
  }

  acceptOrder() {
    if (!this.selectedOrder) return;
    const order = this.selectedOrder;
    this.driverService.acceptOrder(order.id).subscribe({
      next: () => {
        this.activeOrder = order;
        this.activeStep  = 'pickup';
        this.availableOrders = this.availableOrders.filter(o => o.id !== order.id);
        this.closeOrderModal();
        this.activeTab = 'active';
        this.toastr.success('Order accepted! Navigate to restaurant.');
      },
      error: (err) => {
        if (err.status === 409) {
          const msg: string = err.error?.message ?? '';
          if (msg.toLowerCase().includes('not confirmed')) {
            this.toastr.warning('⏳ The restaurant hasn\'t confirmed this order yet. Please wait and try again.');
          } else {
            this.availableOrders = this.availableOrders.filter(o => o.id !== order.id);
            this.closeOrderModal();
            this.toastr.warning('Sorry, another driver already accepted this order.');
          }
        } else {
          this.toastr.error('Failed to accept order. Please try again.');
        }
      },
    });
  }

  rejectOrder() {
    this.closeOrderModal();
    this.toastr.info('Order skipped.');
  }

  markPickedUp() {
    if (!this.activeOrder) return;
    this.driverService.updateOrderStatus(this.activeOrder.id, 'PICKED_UP').subscribe({
      next:  () => { this.activeStep = 'enroute'; this.toastr.success('Order picked up!'); },
      error: () => { this.toastr.error('Failed to update status. Please try again.'); },
    });
  }

  markOutForDelivery() {
    if (!this.activeOrder) return;
    this.driverService.updateOrderStatus(this.activeOrder.id, 'OUT_FOR_DELIVERY').subscribe({
      next:  () => { this.activeStep = 'delivery'; this.toastr.success('On the way! Customer has been notified. 🛵'); },
      error: () => { this.toastr.error('Failed to update status. Please try again.'); },
    });
  }

  markDelivered() {
    if (!this.activeOrder) return;
    const order = this.activeOrder;
    this.driverService.updateOrderStatus(order.id, 'DELIVERED').subscribe({
      next: () => {
        this.toastr.success('Order delivered! Great work. 🎉');
        this.activeOrder = null;
        this.activeStep  = null;
        this.activeTab   = 'dashboard';
        // Refresh earnings + recent deliveries after completing a delivery
        this.loadDriverEarnings();
        this.loadRecentDeliveries();
      },
      error: () => { this.toastr.error('Failed to mark as delivered. Please try again.'); },
    });
  }

  // ── Earnings ─────────────────────────────────────────────────────

  loadDriverEarnings() {
    this.earningsLoading = true;
    this.driverService.getDriverEarnings().subscribe({
      next: res => {
        if (res.data) {
          this.earnings = res.data;
          // Sync the stats object so the dashboard Performance grid is populated
          this.stats.totalDeliveries  = res.data.allTimeDeliveries;
          this.stats.completionRate   = res.data.completionRate;
          this.stats.cancellationRate = res.data.allTimeDeliveries + res.data.cancelledDeliveries > 0
            ? Math.round(res.data.cancelledDeliveries /
                (res.data.allTimeDeliveries + res.data.cancelledDeliveries) * 100)
            : 0;
          this.stats.rating      = res.data.avgRating;
          this.stats.ratingCount = res.data.ratingCount;
        }
        this.earningsLoading = false;
      },
      error: () => { this.earningsLoading = false; },
    });
  }

  // ── History ───────────────────────────────────────────────────────

  private mapOrderToHistory(o: Order): DeliveryHistoryItem {
    return {
      id:              o.id,
      restaurantName:  o.restaurantName,
      deliveryAddress: o.deliveryAddress ?? '—',
      items:           o.items.map(i => `${i.name} ×${i.qty}`),
      // Use stored driverEarnings (frozen at accept time); fall back for legacy orders
      earnAmount:      o.driverEarnings ?? Math.round((o.totalAmount ?? 0) * 0.15),
      totalAmount:     o.totalAmount ?? 0,
      completedAt:     new Date(o.updatedAt ?? o.createdAt),
      status:          o.status as 'DELIVERED' | 'CANCELLED',
      driverRating:    o.driverRating,
    };
  }

  loadRecentDeliveries() {
    this.recentLoading = true;
    this.driverService.getDriverHistory(0, 5).subscribe({
      next: res => {
        this.recentDeliveries = (res.data?.content ?? []).map(o => this.mapOrderToHistory(o));
        this.recentLoading    = false;
      },
      error: () => { this.recentLoading = false; },
    });
  }

  loadDriverHistory() {
    this.historyLoading = true;
    this.driverService.getDriverHistory(
      this.historyPagination.currentPage,
      this.historyPagination.pageSize
    ).subscribe({
      next: res => {
        const p = res.data;
        this.deliveryHistory = (p?.content ?? []).map(o => this.mapOrderToHistory(o));
        this.historyPagination = {
          currentPage:   p?.currentPage   ?? 0,
          totalPages:    p?.totalPages    ?? 0,
          totalElements: p?.totalElements ?? 0,
          pageSize:      p?.pageSize      ?? 10,
        };
        this.historyLoading = false;
      },
      error: () => {
        this.historyLoading = false;
        this.toastr.error('Failed to load delivery history.');
      },
    });
  }

  prevHistoryPage() {
    if (this.historyPagination.currentPage > 0) {
      this.historyPagination.currentPage--;
      this.loadDriverHistory();
    }
  }

  nextHistoryPage() {
    if (this.historyPagination.currentPage < this.historyPagination.totalPages - 1) {
      this.historyPagination.currentPage++;
      this.loadDriverHistory();
    }
  }
}
