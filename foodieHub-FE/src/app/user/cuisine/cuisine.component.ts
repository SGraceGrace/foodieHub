import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HomeService } from '../../home/home.service';
import { Restaurant } from '../../model/restaurant.model';
import { CUISINE_EMOJI, getCuisineEmoji, getCuisineBg } from '../../core/constants/cuisine.constants';
import { DeliveryAddressService } from '../../core/shared/delivery-address.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-cuisine',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cuisine.component.html',
  styleUrl: './cuisine.component.scss',
})
export class CuisineComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('sentinel') sentinel!: ElementRef;

  cuisines: string[] = [];
  restaurants: Restaurant[] = [];
  selectedCuisine = 'All';
  selectedSort = 'relevance';
  loading = false;

  readonly sortOptions = [
    { value: 'relevance',    label: 'Relevance'          },
    { value: 'deliveryTime', label: 'Delivery Time'      },
    { value: 'priceLow',     label: 'Price: Low to High' },
    { value: 'priceHigh',    label: 'Price: High to Low' },
    { value: 'rating',       label: 'Rating'             },
  ];

  currentPage    = 0;
  totalPages     = 0;
  totalElements  = 0;
  readonly pageSize = 10;

  private userLat: number | undefined;
  private userLng: number | undefined;

  private observer!: IntersectionObserver;
  private addressSub!: Subscription;

  constructor(
    private homeService: HomeService,
    private deliveryAddressService: DeliveryAddressService
  ) {}

  ngOnInit() {
    this.cuisines = Object.keys(CUISINE_EMOJI).filter(k => k !== 'default');
    // Pick up the user's selected delivery address (lat/lng) so delivery-time
    // sort can use actual distance instead of the owner's static estimate
    this.addressSub = this.deliveryAddressService.selected$.subscribe(addr => {
      this.userLat = addr?.location?.lat ?? undefined;
      this.userLng = addr?.location?.lng ?? undefined;
    });
    this.load();
  }

  ngAfterViewInit() {
    this.observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !this.loading && this.hasMore) {
        this.currentPage++;
        this.load(true);
      }
    }, { threshold: 0.1 });
    this.observer.observe(this.sentinel.nativeElement);
  }

  ngOnDestroy() {
    this.observer?.disconnect();
    this.addressSub?.unsubscribe();
  }

  selectCuisine(c?: string) {
    this.selectedCuisine = c ?? 'All';
    this.currentPage = 0;
    this.restaurants = [];
    this.load();
  }

  selectSort(sort: string) {
    this.selectedSort = sort;
    this.currentPage = 0;
    this.restaurants = [];
    this.load();
  }

  get hasMore(): boolean {
    return this.currentPage < this.totalPages - 1;
  }

  get showingCount(): number { return this.restaurants.length; }

  private load(append = false) {
    this.loading = true;
    const cuisine = this.selectedCuisine === 'All' ? undefined : this.selectedCuisine;
    this.homeService.getRestaurants(cuisine, this.userLat, this.userLng, this.currentPage, this.pageSize, this.selectedSort).subscribe({
      next: (res) => {
        const p        = res.data;
        const incoming = p?.content ?? [];
        this.restaurants   = append ? [...this.restaurants, ...incoming] : incoming;
        this.currentPage   = p?.currentPage   ?? 0;
        this.totalPages    = p?.totalPages    ?? 0;
        this.totalElements = p?.totalElements ?? 0;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  // helpers
  getEmoji(r: Restaurant): string    { return getCuisineEmoji(r.cuisine?.[0]); }
  getBg(r: Restaurant): string       { return getCuisineBg(r.cuisine?.[0]); }
  getCuisineEmoji(c: string): string { return getCuisineEmoji(c); }
  getCuisineBg(c: string): string    { return getCuisineBg(c); }

  getDistanceLabel(r: Restaurant): string {
    if (r.distanceKm == null) return '';
    return r.distanceKm < 1
      ? `${Math.round(r.distanceKm * 1000)}m`
      : `${r.distanceKm.toFixed(1)}km`;
  }
}
