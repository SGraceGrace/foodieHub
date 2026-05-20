import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { take, catchError } from 'rxjs/operators';
import { TokenService } from '../../core/shared/token.service';
import { CloudinaryService } from '../../core/shared/cloudinary.service';
import { PartnerService } from '../partner.service';
import { UserDetails } from '../../model/user.model';
import { Restaurant, RestaurantStaff } from '../../model/restaurant.model';
import { LocationPickerComponent, PickedLocation } from '../../core/shared/components/location-picker/location-picker.component';

type DashboardSection = 'restaurants' | 'staff';

@Component({
  selector: 'app-partner-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, LocationPickerComponent],
  templateUrl: './partner-dashboard.component.html',
  styleUrl: './partner-dashboard.component.scss',
})
export class PartnerDashboardComponent implements OnInit {
  user: UserDetails | null = null;
  activeSection: DashboardSection = 'restaurants';

  // ── Restaurants ─────────────────────────────────────────────────
  restaurants: Restaurant[] = [];
  pagination = { currentPage: 0, totalPages: 0, totalElements: 0, pageSize: 12 };
  loading = false;
  showCreateForm = false;
  newRestaurant = { name: '', address: '', fssaiNumber: '', gstNumber: '' };
  creating = false;
  createError = '';
  restaurantImageUrl = '';
  uploadingRestaurantImage = false;
  restaurantLat: number | undefined;
  restaurantLng: number | undefined;
  showRestaurantLocationPicker = false;

  // ── Staff ────────────────────────────────────────────────────────
  ownerRestaurants: Restaurant[] = [];
  staff: RestaurantStaff[] = [];
  staffLoading = false;
  showAddStaff = false;
  addingStaff = false;
  staffError = '';
  newStaff = { firstName: '', lastName: '', email: '', password: '' };

  selectedRestaurantIds: string[] = [];
  restaurantSearch = '';
  showRestaurantDropdown = false;
  showPassword = false;

  showInlineCreateRestaurant = false;
  inlineCreating = false;
  inlineCreateError = '';
  newInlineRestaurant = { name: '', address: '', fssaiNumber: '', gstNumber: '' };

  viewingStaff: RestaurantStaff | null = null;
  showStaffRestaurantsPopup = false;

  confirmArchiveStaff: RestaurantStaff | null = null;
  confirmActivateStaff: RestaurantStaff | null = null;
  archiving = false;
  activating = false;

  staffRestaurantFilter = '';
  staffStatusFilter = '';

  toast: { message: string; type: 'error' | 'success' } | null = null;
  private toastTimer: any;

  // ── Getters ──────────────────────────────────────────────────────
  get ownerInitials(): string {
    const f = this.user?.firstName?.[0] ?? '';
    const l = this.user?.lastName?.[0] ?? '';
    return (f + l).toUpperCase() || 'RO';
  }

  get ownerName(): string {
    return [this.user?.firstName, this.user?.lastName].filter(Boolean).join(' ') || 'Owner';
  }

  get startRow(): number {
    return this.pagination.currentPage * this.pagination.pageSize + 1;
  }

  get endRow(): number {
    return Math.min(
      (this.pagination.currentPage + 1) * this.pagination.pageSize,
      this.pagination.totalElements
    );
  }

  get filteredRestaurantsForDropdown(): Restaurant[] {
    const q = this.restaurantSearch.toLowerCase().trim();
    if (!q) return this.ownerRestaurants;
    return this.ownerRestaurants.filter(r => r.name.toLowerCase().includes(q));
  }

  get selectedRestaurants(): Restaurant[] {
    return this.ownerRestaurants.filter(r => this.selectedRestaurantIds.includes(r.id));
  }

  isSelected(id: string): boolean {
    return this.selectedRestaurantIds.includes(id);
  }

  get pwRules() {
    const p = this.newStaff.password;
    return {
      length:    p.length >= 8,
      uppercase: /[A-Z]/.test(p),
      number:    /[0-9]/.test(p),
      special:   /[^A-Za-z0-9]/.test(p),
    };
  }

  get pwValid(): boolean {
    const r = this.pwRules;
    return r.length && r.uppercase && r.number && r.special;
  }

  get filteredStaff(): RestaurantStaff[] {
    return this.staff.filter(s => {
      const matchesRestaurant = !this.staffRestaurantFilter ||
        s.assignedRestaurantIds?.includes(this.staffRestaurantFilter);
      const matchesStatus = !this.staffStatusFilter ||
        s.status === this.staffStatusFilter;
      return matchesRestaurant && matchesStatus;
    });
  }

