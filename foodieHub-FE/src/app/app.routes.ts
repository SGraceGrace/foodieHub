import { Routes } from '@angular/router';
import { NotFoundComponent } from './not-found/not-found.component';
import { guestGuard } from './core/guard/guest.guard';

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
    path: '**',
    component: NotFoundComponent,
  },
];
