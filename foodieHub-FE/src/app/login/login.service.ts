import { Injectable } from '@angular/core';
import { LoginConfig } from './login.config';
import { Login } from '../model/login.model';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { RefreshTokenRequest } from '../model/refresh-token-request.model';

@Injectable({
  providedIn: 'root'
})
export class LoginService {

  loginUrl: string = LoginConfig.loginUrl;
  refreshTokenUrl: string = LoginConfig.refreshTokenUrl;

  constructor(private http: HttpClient) { }

  onLogin(loginRequest: Login): Observable<any> {
    return this.http.post(this.loginUrl, loginRequest, { observe: 'response' });
  }

  refreshToken(refreshTokenRequest: RefreshTokenRequest): Observable<any> {
    return this.http.post(this.refreshTokenUrl, refreshTokenRequest, { observe: 'response' });
  }
}
