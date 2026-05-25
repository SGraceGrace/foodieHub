import { Routes } from '@angular/router';
import { authGuard } from '../core/guard/auth.guard';

export const routes: Routes = [
  { 
    path: 'cuisine', 
    loadComponent: () => import('./cuisine/cuisine.component').then(module => module.CuisineComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'about-us', 
    loadComponent: () => import('./about-us/about-us.component').then(module => module.AboutUsComponent)
  },
  { 
    path: 'reviews', 
    loadComponent: () => import('./reviews/reviews.component').then(module => module.ReviewsComponent)
  },
  { 
    path: 'blog', 
    loadComponent: () => import('./blog/blog.component').then(module => module.BlogComponent)
  },
  { 
    path: 'contact-us', 
    loadComponent: () => import('./contact-us/contact-us.component').then(module => module.ContactUsComponent)
  },
  {
    path: 'deals',
    loadComponent: () => import('./deals/deals.component').then(module => module.DealsComponent)
  },
  {
    path: 'search',
    loadComponent: () => import('./search/search.component').then(module => module.SearchComponent)
  },
  {
    path: 'wishlist',
    loadComponent: () => import('./wishlist/wishlist.component').then(module => module.WishlistComponent)
  },
  {
    path: 'orders',
    loadComponent: () => import('./orders/orders.component').then(module => module.OrdersComponent)
  },
  {
    path: 'orders/:id',
    loadComponent: () => import('./order-tracking/order-tracking.component').then(m => m.OrderTrackingComponent),
    canActivate: [authGuard]
  },
  {
    path: 'cart',
    loadComponent: () => import('./cart/cart.component').then(module => module.CartComponent)
  },
  {
    path: 'profile',
    loadComponent: () => import('./profile/profile.component').then(module => module.ProfileComponent)
  },
  {
    path: 'addresses',
    loadComponent: () => import('./addresses/addresses.component').then(module => module.AddressesComponent),
    canActivate: [authGuard]
  },
];