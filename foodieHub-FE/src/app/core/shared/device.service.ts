import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DeviceService {

  deviceId: string;

  constructor() { 
    const deviceId = localStorage.getItem('deviceId');

    if (deviceId) {
      this.deviceId = deviceId;
    } else {
      this.deviceId = crypto.randomUUID();
      localStorage.setItem('deviceId', this.deviceId);
    }
  }

  getDeviceId(): string {
    return this.deviceId;
  }
}
