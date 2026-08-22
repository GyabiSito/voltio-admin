import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { from, map } from 'rxjs';

import { AuthSessionService } from '../auth/auth-session.service';
import { hasAdministrativeRole } from '../auth/auth.mapper';
import { AuthStore } from '../auth/auth.store';

export const adminGuard: CanActivateFn = () => {
  const session = inject(AuthSessionService);
  const store = inject(AuthStore);
  const router = inject(Router);

  return from(session.initialize()).pipe(
    map(() => {
      const user = store.user();
      if (user !== null && hasAdministrativeRole(user)) {
        return true;
      }

      store.denyAdministrativeAccess();
      return router.createUrlTree(['/login']);
    }),
  );
};
