import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { DriverHeaderComponent } from '../driver-header/driver-header.component';
import { DriverService, DriverProfileData, DriverOrderNotification } from '../driver.service';

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
    fullName: '', firstName: '', lastName: '', phone: '', email: '',
    vehicleType: '', licenseNumber: '', bankAccount: '', verificationStatus: 'PENDING',
  };

  // Profile edit
  editingProfile = false;
  savingProfile = false;
  profileSaveMsg = '';
  profileDraft = { firstName: '', lastName: '', phone: '', vehicleType: '', licenseNumber: '', bankAccount: '' };

  togglingAvailability = false;

  // ── Location tracking ─────────────────────────────────────────────
  private locationWatchId: number | null = null;
  private lastLocationSentAt = 0;
  private lastReverseGeocodedAt = 0;
  private readonly LOCATION_THROTTLE_MS  = 10_000;  // send to backend at most every 10s
  private readonly GEOCODE_THROTTLE_MS   = 30_000;  // reverse-geocode at most every 30s
  locationError = '';

  // Displayed in the dashboard card
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
    // Seed basic info from localStorage immediately (fast, no flicker)
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
    // Load full profile from API (includes vehicleType, licenseNumber, bankAccount from driver_profile table)
    this.loadProfile();
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
    if (tab === 'profile') {
      this.loadProfile();
      this.editingProfile = false;
    }
  }

  goOnline() {
    if (!navigator.geolocation) {
      this.toastr.error('Your browser does not support location. Cannot go online.');
      return;
    }
    // Request location permission first — if denied, block going online
    this.togglingAvailability = true;
    this.locationError = '';
    navigator.geolocation.getCurrentPosition(
      () => {
        // Permission granted — now mark online in backend
        this.driverService.setAvailability(true).subscribe({
          next: () => {
            this.isOnline = true;
            this.togglingAvailability = false;
            this.toastr.success('You are now online. Receiving orders...');
            this.startLocationTracking();
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

  private startLocationTracking() {
    this.stopLocationTracking(); // clear any existing watcher
    this.locationWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        const { latitude, longitude } = pos.coords;

        // Always update the displayed values immediately
        this.currentLat       = latitude;
        this.currentLng       = longitude;
        this.locationUpdatedAt = new Date();

        // Reverse-geocode at most every 30s
        if (now - this.lastReverseGeocodedAt >= this.GEOCODE_THROTTLE_MS) {
          this.lastReverseGeocodedAt = now;
          this.reverseGeocode(latitude, longitude);
        }

        // Send to backend at most every 10s
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
    this.currentLat       = null;
    this.currentLng       = null;
    this.currentAddress   = '';
    this.locationUpdatedAt = null;
  }

  private reverseGeocode(lat: number, lng: number) {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    this.http.get<any>(url).subscribe({
      next: (res) => {
        if (res?.display_name) {
          // Trim to neighbourhood + city — full address is too long
          const parts: string[] = res.display_name.split(',').map((s: string) => s.trim());
          this.currentAddress = parts.slice(0, 3).join(', ');
        }
      },
      error: () => { /* non-critical — raw coords still shown */ }
    });
  }

  // ── Profile ───────────────────────────────────────────────────────

  loadProfile() {
    this.driverService.getProfile().subscribe({
      next: res => {
        if (res.data) this.applyProfileFromApi(res.data);
      },
    });
  }

  ngOnDestroy() {
    this.stopLocationTracking();
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
    // Restore online status from DB — so page refresh doesn't reset to offline
    const wasOnline = this.isOnline;
    this.isOnline = d.online ?? false;
    // If driver was online (or just became online via profile load), resume location tracking
    if (this.isOnline && !wasOnline && navigator.geolocation) {
      this.startLocationTracking();
    }
  }

  openEditProfile() {
    this.profileDraft = {
      firstName:    this.profile.firstName,
      lastName:     this.profile.lastName,
      phone:        this.profile.phone,
      vehicleType:  this.profile.vehicleType,
      licenseNumber: this.profile.licenseNumber,
      bankAccount:  this.profile.bankAccount,
    };
    this.profileSaveMsg  = '';
    this.editingProfile  = true;
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

  /**
   * Called by the driver header when a real-time new-order SSE event arrives.
   * Converts the notification into a DriverOrder and prepends it to availableOrders.
   */
  onNewOrderAlert(notification: DriverOrderNotification) {
    // Avoid duplicates (SSE can fire more than once if the stream reconnects)
    if (this.availableOrders.find(o => o.id === notification.orderId)) return;

    const order: DriverOrder = {
      id:                notification.orderId,
      restaurantName:    notification.restaurantName,
      restaurantAddress: '',  // not in event — show restaurant name only
      deliveryAddress:   notification.deliveryAddress ?? '',
      distanceKm:        0,   // TODO: calculate from GPS
      estimatedMinutes:  0,
      earnAmount:        notification.earnAmount,
      items:             notification.itemNames ?? [],
      placedAt:          new Date(notification.createdAt),
    };
    this.availableOrders = [order, ...this.availableOrders];
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
