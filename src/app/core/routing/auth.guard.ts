import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { from, map } from 'rxjs';

import { AuthSessionService } from '../auth/auth-session.service';
import { AuthStore } from '../auth/auth.store';

export const authGuard: CanActivateFn = (_route, state) => {
  const session = inject(AuthSessionService);
  const store = inject(AuthStore);
  const router = inject(Router);

  return from(session.initialize()).pipe(
    map(() =>
      store.authenticated()
        ? true
        : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } }),
    ),
  );
};
