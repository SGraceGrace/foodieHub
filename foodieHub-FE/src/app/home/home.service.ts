import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../model/apiResponse.model';
import { Slide, Restaurant } from '../model/restaurant.model';

@Injectable({ providedIn: 'root' })
export class HomeService {
  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getSlides(): Observable<ApiResponse<Slide[]>> {
    return this.http.get<ApiResponse<Slide[]>>(`${this.base}/api/v1/slides`);
  }

  getRestaurants(cuisine?: string): Observable<ApiResponse<Restaurant[]>> {
    const url = cuisine
      ? `${this.base}/api/v1/restaurants?cuisine=${cuisine}`
      : `${this.base}/api/v1/restaurants`;
    return this.http.get<ApiResponse<Restaurant[]>>(url);
  }

  getCuisines(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.base}/api/v1/restaurants/cuisines`);
  }
}
