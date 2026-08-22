import { Routes } from '@angular/router';

import { adminGuard } from './core/routing/admin.guard';
import { authGuard } from './core/routing/auth.guard';
import { guestGuard } from './core/routing/guest.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/login-page.component').then(
        (module) => module.LoginPageComponent,
      ),
  },
  {
    path: '',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./layout/admin-layout/admin-layout.component').then(
        (module) => module.AdminLayoutComponent,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'users' },
      {
        path: 'users',
        loadChildren: () =>
          import('./features/users/users.routes').then((module) => module.USERS_ROUTES),
      },
      {
        path: 'moderation/charging-point-reports',
        loadChildren: () =>
          import('./features/charging-point-reports/charging-point-reports.routes').then(
            (module) => module.CHARGING_POINT_REPORTS_ROUTES,
          ),
      },
      {
        path: 'moderation/reviews',
        loadChildren: () =>
          import('./features/reviews/reviews.routes').then((module) => module.REVIEWS_ROUTES),
      },
      {
        path: 'moderation/incidents',
        loadChildren: () =>
          import('./features/incidents/incidents.routes').then((module) => module.INCIDENTS_ROUTES),
      },
      {
        path: 'audit',
        loadChildren: () =>
          import('./features/audit/audit.routes').then((module) => module.AUDIT_ROUTES),
      },
      {
        path: '**',
        loadComponent: () =>
          import('./shared/errors/not-found-page.component').then(
            (module) => module.NotFoundPageComponent,
          ),
      },
    ],
  },
];
