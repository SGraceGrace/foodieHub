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

  // Always public — skip token entirely (auth/static endpoints)
  const alwaysPublic = ['/login', '/signup', '/api/v1/contact', '/api/v1/slides',
    '/partner/register', '/driver/register', '/api/v1/refresh-token', 'api.cloudinary.com', 'nominatim.openstreetmap.org'];
  if (alwaysPublic.some((u) => req.url.includes(u))) {
    return next(req);
  }

  const loginRedirect = router.url.startsWith('/admin')
    ? '/admin/login'
    : router.url.startsWith('/partner')
      ? '/partner/login'
      : '/login';

  if (accessToken && refreshToken) {
    // Logged in — always attach token (gateway needs it for write ops + X-User-Id header)
    req = req.clone({
      setHeaders: {
        Authorization: accessToken,
        'X-Refresh-Token': refreshToken,
      },
    });
  } else {
    // Not logged in — allow GET browse requests through without a token so the
    // home page and restaurant detail page work for unauthenticated visitors.
    // Any write operation (POST/PUT/DELETE) will still hit the gateway, get 401,
    // and the 401 handler below will redirect to login.
    const isPublicGet = req.method === 'GET' &&
      ['/api/v1/restaurants'].some((u) => req.url.includes(u));
    if (isPublicGet) {
      return next(req);
    }
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
