import { Injectable } from '@angular/core';
import { Cloudinary } from '@cloudinary/url-gen/index';

@Injectable({
  providedIn: 'root'
})
export class CloudinaryService {

  private cld: Cloudinary;

  constructor() { 
    this.cld = new Cloudinary({
      cloud: {
        cloudName: 'dyv0innvy'
      }
    });
  }

  getInstance(): Cloudinary {
    return this.cld;
  }
}
