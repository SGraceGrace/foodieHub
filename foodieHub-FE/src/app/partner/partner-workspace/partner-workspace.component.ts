import { Component, NgZone, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TokenService } from '../../core/shared/token.service';
import { PaginatedResponse } from '../../model/restaurant.model';
import { CloudinaryService } from '../../core/shared/cloudinary.service';
import { PartnerService } from '../partner.service';
import { OrderService } from '../../core/shared/order.service';
import { UserDetails } from '../../model/user.model';
import { Restaurant, DaySchedule, MenuCategory, RestaurantStaff } from '../../model/restaurant.model';
import { HomeService } from '../../home/home.service';
import { Order, RestaurantOrderNotification, RestaurantStats } from '../../model/order.model';
import { LocationPickerComponent, PickedLocation } from '../../core/shared/components/location-picker/location-picker.component';

type WorkspaceTab = 'overview' | 'orders' | 'all-orders' | 'menu' | 'analytics' | 'hours' | 'settings';

export interface DayHours {
  day: string;
  short: string;
  open: boolean;
  openTime: string;
  closeTime: string;
}

interface MenuExtra { label: string; amount: number; }

interface LocalMenuItem {
  id?: string;        // menu_items document ID — sent back on save so backend updates in-place (preserving order stats)
  name: string;
  price: number | null;
  gstPercent: number;
  isVeg: boolean;
  available: boolean;
  description: string;
  imageUrl: string;
  extras: MenuExtra[];
}

interface LocalMenuCategory {
  category: string;
  items: LocalMenuItem[];
  collapsed: boolean;
}

@Component({
  selector: 'app-partner-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule, LocationPickerComponent],
  templateUrl: './partner-workspace.component.html',
  styleUrl: './partner-workspace.component.scss',
})
export class PartnerWorkspaceComponent implements OnInit, OnDestroy {
  private statusPollTimer: ReturnType<typeof setInterval> | null = null;
  private sseController: AbortController | null = null;

  activeTab: WorkspaceTab = 'overview';
  user: UserDetails | null = null;
  restaurant: Restaurant | null = null;
  loading = false;

  // ── Order notifications (bell) ────────────────────────────────────
  notifications: RestaurantOrderNotification[] = [];
  showNotifPanel = false;
  notifPermission: NotificationPermission = 'default';

  get unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  // ── Live Orders tab ───────────────────────────────────────────────
  liveOrders: Order[] = [];
  liveOrdersLoading = false;
  updatingOrderId: string | null = null;

  private static readonly LIVE_STATUSES = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY'];

  get liveOrderCount(): number {
    return this.liveOrders.filter(o =>
      ['PLACED', 'CONFIRMED', 'PREPARING'].includes(o.status ?? '')
    ).length;
  }

  // ── Overview stats ───────────────────────────────────────────────
  stats: RestaurantStats = { todayOrders: 0, todayRevenue: 0, pendingOrders: 0, totalOrders: 0 };
  statsLoading = false;

  // ── All Orders tab (paginated history) ───────────────────────────
  allOrdersHistory: Order[] = [];
  allOrdersLoading = false;
  allOrdersPagination = { currentPage: 0, totalPages: 0, totalElements: 0, pageSize: 10 };

  // ── All Orders date filter ────────────────────────────────────────
  aoFilterPreset: 'all' | 'today' | 'custom' = 'all';
  aoFromDate = '';     // yyyy-MM-dd
  aoToDate   = '';     // yyyy-MM-dd
  aoShowCustom = false;
  aoCustomApplied = false;

  // ── Operating hours ──────────────────────────────────────────────
  hours: DayHours[] = [
    { day: 'Monday',    short: 'MON', open: true,  openTime: '09:00', closeTime: '22:00' },
    { day: 'Tuesday',   short: 'TUE', open: true,  openTime: '09:00', closeTime: '22:00' },
    { day: 'Wednesday', short: 'WED', open: true,  openTime: '09:00', closeTime: '22:00' },
    { day: 'Thursday',  short: 'THU', open: true,  openTime: '09:00', closeTime: '22:00' },
    { day: 'Friday',    short: 'FRI', open: true,  openTime: '09:00', closeTime: '23:00' },
    { day: 'Saturday',  short: 'SAT', open: true,  openTime: '10:00', closeTime: '23:00' },
    { day: 'Sunday',    short: 'SUN', open: false, openTime: '10:00', closeTime: '22:00' },
  ];
  savingHours = false;
  hoursSavedMsg = '';

