import { Component, EventEmitter, HostListener, OnDestroy, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { TokenService } from '../../core/shared/token.service';
import { AdminService } from '../admin.service';
import { PushNotificationService } from '../../core/services/push-notification.service';
import { AdminNotificationWsService } from '../../core/services/admin-notification-ws.service';
import { AdminNotification } from '../../model/restaurant.model';

@Component({
  selector: 'app-admin-header',
  imports: [CommonModule],
  templateUrl: './admin-header.component.html',
  styleUrl: './admin-header.component.scss'
})
export class AdminHeaderComponent implements OnInit, OnDestroy {

  @Output() navigateTab = new EventEmitter<string>();
  @Output() pendingOwnerCountChange = new EventEmitter<number>();
  @Output() pendingDriverCountChange = new EventEmitter<number>();

  notifications: AdminNotification[] = [];
  unreadCount = 0;
  showDropdown = false;

  pushSupported = false;
  pushPermission: NotificationPermission = 'default';

  private wsSub: Subscription | null = null;

  constructor(
    private tokenService: TokenService,
    private router: Router,
    private adminService: AdminService,
    private pushService: PushNotificationService,
    private notificationWs: AdminNotificationWsService,
  ) {}

  ngOnInit() {
    this.loadNotifications();

    this.notificationWs.connect();
    this.wsSub = this.notificationWs.notification$.subscribe(n => {
      this.notifications = [n, ...this.notifications];
      this.unreadCount++;
      this.refreshPendingCounts();
    });

    this.pushSupported = this.pushService.isSupported;
    this.pushService.init();
    this.pushService.permission$.subscribe(p => this.pushPermission = p);
  }

  ngOnDestroy() {
    this.wsSub?.unsubscribe();
    // Do NOT disconnect here — the SSE connection is session-scoped, not component-scoped.
    // Disconnecting on component destroy causes a reconnect on every route change.
    // disconnect() is called only on explicit logout below.
  }

  loadNotifications() {
    this.adminService.getNotifications().subscribe({
      next: res => {
        this.notifications = res.data ?? [];
        this.unreadCount = this.notifications.length;
        this.refreshPendingCounts();
      },
      error: () => {}
    });
  }

  dismiss(n: AdminNotification, event: Event) {
    event.stopPropagation();
    // Remove from UI immediately for instant feedback
    this.notifications = this.notifications.filter(x => x.id !== n.id);
    this.unreadCount = Math.max(0, this.unreadCount - 1);
    // Persist to backend so it won't come back on next poll or on other devices
    this.adminService.dismissNotification(n.id).subscribe({ error: () => {} });
  }

  clearAll(event: Event) {
    event.stopPropagation();
    this.notifications = [];
    this.unreadCount = 0;
    this.adminService.clearAllNotifications().subscribe({ error: () => {} });
  }

  private refreshPendingCounts() {
    this.adminService.getPendingOwnerCount().subscribe({
      next: count => this.pendingOwnerCountChange.emit(count),
      error: () => {},
    });
    this.adminService.getPendingDriverCount().subscribe({
      next: count => this.pendingDriverCountChange.emit(count),
      error: () => {},
    });
  }

  enablePushNotifications() {
    this.pushService.requestAndSubscribe();
  }

  toggleDropdown(event: Event) {
    event.stopPropagation();
    this.showDropdown = !this.showDropdown;
    if (this.showDropdown) this.unreadCount = 0;
  }

  @HostListener('document:click')
  closeDropdown() {
    this.showDropdown = false;
  }

  openNotification(n: AdminNotification) {
    this.showDropdown = false;
    if (n.type === 'PENDING_OWNER') this.navigateTab.emit('restaurant-owners');
    else if (n.type === 'PENDING_DRIVER') this.navigateTab.emit('drivers');
    else this.navigateTab.emit('activity-log');
  }

  notifIcon(n: AdminNotification): string {
    if (n.type === 'PENDING_OWNER')  return '🏪';
    if (n.type === 'PENDING_DRIVER') return '🛵';
    return '📋';
  }

  notifClass(n: AdminNotification): string {
    if (n.type === 'PENDING_OWNER' || n.type === 'PENDING_DRIVER') return 'pending';
    return 'activity';
  }

  formatTime(timestamp: string): string {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  logout() {
    if (confirm('Logout from admin panel?')) {
      this.notificationWs.disconnect();
      this.tokenService.clearTokens();
      this.router.navigateByUrl('/admin/login');
    }
  }
}
