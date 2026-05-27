import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../model/apiResponse.model';
import { Order } from '../model/order.model';
import { PaginatedResponse } from '../model/restaurant.model';
import { TokenService } from '../core/shared/token.service';

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

  constructor(private http: HttpClient, private ngZone: NgZone, private tokenService: TokenService) {}

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
   * Opens an authenticated SSE stream to receive real-time driver order notifications.
   * Reads a fresh token from TokenService on every reconnect — never retries with an expired token.
   * Auto-reconnects on connection drop (3s delay on natural close, 5s on error).
   * Returns an AbortController — call controller.abort() to close the stream.
   */
  connectDriverSSE(onMessage: (n: DriverOrderNotification) => void): AbortController {
    const controller = new AbortController();
    this._streamDriverSSE(onMessage, controller);
    return controller;
  }

  private async _streamDriverSSE(
    onMessage: (n: DriverOrderNotification) => void,
    controller: AbortController
  ): Promise<void> {
    const url = `${this.base}/notifications/stream`;
    let token = this.tokenService.getAccessToken() ?? '';
    while (!controller.signal.aborted) {
      try {
        const res = await fetch(url, {
          headers: { Authorization: token },
          signal: controller.signal,
        });

        if (res.status === 401) {
          // Token may have been refreshed by another HTTP call — pick it up and retry once
          const fresh = this.tokenService.getAccessToken();
          if (fresh && fresh !== token) { token = fresh; continue; }
          return; // no fresher token available — user must re-login
        }

        if (!res.ok || !res.body) {
          await new Promise(r => setTimeout(r, 5000));
          continue;
        }

        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer    = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';
          for (const part of parts) {
            const dataLine = part.split('\n').find(l => l.startsWith('data:'));
            if (dataLine) {
              try {
                const notification: DriverOrderNotification = JSON.parse(dataLine.slice(5).trim());
                this.ngZone.run(() => onMessage(notification));
              } catch { /* ignore parse errors */ }
            }
          }
        }
        // Stream closed naturally — wait before reconnecting
        await new Promise(r => setTimeout(r, 3000));
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        console.warn('[DriverSSE] stream error, retrying in 5s');
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }
}
