import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../model/apiResponse.model';
import { Restaurant, PaginatedResponse } from '../model/restaurant.model';

export interface PartnerRegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  restaurantName: string;
  restaurantAddress: string;
  fssaiNumber: string;
  gstNumber?: string;
}

@Injectable({ providedIn: 'root' })
export class PartnerService {
  private base = `${environment.apiBaseUrl}/api/v1/partner`;
  private restaurantBase = `${environment.apiBaseUrl}/api/v1/restaurants`;

  constructor(private http: HttpClient) {}

  register(payload: PartnerRegisterRequest): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.base}/register`, payload);
  }

  getMyRestaurants(ownerId: number, page = 0, size = 10): Observable<ApiResponse<PaginatedResponse<Restaurant>>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<ApiResponse<PaginatedResponse<Restaurant>>>(
      `${this.restaurantBase}/owner/${ownerId}`, { params }
    );
  }

  createRestaurant(name: string, ownerId: number): Observable<ApiResponse<Restaurant>> {
    return this.http.post<ApiResponse<Restaurant>>(this.restaurantBase, { name, ownerId: String(ownerId) });
  }
}
