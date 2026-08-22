import { computed, inject, Injectable, signal } from '@angular/core';

import { AdminIdentity } from './auth.models';
import { TokenStorageService } from './token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly tokenStorage = inject(TokenStorageService);

  readonly user = signal<AdminIdentity | null>(null);
  readonly token = signal<string | null>(this.tokenStorage.getToken());
  readonly initialized = signal(false);
  readonly loading = signal(false);
  readonly identityGeneration = signal(0);
  readonly error = signal<string | null>(null);
  readonly authenticated = computed(() => this.user() !== null && this.token() !== null);

  beginLoading(): void {
    this.loading.set(true);
    this.error.set(null);
  }

  setSession(token: string, user: AdminIdentity): void {
    this.tokenStorage.setToken(token);
    this.token.set(token);
    this.user.set(user);
    this.initialized.set(true);
    this.loading.set(false);
    this.error.set(null);
    this.identityGeneration.update((generation) => generation + 1);
  }

  restoreIdentity(user: AdminIdentity): void {
    if (this.user()?.id !== user.id) {
      this.identityGeneration.update((generation) => generation + 1);
    }
    this.user.set(user);
    this.initialized.set(true);
    this.loading.set(false);
    this.error.set(null);
  }

  finishInitialization(): void {
    this.initialized.set(true);
    this.loading.set(false);
  }

  clearSession(): void {
    const hadIdentity = this.token() !== null || this.user() !== null;
    this.tokenStorage.clear();
    this.token.set(null);
    this.user.set(null);
    this.initialized.set(true);
    this.loading.set(false);
    if (hadIdentity) {
      this.identityGeneration.update((generation) => generation + 1);
    }
  }

  denyAdministrativeAccess(): void {
    this.clearSession();
    this.error.set('This account does not have administrative access.');
  }

  expireAdministrativeSession(): void {
    this.clearSession();
    this.error.set('Your administrative session expired. Sign in again.');
  }

  setSafeError(message: string): void {
    this.loading.set(false);
    this.error.set(message);
  }
}
