import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../model/apiResponse.model';
import { Restaurant, PaginatedResponse, RestaurantStaff, DaySchedule, MenuCategory } from '../model/restaurant.model';

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

  createRestaurant(payload: {
    name: string;
    ownerId: number;
    address: string;
    fssaiNumber: string;
    gstNumber?: string;
    imageUrl?: string;
    lat?: number;
    lng?: number;
  }): Observable<ApiResponse<Restaurant>> {
    return this.http.post<ApiResponse<Restaurant>>(this.restaurantBase, {
      ...payload,
      ownerId: String(payload.ownerId),
    });
  }

  getRestaurantById(id: string): Observable<ApiResponse<Restaurant>> {
    return this.http.get<ApiResponse<Restaurant>>(`${this.restaurantBase}/${id}`);
  }

  getRestaurantStaff(restaurantId: string): Observable<ApiResponse<RestaurantStaff[]>> {
    return this.http.get<ApiResponse<RestaurantStaff[]>>(
      `${this.base}/restaurants/${restaurantId}/staff`
    );
  }

  archiveStaff(staffId: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.base}/staff/${staffId}`);
  }

  activateStaff(staffId: number): Observable<ApiResponse<null>> {
    return this.http.put<ApiResponse<null>>(`${this.base}/staff/${staffId}/activate`, {});
  }

  createRestaurantStaff(payload: {
    firstName: string; lastName: string; email: string;
    password: string; restaurantIds: string[];
  }): Observable<ApiResponse<RestaurantStaff>> {
    return this.http.post<ApiResponse<RestaurantStaff>>(`${this.base}/staff`, payload);
  }

  updateRestaurantDetails(id: string, payload: {
    name?: string; cuisine?: string[]; address?: string;
    deliveryTime?: number; minOrder?: number;
    fssaiNumber?: string; gstNumber?: string; imageUrl?: string;
  }): Observable<ApiResponse<Restaurant>> {
    return this.http.put<ApiResponse<Restaurant>>(`${this.restaurantBase}/${id}`, payload);
  }

  updateRestaurantHours(id: string, hours: DaySchedule[]): Observable<ApiResponse<Restaurant>> {
    return this.http.put<ApiResponse<Restaurant>>(`${this.restaurantBase}/${id}/hours`, hours);
  }

  updateRestaurantMenu(id: string, menu: MenuCategory[]): Observable<ApiResponse<Restaurant>> {
    return this.http.put<ApiResponse<Restaurant>>(`${this.restaurantBase}/${id}/menu`, menu);
  }
}
