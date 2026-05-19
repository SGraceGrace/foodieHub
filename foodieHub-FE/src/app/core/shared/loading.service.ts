import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// Only show the overlay if a request takes longer than this.
// Eliminates the flash for fast local/tab-switch calls while still
// showing a spinner for genuinely slow requests.
const SHOW_DELAY_MS = 250;

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private activeRequests = 0;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  readonly isLoading$ = new BehaviorSubject<boolean>(false);

  start() {
    this.activeRequests++;
    if (this.activeRequests === 1 && !this.showTimer) {
      this.showTimer = setTimeout(() => {
        this.showTimer = null;
        if (this.activeRequests > 0) this.isLoading$.next(true);
      }, SHOW_DELAY_MS);
    }
  }

  stop() {
    if (this.activeRequests > 0) this.activeRequests--;
    if (this.activeRequests === 0) {
      if (this.showTimer) {
        clearTimeout(this.showTimer);
        this.showTimer = null;
      }
      setTimeout(() => this.isLoading$.next(false));
    }
  }
}
