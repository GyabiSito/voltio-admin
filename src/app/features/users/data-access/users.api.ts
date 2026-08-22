import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { mapCursorPage, CursorPage, mapEnvelope } from '../../../core/http/api-envelope';
import { AdminHttpClient } from '../../../core/http/admin-http-client';
import { AdminUserDetail, AdminUserListItem, UserFilters } from './users.models';
import { mapAdminUserDetail, mapAdminUserListItem } from './users.mapper';

@Injectable({ providedIn: 'root' })
export class UsersApi {
  private readonly http = inject(AdminHttpClient);

  list(filters: UserFilters, cursor: string | null): Observable<CursorPage<AdminUserListItem>> {
    return this.http
      .get('/admin/users', {
        status: filters.status,
        role: filters.role,
        emailVerified: filters.emailVerified,
        cursor,
      })
      .pipe(map((response) => mapCursorPage(response, mapAdminUserListItem)));
  }

  detail(id: number): Observable<AdminUserDetail> {
    return this.http
      .get(`/admin/users/${id}`)
      .pipe(map((response) => mapEnvelope(response, mapAdminUserDetail).data));
  }
}
