import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const guestGuard: CanActivateFn = (route, state) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  const router = inject(Router);
  if (!isAuthenticated) {
    return true;
  } else {
    router.navigate(['/home']);
    return false;
  }
};
