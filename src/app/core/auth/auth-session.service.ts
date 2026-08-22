import { inject, Injectable } from '@angular/core';
import { firstValueFrom, finalize } from 'rxjs';

import { RateLimitedError } from '../http/admin-api-error';
import { AuthApi } from './auth.api';
import { hasAdministrativeRole } from './auth.mapper';
import { LoginInput } from './auth.models';
import { AuthStore } from './auth.store';

export class AdministrativeAccessError extends Error {
  constructor() {
    super('This account does not have administrative access.');
    this.name = 'AdministrativeAccessError';
  }
}

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly api = inject(AuthApi);
  private readonly store = inject(AuthStore);
  private initialization: Promise<void> | null = null;

  initialize(): Promise<void> {
    if (this.store.initialized()) {
      return Promise.resolve();
    }
    if (this.initialization !== null) {
      return this.initialization;
    }
    if (this.store.token() === null) {
      this.store.finishInitialization();
      return Promise.resolve();
    }

    this.store.beginLoading();
    this.initialization = firstValueFrom(this.api.me())
      .then((identity) => {
        if (!hasAdministrativeRole(identity)) {
          this.store.denyAdministrativeAccess();
          return;
        }
        this.store.restoreIdentity(identity);
      })
      .catch(() => {
        this.store.clearSession();
      })
      .finally(() => {
        this.store.finishInitialization();
        this.initialization = null;
      });

    return this.initialization;
  }

  async login(input: LoginInput): Promise<void> {
    this.store.beginLoading();
    try {
      const result = await firstValueFrom(this.api.login(input));
      if (!hasAdministrativeRole(result.user)) {
        this.store.denyAdministrativeAccess();
        throw new AdministrativeAccessError();
      }
      this.store.setSession(result.token, result.user);
    } catch (error: unknown) {
      if (error instanceof RateLimitedError) {
        this.store.setSafeError(error.message);
      } else if (!(error instanceof AdministrativeAccessError)) {
        this.store.setSafeError('Sign-in failed. Check your credentials and try again.');
      }
      throw error;
    }
  }

  logout(): Promise<void> {
    if (this.store.token() === null) {
      this.store.clearSession();
      return Promise.resolve();
    }

    return firstValueFrom(
      this.api.logout().pipe(
        finalize(() => {
          this.store.clearSession();
        }),
      ),
    ).then(() => undefined);
  }
}
