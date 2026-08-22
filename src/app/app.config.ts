import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';

import { AuthSessionService } from './core/auth/auth-session.service';
import { apiErrorInterceptor } from './core/http/api-error.interceptor';
import { authorizationInterceptor } from './core/http/authorization.interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withViewTransitions()),
    provideHttpClient(withInterceptors([authorizationInterceptor, apiErrorInterceptor])),
    provideAppInitializer(() => inject(AuthSessionService).initialize()),
  ],
};
