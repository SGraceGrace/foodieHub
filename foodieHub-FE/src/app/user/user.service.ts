import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { UserConfig } from './user.config';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  getUserUrl: string = UserConfig.userApiUrl;

  constructor(private http: HttpClient) { }

  getUserInfo() {
    return this.http.get(this.getUserUrl);
  }
}
