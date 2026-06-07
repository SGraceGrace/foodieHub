import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Signup } from '../model/signup.model';
import { SignupConfig } from './signup.config';

@Injectable({
  providedIn: 'root',
})
export class SignupService {
  constructor(private http: HttpClient) {}

  onSignup(signupRequest: Signup): Observable<any> {
    return this.http.post(SignupConfig.signupUrl, signupRequest, { observe: 'response' });
  }
}
