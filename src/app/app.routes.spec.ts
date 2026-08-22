import { describe, expect, it } from 'vitest';

import { AUDIT_ROUTES } from './features/audit/audit.routes';
import { CHARGING_POINT_REPORTS_ROUTES } from './features/charging-point-reports/charging-point-reports.routes';
import { INCIDENTS_ROUTES } from './features/incidents/incidents.routes';
import { REVIEWS_ROUTES } from './features/reviews/reviews.routes';
import { USERS_ROUTES } from './features/users/users.routes';
import { routes } from './app.routes';

describe('independent admin route surface', () => {
  it('keeps login public and all operational routes under the guarded layout', () => {
    expect(routes[0]?.path).toBe('login');
    expect(routes[0]?.canActivate).toBeDefined();
    expect(routes[1]?.path).toBe('');
    expect(routes[1]?.canActivate).toHaveLength(2);
  });

  it('exposes exactly the requested first-level administrative destinations', () => {
    expect(routes[1]?.children?.map(({ path }) => path)).toEqual([
      '',
      'users',
      'moderation/charging-point-reports',
      'moderation/reviews',
      'moderation/incidents',
      'audit',
      '**',
    ]);
  });

  it('does not add impersonation or user/role mutation routes', () => {
    const paths = routes[1]?.children?.map(({ path }) => path) ?? [];
    expect(paths).not.toContain('impersonate');
    expect(paths).not.toContain('users/:id/edit');
    expect(paths).not.toContain('roles');
  });

  it.each([
    ['users', USERS_ROUTES],
    ['charging point reports', CHARGING_POINT_REPORTS_ROUTES],
    ['reviews', REVIEWS_ROUTES],
    ['incidents', INCIDENTS_ROUTES],
    ['audit', AUDIT_ROUTES],
  ])('provides lazy list and detail routes for %s', (_name, featureRoutes) => {
    expect(featureRoutes.map(({ path }) => path)).toEqual(['', ':id']);
    expect(featureRoutes.every(({ loadComponent }) => loadComponent !== undefined)).toBe(true);
  });
});
