import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../model/apiResponse.model';

export interface PartnerRegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  restaurantName: string;
}

@Injectable({ providedIn: 'root' })
export class PartnerService {
  private base = `${environment.apiBaseUrl}/api/v1/partner`;

  constructor(private http: HttpClient) {}

  register(payload: PartnerRegisterRequest): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.base}/register`, payload);
  }
}
