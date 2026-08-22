import { describe, expect, it } from 'vitest';

import { mapAdminUserDetail, mapAdminUserListItem } from './users.mapper';

const CREATED_AT = '2026-07-29T18:42:01Z';

function listItem(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 11,
    displayName: 'Active User',
    roles: ['driver'],
    status: 'active',
    emailVerified: true,
    createdAt: CREATED_AT,
    closedAt: null,
    ...overrides,
  };
}

function footprint(): Record<string, unknown> {
  return {
    currentlyOwnedChargingPoints: 1,
    activeChargingPoints: 1,
    driverBookings: 2,
    bookingsOnCurrentlyOwnedPoints: 3,
    chargingSessionsAsDriver: 4,
    reviewsAuthored: 5,
    incidentsReported: 6,
  };
}

function detail(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ...listItem(),
    email: 'active@example.test',
    updatedAt: CREATED_AT,
    footprint: footprint(),
    ...overrides,
  };
}

describe('admin user contracts', () => {
  it('maps an active list tombstone without an email field', () => {
    expect(mapAdminUserListItem(listItem())).toEqual({
      id: 11,
      displayName: 'Active User',
      roles: ['driver'],
      status: 'active',
      emailVerified: true,
      createdAt: CREATED_AT,
      closedAt: null,
    });
  });

  it('rejects list email leakage', () => {
    expect(() => mapAdminUserListItem(listItem({ email: 'private@example.test' }))).toThrow();
  });

  it('maps a closed account tombstone', () => {
    expect(
      mapAdminUserListItem(
        listItem({
          displayName: 'Deleted user',
          roles: [],
          status: 'closed',
          emailVerified: false,
          closedAt: CREATED_AT,
        }),
      ),
    ).toMatchObject({ displayName: 'Deleted user', roles: [], status: 'closed' });
  });

  it('rejects roles retained on a closed account', () => {
    expect(() =>
      mapAdminUserListItem(listItem({ status: 'closed', closedAt: CREATED_AT })),
    ).toThrow('Inconsistent user tombstone.');
  });

  it('rejects a closed status without closedAt', () => {
    expect(() =>
      mapAdminUserListItem(listItem({ status: 'closed', roles: [], displayName: 'Deleted user' })),
    ).toThrow('Inconsistent user tombstone.');
  });

  it('rejects an active status with closedAt', () => {
    expect(() => mapAdminUserListItem(listItem({ closedAt: CREATED_AT }))).toThrow(
      'Inconsistent user tombstone.',
    );
  });

  it('maps an active detail and its exact footprint', () => {
    const result = mapAdminUserDetail(detail());
    expect(result.email).toBe('active@example.test');
    expect(result.footprint.reviewsAuthored).toBe(5);
  });

  it('requires active accounts to expose their detail email', () => {
    expect(() => mapAdminUserDetail(detail({ email: null }))).toThrow(
      'Inconsistent user email visibility.',
    );
  });

  it('requires closed account emails to remain tombstoned', () => {
    expect(() =>
      mapAdminUserDetail(
        detail({
          displayName: 'Deleted user',
          roles: [],
          status: 'closed',
          closedAt: CREATED_AT,
          email: 'leaked@example.test',
        }),
      ),
    ).toThrow('Inconsistent user email visibility.');
  });

  it('accepts a closed detail with no email', () => {
    expect(
      mapAdminUserDetail(
        detail({
          displayName: 'Deleted user',
          roles: [],
          status: 'closed',
          closedAt: CREATED_AT,
          email: null,
        }),
      ).email,
    ).toBeNull();
  });

  it('rejects negative footprint counts', () => {
    expect(() =>
      mapAdminUserDetail(detail({ footprint: { ...footprint(), chargingSessionsAsDriver: -1 } })),
    ).toThrow();
  });

  it('rejects unknown footprint fields', () => {
    expect(() =>
      mapAdminUserDetail(detail({ footprint: { ...footprint(), totalRevenue: 'private' } })),
    ).toThrow();
  });
});
