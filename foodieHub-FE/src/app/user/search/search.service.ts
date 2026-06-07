import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../model/apiResponse.model';

// ── Search result models ────────────────────────────────────────────────────

export interface RestaurantSearchResult {
  id:           string;
  name:         string;
  address:      string;
  cuisine:      string[];
  rating:       number;
  ratingCount:  number;
  deliveryTime: number;
  minOrder:     number;
  priceRange:   string;
  open:         boolean;
  imageUrl:     string;
}

export interface MenuItemSearchResult {
  id:             string;
  restaurantId:   string;
  restaurantName: string;
  category:       string;
  name:           string;
  price:          number;
  veg:            boolean;
  description:    string;
  imageUrl:       string;
}

export interface SearchResult {
  restaurants: RestaurantSearchResult[];
  menuItems:   MenuItemSearchResult[];
}

// ── Service ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class SearchService {

  private readonly base = `${environment.apiBaseUrl}/api/search`;

  constructor(private http: HttpClient) {}

  search(q: string): Observable<ApiResponse<SearchResult>> {
    const params = new HttpParams().set('q', q);
    return this.http.get<ApiResponse<SearchResult>>(this.base, { params });
  }
}
