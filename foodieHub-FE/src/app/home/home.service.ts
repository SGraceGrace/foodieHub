import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../model/apiResponse.model';
import { MenuCategory, PaginatedResponse, Slide, Restaurant } from '../model/restaurant.model';

@Injectable({ providedIn: 'root' })
export class HomeService {
  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getSlides(): Observable<ApiResponse<Slide[]>> {
    return this.http.get<ApiResponse<Slide[]>>(`${this.base}/api/v1/slides`);
  }

  getRestaurants(cuisine?: string, lat?: number, lng?: number, page = 0, size = 10, sort = 'relevance'): Observable<ApiResponse<PaginatedResponse<Restaurant>>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    if (cuisine)                        params = params.set('cuisine', cuisine);
    if (lat != null)                    params = params.set('lat', lat.toString());
    if (lng != null)                    params = params.set('lng', lng.toString());
    if (lat != null)                    params = params.set('radiusKm', '10');
    if (sort && sort !== 'relevance')   params = params.set('sort', sort);
    return this.http.get<ApiResponse<PaginatedResponse<Restaurant>>>(`${this.base}/api/v1/restaurants`, { params });
  }

  getCuisines(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.base}/api/v1/restaurants/cuisines`);
  }

  getRestaurantById(id: string): Observable<ApiResponse<Restaurant>> {
    return this.http.get<ApiResponse<Restaurant>>(`${this.base}/api/v1/restaurants/${id}`);
  }

  /**
   * Load the full menu for a restaurant from the menu_items collection (grouped by category).
   * Each MenuItem in the response includes an `id` field — pass it as menuItemId when adding to cart.
   * Called separately from getRestaurantById so menu and restaurant info load independently.
   */
  getMenuByRestaurant(restaurantId: string): Observable<ApiResponse<MenuCategory[]>> {
    return this.http.get<ApiResponse<MenuCategory[]>>(
      `${this.base}/api/v1/restaurants/${restaurantId}/menu`
    );
  }

  /**
   * Submit a 1–5 star rating for a restaurant, tied to a specific order.
   * orderId is required — the backend enforces one rating per order via a unique index.
   * driverRating (optional) is stored on the same Rating document in the ratings collection.
   */
  /**
   * Submit a 1–5 star rating for a restaurant, tied to a specific order.
   * orderId is required — the backend enforces one rating per order via a unique index.
   * driverEmail + driverRating are stored on the same Rating document (null when no driver/skipped).
   */
  rateRestaurant(
    restaurantId: string,
    rating: number,
    orderId: string,
    driverEmail?: string,
    driverRating?: number
  ): Observable<ApiResponse<Restaurant>> {
    const body: { rating: number; orderId: string; driverEmail?: string; driverRating?: number } =
      { rating, orderId };
    if (driverEmail)                body.driverEmail  = driverEmail;
    if (driverRating !== undefined) body.driverRating = driverRating;
    return this.http.post<ApiResponse<Restaurant>>(
      `${this.base}/api/v1/restaurants/${restaurantId}/rating`,
      body
    );
  }
}
