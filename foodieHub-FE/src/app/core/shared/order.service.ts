import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CustomerOrderUpdate, Order, RestaurantOrderNotification, RestaurantStats } from '../../model/order.model';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../model/apiResponse.model';
import { PaginatedResponse } from '../../model/restaurant.model';

export interface PlaceOrderPayload {
  restaurantId: string;
  deliveryAddress: string;
  customerName: string;
}

@Injectable({ providedIn: 'root' })
export class OrderService {

  private base     = environment.apiBaseUrl;           // http://localhost:8080
  private notifBase = environment.apiBaseUrl;          // notifications route via gateway

  constructor(private http: HttpClient) {}

  // ── Order APIs ───────────────────────────────────────────────────

  placeOrder(payload: PlaceOrderPayload): Observable<ApiResponse<Order>> {
    return this.http.post<ApiResponse<Order>>(`${this.base}/api/orders`, payload);
  }

  getOrders(): Observable<ApiResponse<Order[]>> {
    return this.http.get<ApiResponse<Order[]>>(`${this.base}/api/orders`);
  }

  getOrder(id: string): Observable<ApiResponse<Order>> {
    return this.http.get<ApiResponse<Order>>(`${this.base}/api/orders/${id}`);
  }

  /** Restaurant partner: get live/active orders (no pagination — small list) */
  getRestaurantOrders(restaurantId: string, statuses?: string[]): Observable<ApiResponse<Order[]>> {
    const params = statuses?.length ? `?statuses=${statuses.join(',')}` : '';
    return this.http.get<ApiResponse<Order[]>>(
      `${this.base}/api/orders/restaurant/${restaurantId}${params}`
    );
  }

  /** Restaurant partner: full paginated order history for the All Orders tab.
   *  from/to are optional ISO date strings (yyyy-MM-dd). */
  getRestaurantAllOrders(
    restaurantId: string,
    page = 0,
    size = 10,
    from?: string,
    to?: string
  ): Observable<ApiResponse<PaginatedResponse<Order>>> {
    let url = `${this.base}/api/orders/restaurant/${restaurantId}/all?page=${page}&size=${size}`;
    if (from) url += `&from=${from}`;
    if (to)   url += `&to=${to}`;
    return this.http.get<ApiResponse<PaginatedResponse<Order>>>(url);
  }

  /** Restaurant partner: update order status */
  updateOrderStatus(orderId: string, status: string): Observable<ApiResponse<Order>> {
    return this.http.put<ApiResponse<Order>>(
      `${this.base}/api/orders/${orderId}/status`, { status }
    );
  }

  /** Mark order as rated — called after successfully submitting a rating to food-service. */
  markOrderRated(orderId: string): Observable<ApiResponse<Order>> {
    return this.http.patch<ApiResponse<Order>>(`${this.base}/api/orders/${orderId}/rated`, {});
  }

  // ── Customer notification APIs ────────────────────────────────────
  // These mirror the admin (GET /notifications, DELETE /notifications)
  // and restaurant (GET /notifications/{id}, PUT /read-all) patterns.

  /** Fetch stored notification history — called once on UserHeaderComponent init. */
  getCustomerNotifications(): Observable<ApiResponse<CustomerOrderUpdate[]>> {
    return this.http.get<ApiResponse<CustomerOrderUpdate[]>>(
      `${this.notifBase}/api/v1/customer/notifications`
    );
  }

  /** Mark all customer notifications as read — called when the bell panel opens. */
  markAllCustomerNotificationsRead(): Observable<ApiResponse<null>> {
    return this.http.put<ApiResponse<null>>(
      `${this.notifBase}/api/v1/customer/notifications/read-all`, {}
    );
  }

  /** Delete all customer notifications — called by "Clear all" button. */
  clearCustomerNotifications(): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(
      `${this.notifBase}/api/v1/customer/notifications`
    );
  }

  // ── Restaurant notification APIs ─────────────────────────────────

  getRestaurantNotifications(restaurantId: string): Observable<ApiResponse<RestaurantOrderNotification[]>> {
    return this.http.get<ApiResponse<RestaurantOrderNotification[]>>(
      `${this.notifBase}/api/v1/restaurant/notifications/${restaurantId}`
    );
  }

  markAllRead(restaurantId: string): Observable<ApiResponse<null>> {
    return this.http.put<ApiResponse<null>>(
      `${this.notifBase}/api/v1/restaurant/notifications/${restaurantId}/read-all`, {}
    );
  }

  /** Hard-delete all notifications for a restaurant — called by "Clear all" button. */
  clearRestaurantNotifications(restaurantId: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(
      `${this.notifBase}/api/v1/restaurant/notifications/${restaurantId}`
    );
  }

  /** Overview stats for the partner workspace (today's orders/revenue, pending, total). */
  getRestaurantStats(restaurantId: string): Observable<ApiResponse<RestaurantStats>> {
    return this.http.get<ApiResponse<RestaurantStats>>(
      `${this.base}/api/orders/restaurant/${restaurantId}/stats`
    );
  }

  /**
   * Opens an authenticated SSE stream for restaurant order notifications.
   * Uses fetch() instead of EventSource so we can send the Authorization header.
   * Returns an AbortController — call .abort() to close the stream.
   */
  connectRestaurantSSE(
    restaurantId: string,
    token: string,
    onNotification: (n: RestaurantOrderNotification) => void
  ): AbortController {
    const controller = new AbortController();
    this._streamRestaurantSSE(restaurantId, token, onNotification, controller);
    return controller;
  }

  /**
   * Opens an authenticated SSE stream for customer order-status updates.
   * Returns an AbortController — call .abort() to close when the component is destroyed.
   */
  connectCustomerSSE(
    token: string,
    onUpdate: (u: CustomerOrderUpdate) => void
  ): AbortController {
    const controller = new AbortController();
    this._streamCustomerSSE(token, onUpdate, controller);
    return controller;
  }

  private async _streamCustomerSSE(
    token: string,
    onUpdate: (u: CustomerOrderUpdate) => void,
    controller: AbortController
  ): Promise<void> {
    const url = `${this.base}/api/v1/customer/notifications/stream`;
    while (!controller.signal.aborted) {
      try {
        const res = await fetch(url, {
          headers: { Authorization: token },
          signal: controller.signal,
        });

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
                const update: CustomerOrderUpdate = JSON.parse(dataLine.slice(5).trim());
                onUpdate(update);
              } catch { /* malformed event — skip */ }
            }
          }
        }
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }

  private async _streamRestaurantSSE(
    restaurantId: string,
    token: string,
    onNotification: (n: RestaurantOrderNotification) => void,
    controller: AbortController
  ): Promise<void> {
    const url = `${this.base}/api/v1/restaurant/notifications/stream/${restaurantId}`;
    while (!controller.signal.aborted) {
      try {
        const res = await fetch(url, {
          headers: { Authorization: token },
          signal: controller.signal,
        });

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
                const notif: RestaurantOrderNotification =
                  JSON.parse(dataLine.slice(5).trim());
                onNotification(notif);
              } catch { /* malformed event — skip */ }
            }
          }
        }
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        await new Promise(r => setTimeout(r, 5000)); // retry after 5 s
      }
    }
  }
}
