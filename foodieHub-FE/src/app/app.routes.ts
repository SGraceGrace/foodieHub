import { Routes } from '@angular/router';
import { NotFoundComponent } from './not-found/not-found.component';
import { guestGuard } from './core/guard/guest.guard';
import { authGuard } from './core/guard/auth.guard';
import { adminGuard } from './core/guard/admin.guard';
import { partnerGuard } from './partner/partner.guard';
import { driverGuard } from './driver/driver.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./home/home.component').then((module) => module.HomeComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login.component').then((module) => module.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./signup/signup.component').then(
        (module) => module.SignupComponent
      ),
    canActivate: [guestGuard],
  },
  {
    path: 'google-callback',
    loadComponent: () =>
      import('./google-callback/google-callback.component').then(
        (m) => m.GoogleCallbackComponent
      ),
  },
  {
    path: 'user',
    loadChildren: () => import('./user/user.routes').then((m) => m.routes),
  },
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./admin/admin-login/admin-login.component').then((m) => m.AdminLoginComponent),
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./admin/admin.component').then((m) => m.AdminComponent),
    canActivate: [adminGuard],
  },
  {
    path: 'partner/login',
    loadComponent: () =>
      import('./partner/partner-login/partner-login.component').then((m) => m.PartnerLoginComponent),
  },
  {
    path: 'partner/signup',
    loadComponent: () =>
      import('./partner/partner-signup/partner-signup.component').then((m) => m.PartnerSignupComponent),
  },
  {
    path: 'partner',
    loadComponent: () =>
      import('./partner/partner-dashboard/partner-dashboard.component').then((m) => m.PartnerDashboardComponent),
    canActivate: [partnerGuard],
  },
  {
    path: 'partner/restaurants/:id',
    loadComponent: () =>
      import('./partner/partner-workspace/partner-workspace.component').then((m) => m.PartnerWorkspaceComponent),
    canActivate: [partnerGuard],
  },
  {
    path: 'driver/login',
    loadComponent: () =>
      import('./driver/driver-login/driver-login.component').then((m) => m.DriverLoginComponent),
  },
  {
    path: 'driver/register',
    loadComponent: () =>
      import('./driver/driver-signup/driver-signup.component').then((m) => m.DriverSignupComponent),
  },
  {
    path: 'driver/kyc',
    loadComponent: () =>
      import('./driver/driver-kyc/driver-kyc.component').then((m) => m.DriverKycComponent),
  },
  {
    path: 'driver',
    loadComponent: () =>
      import('./driver/driver-dashboard/driver-dashboard.component').then((m) => m.DriverDashboardComponent),
    canActivate: [driverGuard],
  },
  {
    path: 'restaurants/:id',
    loadComponent: () =>
      import('./restaurant-detail/restaurant-detail.component').then((m) => m.RestaurantDetailComponent),
  },
  {
    path: '**',
    component: NotFoundComponent,
  },
];
