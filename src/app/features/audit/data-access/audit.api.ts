import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { CursorPage, mapCursorPage, mapEnvelope } from '../../../core/http/api-envelope';
import { AdminHttpClient } from '../../../core/http/admin-http-client';
import { AdminAuditEntry, AuditFilters } from './audit.models';
import { mapAuditEntry } from './audit.mapper';

@Injectable({ providedIn: 'root' })
export class AuditApi {
  private readonly http = inject(AdminHttpClient);
  private readonly basePath = '/admin/audit-entries';

  list(filters: AuditFilters, cursor: string | null): Observable<CursorPage<AdminAuditEntry>> {
    return this.http
      .get(this.basePath, {
        action: filters.action,
        subjectType: filters.subjectType,
        subjectId: filters.subjectId,
        actorId: filters.actorId,
        cursor,
      })
      .pipe(map((response) => mapCursorPage(response, mapAuditEntry)));
  }

  detail(id: number): Observable<AdminAuditEntry> {
    return this.http
      .get(`${this.basePath}/${id}`)
      .pipe(map((response) => mapEnvelope(response, mapAuditEntry).data));
  }
}
