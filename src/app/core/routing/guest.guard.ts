import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { from, map } from 'rxjs';

import { AuthSessionService } from '../auth/auth-session.service';
import { AuthStore } from '../auth/auth.store';

export const guestGuard: CanActivateFn = () => {
  const session = inject(AuthSessionService);
  const store = inject(AuthStore);
  const router = inject(Router);

  return from(session.initialize()).pipe(
    map(() => (store.authenticated() ? router.createUrlTree(['/users']) : true)),
  );
};
