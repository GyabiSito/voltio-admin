import { describe, expect, it } from 'vitest';

import { DEFAULT_ADMIN_ROUTE, safeAdminReturnUrl } from './admin-return-url';

describe('closed administrative return URLs', () => {
  it.each([
    '/users',
    '/users/7',
    '/moderation/charging-point-reports',
    '/moderation/charging-point-reports/9',
    '/moderation/reviews/12',
    '/moderation/incidents',
    '/audit',
    '/audit/55',
  ])('accepts the known internal route %s', (route) => {
    expect(safeAdminReturnUrl(route)).toBe(route);
  });

  it.each([
    null,
    '',
    'users',
    'https://evil.test/users',
    '//evil.test/users',
    'javascript:alert(1)',
    'data:text/html,unsafe',
    '%2F%2Fevil.test%2Fusers',
    '%252F%252Fevil.test%252Fusers',
    '/users?token=secret',
    '/unknown',
    '/users/0',
  ])('rejects an external or unknown return URL %s', (route) => {
    expect(safeAdminReturnUrl(route)).toBe(DEFAULT_ADMIN_ROUTE);
  });
});
