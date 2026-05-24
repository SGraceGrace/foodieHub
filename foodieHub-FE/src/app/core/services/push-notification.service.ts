import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

const ADMIN_SUBSCRIPTION_URL    = `${environment.apiBaseUrl}/api/v1/admin/push-subscription`;
const CUSTOMER_SUBSCRIPTION_URL = `${environment.apiBaseUrl}/api/v1/customer/push-subscription`;

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private readonly VAPID_PUBLIC_KEY = 'BBExuSKx28RTr_4tt3TJIqAfVoWOfTpwNExZez0UjTUx4rnrSEgyjX0tFqmQPGYY5YS_CZeSRIFvmBL0S-39UQw';

  private permissionSubject = new BehaviorSubject<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  );
  readonly permission$ = this.permissionSubject.asObservable();

  constructor(private http: HttpClient) {}

  get isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  /**
   * Call on login.
   * Registers the service worker and re-subscribes if the user already
   * granted permission in a previous session.
   *
   * @param role  'admin' → saves to admin endpoint, 'customer' → customer endpoint
   */
  async init(role: 'admin' | 'customer' = 'admin'): Promise<void> {
    if (!this.isSupported) return;
    this.permissionSubject.next(Notification.permission);
    if (Notification.permission === 'granted') {
      await this.subscribe(role === 'customer' ? CUSTOMER_SUBSCRIPTION_URL : ADMIN_SUBSCRIPTION_URL);
    }
  }

  /**
   * Call when the user clicks "Enable Notifications".
   * Shows the browser permission prompt, then subscribes if granted.
   *
   * @param role  'admin' | 'customer'
   */
  async requestAndSubscribe(role: 'admin' | 'customer' = 'admin'): Promise<void> {
    if (!this.isSupported) return;
    const permission = await Notification.requestPermission();
    this.permissionSubject.next(permission);
    if (permission === 'granted') {
      await this.subscribe(role === 'customer' ? CUSTOMER_SUBSCRIPTION_URL : ADMIN_SUBSCRIPTION_URL);
    }
  }

  private async subscribe(subscriptionUrl: string): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      // Reuse existing subscription — avoids re-registering on every page load
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(this.VAPID_PUBLIC_KEY),
        });
      }

      this.saveSubscriptionOnServer(subscription, subscriptionUrl);
    } catch (err) {
      console.error('[Push] Subscription failed:', err);
    }
  }

  private saveSubscriptionOnServer(sub: PushSubscription, subscriptionUrl: string): void {
    this.http
      .post(subscriptionUrl, sub.toJSON())
      .subscribe({ error: (e) => console.error('[Push] Failed to save subscription:', e) });
  }

  private urlBase64ToUint8Array(base64: string): Uint8Array {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = window.atob(b64);
    return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
  }
}
