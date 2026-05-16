import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private activeRequests = 0;
  readonly isLoading$ = new BehaviorSubject<boolean>(false);

  start() {
    this.activeRequests++;
    if (this.activeRequests === 1) {
      // setTimeout avoids ExpressionChangedAfterItHasBeenCheckedError
      // when the interceptor triggers state change mid change-detection cycle
      setTimeout(() => this.isLoading$.next(true));
    }
  }

  stop() {
    if (this.activeRequests > 0) this.activeRequests--;
    if (this.activeRequests === 0) {
      setTimeout(() => this.isLoading$.next(false));
    }
  }
}
