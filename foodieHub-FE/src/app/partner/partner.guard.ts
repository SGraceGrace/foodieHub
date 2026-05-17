import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserDetails } from '../model/user.model';

export const partnerGuard: CanActivateFn = () => {
  const router = inject(Router);
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

  if (!isAuthenticated) {
    router.navigate(['/partner/login']);
    return false;
  }

  const userInfo = localStorage.getItem('userInfo');
  const user: UserDetails | null = userInfo ? JSON.parse(userInfo) : null;

  if (user?.role?.roleName === 'RESTAURANT_OWNER') {
    return true;
  }

  router.navigate(['/home']);
  return false;
};
