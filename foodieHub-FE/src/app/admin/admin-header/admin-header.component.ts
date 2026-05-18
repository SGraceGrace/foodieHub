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

  notifications: AdminNotification[] = [];
  unreadCount = 0;
  showDropdown = false;

  pushSupported = false;
  pushPermission: NotificationPermission = 'default';

  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private tokenService: TokenService,
    private router: Router,
    private adminService: AdminService,
    private pushService: PushNotificationService,
  ) {}

  ngOnInit() {
    this.loadNotifications();

    // Re-poll every 30 s so the badge stays fresh even without push
    this.pollInterval = setInterval(() => this.loadNotifications(), 30_000);

    // Initialise push (re-subscribes silently if already granted)
    this.pushSupported = this.pushService.isSupported;
    this.pushService.init();
    this.pushService.permission$.subscribe(p => this.pushPermission = p);
  }

  ngOnDestroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  loadNotifications() {
    this.adminService.getNotifications().subscribe({
      next: res => {
        this.notifications = res.data ?? [];
        this.unreadCount = this.notifications.length;
      }
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
      this.tokenService.clearTokens();
      this.router.navigateByUrl('/admin/login');
    }
  }
}
