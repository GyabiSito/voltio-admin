import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthSessionService } from '../auth/auth-session.service';
import { AdminIdentity } from '../auth/auth.models';
import { AuthStore } from '../auth/auth.store';
import { TokenStorageService } from '../auth/token-storage.service';
import { adminGuard } from './admin.guard';
import { authGuard } from './auth.guard';

const NOW = '2026-07-29T18:42:01Z';
const loginTree = { destination: '/login' };

function identity(roles: AdminIdentity['roles'] = ['admin']): AdminIdentity {
  return {
    id: 7,
    displayName: 'Administrative User',
    email: 'admin@example.test',
    roles,
    createdAt: NOW,
  };
}

describe('adminGuard session ordering', () => {
  let store: AuthStore;
  const initialize = vi.fn<() => Promise<void>>();
  const createUrlTree = vi.fn(() => loginTree);

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    initialize.mockReset();
    createUrlTree.mockClear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AuthStore,
        TokenStorageService,
        { provide: AuthSessionService, useValue: { initialize } },
        { provide: Router, useValue: { createUrlTree } },
      ],
    });
    store = TestBed.inject(AuthStore);
  });

  it('waits for session restoration before checking the ADMIN role', async () => {
    initialize.mockImplementation(async () => {
      await Promise.resolve();
      store.setSession('opaque-test-token', identity());
    });

    const result = TestBed.runInInjectionContext(() =>
      adminGuard(undefined as never, undefined as never),
    );

    await expect(firstValueFrom(result as Observable<unknown>)).resolves.toBe(true);
    expect(initialize).toHaveBeenCalledOnce();
    expect(store.authenticated()).toBe(true);
  });

  it('clears a restored non-admin identity and redirects to login', async () => {
    initialize.mockImplementation(async () => {
      store.setSession('opaque-test-token', identity(['driver']));
    });

    const result = TestBed.runInInjectionContext(() =>
      adminGuard(undefined as never, undefined as never),
    );

    await expect(firstValueFrom(result as Observable<unknown>)).resolves.toBe(loginTree);
    expect(store.authenticated()).toBe(false);
    expect(store.error()).toBe('This account does not have administrative access.');
  });

  it('preserves only the router-generated internal destination for sign-in', async () => {
    initialize.mockResolvedValue();
    const result = TestBed.runInInjectionContext(() =>
      authGuard(undefined as never, { url: '/audit/7' } as never),
    );

    await expect(firstValueFrom(result as Observable<unknown>)).resolves.toBe(loginTree);
    expect(createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/audit/7' },
    });
  });
});
