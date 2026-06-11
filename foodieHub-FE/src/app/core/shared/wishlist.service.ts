import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../model/apiResponse.model';
import { PaginatedResponse, Restaurant } from '../../model/restaurant.model';

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getWishlist(page = 0, size = 10): Observable<ApiResponse<PaginatedResponse<Restaurant>>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<ApiResponse<PaginatedResponse<Restaurant>>>(
      `${this.base}/api/v1/wishlist`, { params }
    );
  }

  add(restaurantId: string): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(
      `${this.base}/api/v1/wishlist/${restaurantId}`, {}
    );
  }

  remove(restaurantId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.base}/api/v1/wishlist/${restaurantId}`
    );
  }

  checkStatus(restaurantId: string): Observable<ApiResponse<{ saved: boolean }>> {
    return this.http.get<ApiResponse<{ saved: boolean }>>(
      `${this.base}/api/v1/wishlist/${restaurantId}/status`
    );
  }
}
