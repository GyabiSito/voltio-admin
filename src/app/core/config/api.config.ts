import { InjectionToken } from '@angular/core';

import { environment } from '../../../environments/environment';

export const API_BASE_URL = new InjectionToken<string>('VOLTIO_ADMIN_API_BASE_URL', {
  providedIn: 'root',
  factory: () => environment.API_BASE_URL.replace(/\/+$/u, ''),
});

export function isVoltioApiUrl(candidate: string, apiBaseUrl: string): boolean {
  try {
    const requestUrl = new URL(candidate, globalThis.location?.origin ?? 'http://admin.invalid');
    const baseUrl = new URL(apiBaseUrl);
    const basePath = baseUrl.pathname.replace(/\/+$/u, '');

    return (
      requestUrl.origin === baseUrl.origin &&
      (requestUrl.pathname === basePath || requestUrl.pathname.startsWith(`${basePath}/`))
    );
  } catch {
    return false;
  }
}
