import { Routes } from '@angular/router';

export const USERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/users-list-page.component').then((module) => module.UsersListPageComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/user-detail-page.component').then((module) => module.UserDetailPageComponent),
  },
];
