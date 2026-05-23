import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HomeService } from '../../home/home.service';
import { Restaurant } from '../../model/restaurant.model';
import { CUISINE_EMOJI, getCuisineEmoji, getCuisineBg } from '../../core/constants/cuisine.constants';

@Component({
  selector: 'app-cuisine',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cuisine.component.html',
  styleUrl: './cuisine.component.scss',
})
export class CuisineComponent implements OnInit {

  cuisines: string[] = [];
  restaurants: Restaurant[] = [];
  selectedCuisine = 'All';
  loading = false;

  // pagination
  currentPage = 0;
  totalPages   = 0;
  totalElements = 0;
  readonly pageSize = 10;

  constructor(private homeService: HomeService) {}

  ngOnInit() {
    this.cuisines = Object.keys(CUISINE_EMOJI).filter(k => k !== 'default');
    this.load();
  }

  selectCuisine(c?: string) {
    this.selectedCuisine = c ?? 'All';
    this.currentPage = 0;
    this.load();
  }

  prevPage() {
    if (this.currentPage > 0) this.goToPage(this.currentPage - 1);
  }

  nextPage() {
    if (this.currentPage < this.totalPages - 1) this.goToPage(this.currentPage + 1);
  }

  goToPage(page: number) {
    this.currentPage = page;
    this.load();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private load() {
    this.loading = true;
    const cuisine = this.selectedCuisine === 'All' ? undefined : this.selectedCuisine;
    this.homeService.getRestaurants(cuisine, undefined, undefined, this.currentPage, this.pageSize).subscribe({
      next: (res) => {
        const p = res.data;
        this.restaurants   = p?.content      ?? [];
        this.currentPage   = p?.currentPage  ?? 0;
        this.totalPages    = p?.totalPages   ?? 0;
        this.totalElements = p?.totalElements ?? 0;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  // helpers
  getEmoji(r: Restaurant): string        { return getCuisineEmoji(r.cuisine?.[0]); }
  getBg(r: Restaurant): string           { return getCuisineBg(r.cuisine?.[0]); }
  getCuisineEmoji(c: string): string     { return getCuisineEmoji(c); }
  getCuisineBg(c: string): string        { return getCuisineBg(c); }

  getDistanceLabel(r: Restaurant): string {
    if (r.distanceKm == null) return '';
    return r.distanceKm < 1
      ? `${Math.round(r.distanceKm * 1000)}m`
      : `${r.distanceKm.toFixed(1)}km`;
  }

  get showingFrom(): number {
    return this.totalElements === 0 ? 0 : this.currentPage * this.pageSize + 1;
  }
  get showingTo(): number {
    return Math.min((this.currentPage + 1) * this.pageSize, this.totalElements);
  }
}
