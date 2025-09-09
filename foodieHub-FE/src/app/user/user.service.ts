import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { UserConfig } from './user.config';
import { Observable } from 'rxjs';
import { UserDetails } from '../model/user.model';
import { ApiResponse } from '../model/apiResponse.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  getUserUrl: string = UserConfig.userApiUrl;

  constructor(private http: HttpClient) { }

  getUserInfo(): Observable<ApiResponse<UserDetails>> {
    return this.http.get<ApiResponse<UserDetails>>(this.getUserUrl);
  }
}
