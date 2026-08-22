import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminIdentity } from '../auth/auth.models';
import { AuthStore } from '../auth/auth.store';
import { TokenStorageService } from '../auth/token-storage.service';
import { API_BASE_URL } from '../config/api.config';
import { apiErrorInterceptor } from './api-error.interceptor';
import { authorizationInterceptor } from './authorization.interceptor';

const API = 'https://api.voltio.test/api/v1';
const NOW = '2026-07-29T18:42:01Z';

function identity(): AdminIdentity {
  return {
    id: 7,
    displayName: 'Ada Admin',
    email: 'ada@example.test',
    roles: ['admin'],
    createdAt: NOW,
  };
}

describe('administrative HTTP interceptors', () => {
  const navigateByUrl = vi.fn(() => Promise.resolve(true));
  let client: HttpClient;
  let controller: HttpTestingController;
  let store: AuthStore;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    navigateByUrl.mockClear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AuthStore,
        TokenStorageService,
        provideHttpClient(withInterceptors([authorizationInterceptor, apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: API },
        { provide: Router, useValue: { navigateByUrl } },
      ],
    });
    client = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    store = TestBed.inject(AuthStore);
  });

  it('adds Bearer and JSON Accept only to the configured API', async () => {
    store.setSession('admin-secret', identity());
    const response = firstValueFrom(client.get(`${API}/admin/users`));
    const request = controller.expectOne(`${API}/admin/users`);

    expect(request.request.headers.get('Authorization')).toBe('Bearer admin-secret');
    expect(request.request.headers.get('Accept')).toBe('application/json');
    request.flush({ ok: true });
    await response;
  });

  it('does not send the token to an external origin', async () => {
    store.setSession('admin-secret', identity());
    const response = firstValueFrom(client.get('https://example.test/asset.json'));
    const request = controller.expectOne('https://example.test/asset.json');

    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
    await response;
  });

  it('does not send the token to a same-origin path outside the API base', async () => {
    store.setSession('admin-secret', identity());
    const response = firstValueFrom(client.get('https://api.voltio.test/assets/config.json'));
    const request = controller.expectOne('https://api.voltio.test/assets/config.json');

    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
    await response;
  });

  it('clears the session and advances identity generation on 401', async () => {
    store.setSession('admin-secret', identity());
    const generation = store.identityGeneration();
    const response = firstValueFrom(client.get(`${API}/admin/users`));
    controller
      .expectOne(`${API}/admin/users`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    await expect(response).rejects.toMatchObject({ status: 401, errorCode: 'UNAUTHENTICATED' });
    expect(store.authenticated()).toBe(false);
    expect(store.identityGeneration()).toBe(generation + 1);
    expect(navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('does not clear a current session for a rejected public login request', async () => {
    store.setSession('admin-secret', identity());
    const response = firstValueFrom(client.post(`${API}/auth/login`, {}));
    controller
      .expectOne(`${API}/auth/login`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    await expect(response).rejects.toMatchObject({ status: 401 });
    expect(store.authenticated()).toBe(true);
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('clears feature identity and shows the admin-only state on 403', async () => {
    store.setSession('admin-secret', identity());
    const response = firstValueFrom(client.get(`${API}/admin/audit-entries`));
    controller
      .expectOne(`${API}/admin/audit-entries`)
      .flush({}, { status: 403, statusText: 'Forbidden' });

    await expect(response).rejects.toMatchObject({ status: 403, errorCode: 'FORBIDDEN' });
    expect(store.authenticated()).toBe(false);
    expect(store.error()).toBe('This account does not have administrative access.');
    expect(navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('clears every session reference and shows the dedicated expiry message', async () => {
    store.setSession('admin-secret', identity());
    const generation = store.identityGeneration();
    const response = firstValueFrom(client.get(`${API}/admin/users`));
    controller
      .expectOne(`${API}/admin/users`)
      .flush({ error_code: 'ADMIN_SESSION_EXPIRED' }, { status: 401, statusText: 'Unauthorized' });

    await expect(response).rejects.toMatchObject({
      status: 401,
      errorCode: 'ADMIN_SESSION_EXPIRED',
    });
    expect(store.authenticated()).toBe(false);
    expect(store.identityGeneration()).toBe(generation + 1);
    expect(store.error()).toBe('Your administrative session expired. Sign in again.');
    expect(sessionStorage.getItem('voltio_admin_access_token')).toBeNull();
    expect(navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('maps Retry-After without retrying the request or clearing other features', async () => {
    store.setSession('admin-secret', identity());
    const generation = store.identityGeneration();
    const response = firstValueFrom(client.post(`${API}/admin/moderation/reviews/9/hide`, {}));
    controller.expectOne(`${API}/admin/moderation/reviews/9/hide`).flush(
      { error_code: 'RATE_LIMITED', bucket: 'must-not-surface' },
      {
        status: 429,
        statusText: 'Too Many Requests',
        headers: { 'Retry-After': '17' },
      },
    );

    await expect(response).rejects.toMatchObject({
      status: 429,
      errorCode: 'RATE_LIMITED',
      retryAfterSeconds: 17,
      message: 'Too many requests. Try again in 17 seconds.',
    });
    controller.expectNone(`${API}/admin/moderation/reviews/9/hide`);
    expect(store.authenticated()).toBe(true);
    expect(store.identityGeneration()).toBe(generation);
  });
});
