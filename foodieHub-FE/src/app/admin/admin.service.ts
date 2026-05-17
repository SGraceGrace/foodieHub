import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../model/apiResponse.model';
import { Slide } from '../model/restaurant.model';

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

@Injectable({ providedIn: 'root' })
export class AdminService {
  private base = `${environment.apiBaseUrl}/api/v1/admin/slides`;

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
}
