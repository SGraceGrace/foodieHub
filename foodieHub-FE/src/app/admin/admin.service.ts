import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../model/apiResponse.model';
import { ActivityLog, AdminNotification, AdminUserResponse, ContactMessage, PaginatedResponse, Restaurant, Slide } from '../model/restaurant.model';

export interface SlideRequest {
  title: string;
  highlightWord: string;
  description: string;
  btn1Text: string;
  btn2Text: string;
  emoji: string;
  badgeIcon: string;
  badgeText: string;
  displayOrder: number;
}

export interface CreateAdminRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private base = `${environment.apiBaseUrl}/api/v1/admin/slides`;
  private usersBase = `${environment.apiBaseUrl}/api/v1/admin/users`;
  private logsBase = `${environment.apiBaseUrl}/api/v1/admin/activity-logs`;

  constructor(private http: HttpClient) {}

  getSlides(): Observable<ApiResponse<Slide[]>> {
    return this.http.get<ApiResponse<Slide[]>>(this.base);
  }

  createSlide(payload: SlideRequest): Observable<ApiResponse<Slide>> {
    return this.http.post<ApiResponse<Slide>>(this.base, payload);
  }

  updateSlide(id: string, payload: SlideRequest): Observable<ApiResponse<Slide>> {
    return this.http.put<ApiResponse<Slide>>(`${this.base}/${id}`, payload);
  }

  deleteSlide(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.base}/${id}`);
  }

  toggleSlide(id: string): Observable<ApiResponse<Slide>> {
    return this.http.put<ApiResponse<Slide>>(`${this.base}/${id}/toggle`, {});
  }

  // Users
  getUsers(status?: string, search?: string, role?: string, page = 0, size = 10): Observable<ApiResponse<PaginatedResponse<AdminUserResponse>>> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (search) params = params.set('search', search);
    if (role) params = params.set('role', role);
    params = params.set('page', page.toString()).set('size', size.toString());
    return this.http.get<ApiResponse<PaginatedResponse<AdminUserResponse>>>(this.usersBase, { params });
  }

  createAdmin(payload: CreateAdminRequest): Observable<ApiResponse<AdminUserResponse>> {
    return this.http.post<ApiResponse<AdminUserResponse>>(`${this.usersBase}/create-admin`, payload);
  }

  suspendUser(id: number): Observable<ApiResponse<AdminUserResponse>> {
    return this.http.put<ApiResponse<AdminUserResponse>>(`${this.usersBase}/${id}/suspend`, {});
  }

  unsuspendUser(id: number): Observable<ApiResponse<AdminUserResponse>> {
    return this.http.put<ApiResponse<AdminUserResponse>>(`${this.usersBase}/${id}/unsuspend`, {});
  }

  // Restaurants
  private restaurantsBase = `${environment.apiBaseUrl}/api/v1/restaurants`;
  private adminRestaurantsBase = `${environment.apiBaseUrl}/api/v1/admin/restaurants`;

  getRestaurants(cuisine?: string, page = 0, size = 10): Observable<ApiResponse<PaginatedResponse<Restaurant>>> {
    let params = new HttpParams();
    if (cuisine) params = params.set('cuisine', cuisine);
    params = params.set('page', page.toString()).set('size', size.toString());
    return this.http.get<ApiResponse<PaginatedResponse<Restaurant>>>(this.restaurantsBase, { params });
  }

  getAdminRestaurants(status?: string, cuisine?: string, page = 0, size = 10): Observable<ApiResponse<PaginatedResponse<Restaurant>>> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (cuisine) params = params.set('cuisine', cuisine);
    params = params.set('page', page.toString()).set('size', size.toString());
    return this.http.get<ApiResponse<PaginatedResponse<Restaurant>>>(this.adminRestaurantsBase, { params });
  }

  // Activity Logs
  getActivityLogs(): Observable<ApiResponse<ActivityLog[]>> {
    return this.http.get<ApiResponse<ActivityLog[]>>(this.logsBase);
  }

  // Notifications
  private notificationsBase = `${environment.apiBaseUrl}/api/v1/admin/notifications`;

  getNotifications(): Observable<ApiResponse<AdminNotification[]>> {
    return this.http.get<ApiResponse<AdminNotification[]>>(this.notificationsBase);
  }

  dismissNotification(id: string): Observable<any> {
    return this.http.delete(`${this.notificationsBase}/${id}`);
  }

  clearAllNotifications(): Observable<any> {
    return this.http.delete(this.notificationsBase);
  }

  // Restaurant Owners
  private ownersBase = `${environment.apiBaseUrl}/api/v1/admin/restaurant-owners`;

  getRestaurantOwners(status?: string, page = 0, size = 10): Observable<ApiResponse<PaginatedResponse<AdminUserResponse>>> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    params = params.set('page', page.toString()).set('size', size.toString());
    return this.http.get<ApiResponse<PaginatedResponse<AdminUserResponse>>>(this.ownersBase, { params });
  }

  getPendingOwnerCount(): Observable<number> {
    return this.getRestaurantOwners('PENDING', 0, 1).pipe(
      map(res => res.data?.totalElements ?? 0)
    );
  }

  approveOwner(id: number): Observable<ApiResponse<AdminUserResponse>> {
    return this.http.put<ApiResponse<AdminUserResponse>>(`${this.ownersBase}/${id}/approve`, {});
  }

  rejectOwner(id: number): Observable<ApiResponse<AdminUserResponse>> {
    return this.http.put<ApiResponse<AdminUserResponse>>(`${this.ownersBase}/${id}/reject`, {});
  }

  // Push subscriptions
  savePushSubscription(subscription: object): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}/api/v1/admin/push-subscription`, subscription);
  }

  // Drivers
  private driversBase = `${environment.apiBaseUrl}/api/v1/admin/drivers`;

  getDrivers(status?: string, search?: string, page = 0, size = 10): Observable<ApiResponse<PaginatedResponse<AdminUserResponse>>> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (search) params = params.set('search', search);
    params = params.set('page', page.toString()).set('size', size.toString());
    return this.http.get<ApiResponse<PaginatedResponse<AdminUserResponse>>>(this.driversBase, { params });
  }

  getPendingDriverCount(): Observable<number> {
    return this.getDrivers('PENDING', undefined, 0, 1).pipe(
      map(res => res.data?.totalElements ?? 0)
    );
  }

  approveDriver(id: number): Observable<ApiResponse<AdminUserResponse>> {
    return this.http.put<ApiResponse<AdminUserResponse>>(`${this.driversBase}/${id}/approve`, {});
  }

  rejectDriver(id: number): Observable<ApiResponse<AdminUserResponse>> {
    return this.http.put<ApiResponse<AdminUserResponse>>(`${this.driversBase}/${id}/reject`, {});
  }

  suspendDriver(id: number): Observable<ApiResponse<AdminUserResponse>> {
    return this.http.put<ApiResponse<AdminUserResponse>>(`${this.driversBase}/${id}/suspend`, {});
  }

  unsuspendDriver(id: number): Observable<ApiResponse<AdminUserResponse>> {
    return this.http.put<ApiResponse<AdminUserResponse>>(`${this.driversBase}/${id}/unsuspend`, {});
  }

  // Contact Messages
  private contactMessagesBase = `${environment.apiBaseUrl}/api/v1/admin/contact-messages`;

  getContactMessages(page = 0, size = 10): Observable<ApiResponse<PaginatedResponse<ContactMessage>>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<ApiResponse<PaginatedResponse<ContactMessage>>>(this.contactMessagesBase, { params });
  }

  getUnreadContactCount(): Observable<number> {
    return this.http.get<ApiResponse<number>>(`${this.contactMessagesBase}/unread-count`).pipe(
      map(res => res.data ?? 0)
    );
  }

  markContactMessageRead(id: number): Observable<ApiResponse<null>> {
    return this.http.patch<ApiResponse<null>>(`${this.contactMessagesBase}/${id}/read`, {});
  }
}
