import { Injectable } from '@angular/core';
import { LoginConfig } from './login.config';
import { Login } from '../model/login.model';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class LoginService {

  loginUrl: string = LoginConfig.loginUrl;

  constructor(private http: HttpClient) { }

  onLogin(loginRequest: Login): Observable<any> {
    return this.http.post(this.loginUrl, loginRequest);
  }
}
