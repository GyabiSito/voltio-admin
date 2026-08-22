import { Routes } from '@angular/router';

export const REVIEWS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/reviews-list-page.component').then(
        (module) => module.ReviewsListPageComponent,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/review-detail-page.component').then(
        (module) => module.ReviewDetailPageComponent,
      ),
  },
];
