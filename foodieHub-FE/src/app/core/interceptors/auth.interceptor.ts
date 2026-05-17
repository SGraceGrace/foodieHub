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

  const publicUrls = ['/login', '/signup', '/contact', '/api/v1/slides', '/api/v1/restaurants'];
  if (publicUrls.some((u) => req.url.includes(u))) {
    return next(req);
  }

  if (accessToken && refreshToken) {
    req = req.clone({
      setHeaders: {
        Authorization: accessToken,
        'X-Refresh-Token': refreshToken,
      },
    });
  } else {
    router.navigateByUrl('/login');
    return throwError(() => new Error('No token'));
  }
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (
        error.status === 401 &&
        typeof refreshToken === 'string'
      ) {
        return handle401(
          req,
          next,
          tokenService,
          loginService,
          router,
          refreshToken
        );
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
  refreshToken: string
): Observable<HttpEvent<unknown>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshSubject.next(null);

    return loginService.refreshToken({ refreshToken }).pipe(
      switchMap((tokens) => {
        isRefreshing = false;
        tokenService.setTokens(tokens.accessToken, tokens.refreshToken);
        refreshSubject.next(tokens.accessToken);
        return next(
          request.clone({
            setHeaders: { Authorization: `Bearer ${tokens.accessToken}` },
          })
        );
      }),
      catchError((err) => {
        isRefreshing = false;
        tokenService.clearTokens();
        router.navigateByUrl('/login');
        return throwError(() => err);
      })
    );
  } else {
    return refreshSubject.pipe(
      filter((token) => token !== null),
      take(1),
      switchMap((token) =>
        next(
          request.clone({
            setHeaders: { Authorization: `Bearer ${token}` },
          })
        )
      )
    );
  }
}
