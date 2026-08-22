import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthStore } from '../auth/auth.store';
import { mapHttpError } from './admin-api-error';

export const apiErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  return next(request).pipe(
    catchError((failure: unknown) => {
      const error = mapHttpError(failure);
      const isLogin = request.url.endsWith('/auth/login');

      if (error.status === 401 && !isLogin) {
        if (error.errorCode === 'ADMIN_SESSION_EXPIRED') {
          authStore.expireAdministrativeSession();
        } else {
          authStore.clearSession();
        }
        void router.navigateByUrl('/login');
      } else if (error.status === 403) {
        authStore.denyAdministrativeAccess();
        void router.navigateByUrl('/login');
      }

      return throwError(() => error);
    }),
  );
};
