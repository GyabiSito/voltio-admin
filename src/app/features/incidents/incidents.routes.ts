import { Routes } from '@angular/router';

export const INCIDENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/incidents-list-page.component').then(
        (module) => module.IncidentsListPageComponent,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/incident-detail-page.component').then(
        (module) => module.IncidentDetailPageComponent,
      ),
  },
];
