import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {

  constructor() { }

  private activeRequests = 0;
  readonly isLoading$ = new BehaviorSubject<boolean>(false);

  start() {
    this.activeRequests++;
    if (this.activeRequests === 1) {
      this.isLoading$.next(true);
    }
  }

  stop() {
    this.activeRequests--;
    if (this.activeRequests === 0) {
      this.isLoading$.next(false);
    }
  }
}
