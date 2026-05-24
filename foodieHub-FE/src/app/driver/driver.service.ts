import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../model/apiResponse.model';

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