  // ── Menu ─────────────────────────────────────────────────────────
  menuCategories: LocalMenuCategory[] = [];
  menuDirty = false;
  savingMenu = false;
  menuSavedMsg = '';

  showAddCategory = false;
  newCategoryName = '';
  categoryNameError = '';

  editingCategoryIdx: number | null = null;
  editingCategoryName = '';

  showItemForm = false;
  itemFormCatIdx = -1;
  itemFormItemIdx = -1;
  itemDraft: LocalMenuItem = this.emptyItemDraft();
  itemFormError = '';
  uploadingItemImage = false;

  readonly gstOptions = [0, 5, 12, 18];

  // ── Restaurant details edit ───────────────────────────────────────
  editingDetails = false;
  detailsDraft = { name: '', address: '', cuisine: '', deliveryTime: null as number | null, minOrder: null as number | null, fssaiNumber: '', gstNumber: '' };
  detailsImageUrl = '';
  detailsLocation: PickedLocation | null = null;
  showDetailsLocationPicker = false;
  detailsLocationError = false;
  uploadingDetailsImage = false;
  savingDetails = false;
  detailsSaveMsg = '';

  // ── Settings ──────────────────────────────────────────────────────
  staff: RestaurantStaff[] = [];
  staffLoading = false;

  editingStaff: RestaurantStaff | null = null;
  staffActionLoading = false;
  staffActionMsg = '';

  editingOwner = false;
  ownerDraft = { firstName: '', lastName: '', phone: '' };
  savingOwner = false;
  ownerSaveMsg = '';

  // ── Hours getters/methods ─────────────────────────────────────────
  initHours() {
    const apiHours = this.restaurant?.operatingHours ?? [];
    this.hours = this.hours.map(d => {
      const match = apiHours.find(h => h.day.toUpperCase() === d.day.toUpperCase());
      return match ? { ...d, open: match.open, openTime: match.openTime, closeTime: match.closeTime } : d;
    });
  }

  get openDaysCount(): number {
    return this.hours.filter(h => h.open).length;
  }

  applyToAllDays(source: DayHours) {
    this.hours = this.hours.map(h => ({
      ...h,
      openTime:  source.openTime,
      closeTime: source.closeTime,
    }));
  }

  saveHours() {
    if (!this.restaurant) return;
    this.savingHours = true;
    this.hoursSavedMsg = '';
    const payload: DaySchedule[] = this.hours.map(h => ({
      day: h.day.toUpperCase(), open: h.open,
      openTime: h.openTime, closeTime: h.closeTime,
    }));
    this.partnerService.updateRestaurantHours(this.restaurant.id, payload).subscribe({
      next: res => {
        if (res.data) this.restaurant = res.data;
        this.initHours();
        this.savingHours = false;
        this.hoursSavedMsg = 'Hours saved successfully.';
        setTimeout(() => { this.hoursSavedMsg = ''; }, 3000);
      },
      error: () => {
        this.savingHours = false;
        this.hoursSavedMsg = 'Failed to save. Please try again.';
        setTimeout(() => { this.hoursSavedMsg = ''; }, 3000);
      }
    });
  }

  // ── Menu: category operations ─────────────────────────────────────
  initMenu() {
    if (!this.restaurant?.id) return;
    // Load from menu_items collection — items include their DB id so save can update in-place
    this.homeService.getMenuByRestaurant(this.restaurant.id).subscribe({
      next: res => this.applyMenuFromApi(res.data ?? [])
    });
  }

