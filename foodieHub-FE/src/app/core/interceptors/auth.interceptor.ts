import { HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { TokenService } from '../shared/token.service';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

export function authInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) {
  const accessToken = inject(TokenService).getAccessToken();
  const route = inject(Router);

  if (req.url.includes('/login') || req.url.includes('/signup')) {
    return next(req);
  }

  if (accessToken) {
    req = req.clone({
      setHeaders: {
        Authorization: accessToken,
      },
    });
  } else {
    route.navigateByUrl('/login');
  }
  return next(req);
}