  get isFiltering(): boolean {
    return !!(this.staffRestaurantFilter || this.staffStatusFilter);
  }

  constructor(
    private tokenService: TokenService,
    private partnerService: PartnerService,
    private cloudinary: CloudinaryService,
    private router: Router
  ) {}

  ngOnInit() {
    this.tokenService.userInfo$.subscribe(u => { this.user = u; });
    this.tokenService.userInfo$.pipe(take(1)).subscribe(u => {
      if (u?.id) this.loadRestaurants(0);
    });
  }

  // ── Section ──────────────────────────────────────────────────────
  goSection(section: DashboardSection) {
    this.activeSection = section;
    if (section === 'staff') {
      this.loadOwnerRestaurants(() => this.loadAllStaff());
    }
  }

  // ── Restaurants ──────────────────────────────────────────────────
  loadRestaurants(page: number) {
    if (!this.user?.id) return;
    this.loading = true;
    this.partnerService.getMyRestaurants(this.user.id, page, this.pagination.pageSize).subscribe({
      next: res => {
        const p = res.data;
        this.restaurants = p?.content ?? [];
        this.pagination = {
          currentPage: p?.currentPage ?? 0,
          totalPages:  p?.totalPages  ?? 0,
          totalElements: p?.totalElements ?? 0,
          pageSize:    p?.pageSize    ?? 12,
        };
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  manage(restaurant: Restaurant) {
    this.router.navigate(['/partner/restaurants', restaurant.id]);
  }

  openCreateForm() {
    this.showCreateForm = true;
    this.newRestaurant = { name: '', address: '', fssaiNumber: '', gstNumber: '' };
    this.createError = '';
  }

  onRestaurantImageSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadingRestaurantImage = true;
    this.cloudinary.upload(file).subscribe({
      next: url => { this.restaurantImageUrl = url; this.uploadingRestaurantImage = false; },
      error: () => { this.uploadingRestaurantImage = false; this.createError = 'Image upload failed.'; },
    });
  }

  onRestaurantLocationPicked(loc: PickedLocation) {
    this.restaurantLat = loc.lat;
    this.restaurantLng = loc.lng;
    if (!this.newRestaurant.address) this.newRestaurant.address = loc.displayName;
    this.showRestaurantLocationPicker = false;
  }

  cancelCreate() {
    this.showCreateForm = false;
    this.newRestaurant = { name: '', address: '', fssaiNumber: '', gstNumber: '' };
    this.restaurantImageUrl = '';
    this.restaurantLat = undefined;
    this.restaurantLng = undefined;
    this.createError = '';
  }

  submitCreate() {
    const { name, address, fssaiNumber } = this.newRestaurant;
    if (!name.trim())        { this.createError = 'Restaurant name is required.'; return; }
    if (!address.trim())     { this.createError = 'Address is required.'; return; }
    if (!fssaiNumber.trim()) { this.createError = 'FSSAI number is required.'; return; }
    if (!this.restaurantLat || !this.restaurantLng) { this.createError = 'location'; return; }
    if (!this.user?.id) return;

    this.creating = true;
    this.createError = '';
    this.partnerService.createRestaurant({
      name: name.trim(), address: address.trim(),
      fssaiNumber: fssaiNumber.trim(),
      gstNumber: this.newRestaurant.gstNumber.trim() || undefined,
      ownerId: this.user.id,
      imageUrl: this.restaurantImageUrl || undefined,
      lat: this.restaurantLat,
      lng: this.restaurantLng,
    }).subscribe({
      next: () => {
        this.creating = false;
        this.showCreateForm = false;
        this.newRestaurant = { name: '', address: '', fssaiNumber: '', gstNumber: '' };
        this.restaurantImageUrl = '';
        this.restaurantLat = undefined;
        this.restaurantLng = undefined;
        this.loadRestaurants(0);
      },
      error: () => {
        this.creating = false;
        this.createError = 'Failed to create restaurant. Please try again.';
      }
    });
  }

  prevPage() { this.loadRestaurants(this.pagination.currentPage - 1); }
  nextPage() { this.loadRestaurants(this.pagination.currentPage + 1); }

  // ── Staff: load ──────────────────────────────────────────────────
  loadOwnerRestaurants(callback?: () => void) {
    if (!this.user?.id) return;
    this.partnerService.getMyRestaurants(this.user.id, 0, 100).subscribe({
      next: res => { this.ownerRestaurants = res.data?.content ?? []; callback?.(); },
      error: () => { callback?.(); }
    });
  }

  loadAllStaff() {
    if (!this.ownerRestaurants.length) { this.staff = []; return; }
    this.staffLoading = true;
    const calls = this.ownerRestaurants.map(r =>
      this.partnerService.getRestaurantStaff(r.id).pipe(
        catchError(() => of({ data: [] as RestaurantStaff[], successMessage: '', httpCode: 0, errorMsg: [] }))
      )
    );
    forkJoin(calls).subscribe(results => {
      const map = new Map<number, RestaurantStaff>();
      for (const res of results) {
        for (const s of (res.data ?? [])) map.set(s.id, s);
      }
      this.staff = Array.from(map.values()).sort((a, b) => b.id - a.id);
      this.staffLoading = false;
    });
  }

  // ── Staff: add form ──────────────────────────────────────────────
  openAddStaff() {
    this.newStaff = { firstName: '', lastName: '', email: '', password: '' };
    this.staffError = '';
    this.showPassword = false;
    this.selectedRestaurantIds = [];
    this.restaurantSearch = '';
    this.showRestaurantDropdown = false;
    this.showInlineCreateRestaurant = false;
    this.showAddStaff = true;
  }

  cancelAddStaff() { this.showAddStaff = false; }

  togglePassword() { this.showPassword = !this.showPassword; }

  toggleRestaurantSelection(r: Restaurant) {
    const idx = this.selectedRestaurantIds.indexOf(r.id);
    if (idx === -1) {
      this.selectedRestaurantIds = [...this.selectedRestaurantIds, r.id];
    } else {
      this.selectedRestaurantIds = this.selectedRestaurantIds.filter(id => id !== r.id);
    }
  }

  removeRestaurant(id: string) {
    this.selectedRestaurantIds = this.selectedRestaurantIds.filter(x => x !== id);
  }

  onRestaurantSearchInput() { this.showRestaurantDropdown = true; }

  closeRestaurantDropdown() {
    setTimeout(() => {
      if (!this.showInlineCreateRestaurant) this.showRestaurantDropdown = false;
    }, 150);
  }

  openInlineCreate(e: Event) {
    e.preventDefault();
    this.newInlineRestaurant = { name: '', address: '', fssaiNumber: '', gstNumber: '' };
    this.inlineCreateError = '';
    this.showInlineCreateRestaurant = true;
    this.showRestaurantDropdown = false;
  }

  cancelInlineCreate() {
    this.showInlineCreateRestaurant = false;
    this.showRestaurantDropdown = true;
  }

  submitInlineCreate() {
    const { name, address, fssaiNumber } = this.newInlineRestaurant;
    if (!name.trim())        { this.inlineCreateError = 'Name is required.'; return; }
    if (!address.trim())     { this.inlineCreateError = 'Address is required.'; return; }
    if (!fssaiNumber.trim()) { this.inlineCreateError = 'FSSAI is required.'; return; }
    if (!this.user?.id) return;

    this.inlineCreating = true;
    this.inlineCreateError = '';
    this.partnerService.createRestaurant({
      name: name.trim(), address: address.trim(),
      fssaiNumber: fssaiNumber.trim(),
      gstNumber: this.newInlineRestaurant.gstNumber.trim() || undefined,
      ownerId: this.user.id,
    }).subscribe({
      next: res => {
        if (res.data) {
          this.ownerRestaurants = [res.data, ...this.ownerRestaurants];
          this.selectedRestaurantIds = [...this.selectedRestaurantIds, res.data.id];
        }
        this.inlineCreating = false;
        this.showInlineCreateRestaurant = false;
        this.showRestaurantDropdown = true;
      },
      error: err => {
        const msg = err?.error?.errorMsg?.[0] || err?.error?.message || 'Failed to create restaurant.';
        this.inlineCreateError = msg;
        this.showToast(msg);
        this.inlineCreating = false;
      }
    });
  }

  submitAddStaff() {
    const { firstName, lastName, email, password } = this.newStaff;
    if (!firstName.trim())                  { this.staffError = 'First name is required.'; return; }
    if (!lastName.trim())                   { this.staffError = 'Last name is required.'; return; }
    if (!email.trim())                      { this.staffError = 'Email is required.'; return; }
    if (!this.pwValid)                      { this.staffError = 'Password does not meet requirements.'; return; }
    if (!this.selectedRestaurantIds.length) { this.staffError = 'Select at least one restaurant.'; return; }

    this.addingStaff = true;
    this.staffError = '';
    this.partnerService.createRestaurantStaff({
      firstName: firstName.trim(), lastName: lastName.trim(),
      email: email.trim(), password: password.trim(),
      restaurantIds: this.selectedRestaurantIds,
    }).subscribe({
      next: res => {
        if (res.data) this.staff = [res.data, ...this.staff];
        this.showAddStaff = false;
        this.addingStaff = false;
      },
      error: err => {
        const msg = err?.error?.errorMsg?.[0] || err?.error?.message || 'Failed to create user.';
        this.showToast(msg);
        this.addingStaff = false;
      }
    });
  }

  // ── Staff: actions ───────────────────────────────────────────────
  openStaffRestaurants(s: RestaurantStaff) {
    this.viewingStaff = s;
    this.showStaffRestaurantsPopup = true;
  }

  closeStaffRestaurants() {
    this.showStaffRestaurantsPopup = false;
    this.viewingStaff = null;
  }

  openConfirmArchive(s: RestaurantStaff)  { this.confirmArchiveStaff = s; }
  cancelArchive()                          { this.confirmArchiveStaff = null; }

  confirmArchive() {
    if (!this.confirmArchiveStaff) return;
    const target = this.confirmArchiveStaff;
    this.archiving = true;
    this.partnerService.archiveStaff(target.id).subscribe({
      next: () => {
        this.updateStaffStatus(target.id, 'INACTIVE');
        this.confirmArchiveStaff = null;
        this.archiving = false;
        this.showToast(`${target.firstName} ${target.lastName} has been archived.`, 'success');
      },
      error: err => {
        const msg = err?.error?.errorMsg?.[0] || err?.error?.message || 'Failed to archive user.';
        this.showToast(msg);
        this.archiving = false;
        this.confirmArchiveStaff = null;
      }
    });
  }

  openConfirmActivate(s: RestaurantStaff) { this.confirmActivateStaff = s; }
  cancelActivate()                         { this.confirmActivateStaff = null; }

  confirmActivate() {
    if (!this.confirmActivateStaff) return;
    const target = this.confirmActivateStaff;
    this.activating = true;
    this.partnerService.activateStaff(target.id).subscribe({
      next: () => {
        this.updateStaffStatus(target.id, 'ACTIVE');
        this.confirmActivateStaff = null;
        this.activating = false;
        this.showToast(`${target.firstName} ${target.lastName} has been activated.`, 'success');
      },
      error: err => {
        const msg = err?.error?.errorMsg?.[0] || err?.error?.message || 'Failed to activate user.';
        this.showToast(msg);
        this.activating = false;
        this.confirmActivateStaff = null;
      }
    });
  }

  private updateStaffStatus(id: number, status: string) {
    const idx = this.staff.findIndex(s => s.id === id);
    if (idx !== -1) this.staff[idx] = { ...this.staff[idx], status };
  }

  getRestaurantDetails(id: string): Restaurant | undefined {
    return this.ownerRestaurants.find(r => r.id === id);
  }

  clearStaffFilters() {
    this.staffRestaurantFilter = '';
    this.staffStatusFilter = '';
  }

  getStaffInitials(s: RestaurantStaff): string {
    return ((s.firstName?.[0] ?? '') + (s.lastName?.[0] ?? '')).toUpperCase() || '?';
  }

  // ── Toast ────────────────────────────────────────────────────────
  showToast(message: string, type: 'error' | 'success' = 'error') {
    clearTimeout(this.toastTimer);
    this.toast = { message, type };
    this.toastTimer = setTimeout(() => { this.toast = null; }, 4000);
  }

  dismissToast() { this.toast = null; }

  // ── Helpers ──────────────────────────────────────────────────────
  getMenuItemCount(r: Restaurant): number {
    if (!r.menu) return 0;
    return r.menu.reduce((sum, cat) => sum + (cat.items?.length ?? 0), 0);
  }

  getCityFromAddress(address?: string): string {
    if (!address) return '';
    const parts = address.split(',');
    return parts[parts.length - 1]?.trim() ?? '';
  }

  logout() {
    if (confirm('Logout?')) {
      this.tokenService.clearTokens();
      this.router.navigateByUrl('/partner/login');
    }
  }
}
