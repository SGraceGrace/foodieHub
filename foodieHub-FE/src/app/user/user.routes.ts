import { Routes } from '@angular/router';

export const routes: Routes = [
  { 
    path: 'cuisine', 
    loadComponent: () => import('./cuisine/cuisine.component').then(module => module.CuisineComponent)
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
  }
];