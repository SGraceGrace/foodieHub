import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  const router = inject(Router);
  if (isAuthenticated) {
    return true;
  } else {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
};
