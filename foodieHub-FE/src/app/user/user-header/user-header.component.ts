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
  notifications: (CustomerOrderUpdate & { read: boolean })[] = [];
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
    // (it updates when requestAndSubscribe resolves inside the service)
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
          this.connectSSE();
          // Register SW + re-subscribe if permission was already granted before
          this.pushService.init('customer');
        } else {
          this.initials = 'U';
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

  // ── SSE connection ────────────────────────────────────────────────

  private connectSSE(): void {
    if (this.sseController) return;   // already connected
    const token = this.tokenService.getAccessToken();
    if (!token) return;

    this.sseController = this.orderService.connectCustomerSSE(token, (update) => {
      this.ngZone.run(() => {
        // Update bell badge
        this.notifications = [{ ...update, read: false }, ...this.notifications].slice(0, 20);
        // In-app toast (Web Push from service worker handles the OS notification)
        this.toaster.info(update.message, update.restaurantName, { timeOut: 6000 });
      });
    });
  }

  // ── Notification bell ─────────────────────────────────────────────

  toggleNotifPanel(): void {
    this.showNotifPanel = !this.showNotifPanel;
    if (this.showNotifPanel) {
      // Mark all as read when panel opens
      this.notifications = this.notifications.map(n => ({ ...n, read: true }));
    }
  }

  closeNotifPanel(): void {
    this.showNotifPanel = false;
  }

  // ── Browser push notification ─────────────────────────────────────

  enableBrowserNotifications(): void {
    // requestAndSubscribe: shows browser permission prompt → registers SW
    // → subscribes to Web Push → saves endpoint to backend
    // permission$ observable updates notifPermission automatically via ngOnInit subscription
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