  private applyMenuFromApi(apiMenu: MenuCategory[]) {
    this.menuCategories = apiMenu.map(cat => ({
      category: cat.category,
      collapsed: false,
      items: (cat.items ?? []).map(item => ({
        id:          item.id,
        name:        item.name,
        price:       item.price,
        gstPercent:  item.gstPercent ?? 5,
        isVeg:       item.isVeg,
        available:   item.available,
        description: item.description ?? '',
        imageUrl:    item.imageUrl ?? '',
        extras:      (item.extras ?? []).map(e => ({ ...e })),
      })),
    }));
    this.menuDirty = false;
  }

  addCategory() {
    const name = this.newCategoryName.trim();
    if (!name) { this.categoryNameError = 'Category name is required.'; return; }
    if (this.menuCategories.some(c => c.category.toLowerCase() === name.toLowerCase())) {
      this.categoryNameError = 'Category already exists.'; return;
    }
    this.menuCategories = [...this.menuCategories, { category: name, items: [], collapsed: false }];
    this.newCategoryName = '';
    this.categoryNameError = '';
    this.showAddCategory = false;
    this.menuDirty = true;
  }

  deleteCategory(idx: number) {
    this.menuCategories = this.menuCategories.filter((_, i) => i !== idx);
    this.menuDirty = true;
  }

  startEditCategory(idx: number) {
    this.editingCategoryIdx = idx;
    this.editingCategoryName = this.menuCategories[idx].category;
  }

  saveEditCategory(idx: number) {
    const name = this.editingCategoryName.trim();
    if (!name) return;
    this.menuCategories = this.menuCategories.map((c, i) =>
      i === idx ? { ...c, category: name } : c
    );
    this.editingCategoryIdx = null;
    this.menuDirty = true;
  }

  cancelEditCategory() { this.editingCategoryIdx = null; }

  toggleCategory(idx: number) {
    this.menuCategories[idx] = {
      ...this.menuCategories[idx],
      collapsed: !this.menuCategories[idx].collapsed,
    };
  }

  // ── Menu: item operations ─────────────────────────────────────────
  openAddItem(catIdx: number) {
    this.itemFormCatIdx = catIdx;
    this.itemFormItemIdx = -1;
    this.itemDraft = this.emptyItemDraft();
    this.itemFormError = '';
    this.showItemForm = true;
  }

  openEditItem(catIdx: number, itemIdx: number) {
    this.itemFormCatIdx = catIdx;
    this.itemFormItemIdx = itemIdx;
    const src = this.menuCategories[catIdx].items[itemIdx];
    this.itemDraft = { ...src, extras: src.extras.map(e => ({ ...e })) };
    this.itemFormError = '';
    this.showItemForm = true;
  }

  closeItemForm() { this.showItemForm = false; this.uploadingItemImage = false; }

  onItemImageSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadingItemImage = true;
    this.cloudinary.upload(file).subscribe({
      next: url => { this.itemDraft = { ...this.itemDraft, imageUrl: url }; this.uploadingItemImage = false; },
      error: () => { this.uploadingItemImage = false; this.itemFormError = 'Image upload failed.'; },
    });
  }

  saveItem() {
    if (!this.itemDraft.name.trim())                { this.itemFormError = 'Item name is required.'; return; }
    if (this.itemDraft.price === null || this.itemDraft.price === undefined || (this.itemDraft.price as any) === '') {
      this.itemFormError = 'Price is required.'; return;
    }
    if (Number(this.itemDraft.price) < 0) { this.itemFormError = 'Price cannot be negative.'; return; }

    const saved: LocalMenuItem = {
      ...this.itemDraft,
      name:   this.itemDraft.name.trim(),
      price:  Number(this.itemDraft.price),
      extras: this.itemDraft.extras.filter(e => e.label.trim()),
    };

    this.menuCategories = this.menuCategories.map((cat, ci) => {
      if (ci !== this.itemFormCatIdx) return cat;
      const items = [...cat.items];
      if (this.itemFormItemIdx === -1) {
        items.push(saved);
      } else {
        items[this.itemFormItemIdx] = saved;
      }
      return { ...cat, items };
    });

    this.menuDirty = true;
    this.showItemForm = false;
  }

  deleteItem(catIdx: number, itemIdx: number) {
    this.menuCategories = this.menuCategories.map((cat, ci) =>
      ci !== catIdx ? cat : { ...cat, items: cat.items.filter((_, ii) => ii !== itemIdx) }
    );
    this.menuDirty = true;
  }

  // ── Menu: extras ──────────────────────────────────────────────────
  addExtra() {
    this.itemDraft = {
      ...this.itemDraft,
      extras: [...this.itemDraft.extras, { label: '', amount: 0 }],
    };
  }

  removeExtra(idx: number) {
    this.itemDraft = {
      ...this.itemDraft,
      extras: this.itemDraft.extras.filter((_, i) => i !== idx),
    };
  }

  // ── Menu: pricing helpers ─────────────────────────────────────────
  getGstAmount(price: number | null, pct: number): number {
    if (!price || !pct) return 0;
    return Math.round(Number(price) * pct) / 100;
  }

  getTotalPrice(price: number | null, pct: number): number {
    return (Number(price) || 0) + this.getGstAmount(price, pct);
  }

  get totalMenuItems(): number {
    return this.menuCategories.reduce((sum, c) => sum + c.items.length, 0);
  }

  // ── Menu: save ────────────────────────────────────────────────────
  saveMenu() {
    if (!this.restaurant) return;
    this.savingMenu = true;
    this.menuSavedMsg = '';
    const payload = this.menuCategories.map(cat => ({
      category: cat.category,
      items: cat.items.map(item => ({
        id:          item.id ?? undefined, // send existing ID → backend updates in-place, preserving order stats
        name:        item.name,
        price:       item.price ?? 0,
        gstPercent:  item.gstPercent,
        isVeg:       item.isVeg,
        available:   item.available,
        description: item.description,
        imageUrl:    item.imageUrl || undefined,
        extras:      item.extras,
      })),
    }));
    this.partnerService.updateRestaurantMenu(this.restaurant.id, payload).subscribe({
      next: res => {
        // res.data is List<MenuCategory> — apply directly; do NOT touch this.restaurant
        this.applyMenuFromApi(res.data ?? []);
        this.savingMenu = false;
        this.menuSavedMsg = 'Menu saved successfully.';
        setTimeout(() => { this.menuSavedMsg = ''; }, 3000);
      },
      error: () => {
        this.savingMenu = false;
        this.menuSavedMsg = 'Failed to save. Please try again.';
        setTimeout(() => { this.menuSavedMsg = ''; }, 3000);
      }
    });
  }

  private emptyItemDraft(): LocalMenuItem {
    return {
      name: '', price: null, gstPercent: 5,
      isVeg: true, available: true,
      description: '', imageUrl: '', extras: [],
    };
  }

  // ── Common helpers ────────────────────────────────────────────────
  get detailsLat(): number | null { return this.detailsLocation?.lat ?? null; }
  get detailsLng(): number | null { return this.detailsLocation?.lng ?? null; }

  get ownerInitials(): string {
    const f = this.user?.firstName?.[0] ?? '';
    const l = this.user?.lastName?.[0] ?? '';
    return (f + l).toUpperCase() || 'RO';
  }

  get ownerName(): string {
    return [this.user?.firstName, this.user?.lastName].filter(Boolean).join(' ') || 'Owner';
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tokenService: TokenService,
    private partnerService: PartnerService,
    private homeService: HomeService,
    private cloudinary: CloudinaryService,
    private orderService: OrderService,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.tokenService.userInfo$.subscribe(u => this.user = u);
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadRestaurant(id);
    this.initNotifPermission();
  }

  // ── Browser notification permission ───────────────────────────────

  private initNotifPermission(): void {
    if (!('Notification' in window)) return;
    this.notifPermission = Notification.permission;
  }

  enableBrowserNotifications(): void {
    if (!('Notification' in window)) return;
    Notification.requestPermission().then(p => {
      this.ngZone.run(() => { this.notifPermission = p; });
    });
  }

  private showBrowserNotification(notif: RestaurantOrderNotification): void {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      new Notification('🛎 New Order!', {
        body: `${notif.customerName} placed an order • ₹${notif.totalAmount}`,
        icon: '/favicon.ico',
        tag: `order-${notif.orderId ?? Date.now()}`,
        requireInteraction: true,
      });
    } catch { /* some browsers block Notification outside user gesture — safe to ignore */ }
  }

  loadRestaurant(id: string) {
    this.loading = true;
    this.partnerService.getRestaurantById(id).subscribe({
      next: res => {
        this.restaurant = res.data ?? null;
        this.initHours();
        this.initMenu();
        this.loading = false;
        this.startStatusPoll();
        this.loadNotifications();
        this.loadLiveOrders();   // populate badge immediately on load
        this.loadStats();        // populate overview stats
        this.startSseStream();
      },
      error: () => {
        this.loading = false;
        this.router.navigateByUrl('/partner');
      }
    });
  }

  // ── Overview stats ────────────────────────────────────────────────

  loadStats() {
    if (!this.restaurant) return;
    this.statsLoading = true;
    this.orderService.getRestaurantStats(this.restaurant.id).subscribe({
      next: res => {
        this.stats = res.data ?? this.stats;
        this.statsLoading = false;
      },
      error: () => { this.statsLoading = false; }
    });
  }

  // ── Notification bell ─────────────────────────────────────────────

  loadNotifications() {
    if (!this.restaurant) return;
    this.orderService.getRestaurantNotifications(this.restaurant.id).subscribe({
      next: res => {
        this.notifications = res.data ?? [];
      },
      error: () => {}
    });
  }

  startSseStream() {
    if (!this.restaurant || this.sseController) return;
    const token = this.tokenService.getAccessToken();
    if (!token) return;

    this.sseController = this.orderService.connectRestaurantSSE(
      this.restaurant.id,
      token,
      (notif) => {
        // Prepend so newest is first
        this.notifications = [notif, ...this.notifications];
        // Refresh live orders list so the new order appears immediately
        this.loadLiveOrders();
        // Fire a browser push notification if permission is granted
        this.showBrowserNotification(notif);
      }
    );
  }

  toggleNotifPanel() {
    this.showNotifPanel = !this.showNotifPanel;
    if (!this.showNotifPanel) return;
    // Mark all as read when panel is opened
    if (this.unreadCount > 0 && this.restaurant) {
      this.orderService.markAllRead(this.restaurant.id).subscribe();
      this.notifications = this.notifications.map(n => ({ ...n, read: true }));
    }
  }

  closeNotifPanel() { this.showNotifPanel = false; }

  clearNotifications() {
    this.notifications = [];
    // Hard-delete from DB — notifications are transient alerts, order data lives in orders collection
    if (this.restaurant) {
      this.orderService.clearRestaurantNotifications(this.restaurant.id).subscribe();
    }
  }

  /** Clicking a notification card closes the panel and jumps to Live Orders tab */
  onNotifItemClick() {
    this.closeNotifPanel();
    this.goTab('orders');
  }

  // ── Live Orders ───────────────────────────────────────────────────

  loadLiveOrders() {
    if (!this.restaurant) return;
    this.liveOrdersLoading = true;
    this.orderService.getRestaurantOrders(
      this.restaurant.id,
      PartnerWorkspaceComponent.LIVE_STATUSES
    ).subscribe({
      next: res => {
        this.liveOrders      = res.data ?? [];
        this.liveOrdersLoading = false;
      },
      error: () => { this.liveOrdersLoading = false; }
    });
  }

  onStatusUpdate(order: Order, newStatus: string) {
    this.updatingOrderId = order.id;
    this.orderService.updateOrderStatus(order.id, newStatus).subscribe({
      next: res => {
        this.updatingOrderId = null;
        if (newStatus === 'CANCELLED') {
          // Remove cancelled orders from live list
          this.liveOrders = this.liveOrders.filter(o => o.id !== order.id);
        } else {
          // Update status in live list — order stays visible until driver picks up
          this.liveOrders = this.liveOrders.map(o =>
            o.id === order.id ? { ...o, status: newStatus as any } : o
          );
        }
      },
      error: () => { this.updatingOrderId = null; }
    });
  }

  nextStatus(status: string): string | null {
    // Restaurant handles: PLACED → CONFIRMED → PREPARING → READY
    // Driver handles the rest: READY → OUT_FOR_DELIVERY → DELIVERED
    const flow: Record<string, string> = {
      PLACED:    'CONFIRMED',
      CONFIRMED: 'PREPARING',
      PREPARING: 'READY',
    };
    return flow[status] ?? null;
  }

  nextStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PLACED:    '✅ Accept Order',
      CONFIRMED: '👨‍🍳 Start Preparing',
      PREPARING: '📦 Mark Ready for Pickup',
    };
    return labels[status] ?? '';
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      PLACED:    'New',
      CONFIRMED: 'Accepted',
      PREPARING: 'Preparing',
      READY:     'Ready',
      DELIVERED: 'Delivered',
      CANCELLED: 'Cancelled',
    };
    return labels[status] ?? status;
  }

  goTab(tab: WorkspaceTab) {
    this.activeTab = tab;
    // No initMenu() here — menu is loaded once in loadRestaurant() and kept in sync
    // by saveMenu() applying the PUT response directly. Re-fetching on every tab
    // click is wasteful and would wipe unsaved edits if the user switched tabs mid-edit.
    if (tab === 'hours')      this.refreshHours();
    if (tab === 'settings')   this.loadStaff();
    if (tab === 'orders')     this.loadLiveOrders();
    if (tab === 'all-orders') this.loadAllOrdersHistory(0);
  }

  // ── All Orders history ────────────────────────────────────────────

  loadAllOrdersHistory(page: number) {
    if (!this.restaurant) return;
    this.allOrdersLoading = true;

    let from: string | undefined;
    let to: string | undefined;

    if (this.aoFilterPreset === 'today') {
      const today = new Date().toISOString().split('T')[0]; // yyyy-MM-dd
      from = today;
      to   = today;
    } else if (this.aoFilterPreset === 'custom' && this.aoCustomApplied) {
      from = this.aoFromDate || undefined;
      to   = this.aoToDate   || undefined;
    }

    this.orderService.getRestaurantAllOrders(
      this.restaurant.id, page, this.allOrdersPagination.pageSize, from, to
    ).subscribe({
      next: res => {
        const p: PaginatedResponse<Order> = res.data as any;
        this.allOrdersHistory   = p.content ?? [];
        this.allOrdersPagination = {
          currentPage:   p.currentPage,
          totalPages:    p.totalPages,
          totalElements: p.totalElements,
          pageSize:      p.pageSize,
        };
        this.allOrdersLoading = false;
      },
      error: () => { this.allOrdersLoading = false; }
    });
  }

  setAoFilter(preset: 'all' | 'today' | 'custom') {
    this.aoFilterPreset = preset;
    if (preset === 'custom') {
      this.aoShowCustom = true;
      // Don't load yet — wait for the user to click Apply
    } else {
      this.aoShowCustom    = false;
      this.aoCustomApplied = false;
      this.loadAllOrdersHistory(0);
    }
  }

  applyAoCustomFilter() {
    if (!this.aoFromDate || !this.aoToDate) return;
    this.aoCustomApplied = true;
    this.loadAllOrdersHistory(0);
  }

  clearAoFilter() {
    this.aoFilterPreset  = 'all';
    this.aoFromDate      = '';
    this.aoToDate        = '';
    this.aoShowCustom    = false;
    this.aoCustomApplied = false;
    this.loadAllOrdersHistory(0);
  }

  /** True when a non-"all" filter is actively applied (used to show the clear button) */
  get aoFilterActive(): boolean {
    return this.aoFilterPreset === 'today' ||
           (this.aoFilterPreset === 'custom' && this.aoCustomApplied);
  }

  /** Human-readable label for the active filter chip */
  get aoFilterLabel(): string {
    if (this.aoFilterPreset === 'today') return 'Today';
    if (this.aoFilterPreset === 'custom' && this.aoCustomApplied) {
      return `${this.aoFromDate} → ${this.aoToDate}`;
    }
    return '';
  }

  allOrdersPageRange(): number[] {
    const total = this.allOrdersPagination.totalPages;
    const cur   = this.allOrdersPagination.currentPage;
    // Show at most 5 page buttons centred on current page
    const start = Math.max(0, Math.min(cur - 2, total - 5));
    const end   = Math.min(total, start + 5);
    return Array.from({ length: end - start }, (_, i) => start + i);
  }

  allOrdersFrom(): number {
    const { currentPage, pageSize } = this.allOrdersPagination;
    return currentPage * pageSize + 1;
  }

  allOrdersTo(): number {
    const { currentPage, pageSize, totalElements } = this.allOrdersPagination;
    return Math.min((currentPage + 1) * pageSize, totalElements);
  }

  // ── Settings: staff ───────────────────────────────────────────────
  loadStaff() {
    if (!this.restaurant) return;
    this.staffLoading = true;
    this.partnerService.getRestaurantStaff(this.restaurant.id).subscribe({
      next: res => { this.staff = res.data ?? []; this.staffLoading = false; },
      error: () => { this.staffLoading = false; },
    });
  }

  openEditStaff(s: RestaurantStaff) {
    this.editingStaff = { ...s };
    this.staffActionMsg = '';
  }

  closeEditStaff() { this.editingStaff = null; this.staffActionMsg = ''; }

  toggleStaffStatus() {
    if (!this.editingStaff) return;
    const isActive = this.editingStaff.status === 'ACTIVE';
    this.staffActionLoading = true;
    const call = isActive
      ? this.partnerService.archiveStaff(this.editingStaff.id)
      : this.partnerService.activateStaff(this.editingStaff.id);
    call.subscribe({
      next: () => {
        const newStatus = isActive ? 'INACTIVE' : 'ACTIVE';
        this.staff = this.staff.map(s =>
          s.id === this.editingStaff!.id ? { ...s, status: newStatus } : s
        );
        this.editingStaff = { ...this.editingStaff!, status: newStatus };
        this.staffActionLoading = false;
        this.staffActionMsg = `Staff ${isActive ? 'deactivated' : 'activated'} successfully.`;
        setTimeout(() => { this.staffActionMsg = ''; }, 3000);
      },
      error: () => { this.staffActionLoading = false; this.staffActionMsg = 'Action failed. Please try again.'; },
    });
  }

  // ── Restaurant details edit ───────────────────────────────────────
  openEditDetails() {
    if (!this.restaurant) return;
    this.detailsDraft = {
      name:         this.restaurant.name ?? '',
      address:      this.restaurant.address ?? '',
      cuisine:      this.restaurant.cuisine?.join(', ') ?? '',
      deliveryTime: this.restaurant.deliveryTime ?? null,
      minOrder:     this.restaurant.minOrder ?? null,
      fssaiNumber:  this.restaurant.fssaiNumber ?? '',
      gstNumber:    this.restaurant.gstNumber ?? '',
    };
    this.detailsImageUrl = this.restaurant.imageUrl ?? '';
    const loc = this.restaurant.location;
    this.detailsLocation = loc
      ? {
          lat: loc.lat,
          lng: loc.lng,
          city: loc.city,
          state: loc.state,
          country: loc.country,
          // Prefer the stored full address string; fall back to city/state/country only if missing
          displayName: this.restaurant.address || `${loc.city}, ${loc.state}, ${loc.country}`,
        }
      : null;
    this.detailsSaveMsg = '';
    this.editingDetails = true;
  }

  cancelEditDetails() {
    this.editingDetails = false;
    this.detailsSaveMsg = '';
    this.detailsLocationError = false;
    this.showDetailsLocationPicker = false;
  }

  onDetailsLocationPicked(loc: PickedLocation) {
    this.detailsLocation = loc;
    // Auto-fill address field with the detailed Nominatim address string
    if (loc.displayName) {
      this.detailsDraft.address = loc.displayName;
    }
    this.detailsLocationError = false;
    this.showDetailsLocationPicker = false;
  }

  onDetailsImageSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadingDetailsImage = true;
    this.cloudinary.upload(file).subscribe({
      next: url => { this.detailsImageUrl = url; this.uploadingDetailsImage = false; },
      error: () => { this.uploadingDetailsImage = false; this.detailsSaveMsg = 'Image upload failed.'; },
    });
  }

  saveDetails() {
    if (!this.restaurant) return;
    if (!this.detailsLocation) {
      this.detailsLocationError = true;
      return;
    }
    this.detailsLocationError = false;
    this.savingDetails = true;
    this.detailsSaveMsg = '';
    const cuisineList = this.detailsDraft.cuisine
      .split(',').map(c => c.trim()).filter(Boolean);
    this.partnerService.updateRestaurantDetails(this.restaurant.id, {
      name:         this.detailsDraft.name.trim()        || undefined,
      address:      this.detailsDraft.address.trim()     || undefined,
      cuisine:      cuisineList.length ? cuisineList     : undefined,
      deliveryTime: this.detailsDraft.deliveryTime       ?? undefined,
      minOrder:     this.detailsDraft.minOrder           ?? undefined,
      fssaiNumber:  this.detailsDraft.fssaiNumber.trim() || undefined,
      gstNumber:    this.detailsDraft.gstNumber.trim()   || undefined,
      imageUrl:     this.detailsImageUrl                 || undefined,
      location:     this.detailsLocation ? {
        city: this.detailsLocation.city, state: this.detailsLocation.state,
        country: this.detailsLocation.country, lat: this.detailsLocation.lat, lng: this.detailsLocation.lng,
      } : undefined,
    }).subscribe({
      next: res => {
        if (res.data) this.restaurant = res.data;
        this.savingDetails = false;
        this.editingDetails = false;
        this.detailsSaveMsg = '';
      },
      error: () => {
        this.savingDetails = false;
        this.detailsSaveMsg = 'Failed to save. Please try again.';
      },
    });
  }

  // ── Settings: owner edit ─────────────────────────────────────────
  openEditOwner() {
    this.ownerDraft = {
      firstName: this.user?.firstName ?? '',
      lastName:  this.user?.lastName  ?? '',
      phone:     this.user?.phone     ?? '',
    };
    this.ownerSaveMsg = '';
    this.editingOwner = true;
  }

  cancelEditOwner() { this.editingOwner = false; this.ownerSaveMsg = ''; }

  getStaffInitials(s: RestaurantStaff): string {
    return ((s.firstName?.[0] ?? '') + (s.lastName?.[0] ?? '')).toUpperCase() || '?';
  }

  refreshHours() {
    if (!this.restaurant) return;
    this.partnerService.getRestaurantById(this.restaurant.id).subscribe({
      next: res => {
        if (res.data) this.restaurant = res.data;
        this.initHours();
      },
    });
  }

  private startStatusPoll() {
    if (this.statusPollTimer) clearInterval(this.statusPollTimer);
    this.statusPollTimer = setInterval(() => {
      if (!this.restaurant) return;
      this.partnerService.getRestaurantById(this.restaurant.id).subscribe({
        next: res => { if (res.data) this.restaurant = { ...this.restaurant!, open: res.data.open }; },
      });
    }, 60_000);
  }

  ngOnDestroy() {
    if (this.statusPollTimer) clearInterval(this.statusPollTimer);
    if (this.sseController) { this.sseController.abort(); this.sseController = null; }
  }

  goBack()  { this.router.navigateByUrl('/partner'); }

  logout() {
    if (confirm('Logout?')) {
      this.tokenService.clearTokens();
      this.router.navigateByUrl('/partner/login');
    }
  }

  getMenuItemCount(): number {
    if (this.menuCategories.length) {
      return this.menuCategories.reduce((s, c) => s + c.items.length, 0);
    }
    if (!this.restaurant?.menu) return 0;
    return this.restaurant.menu.reduce((s, c) => s + (c.items?.length ?? 0), 0);
  }

  formatTime(t: string): string {
    if (!t) return '—';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
  }
}
