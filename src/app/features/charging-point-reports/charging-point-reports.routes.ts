import { Routes } from '@angular/router';

export const CHARGING_POINT_REPORTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/reports-list-page.component').then(
        (module) => module.ReportsListPageComponent,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/report-detail-page.component').then(
        (module) => module.ReportDetailPageComponent,
      ),
  },
];
