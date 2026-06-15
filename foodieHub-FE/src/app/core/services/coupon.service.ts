import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../model/apiResponse.model';

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number;
  minOrderAmount: number;
  maxDiscount: number;
  expiresAt: string;
  active: boolean;
  usageLimit: number;
  usedCount: number;
}

export interface CouponValidateResponse {
  valid: boolean;
  discountAmount: number;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class CouponService {

  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getActiveCoupons(): Observable<ApiResponse<Coupon[]>> {
    return this.http.get<ApiResponse<Coupon[]>>(`${this.base}/api/v1/coupons/active`);
  }

  validate(code: string, orderAmount: number): Observable<ApiResponse<CouponValidateResponse>> {
    return this.http.post<ApiResponse<CouponValidateResponse>>(
      `${this.base}/api/v1/coupons/validate`,
      { code, orderAmount }
    );
  }
}
