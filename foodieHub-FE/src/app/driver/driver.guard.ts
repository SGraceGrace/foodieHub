import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserDetails } from '../model/user.model';

export const driverGuard: CanActivateFn = () => {
  const router = inject(Router);
  const isAuthenticated = localStorage.getItem('driverAuthenticated') === 'true';

  if (!isAuthenticated) {
    router.navigate(['/driver/login']);
    return false;
  }

  const driverInfo = localStorage.getItem('driverInfo');
  const driver: UserDetails | null = driverInfo ? JSON.parse(driverInfo) : null;

  if (driver?.role?.roleName === 'DRIVER') {
    return true;
  }

  router.navigate(['/driver/login']);
  return false;
};
