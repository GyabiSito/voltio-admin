import { Routes } from '@angular/router';

export const AUDIT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/audit-list-page.component').then((module) => module.AuditListPageComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/audit-detail-page.component').then(
        (module) => module.AuditDetailPageComponent,
      ),
  },
];
