import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { WishlistService } from '../../core/shared/wishlist.service';
import { Restaurant, PaginatedResponse } from '../../model/restaurant.model';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './wishlist.component.html',
  styleUrl: './wishlist.component.scss'
})
export class WishlistComponent implements OnInit {
  restaurants: Restaurant[] = [];
  pagination = { currentPage: 0, totalPages: 0, totalElements: 0, pageSize: 10 };
  loading = true;

  constructor(
    private wishlistService: WishlistService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.load();
  }

  load(page = 0) {
    this.loading = true;
    this.wishlistService.getWishlist(page, this.pagination.pageSize).subscribe({
      next: (res) => {
        const p: PaginatedResponse<Restaurant> = res.data;
        this.restaurants = p.content ?? [];
        this.pagination = {
          currentPage: p.currentPage,
          totalPages: p.totalPages,
          totalElements: p.totalElements,
          pageSize: p.pageSize
        };
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Failed to load wishlist.');
        this.loading = false;
      }
    });
  }

  remove(restaurantId: string, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.wishlistService.remove(restaurantId).subscribe({
      next: () => {
        this.restaurants = this.restaurants.filter(r => r.id !== restaurantId);
        this.pagination.totalElements--;
        this.toastr.success('Removed from wishlist.');
      },
      error: () => this.toastr.error('Could not remove from wishlist.')
    });
  }

  prevPage() {
    if (this.pagination.currentPage > 0) this.load(this.pagination.currentPage - 1);
  }

  nextPage() {
    if (this.pagination.currentPage < this.pagination.totalPages - 1)
      this.load(this.pagination.currentPage + 1);
  }

  get showingFrom(): number {
    return this.pagination.currentPage * this.pagination.pageSize + 1;
  }

  get showingTo(): number {
    return Math.min(
      (this.pagination.currentPage + 1) * this.pagination.pageSize,
      this.pagination.totalElements
    );
  }

  getBg(r: Restaurant): string {
    const colors = ['#ffe0b2', '#f8bbd0', '#e1bee7', '#b2dfdb', '#bbdefb'];
    const idx = r.name.charCodeAt(0) % colors.length;
    return colors[idx];
  }
}
