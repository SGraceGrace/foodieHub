import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpRequest,
} from '@angular/common/http';
import { TokenService } from '../shared/token.service';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  catchError,
  filter,
  Observable,
  switchMap,
  take,
  throwError,
} from 'rxjs';
import { LoginService } from '../../login/login.service';

let isRefreshing = false;
const refreshSubject = new BehaviorSubject<string | null>(null);

export function authInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const accessToken = inject(TokenService).getAccessToken();
  const refreshToken = inject(TokenService).getRefreshToken();
  const tokenService = inject(TokenService);
  const loginService = inject(LoginService);
  const router = inject(Router);

  const publicUrls = ['/login', '/signup', '/api/v1/contact', '/api/v1/slides', '/api/v1/restaurants', '/partner/register', '/api/v1/refresh-token', 'api.cloudinary.com', 'nominatim.openstreetmap.org'];
  if (publicUrls.some((u) => req.url.includes(u))) {
    return next(req);
  }

  const loginRedirect = router.url.startsWith('/admin')
    ? '/admin/login'
    : router.url.startsWith('/partner')
      ? '/partner/login'
      : '/login';

  if (accessToken && refreshToken) {
    req = req.clone({
      setHeaders: {
        Authorization: accessToken,
        'X-Refresh-Token': refreshToken,
      },
    });
  } else {
    router.navigateByUrl(loginRedirect);
    return throwError(() => new Error('No token'));
  }
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      console.log(error);
      // status 0 = browser blocked reading the response due to missing CORS headers on the 401.
      // Treat it the same as a real 401 so the refresh-token flow still fires.
      const isAuthFailure = error.status === 401 || error.status === 0;
      if (isAuthFailure && typeof refreshToken === 'string') {
        return handle401(req, next, tokenService, loginService, router, refreshToken, loginRedirect);
      }
      return throwError(() => error);
    })
  );
}

function handle401(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
  tokenService: TokenService,
  loginService: LoginService,
  router: Router,
  refreshToken: string,
  loginRedirect: string
): Observable<HttpEvent<unknown>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshSubject.next(null);

    return loginService.refreshToken({ refreshToken }).pipe(
      switchMap((response) => {
        isRefreshing = false;
        const newAccessToken = response.headers.get('Authorization') ?? '';
        const newRefreshToken = response.headers.get('X-Refresh-Token') ?? '';
        tokenService.setTokens(newAccessToken, newRefreshToken);
        refreshSubject.next(newAccessToken);
        return next(request.clone({ setHeaders: { Authorization: newAccessToken } }));
      }),
      catchError((err) => {
        isRefreshing = false;
        refreshSubject.next(null);
        tokenService.clearTokens();
        router.navigateByUrl(loginRedirect);
        return throwError(() => err);
      })
    );
  } else {
    // Wait until a non-null token is emitted (i.e. refresh has completed).
    // Using filter() instead of skip(1) avoids a race condition where the
    // refresh completes before this subscription is created — in that case
    // the BehaviorSubject already holds the new token and filter() lets it
    // through immediately, whereas skip(1) would discard it and hang forever.
    return refreshSubject.pipe(
      filter((token): token is string => token !== null),
      take(1),
      switchMap((token) => {
        return next(request.clone({ setHeaders: { Authorization: token } }));
      })
    );
  }
}
