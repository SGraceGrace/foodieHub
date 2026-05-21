import { Injectable } from '@angular/core';
import { UserDetails } from '../../model/user.model';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TokenService {

  constructor() {}

  private userInfoSubject = new BehaviorSubject<UserDetails | null>(
    this.getUserInfoFromStorage()
  );

  userInfo$ = this.userInfoSubject.asObservable();

  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  setUserInfo(userInfo: UserDetails): void {
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
    localStorage.setItem('isAuthenticated', 'true');
    this.userInfoSubject.next(userInfo);
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  clearTokens(): void {
    localStorage.clear();
    this.userInfoSubject.next(null);
  }

  private getUserInfoFromStorage(): UserDetails | null {
    const userInfo = localStorage.getItem('userInfo');
    return userInfo ? JSON.parse(userInfo) : null;
  }
}
