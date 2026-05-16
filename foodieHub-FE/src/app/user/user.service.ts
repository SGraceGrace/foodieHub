import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { UserConfig } from './user.config';
import { Observable } from 'rxjs';
import { UserDetails } from '../model/user.model';
import { UserAddress } from '../model/address.model';
import { ApiResponse } from '../model/apiResponse.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  getUserUrl: string = UserConfig.userApiUrl;
  logoutUrl: string = UserConfig.userLogoutUrl;

  constructor(private http: HttpClient) {}

  updateProfileUrl: string = UserConfig.updateProfileUrl;

  getUserInfo(): Observable<ApiResponse<UserDetails>> {
    return this.http.get<ApiResponse<UserDetails>>(this.getUserUrl);
  }

  updateProfile(data: {
    firstName: string;
    lastName: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
    bio?: string;
  }): Observable<ApiResponse<null>> {
    return this.http.put<ApiResponse<null>>(this.updateProfileUrl, data);
  }

  addressesUrl: string = UserConfig.addressesUrl;

  getAddresses(): Observable<ApiResponse<UserAddress[]>> {
    return this.http.get<ApiResponse<UserAddress[]>>(this.addressesUrl);
  }

  addAddress(data: { label: string; addressText: string; landmark?: string; defaultAddress: boolean }): Observable<ApiResponse<UserAddress>> {
    return this.http.post<ApiResponse<UserAddress>>(this.addressesUrl, data);
  }

  deleteAddress(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.addressesUrl}/${id}`);
  }

  setDefaultAddress(id: number): Observable<ApiResponse<UserAddress>> {
    return this.http.put<ApiResponse<UserAddress>>(`${this.addressesUrl}/${id}/default`, {});
  }

  logout(): Observable<any> {
    return this.http.get(this.logoutUrl, { responseType: 'text' });
  }
}
