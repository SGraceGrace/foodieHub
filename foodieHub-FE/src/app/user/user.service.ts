import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { UserConfig } from './user.config';
import { Observable } from 'rxjs';
import { UserDetails } from '../model/user.model';
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

  logout(): Observable<any> {
    return this.http.get(this.logoutUrl, { responseType: 'text' });
  }
}
