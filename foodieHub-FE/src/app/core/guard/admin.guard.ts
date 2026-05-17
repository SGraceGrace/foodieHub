import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserDetails } from '../../model/user.model';

export const adminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

  if (!isAuthenticated) {
    router.navigate(['/admin/login']);
    return false;
  }

  const userInfo = localStorage.getItem('userInfo');
  const user: UserDetails | null = userInfo ? JSON.parse(userInfo) : null;

  if (user?.role?.roleName === 'ADMIN') {
    return true;
  }

  router.navigate(['/home']);
  return false;
};
