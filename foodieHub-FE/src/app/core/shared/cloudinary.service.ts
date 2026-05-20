import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Cloudinary } from '@cloudinary/url-gen/index';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CloudinaryService {
  private cld: Cloudinary;
  private uploadUrl = `https://api.cloudinary.com/v1_1/${environment.cloudinary.cloudName}/image/upload`;

  constructor(private http: HttpClient) {
    this.cld = new Cloudinary({ cloud: { cloudName: environment.cloudinary.cloudName } });
  }

  getInstance(): Cloudinary {
    return this.cld;
  }

  upload(file: File): Observable<string> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', environment.cloudinary.uploadPreset);
    return this.http.post<{ secure_url: string }>(this.uploadUrl, fd).pipe(
      map(res => res.secure_url)
    );
  }
}
