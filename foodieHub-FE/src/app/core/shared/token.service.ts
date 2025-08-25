import { Injectable } from '@angular/core';
import { UserDetails } from '../../model/user.model';

@Injectable({
  providedIn: 'root'
})
export class TokenService {

  constructor() { }

  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  setUserInfo(userInfo: UserDetails): void {
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
  }

  getUserInfo(): UserDetails | null {
    const userInfo = localStorage.getItem('userInfo');
    return userInfo ? JSON.parse(userInfo) : null;
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userInfo');
  }
}
