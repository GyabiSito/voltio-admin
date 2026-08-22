import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { CursorPage, mapCursorPage, mapEnvelope } from '../../../core/http/api-envelope';
import { AdminHttpClient } from '../../../core/http/admin-http-client';
import { AdminIncidentDetail, AdminIncidentListItem, IncidentFilters } from './incidents.models';
import { mapIncidentDetail, mapIncidentListItem } from './incidents.mapper';

@Injectable({ providedIn: 'root' })
export class IncidentsApi {
  private readonly http = inject(AdminHttpClient);
  private readonly basePath = '/admin/moderation/incidents';

  list(
    filters: IncidentFilters,
    cursor: string | null,
  ): Observable<CursorPage<AdminIncidentListItem>> {
    return this.http
      .get(this.basePath, {
        type: filters.type,
        reportedByRole: filters.reportedByRole,
        cursor,
      })
      .pipe(map((response) => mapCursorPage(response, mapIncidentListItem)));
  }

  detail(id: number): Observable<AdminIncidentDetail> {
    return this.http
      .get(`${this.basePath}/${id}`)
      .pipe(map((response) => mapEnvelope(response, mapIncidentDetail).data));
  }
}
