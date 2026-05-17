import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../model/apiResponse.model';
import { ActivityLog, AdminUserResponse, PaginatedResponse, Slide } from '../model/restaurant.model';

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

  updateSlide(id: number, payload: SlideRequest): Observable<ApiResponse<Slide>> {
    return this.http.put<ApiResponse<Slide>>(`${this.base}/${id}`, payload);
  }

  deleteSlide(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.base}/${id}`);
  }

  toggleSlide(id: number): Observable<ApiResponse<Slide>> {
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

  // Activity Logs
  getActivityLogs(): Observable<ApiResponse<ActivityLog[]>> {
    return this.http.get<ApiResponse<ActivityLog[]>>(this.logsBase);
  }
}
