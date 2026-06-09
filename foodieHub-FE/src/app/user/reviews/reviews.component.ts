import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HomeService } from '../../home/home.service';
import { Review, PaginatedResponse } from '../../model/restaurant.model';

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reviews.component.html',
  styleUrl: './reviews.component.scss',
})
export class ReviewsComponent implements OnInit {
  reviews: Review[] = [];
  loading = false;

  pagination = { currentPage: 0, totalPages: 0, totalElements: 0, pageSize: 10 };

  readonly stars = [1, 2, 3, 4, 5];
  readonly starLabels = ['', '😞 Poor', '😐 Fair', '🙂 Good', '😊 Great', '🤩 Excellent'];

  constructor(private homeService: HomeService, private router: Router) {}

  ngOnInit(): void {
    this.loadPage(0);
  }

  loadPage(page: number): void {
    this.loading = true;
    this.homeService.getMyRatings(page, this.pagination.pageSize).subscribe({
      next: res => {
        const p: PaginatedResponse<Review> = res.data;
        this.reviews = p.content ?? [];
        this.pagination = {
          currentPage: p.currentPage,
          totalPages:  p.totalPages,
          totalElements: p.totalElements,
          pageSize:    p.pageSize,
        };
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  prevPage(): void {
    if (this.pagination.currentPage > 0) this.loadPage(this.pagination.currentPage - 1);
  }

  nextPage(): void {
    if (this.pagination.currentPage < this.pagination.totalPages - 1)
      this.loadPage(this.pagination.currentPage + 1);
  }

  starFill(review: Review, n: number): 'full' | 'half' | 'empty' {
    if (review.rating >= n) return 'full';
    if (review.rating >= n - 0.5) return 'half';
    return 'empty';
  }

  goToRestaurant(id: string): void {
    this.router.navigateByUrl(`/restaurant/${id}`);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
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
}
