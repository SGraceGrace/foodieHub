import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { SharedServiceService } from '../../core/shared/shared-service.service';
import { SearchService, SearchResult, RestaurantSearchResult, MenuItemSearchResult } from './search.service';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss'
})
export class SearchComponent implements OnInit, OnDestroy {

  searchValue   = '';
  loading       = false;
  searched      = false;

  restaurants: RestaurantSearchResult[] = [];
  menuItems:   MenuItemSearchResult[]   = [];

  private termSub!: Subscription;
  private searchSub!: Subscription;
  private termStream$ = new Subject<string>();

  constructor(
    private sharedService: SharedServiceService,
    private searchService: SearchService
  ) {}

  ngOnInit(): void {
    // Debounce: wait 350ms after the user stops typing before hitting the API
    this.searchSub = this.termStream$.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap(term => {
        if (!term.trim()) {
          this.restaurants = [];
          this.menuItems   = [];
          this.searched    = false;
          this.loading     = false;
          return [];
        }
        this.loading = true;
        return this.searchService.search(term);
      })
    ).subscribe({
      next: res => {
        const data = res?.data;
        this.restaurants = data?.restaurants ?? [];
        this.menuItems   = data?.menuItems   ?? [];
        this.loading     = false;
        this.searched    = true;
      },
      error: () => {
        this.loading  = false;
        this.searched = true;
      }
    });

    // React to search term emitted from the header search box
    this.termSub = this.sharedService.searchTerm$.subscribe(term => {
      this.searchValue = term;
      this.termStream$.next(term);
    });
  }

  ngOnDestroy(): void {
    this.termSub?.unsubscribe();
    this.searchSub?.unsubscribe();
  }

  get totalResults(): number {
    return this.restaurants.length + this.menuItems.length;
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }
}
