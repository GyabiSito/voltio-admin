import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AuthStore } from '../auth/auth.store';
import { API_BASE_URL, isVoltioApiUrl } from '../config/api.config';
import { AdminLanguageService } from '../i18n';

export const authorizationInterceptor: HttpInterceptorFn = (request, next) => {
  const apiBaseUrl = inject(API_BASE_URL);
  const token = inject(AuthStore).token();
  const language = inject(AdminLanguageService);

  if (!isVoltioApiUrl(request.url, apiBaseUrl)) {
    return next(request);
  }

  const setHeaders: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Language': language.language(),
  };
  if (token !== null) {
    setHeaders['Authorization'] = `Bearer ${token}`;
  }

  return next(request.clone({ setHeaders }));
};
