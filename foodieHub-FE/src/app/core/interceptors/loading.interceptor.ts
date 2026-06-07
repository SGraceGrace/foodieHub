import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../shared/loading.service';

// Requests that run silently in the background — no loading overlay.
const SILENT_URL_PATTERNS = [
  '/api/v1/admin/notifications',   // poll + dismiss + clear
  '/api/v1/admin/push-subscription',
  '/api/v1/driver/location',       // GPS heartbeat every 10 s — must never flash the overlay
  '/api/v1/driver/notifications',  // driver bell: poll + dismiss + clear
  'nominatim.openstreetmap.org',   // reverse-geocode (driver live location, location-picker)
];

// Pending-count calls use size=1 and are small background checks.
function isPendingCountCall(url: string): boolean {
  return (
    url.includes('/api/v1/admin/restaurant-owners') ||
    url.includes('/api/v1/admin/drivers')
  ) && url.includes('size=1');
}

function isSilent(url: string): boolean {
  return SILENT_URL_PATTERNS.some(p => url.includes(p)) || isPendingCountCall(url);
}

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (isSilent(req.urlWithParams)) {
    return next(req);
  }

  const loading = inject(LoadingService);
  loading.start();

  return next(req).pipe(
    finalize(() => loading.stop())
  );
};
