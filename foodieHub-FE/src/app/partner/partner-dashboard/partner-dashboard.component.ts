import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { take } from 'rxjs';
import { TokenService } from '../../core/shared/token.service';
import { PartnerService } from '../partner.service';
import { UserDetails } from '../../model/user.model';
import { Restaurant } from '../../model/restaurant.model';

@Component({
  selector: 'app-partner-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './partner-dashboard.component.html',
  styleUrl: './partner-dashboard.component.scss',
})
export class PartnerDashboardComponent implements OnInit {
  user: UserDetails | null = null;
  restaurants: Restaurant[] = [];
  pagination = { currentPage: 0, totalPages: 0, totalElements: 0, pageSize: 12 };
  loading = false;
  showCreateForm = false;
  newRestaurant = { name: '', address: '', fssaiNumber: '', gstNumber: '' };
  creating = false;
  createError = '';

  get ownerInitials(): string {
    const f = this.user?.firstName?.[0] ?? '';
    const l = this.user?.lastName?.[0] ?? '';
    return (f + l).toUpperCase() || 'RO';
  }

  get ownerName(): string {
    return [this.user?.firstName, this.user?.lastName].filter(Boolean).join(' ') || 'Owner';
  }

  constructor(
    private tokenService: TokenService,
    private partnerService: PartnerService,
    private router: Router
  ) {}

  ngOnInit() {
    this.tokenService.userInfo$.subscribe(u => { this.user = u; });
    this.tokenService.userInfo$.pipe(take(1)).subscribe(u => {
      if (u?.id) this.loadRestaurants(0);
    });
  }

  loadRestaurants(page: number) {
    if (!this.user?.id) return;
    this.loading = true;
    this.partnerService.getMyRestaurants(this.user.id, page, this.pagination.pageSize).subscribe({
      next: res => {
        const p = res.data;
        this.restaurants = p?.content ?? [];
        this.pagination = {
          currentPage: p?.currentPage ?? 0,
          totalPages: p?.totalPages ?? 0,
          totalElements: p?.totalElements ?? 0,
          pageSize: p?.pageSize ?? 12,
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

  cancelCreate() {
    this.showCreateForm = false;
    this.newRestaurant = { name: '', address: '', fssaiNumber: '', gstNumber: '' };
    this.createError = '';
  }

  submitCreate() {
    const { name, address, fssaiNumber } = this.newRestaurant;
    if (!name.trim())        { this.createError = 'Restaurant name is required.'; return; }
    if (!address.trim())     { this.createError = 'Address is required.'; return; }
    if (!fssaiNumber.trim()) { this.createError = 'FSSAI number is required.'; return; }
    if (!this.user?.id) return;

    this.creating = true;
    this.createError = '';
    this.partnerService.createRestaurant({
      name: name.trim(),
      address: address.trim(),
      fssaiNumber: fssaiNumber.trim(),
      gstNumber: this.newRestaurant.gstNumber.trim() || undefined,
      ownerId: this.user.id,
    }).subscribe({
      next: () => {
        this.creating = false;
        this.showCreateForm = false;
        this.newRestaurant = { name: '', address: '', fssaiNumber: '', gstNumber: '' };
        this.loadRestaurants(0);
      },
      error: () => {
        this.creating = false;
        this.createError = 'Failed to create restaurant. Please try again.';
      }
    });
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

  prevPage() { this.loadRestaurants(this.pagination.currentPage - 1); }
  nextPage() { this.loadRestaurants(this.pagination.currentPage + 1); }

  logout() {
    if (confirm('Logout?')) {
      this.tokenService.clearTokens();
      this.router.navigateByUrl('/partner/login');
    }
  }

  getMenuItemCount(r: Restaurant): number {
    if (!r.menu) return 0;
    return r.menu.reduce((sum, cat) => sum + (cat.items?.length ?? 0), 0);
  }

  getCityFromAddress(address?: string): string {
    if (!address) return '';
    const parts = address.split(',');
    return parts[parts.length - 1]?.trim() ?? '';
  }
}
