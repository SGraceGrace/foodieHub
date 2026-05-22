import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  /**
   * VAPID public key from your Spring Boot backend.
   * Generate it once with: webpush.generateVAPIDKeys() (Java: vapid-jose or web-push library)
   * Paste the urlSafeBase64 public key string here.
   */
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
   * Called on admin login. Registers the service worker and re-subscribes
   * if the user already granted permission in a previous session.
   */
  async init(): Promise<void> {
    if (!this.isSupported) return;
    this.permissionSubject.next(Notification.permission);
    if (Notification.permission === 'granted') {
      await this.subscribe();
    }
  }

  /**
   * Called when the admin clicks "Enable Notifications".
   * Shows the browser permission prompt, then subscribes if granted.
   */
  async requestAndSubscribe(): Promise<void> {
    if (!this.isSupported) return;
    const permission = await Notification.requestPermission();
    this.permissionSubject.next(permission);
    if (permission === 'granted') {
      await this.subscribe();
    }
  }

  private async subscribe(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      // Reuse existing subscription so we don't re-register on every page load
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(this.VAPID_PUBLIC_KEY),
        });
      }

      this.saveSubscriptionOnServer(subscription);
    } catch (err) {
      console.error('[Push] Subscription failed:', err);
    }
  }

  private saveSubscriptionOnServer(sub: PushSubscription): void {
    // Sends { endpoint, keys: { p256dh, auth } } to the backend so it can
    // call the push service later when an event happens.
    this.http
      .post(`${environment.apiBaseUrl}/api/v1/admin/push-subscription`, sub.toJSON())
      .subscribe({ error: (e) => console.error('[Push] Failed to save subscription:', e) });
  }

  // Web Push requires the VAPID key as a Uint8Array, not a base64 string
  private urlBase64ToUint8Array(base64: string): Uint8Array {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = window.atob(b64);
    return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
  }
}
