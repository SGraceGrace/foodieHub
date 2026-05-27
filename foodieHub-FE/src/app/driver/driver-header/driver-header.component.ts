import { Component, EventEmitter, NgZone, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe, SlicePipe } from '@angular/common';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { TokenService } from '../../core/shared/token.service';
import { DriverService, DriverOrderNotification } from '../driver.service';
import { PushNotificationService } from '../../core/services/push-notification.service';

@Component({
  selector: 'app-driver-header',
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe, SlicePipe],
  templateUrl: './driver-header.component.html',
  styleUrl: './driver-header.component.scss',
})
export class DriverHeaderComponent implements OnInit, OnDestroy {
  @Output() navigateTab    = new EventEmitter<string>();
  @Output() newOrderAlert  = new EventEmitter<DriverOrderNotification>();

  driverInitials = 'DR';

  // ── Notification bell ─────────────────────────────────────────────
  showBell         = false;
  notifications: DriverOrderNotification[] = [];
  get unreadCount(): number { return this.notifications.filter(n => !n.read).length; }

  private sseController: AbortController | null = null;

  constructor(
    private router: Router,
    private toastr: ToastrService,
    private tokenService: TokenService,
    private driverService: DriverService,
    private pushService: PushNotificationService,
    private ngZone: NgZone,
  ) {
    const info = localStorage.getItem('driverInfo');
    if (info) {
      const driver = JSON.parse(info);
      const name: string = driver?.firstName ?? driver?.name ?? '';
      if (name) {
        this.driverInitials = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
      }
    }
  }

  ngOnInit() {
    this.loadNotifications();
    this.connectSSE();
    this.pushService.init('driver');
  }

  ngOnDestroy() {
    this.sseController?.abort();
  }

  // ── SSE + push ────────────────────────────────────────────────────

  private connectSSE() {
    this.sseController = this.driverService.connectDriverSSE((notification) => {
      // Prepend so newest is first; avoid duplicates by id
      if (!this.notifications.find(n => n.id === notification.id)) {
        this.notifications = [notification, ...this.notifications];
      }
      this.toastr.info(
        `${notification.restaurantName} — ₹${notification.earnAmount.toFixed(0)} earn`,
        '🚚 New Order Available!'
      );
      this.newOrderAlert.emit(notification);
    });
  }

  private loadNotifications() {
    this.driverService.getNotifications().subscribe({
      next: res => {
        this.notifications = res.data ?? [];
      },
    });
  }

  // ── Bell panel ────────────────────────────────────────────────────

  toggleBell() {
    this.showBell = !this.showBell;
    if (this.showBell && this.unreadCount > 0) {
      this.driverService.markAllRead().subscribe();
      this.notifications = this.notifications.map(n => ({ ...n, read: true }));
    }
  }

  clearNotifications() {
    this.driverService.clearAllNotifications().subscribe({
      next: () => { this.notifications = []; this.showBell = false; },
    });
  }

  enableBrowserNotifications() {
    this.pushService.requestAndSubscribe('driver');
  }

  get notifPermission(): NotificationPermission {
    return 'Notification' in window ? Notification.permission : 'denied';
  }

  // ── Nav ───────────────────────────────────────────────────────────

  logout() {
    if (confirm('Logout from driver account?')) {
      this.sseController?.abort();
      localStorage.removeItem('driverAuthenticated');
      localStorage.removeItem('driverInfo');
      this.tokenService.clearTokens();
      this.router.navigateByUrl('/driver/login');
    }
  }

  goProfile() { this.navigateTab.emit('profile'); }
  goOrders()  { this.navigateTab.emit('orders'); }
}
