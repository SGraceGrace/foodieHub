import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../shared/loading.service';

// Requests that run silently in the background — no loading overlay.
const SILENT_URL_PATTERNS = [
  '/api/v1/admin/notifications',
  '/api/v1/admin/push-subscription',
];

function isSilent(url: string): boolean {
  return SILENT_URL_PATTERNS.some(pattern => url.includes(pattern));
}

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (isSilent(req.url)) {
    return next(req);
  }

  const loading = inject(LoadingService);
  loading.start();

  return next(req).pipe(
    finalize(() => loading.stop())
  );
};
