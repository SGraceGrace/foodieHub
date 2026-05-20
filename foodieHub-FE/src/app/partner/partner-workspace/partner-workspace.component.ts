import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TokenService } from '../../core/shared/token.service';
import { PartnerService } from '../partner.service';
import { UserDetails } from '../../model/user.model';
import { Restaurant, DaySchedule } from '../../model/restaurant.model';

type WorkspaceTab = 'overview' | 'orders' | 'menu' | 'analytics' | 'hours' | 'settings';

export interface DayHours {
  day: string;
  short: string;
  open: boolean;
  openTime: string;
  closeTime: string;
}

interface MenuExtra { label: string; amount: number; }

interface LocalMenuItem {
  name: string;
  price: number | null;
  gstPercent: number;
  isVeg: boolean;
  available: boolean;
  description: string;
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
  imports: [CommonModule, FormsModule],
  templateUrl: './partner-workspace.component.html',
  styleUrl: './partner-workspace.component.scss',
})
export class PartnerWorkspaceComponent implements OnInit {
  activeTab: WorkspaceTab = 'overview';
  user: UserDetails | null = null;
  restaurant: Restaurant | null = null;
  loading = false;

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
  itemFormItemIdx = -1; // -1 = new item
  itemDraft: LocalMenuItem = this.emptyItemDraft();
  itemFormError = '';

  readonly gstOptions = [0, 5, 12, 18];

  // ── Hours getters/methods ─────────────────────────────────────────
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
    this.menuCategories = [];
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

  closeItemForm() { this.showItemForm = false; }

  saveItem() {
    if (!this.itemDraft.name.trim())                { this.itemFormError = 'Item name is required.'; return; }
    if (this.itemDraft.price === null || this.itemDraft.price === undefined || (this.itemDraft.price as any) === '') {
      this.itemFormError = 'Price is required.'; return;
    }
    if (Number(this.itemDraft.price) < 0) { this.itemFormError = 'Price cannot be negative.'; return; }

    const saved: LocalMenuItem = {
      ...this.itemDraft,
      name:  this.itemDraft.name.trim(),
      price: Number(this.itemDraft.price),
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
        name:        item.name,
        price:       item.price ?? 0,
        gstPercent:  item.gstPercent,
        isVeg:       item.isVeg,
        available:   item.available,
        description: item.description,
        extras:      item.extras,
      })),
    }));
    this.partnerService.updateRestaurantMenu(this.restaurant.id, payload).subscribe({
      next: res => {
        if (res.data) this.restaurant = res.data;
        this.menuCategories = [];
        this.savingMenu = false;
        this.menuSavedMsg = 'Menu saved successfully.';
        this.menuDirty = false;
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
      description: '', extras: [],
    };
  }

  // ── Common helpers ────────────────────────────────────────────────
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
    private partnerService: PartnerService
  ) {}

  ngOnInit() {
    this.tokenService.userInfo$.subscribe(u => this.user = u);
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadRestaurant(id);
  }

  loadRestaurant(id: string) {
    this.loading = true;
    this.partnerService.getRestaurantById(id).subscribe({
      next: res => {
        this.restaurant = res.data ?? null;
        if (this.restaurant?.operatingHours?.length) {
          this.hours = this.mapHoursFromApi(this.restaurant.operatingHours);
        }
        this.initMenu();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.router.navigateByUrl('/partner');
      }
    });
  }

  private mapHoursFromApi(apiHours: DaySchedule[]): DayHours[] {
    return this.hours.map(d => {
      const match = apiHours.find(h => h.day.toUpperCase() === d.day.toUpperCase());
      return match ? { ...d, open: match.open, openTime: match.openTime, closeTime: match.closeTime } : d;
    });
  }

  goTab(tab: WorkspaceTab) {
    this.activeTab = tab;
    if (tab === 'menu') this.initMenu();
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
