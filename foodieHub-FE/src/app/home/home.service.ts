import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../model/apiResponse.model';
import { PaginatedResponse, Slide, Restaurant } from '../model/restaurant.model';

@Injectable({ providedIn: 'root' })
export class HomeService {
  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getSlides(): Observable<ApiResponse<Slide[]>> {
    return this.http.get<ApiResponse<Slide[]>>(`${this.base}/api/v1/slides`);
  }

  getRestaurants(cuisine?: string, lat?: number, lng?: number): Observable<ApiResponse<PaginatedResponse<Restaurant>>> {
    let params = new HttpParams();
    if (cuisine)            params = params.set('cuisine', cuisine);
    if (lat != null)        params = params.set('lat', lat.toString());
    if (lng != null)        params = params.set('lng', lng.toString());
    if (lat != null)        params = params.set('radiusKm', '10');
    return this.http.get<ApiResponse<PaginatedResponse<Restaurant>>>(`${this.base}/api/v1/restaurants`, { params });
  }

  getCuisines(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.base}/api/v1/restaurants/cuisines`);
  }
}
