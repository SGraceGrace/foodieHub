import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { AdminService, CreateAdminRequest, SlideRequest } from './admin.service';
import { ActivityLog, AdminUserResponse, PaginatedResponse, Restaurant, Slide } from '../model/restaurant.model';
import { AdminHeaderComponent } from './admin-header/admin-header.component';

type Tab = 'dashboard' | 'users' | 'restaurants' | 'restaurant-owners' | 'orders' | 'payments' | 'support' | 'reports' | 'slides' | 'activity-log';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminHeaderComponent],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent implements OnInit {
  activeTab: Tab = 'dashboard';

  // Users
  users: AdminUserResponse[] = [];
  userSearch = '';
  userStatusFilter = '';
  userRoleFilter = '';
  pagination = { currentPage: 0, totalPages: 0, totalElements: 0, pageSize: 10 };

  // Create Admin modal
  showCreateAdminModal = false;
  showAdminPassword = false;
  createAdminForm: CreateAdminRequest = this.emptyAdminForm();
  adminFormErrors = { firstName: '', email: '', password: '' };

  // Restaurants
  restaurants: Restaurant[] = [];
  restaurantSearch = '';
  restaurantPagination = { currentPage: 0, totalPages: 0, totalElements: 0, pageSize: 10 };

  // Restaurant Owners
  owners: AdminUserResponse[] = [];
  ownerStatusFilter = 'PENDING';
  ownerPagination = { currentPage: 0, totalPages: 0, totalElements: 0, pageSize: 10 };

  // Activity Log
  activityLogs: ActivityLog[] = [];

  // Slides
  slides: Slide[] = [];
  showEditModal = false;
  editingSlide: Slide | null = null;
  form: SlideRequest = this.emptyForm();
  editForm: SlideRequest = this.emptyForm();

  constructor(private adminService: AdminService, private toastr: ToastrService) {}

  ngOnInit() {}

  goTab(tab: Tab) {
    this.activeTab = tab;
    if (tab === 'users') this.loadUsers();
    if (tab === 'restaurants') this.loadRestaurants();
    if (tab === 'restaurant-owners') this.loadOwners();
    if (tab === 'slides') this.loadSlides();
    if (tab === 'activity-log') this.loadActivityLogs();
  }

  // ── Users ────────────────────────────────────────────────────────

  loadUsers(page = 0) {
    this.adminService.getUsers(this.userStatusFilter, this.userSearch, this.userRoleFilter, page, this.pagination.pageSize).subscribe({
      next: (res) => {
        const p: PaginatedResponse<AdminUserResponse> = res.data;
        this.users = p.content;
        this.pagination = { currentPage: p.currentPage, totalPages: p.totalPages, totalElements: p.totalElements, pageSize: p.pageSize };
      },
      error: () => this.toastr.error('Failed to load users.'),
    });
  }

  get pageNumbers(): number[] {
    const { currentPage, totalPages } = this.pagination;
    const pages: number[] = [];
    for (let i = Math.max(0, currentPage - 2); i <= Math.min(totalPages - 1, currentPage + 2); i++) {
      pages.push(i);
    }
    return pages;
  }

  pagingStart(): number { return this.pagination.currentPage * this.pagination.pageSize + 1; }
  pagingEnd(): number { return Math.min((this.pagination.currentPage + 1) * this.pagination.pageSize, this.pagination.totalElements); }

  suspendUser(user: AdminUserResponse) {
    if (!confirm(`Suspend ${user.firstName} ${user.lastName}?`)) return;
    this.adminService.suspendUser(user.id).subscribe({
      next: (res) => {
        const idx = this.users.findIndex((u) => u.id === user.id);
        if (idx !== -1) this.users[idx] = res.data;
        this.toastr.success('User suspended.');
      },
      error: () => this.toastr.error('Failed to suspend user.'),
    });
  }

  unsuspendUser(user: AdminUserResponse) {
    this.adminService.unsuspendUser(user.id).subscribe({
      next: (res) => {
        const idx = this.users.findIndex((u) => u.id === user.id);
        if (idx !== -1) this.users[idx] = res.data;
        this.toastr.success('User unsuspended.');
      },
      error: () => this.toastr.error('Failed to unsuspend user.'),
    });
  }

  // ── Restaurants ───────────────────────────────────────────────────

  loadRestaurants(page = 0) {
    this.adminService.getRestaurants(this.restaurantSearch, page, this.restaurantPagination.pageSize).subscribe({
      next: (res) => {
        const p: PaginatedResponse<Restaurant> = res.data;
        this.restaurants = p.content;
        this.restaurantPagination = { currentPage: p.currentPage, totalPages: p.totalPages, totalElements: p.totalElements, pageSize: p.pageSize };
      },
      error: () => this.toastr.error('Failed to load restaurants.'),
    });
  }

  get restaurantPageNumbers(): number[] {
    const { currentPage, totalPages } = this.restaurantPagination;
    const pages: number[] = [];
    for (let i = Math.max(0, currentPage - 2); i <= Math.min(totalPages - 1, currentPage + 2); i++) {
      pages.push(i);
    }
    return pages;
  }

  restaurantPagingStart(): number { return this.restaurantPagination.currentPage * this.restaurantPagination.pageSize + 1; }
  restaurantPagingEnd(): number { return Math.min((this.restaurantPagination.currentPage + 1) * this.restaurantPagination.pageSize, this.restaurantPagination.totalElements); }

  // ── Restaurant Owners ────────────────────────────────────────────

  loadOwners(page = 0) {
    this.adminService.getRestaurantOwners(this.ownerStatusFilter || undefined, page, this.ownerPagination.pageSize).subscribe({
      next: (res) => {
        const p: PaginatedResponse<AdminUserResponse> = res.data;
        this.owners = p.content;
        this.ownerPagination = { currentPage: p.currentPage, totalPages: p.totalPages, totalElements: p.totalElements, pageSize: p.pageSize };
      },
      error: () => this.toastr.error('Failed to load restaurant owners.'),
    });
  }

  get ownerPageNumbers(): number[] {
    const { currentPage, totalPages } = this.ownerPagination;
    const pages: number[] = [];
    for (let i = Math.max(0, currentPage - 2); i <= Math.min(totalPages - 1, currentPage + 2); i++) {
      pages.push(i);
    }
    return pages;
  }

  ownerPagingStart(): number { return this.ownerPagination.currentPage * this.ownerPagination.pageSize + 1; }
  ownerPagingEnd(): number { return Math.min((this.ownerPagination.currentPage + 1) * this.ownerPagination.pageSize, this.ownerPagination.totalElements); }

  approveOwner(owner: AdminUserResponse) {
    if (!confirm(`Approve ${owner.restaurantName || owner.firstName + ' ' + owner.lastName}?`)) return;
    this.adminService.approveOwner(owner.id).subscribe({
      next: (res) => {
        const idx = this.owners.findIndex((o) => o.id === owner.id);
        if (idx !== -1) this.owners[idx] = res.data;
        this.toastr.success('Owner approved.');
      },
      error: () => this.toastr.error('Failed to approve owner.'),
    });
  }

  rejectOwner(owner: AdminUserResponse) {
    if (!confirm(`Reject ${owner.restaurantName || owner.firstName + ' ' + owner.lastName}?`)) return;
    this.adminService.rejectOwner(owner.id).subscribe({
      next: (res) => {
        const idx = this.owners.findIndex((o) => o.id === owner.id);
        if (idx !== -1) this.owners[idx] = res.data;
        this.toastr.success('Owner rejected.');
      },
      error: () => this.toastr.error('Failed to reject owner.'),
    });
  }

  // ── Create Admin ─────────────────────────────────────────────────

  openCreateAdmin() {
    this.createAdminForm = this.emptyAdminForm();
    this.adminFormErrors = { firstName: '', email: '', password: '' };
    this.showAdminPassword = false;
    this.showCreateAdminModal = true;
  }

  submitCreateAdmin() {
    if (!this.validateAdminForm()) return;
    this.adminService.createAdmin(this.createAdminForm).subscribe({
      next: () => {
        this.toastr.success('Admin user created successfully.');
        this.showCreateAdminModal = false;
        this.loadUsers();
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Failed to create admin.'),
    });
  }

  private validateAdminForm(): boolean {
    this.adminFormErrors = { firstName: '', email: '', password: '' };
    let valid = true;

    if (!this.createAdminForm.firstName.trim()) {
      this.adminFormErrors.firstName = 'First name is required.';
      valid = false;
    }

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!this.createAdminForm.email.trim()) {
      this.adminFormErrors.email = 'Email is required.';
      valid = false;
    } else if (!emailRe.test(this.createAdminForm.email)) {
      this.adminFormErrors.email = 'Enter a valid email address.';
      valid = false;
    }

    const pw = this.createAdminForm.password;
    if (!pw) {
      this.adminFormErrors.password = 'Password is required.';
      valid = false;
    } else if (pw.length < 8) {
      this.adminFormErrors.password = 'Must be at least 8 characters.';
      valid = false;
    } else if (!/[A-Z]/.test(pw)) {
      this.adminFormErrors.password = 'Must contain at least one uppercase letter.';
      valid = false;
    } else if (!/[0-9]/.test(pw)) {
      this.adminFormErrors.password = 'Must contain at least one number.';
      valid = false;
    }

    return valid;
  }

  // ── Activity Log ──────────────────────────────────────────────────

  loadActivityLogs() {
    this.adminService.getActivityLogs().subscribe({
      next: (res) => (this.activityLogs = res.data ?? []),
      error: () => this.toastr.error('Failed to load activity logs.'),
    });
  }

  actionLabel(action: string): string {
    const labels: Record<string, string> = {
      CREATE_ADMIN: 'Created Admin',
      SUSPEND_USER: 'Suspended User',
      UNSUSPEND_USER: 'Unsuspended User',
      APPROVE_OWNER: 'Approved Owner',
      REJECT_OWNER: 'Rejected Owner',
    };
    return labels[action] ?? action;
  }

  actionClass(action: string): string {
    if (action === 'CREATE_ADMIN') return 'log-badge create';
    if (action === 'SUSPEND_USER') return 'log-badge suspend';
    if (action === 'UNSUSPEND_USER') return 'log-badge restore';
    if (action === 'APPROVE_OWNER') return 'log-badge create';
    if (action === 'REJECT_OWNER') return 'log-badge suspend';
    return 'log-badge';
  }

  // ── Slides ──────────────────────────────────────────────────────

  loadSlides() {
    this.adminService.getSlides().subscribe({
      next: (res) => (this.slides = res.data ?? []),
    });
  }

  addSlide() {
    if (!this.form.title.trim()) { this.toastr.error('Title is required.'); return; }
    this.adminService.createSlide(this.form).subscribe({
      next: (res) => {
        this.slides.push(res.data);
        this.form = this.emptyForm();
        this.toastr.success('Slide added!');
      },
      error: () => this.toastr.error('Failed to add slide.'),
    });
  }

  openEdit(slide: Slide) {
    this.editingSlide = slide;
    this.editForm = {
      title: slide.title, highlightWord: slide.highlightWord,
      description: slide.description, btn1Text: slide.btn1Text,
      btn2Text: slide.btn2Text, emoji: slide.emoji,
      badgeIcon: slide.badgeIcon, badgeText: slide.badgeText,
      displayOrder: slide.displayOrder,
    };
    this.showEditModal = true;
  }

  saveEdit() {
    if (!this.editingSlide) return;
    this.adminService.updateSlide(this.editingSlide.id, this.editForm).subscribe({
      next: (res) => {
        const idx = this.slides.findIndex((s) => s.id === this.editingSlide!.id);
        if (idx !== -1) this.slides[idx] = res.data;
        this.showEditModal = false;
        this.toastr.success('Slide updated!');
      },
      error: () => this.toastr.error('Failed to update slide.'),
    });
  }

  deleteSlide(slide: Slide) {
    if (!confirm('Delete this slide?')) return;
    this.adminService.deleteSlide(slide.id).subscribe({
      next: () => {
        this.slides = this.slides.filter((s) => s.id !== slide.id);
        this.toastr.success('Slide deleted.');
      },
    });
  }

  toggle(slide: Slide) {
    this.adminService.toggleSlide(slide.id).subscribe({
      next: (res) => {
        const idx = this.slides.findIndex((s) => s.id === slide.id);
        if (idx !== -1) this.slides[idx] = res.data;
      },
    });
  }

  clearForm() { this.form = this.emptyForm(); }

  get pwHasLength(): boolean { return this.createAdminForm.password.length >= 8; }
  get pwHasUppercase(): boolean { return /[A-Z]/.test(this.createAdminForm.password); }
  get pwHasNumber(): boolean { return /[0-9]/.test(this.createAdminForm.password); }

  private emptyAdminForm(): CreateAdminRequest {
    return { firstName: '', lastName: '', email: '', password: '' };
  }

  private emptyForm(): SlideRequest {
    return { title: '', highlightWord: '', description: '', btn1Text: '', btn2Text: '', emoji: '🍛', badgeIcon: '⚡', badgeText: '', displayOrder: 0 };
  }
}
