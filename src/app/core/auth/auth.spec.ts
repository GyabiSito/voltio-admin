import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { captureIdentity, identityIsCurrent } from '../http/identity-context';
import {
  hasAdministrativeRole,
  mapAdminIdentity,
  mapLoginResponse,
  mapMeResponse,
} from './auth.mapper';
import { AdminIdentity } from './auth.models';
import { AuthStore } from './auth.store';
import { ADMIN_TOKEN_STORAGE_KEY, TokenStorageService } from './token-storage.service';

const CREATED_AT = '2026-07-29T18:42:01Z';

function user(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 7,
    displayName: 'Ada Admin',
    email: 'ada@example.test',
    role: 'ADMIN',
    roleKey: 'admin',
    roles: ['admin'],
    permissions: [],
    created_at: CREATED_AT,
    ...overrides,
  };
}

function identity(id = 7): AdminIdentity {
  return {
    id,
    displayName: 'Ada Admin',
    email: 'ada@example.test',
    roles: ['admin'],
    createdAt: CREATED_AT,
  };
}

function envelope(data: unknown): Record<string, unknown> {
  return {
    success: true,
    message: 'OK',
    data,
    error_code: null,
    errors: null,
    status_code: 200,
  };
}

describe('administrative identity mapping', () => {
  it('derives admin access from the Spatie roles collection', () => {
    expect(hasAdministrativeRole(mapAdminIdentity(user()))).toBe(true);
  });

  it('accepts a multi-role administrator', () => {
    const mapped = mapAdminIdentity(
      user({ role: 'DRIVER', roleKey: 'driver', roles: ['driver', 'admin'] }),
    );
    expect(mapped.roles).toEqual(['driver', 'admin']);
    expect(hasAdministrativeRole(mapped)).toBe(true);
  });

  it('does not grant a Driver administrative access', () => {
    const mapped = mapAdminIdentity(user({ role: 'DRIVER', roleKey: 'driver', roles: ['driver'] }));
    expect(hasAdministrativeRole(mapped)).toBe(false);
  });

  it('does not grant a Host administrative access', () => {
    const mapped = mapAdminIdentity(user({ role: 'HOST', roleKey: 'host', roles: ['host'] }));
    expect(hasAdministrativeRole(mapped)).toBe(false);
  });

  it('rejects a legacy scalar role without the canonical roles collection', () => {
    const legacy = user();
    delete legacy['roles'];
    expect(() => mapAdminIdentity(legacy)).toThrow();
  });

  it('rejects a scalar role inconsistent with roleKey', () => {
    expect(() => mapAdminIdentity(user({ role: 'HOST' }))).toThrow(
      'Inconsistent authenticated role response.',
    );
  });

  it('rejects a primary role absent from the roles collection', () => {
    expect(() => mapAdminIdentity(user({ roles: ['driver'] }))).toThrow(
      'Inconsistent authenticated role response.',
    );
  });

  it('rejects unknown privilege-bearing roles', () => {
    expect(() => mapAdminIdentity(user({ roles: ['superadmin'] }))).toThrow();
  });

  it('rejects unknown identity fields', () => {
    expect(() => mapAdminIdentity(user({ phone: '+59800000000' }))).toThrow();
  });

  it('maps an exact Bearer login response', () => {
    const result = mapLoginResponse(
      envelope({ user: user(), token: 'opaque-admin-token', token_type: 'Bearer' }),
    );
    expect(result.token).toBe('opaque-admin-token');
    expect(result.tokenType).toBe('Bearer');
    expect(result.user.id).toBe(7);
  });

  it('rejects a different token type', () => {
    expect(() =>
      mapLoginResponse(envelope({ user: user(), token: 'secret', token_type: 'Basic' })),
    ).toThrow('Invalid authentication token type.');
  });

  it('maps an exact /me response without a token payload', () => {
    expect(mapMeResponse(envelope({ user: user() }))).toMatchObject({
      id: 7,
      roles: ['admin'],
    });
  });
});

describe('isolated admin session storage and identity generations', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [AuthStore, TokenStorageService] });
  });

  it('uses only the dedicated admin token key', () => {
    const storage = TestBed.inject(TokenStorageService);
    storage.setToken('admin-secret');

    expect(sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY)).toBe('admin-secret');
    expect(localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem('voltio_access_token')).toBeNull();
  });

  it('restores an existing admin token without treating it as an authenticated identity', () => {
    sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, 'existing');
    const store = TestBed.inject(AuthStore);

    expect(store.token()).toBe('existing');
    expect(store.authenticated()).toBe(false);
  });

  it('stores a validated session and advances identity generation', () => {
    const store = TestBed.inject(AuthStore);
    store.setSession('admin-secret', identity());

    expect(store.authenticated()).toBe(true);
    expect(store.identityGeneration()).toBe(1);
    expect(sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY)).toBe('admin-secret');
  });

  it('clears local state and storage on administrative denial', () => {
    const store = TestBed.inject(AuthStore);
    store.setSession('admin-secret', identity());
    store.denyAdministrativeAccess();

    expect(store.authenticated()).toBe(false);
    expect(store.identityGeneration()).toBe(2);
    expect(store.error()).toBe('This account does not have administrative access.');
    expect(sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('clears the tab session with the dedicated expiry message', () => {
    const store = TestBed.inject(AuthStore);
    store.setSession('admin-secret', identity());
    store.expireAdministrativeSession();

    expect(store.authenticated()).toBe(false);
    expect(store.identityGeneration()).toBe(2);
    expect(store.error()).toBe('Your administrative session expired. Sign in again.');
    expect(sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('does not advance generation for a redundant empty clear', () => {
    const store = TestBed.inject(AuthStore);
    store.clearSession();
    expect(store.identityGeneration()).toBe(0);
  });

  it('invalidates captured work after logout', () => {
    const store = TestBed.inject(AuthStore);
    store.setSession('admin-secret', identity());
    const context = captureIdentity(store, 3, 5);

    expect(identityIsCurrent(context, store, 3, 5)).toBe(true);
    store.clearSession();
    expect(identityIsCurrent(context, store, 3, 5)).toBe(false);
  });

  it('invalidates captured work when a feature or view lifetime changes', () => {
    const store = TestBed.inject(AuthStore);
    store.setSession('admin-secret', identity());
    const context = captureIdentity(store, 3, 5);

    expect(identityIsCurrent(context, store, 4, 5)).toBe(false);
    expect(identityIsCurrent(context, store, 3, 6)).toBe(false);
  });

  it('invalidates captured work when another administrator signs in', () => {
    const store = TestBed.inject(AuthStore);
    store.setSession('first', identity(7));
    const context = captureIdentity(store, 1, 1);
    store.setSession('second', identity(8));

    expect(identityIsCurrent(context, store, 1, 1)).toBe(false);
  });
});
