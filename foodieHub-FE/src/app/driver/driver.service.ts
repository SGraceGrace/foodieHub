import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../model/apiResponse.model';
import { Order } from '../model/order.model';
import { PaginatedResponse } from '../model/restaurant.model';

export interface DayEarning {
  dayLabel:    string;   // "Mon"
  dateLabel:   string;   // "26 May"
  amount:      number;
  deliveries:  number;
  isToday:     boolean;
}

export interface DriverEarnings {
  todayAmount:           number;
  todayDeliveries:       number;
  weekAmount:            number;
  weekDeliveries:        number;
  allTimeAmount:         number;
  allTimeDeliveries:     number;
  avgEarningPerDelivery: number;
  weeklyBreakdown:       DayEarning[];
  // Performance stats
  cancelledDeliveries:   number;
  completionRate:        number;  // 0-100
  avgRating:             number;  // 0-5
  ratingCount:           number;
}

export interface DriverRegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  vehicleType: string;
  licenseNumber: string;
  bankAccount: string;
  password: string;
}

export interface DriverProfileData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  vehicleType: string;
  licenseNumber: string;
  bankAccount: string;
  status: string;
  online: boolean;
}

export interface DriverProfileUpdatePayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  vehicleType?: string;
  licenseNumber?: string;
  bankAccount?: string;
}

export interface DriverOrderNotification {
  id: string;
  orderId: string;
  restaurantName: string;
  deliveryAddress: string;
  itemCount: number;
  earnAmount: number;
  itemNames: string[];
  read: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class DriverService {
  private base = `${environment.apiBaseUrl}/api/v1/driver`;

  constructor(private http: HttpClient, private ngZone: NgZone) {}

  register(payload: DriverRegisterRequest): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.base}/register`, payload);
  }

  setAvailability(online: boolean): Observable<ApiResponse<{ online: boolean }>> {
    return this.http.patch<ApiResponse<{ online: boolean }>>(`${this.base}/availability`, { online });
  }

  updateLocation(lat: number, lng: number): Observable<ApiResponse<null>> {
    return this.http.patch<ApiResponse<null>>(`${this.base}/location`, { lat, lng });
  }

  getProfile(): Observable<ApiResponse<DriverProfileData>> {
    return this.http.get<ApiResponse<DriverProfileData>>(`${this.base}/profile`);
  }

  updateProfile(payload: DriverProfileUpdatePayload): Observable<ApiResponse<DriverProfileData>> {
    return this.http.patch<ApiResponse<DriverProfileData>>(`${this.base}/profile`, payload);
  }

  // ── Order actions ───────────────────────────────────────────────────

  /**
   * Driver claims an order — stores their email on the order document.
   * Returns 409 if another driver already accepted it.
   */
  acceptOrder(orderId: string): Observable<any> {
    return this.http.patch(`${environment.apiBaseUrl}/api/orders/${orderId}/accept`, {});
  }

  /**
   * Driver updates the order status.
   * READY → OUT_FOR_DELIVERY (picked up) → DELIVERED
   */
  updateOrderStatus(orderId: string, status: 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED'): Observable<any> {
    return this.http.patch(`${environment.apiBaseUrl}/api/orders/${orderId}/driver-status`, { status });
  }

  // ── Notifications ───────────────────────────────────────────────────

  getNotifications(): Observable<ApiResponse<DriverOrderNotification[]>> {
    return this.http.get<ApiResponse<DriverOrderNotification[]>>(`${this.base}/notifications`);
  }

  markAllRead(): Observable<ApiResponse<null>> {
    return this.http.put<ApiResponse<null>>(`${this.base}/notifications/read-all`, {});
  }

  clearAllNotifications(): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.base}/notifications`);
  }

  /**
   * Fetches all unassigned active orders from order-service.
   * This is the source of truth for the Available Orders tab — completely separate
   * from the driver notification bell (which reads from notification-service).
   */
  getAvailableOrders(): Observable<ApiResponse<Order[]>> {
    return this.http.get<ApiResponse<Order[]>>(`${environment.apiBaseUrl}/api/orders/available`);
  }

  /**
   * Returns the driver's own current in-progress order (accepted but not yet delivered).
   * Used to restore active delivery state after a page refresh.
   * Returns null in data when the driver has no active delivery.
   */
  getActiveOrder(): Observable<ApiResponse<Order | null>> {
    return this.http.get<ApiResponse<Order | null>>(`${environment.apiBaseUrl}/api/orders/driver/active`);
  }

  /**
   * Paginated delivery history for the driver — DELIVERED + CANCELLED orders.
   */
  getDriverHistory(page: number, size: number): Observable<ApiResponse<PaginatedResponse<Order>>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<ApiResponse<PaginatedResponse<Order>>>(
      `${environment.apiBaseUrl}/api/orders/driver/history`, { params }
    );
  }

  /**
   * Earnings summary — today, this week, all-time, and per-day weekly breakdown.
   */
  getDriverEarnings(): Observable<ApiResponse<DriverEarnings>> {
    return this.http.get<ApiResponse<DriverEarnings>>(
      `${environment.apiBaseUrl}/api/orders/driver/earnings`
    );
  }

  /**
   * Opens an SSE connection to receive real-time driver order notifications.
   * Returns an AbortController — call controller.abort() to close the stream.
   * The callback fires inside NgZone.run() so Angular change detection triggers.
   */
  connectDriverSSE(token: string, onMessage: (n: DriverOrderNotification) => void): AbortController {
    const controller = new AbortController();
    const url = `${this.base}/notifications/stream`;

    fetch(url, {
      headers: { Authorization: token },
      signal: controller.signal,
    }).then(async (res) => {
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              const notification: DriverOrderNotification = JSON.parse(line.slice(5).trim());
              this.ngZone.run(() => onMessage(notification));
            } catch { /* ignore parse errors */ }
          }
        }
      }
    }).catch(err => {
      if (err.name !== 'AbortError') {
        console.warn('[DriverSSE] stream error:', err.message);
      }
    });

    return controller;
  }
}
