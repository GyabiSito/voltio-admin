import { Injectable } from '@angular/core';

export const ADMIN_TOKEN_STORAGE_KEY = 'voltio_admin_access_token';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  getToken(): string | null {
    return sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
  }

  setToken(token: string): void {
    sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
  }

  clear(): void {
    sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  }
}
