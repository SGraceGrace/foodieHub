import { Component, EventEmitter, HostListener, OnDestroy, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TokenService } from '../../core/shared/token.service';
import { AdminService } from '../admin.service';
import { PushNotificationService } from '../../core/services/push-notification.service';
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

  private pollInterval: ReturnType<typeof setInterval> | null = null;

  // Dismissed keys are stored per day so they automatically clear the next day
  private readonly storageKey = `dismissed_notifs_${new Date().toISOString().slice(0, 10)}`;
  private dismissedKeys = new Set<string>(
    JSON.parse(localStorage.getItem(this.storageKey) ?? '[]')
  );

  constructor(
    private tokenService: TokenService,
    private router: Router,
    private adminService: AdminService,
    private pushService: PushNotificationService,
  ) {}

  ngOnInit() {
    this.loadNotifications();
    this.pollInterval = setInterval(() => this.loadNotifications(), 30_000);

    this.pushSupported = this.pushService.isSupported;
    this.pushService.init();
    this.pushService.permission$.subscribe(p => this.pushPermission = p);
  }

  ngOnDestroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  // Only notifications the admin has not dismissed
  get visibleNotifications(): AdminNotification[] {
    return this.notifications.filter(n => !this.dismissedKeys.has(this.notifKey(n)));
  }

  loadNotifications() {
    this.adminService.getNotifications().subscribe({
      next: res => {
        this.notifications = res.data ?? [];
        this.unreadCount = this.visibleNotifications.length;
        this.refreshPendingCounts();
      }
    });
  }

  private refreshPendingCounts() {
    const hasPendingOwner  = this.notifications.some(n => n.type === 'PENDING_OWNER');
    const hasPendingDriver = this.notifications.some(n => n.type === 'PENDING_DRIVER');

    if (hasPendingOwner) {
      this.adminService.getPendingOwnerCount().subscribe({
        next: count => this.pendingOwnerCountChange.emit(count),
        error: () => {},
      });
    }
    if (hasPendingDriver) {
      this.adminService.getPendingDriverCount().subscribe({
        next: count => this.pendingDriverCountChange.emit(count),
        error: () => {},
      });
    }
  }

  dismiss(n: AdminNotification, event: Event) {
    event.stopPropagation();
    this.dismissedKeys.add(this.notifKey(n));
    this.saveDismissed();
    // Adjust badge so it never goes below 0
    this.unreadCount = Math.max(0, this.unreadCount - 1);
  }

  clearAll(event: Event) {
    event.stopPropagation();
    this.notifications.forEach(n => this.dismissedKeys.add(this.notifKey(n)));
    this.saveDismissed();
    this.unreadCount = 0;
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
      this.tokenService.clearTokens();
      this.router.navigateByUrl('/admin/login');
    }
  }

  // Composite key — unique per notification within a day
  private notifKey(n: AdminNotification): string {
    return `${n.timestamp}_${n.type}_${n.message}`;
  }

  private saveDismissed() {
    localStorage.setItem(this.storageKey, JSON.stringify([...this.dismissedKeys]));
  }
}
