import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { AdminHttpClient } from '../http/admin-http-client';
import { mapLoginResponse, mapMeResponse } from './auth.mapper';
import { AdminIdentity, LoginInput, LoginResult } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(AdminHttpClient);

  login(input: LoginInput): Observable<LoginResult> {
    return this.http.post('/auth/login', input).pipe(map(mapLoginResponse));
  }

  me(): Observable<AdminIdentity> {
    return this.http.get('/me').pipe(map(mapMeResponse));
  }

  logout(): Observable<unknown> {
    return this.http.post('/auth/logout', {});
  }
}
