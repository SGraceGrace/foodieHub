import { Routes } from '@angular/router';
import { NotFoundComponent } from './not-found/not-found.component';

export const routes: Routes = [
    {
        path: '',
        redirectTo: "/home",
        pathMatch: 'full'
    },
    {
        path: 'home',
        loadComponent: () => import('./home/home.component').then(module => module.HomeComponent)
    },
    {
        path: 'login',
        loadComponent: () => import('./login/login.component').then(module => module.LoginComponent)
    },
    {
        path: 'signup',
        loadComponent: () => import('./signup/signup.component').then(module => module.SignupComponent)
    },
    {
        path: 'user',
        loadChildren: () => import('./user/user.routes').then(m => m.routes)
    },
    {
        path: '**',
        component: NotFoundComponent
    }
];
