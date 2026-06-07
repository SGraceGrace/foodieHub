import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../model/apiResponse.model';

export interface ContactMessageRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class ContactUsService {
  private url = `${environment.apiBaseUrl}/api/v1/contact`;

  constructor(private http: HttpClient) {}

  submit(payload: ContactMessageRequest): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(this.url, payload);
  }
}
