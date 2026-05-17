import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TokenService } from '../../core/shared/token.service';
import { PartnerService } from '../partner.service';
import { UserDetails } from '../../model/user.model';
import { Restaurant, PaginatedResponse } from '../../model/restaurant.model';

type Tab = 'dashboard' | 'orders' | 'menu' | 'analytics' | 'restaurants' | 'settings';

@Component({
  selector: 'app-partner-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './partner-dashboard.component.html',
  styleUrl: './partner-dashboard.component.scss',
})
export class PartnerDashboardComponent implements OnInit {
  activeTab: Tab = 'dashboard';
  user: UserDetails | null = null;

  // Restaurants tab state
  restaurants: Restaurant[] = [];
  restaurantPagination = { currentPage: 0, totalPages: 0, totalElements: 0, pageSize: 10 };
  restaurantsLoading = false;
  showCreateForm = false;
  newRestaurantName = '';
  creating = false;
  createError = '';

  get restaurantName(): string { return this.user?.bio || 'My Restaurant'; }
  get ownerInitials(): string {
    const f = this.user?.firstName?.[0] ?? '';
    const l = this.user?.lastName?.[0] ?? '';
    return (f + l).toUpperCase() || 'RO';
  }

  constructor(
    private tokenService: TokenService,
    private partnerService: PartnerService,
    private router: Router
  ) {}

  ngOnInit() {
    this.tokenService.userInfo$.subscribe(u => this.user = u);
  }

  goTab(tab: Tab) {
    this.activeTab = tab;
    if (tab === 'restaurants') {
      this.loadRestaurants(0);
    }
  }

  loadRestaurants(page: number) {
    if (!this.user?.id) return;
    this.restaurantsLoading = true;
    this.partnerService.getMyRestaurants(this.user.id, page, this.restaurantPagination.pageSize).subscribe({
      next: res => {
        const p = res.data;
        this.restaurants = p?.content ?? [];
        this.restaurantPagination = {
          currentPage: p?.currentPage ?? 0,
          totalPages: p?.totalPages ?? 0,
          totalElements: p?.totalElements ?? 0,
          pageSize: p?.pageSize ?? 10,
        };
        this.restaurantsLoading = false;
      },
      error: () => { this.restaurantsLoading = false; }
    });
  }

  openCreateForm() {
    this.showCreateForm = true;
    this.newRestaurantName = '';
    this.createError = '';
  }

  cancelCreate() {
    this.showCreateForm = false;
    this.newRestaurantName = '';
    this.createError = '';
  }

  submitCreate() {
    if (!this.newRestaurantName.trim()) {
      this.createError = 'Restaurant name is required.';
      return;
    }
    if (!this.user?.id) return;
    this.creating = true;
    this.createError = '';
    this.partnerService.createRestaurant(this.newRestaurantName.trim(), this.user.id).subscribe({
      next: () => {
        this.creating = false;
        this.showCreateForm = false;
        this.newRestaurantName = '';
        this.loadRestaurants(0);
      },
      error: () => {
        this.creating = false;
        this.createError = 'Failed to create restaurant. Please try again.';
      }
    });
  }

  get restaurantStartRow(): number {
    return this.restaurantPagination.currentPage * this.restaurantPagination.pageSize + 1;
  }
  get restaurantEndRow(): number {
    return Math.min(
      (this.restaurantPagination.currentPage + 1) * this.restaurantPagination.pageSize,
      this.restaurantPagination.totalElements
    );
  }

  prevPage() { this.loadRestaurants(this.restaurantPagination.currentPage - 1); }
  nextPage() { this.loadRestaurants(this.restaurantPagination.currentPage + 1); }

  logout() {
    if (confirm('Logout?')) {
      this.tokenService.clearTokens();
      this.router.navigateByUrl('/partner/login');
    }
  }
}
