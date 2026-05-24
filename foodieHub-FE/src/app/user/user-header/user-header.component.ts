import { Component, ElementRef, HostListener, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { SharedServiceService } from '../../core/shared/shared-service.service';
import { TokenService } from '../../core/shared/token.service';
import { CartService } from '../../core/shared/cart.service';
import { UserService } from '../user.service';
import { ToastrService } from 'ngx-toastr';
import { DeliveryAddressService } from '../../core/shared/delivery-address.service';
import { OrderService } from '../../core/shared/order.service';
import { CustomerOrderUpdate } from '../../model/order.model';
import { PushNotificationService } from '../../core/services/push-notification.service';

@Component({
  selector: 'app-user-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterModule, ReactiveFormsModule],
  templateUrl: './user-header.component.html',
  styleUrl: './user-header.component.scss',
})
export class UserHeaderComponent implements OnInit, OnDestroy {
  searchControl = new FormControl('');
  searchFocused = false;
  menuOpen = false;
  initials = '';
  cartCount = 0;

  // ── Order status notifications ────────────────────────────────────
  // Loaded from DB on init (persists across page refreshes).
  // New items prepended via SSE as they arrive in real-time.
  notifications: CustomerOrderUpdate[] = [];
  showNotifPanel = false;
  notifPermission: NotificationPermission = 'default';

  get unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  private sseController: AbortController | null = null;
  private subs = new Subscription();

  constructor(
    private router: Router,
    private sharedService: SharedServiceService,
    private tokenService: TokenService,
    private cartService: CartService,
    private userService: UserService,
    private toaster: ToastrService,
    private elRef: ElementRef,
    private deliveryAddressService: DeliveryAddressService,
    private orderService: OrderService,
    private ngZone: NgZone,
    private pushService: PushNotificationService
  ) {}

  ngOnInit() {
    // Keep notifPermission in sync with the PushNotificationService observable
    this.subs.add(
      this.pushService.permission$.subscribe(p => {
        this.ngZone.run(() => { this.notifPermission = p; });
      })
    );

    this.subs.add(
      this.tokenService.userInfo$.subscribe(user => {
        if (user) {
          this.initials = (user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '');
          this.initials = this.initials.toUpperCase();
          // Load stored history from DB first, then start SSE for new items
          this.loadNotifications();
          this.connectSSE();
          this.pushService.init('customer');
        } else {
          this.initials = 'U';
          this.notifications = [];
          this.sseController?.abort();
          this.sseController = null;
        }
      })
    );

    this.subs.add(
      this.cartService.cart$.subscribe(() => {
        this.cartCount = this.cartService.totalItems;
      })
    );

    if (!this.deliveryAddressService.get()) {
      this.userService.getAddresses().subscribe({
        next: (res) => {
          const defaultAddr = (res?.data ?? []).find(a => a.defaultAddress);
          if (defaultAddr) {
            this.deliveryAddressService.set(defaultAddr);
          }
        },
      });
    }
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    this.sseController?.abort();
    this.sseController = null;
  }

  // ── Load notification history from DB ─────────────────────────────
  // Same pattern as admin (GET /api/v1/admin/notifications) and
  // restaurant (GET /api/v1/restaurant/notifications/{id}).

  private loadNotifications(): void {
    this.orderService.getCustomerNotifications().subscribe({
      next: res => {
        this.ngZone.run(() => {
          this.notifications = res.data ?? [];
        });
      },
      error: () => { /* non-critical — bell just starts empty */ }
    });
  }

  // ── SSE connection ────────────────────────────────────────────────
  // Prepends new real-time events to the already-loaded DB history.

  private connectSSE(): void {
    if (this.sseController) return;   // already connected
    const token = this.tokenService.getAccessToken();
    if (!token) return;

    this.sseController = this.orderService.connectCustomerSSE(token, (update) => {
      this.ngZone.run(() => {
        // Prepend new notification (SSE always carries a fresh DB-saved record with id)
        this.notifications = [{ ...update, read: false }, ...this.notifications].slice(0, 20);
        // In-app toast (Web Push from service worker handles the OS notification)
        this.toaster.info(update.message, update.restaurantName, { timeOut: 6000 });
      });
    });
  }

  // ── Notification bell ─────────────────────────────────────────────

  toggleNotifPanel(): void {
    this.showNotifPanel = !this.showNotifPanel;
    if (this.showNotifPanel && this.unreadCount > 0) {
      // Mark all as read in-memory immediately so badge clears
      this.notifications = this.notifications.map(n => ({ ...n, read: true }));
      // Persist to DB (same as restaurant's markAllRead)
      this.orderService.markAllCustomerNotificationsRead().subscribe();
    }
  }

  closeNotifPanel(): void {
    this.showNotifPanel = false;
  }

  // ── Clear all ─────────────────────────────────────────────────────
  // Deletes from DB + clears in-memory (same as admin's clearAll).

  clearNotifications(): void {
    this.notifications = [];
    this.orderService.clearCustomerNotifications().subscribe();
  }

  // ── Browser push notification ─────────────────────────────────────

  enableBrowserNotifications(): void {
    this.pushService.requestAndSubscribe('customer');
  }

  statusEmoji(status: string): string {
    const map: Record<string, string> = {
      CONFIRMED: '✅', PREPARING: '👨‍🍳', READY: '🛵', DELIVERED: '🎉', CANCELLED: '❌',
    };
    return map[status] ?? '📦';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.menuOpen = false;
    }
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  onSearch() {
    const searchTerm = this.searchControl.value ?? '';
    this.router.navigateByUrl('/user/search');
    this.sharedService.onSearch(searchTerm);
    this.searchControl.reset();
  }

  logout() {
    this.menuOpen = false;
    this.userService.logout().subscribe({
      next: (response) => {
        this.toaster.success('Logged out successfully');
        this.tokenService.clearTokens();
        this.router.navigateByUrl('/login');
      },
      error: () => {
        this.toaster.error('Logout failed');
      },
    });
  }
}
