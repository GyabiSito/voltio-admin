import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { CursorPage, mapCursorPage, mapEnvelope } from '../../../core/http/api-envelope';
import { AdminHttpClient } from '../../../core/http/admin-http-client';
import {
  ChargingPointReportDetail,
  ChargingPointReportListItem,
  DismissReason,
  LiftReason,
  PointModerationState,
  ReportFilters,
  ReportState,
  RestrictReason,
  RestrictResult,
} from './reports.models';
import {
  mapPointModerationState,
  mapReportDetail,
  mapReportListItem,
  mapReportState,
  mapRestrictResult,
} from './reports.mapper';

@Injectable({ providedIn: 'root' })
export class ReportsApi {
  private readonly http = inject(AdminHttpClient);
  private readonly basePath = '/admin/moderation/charging-point-reports';

  list(
    filters: ReportFilters,
    cursor: string | null,
  ): Observable<CursorPage<ChargingPointReportListItem>> {
    return this.http
      .get(this.basePath, { status: filters.status, reason: filters.reason, cursor })
      .pipe(map((response) => mapCursorPage(response, mapReportListItem)));
  }

  detail(id: number): Observable<ChargingPointReportDetail> {
    return this.http
      .get(`${this.basePath}/${id}`)
      .pipe(map((response) => mapEnvelope(response, mapReportDetail).data));
  }

  dismiss(id: number, reasonCode: DismissReason): Observable<ReportState> {
    return this.http
      .post(`${this.basePath}/${id}/dismiss`, { reasonCode })
      .pipe(map((response) => mapEnvelope(response, mapReportState).data));
  }

  restrict(id: number, reasonCode: RestrictReason): Observable<RestrictResult> {
    return this.http
      .post(`${this.basePath}/${id}/restrict-point`, { reasonCode })
      .pipe(map((response) => mapEnvelope(response, mapRestrictResult).data));
  }

  lift(pointId: number, reasonCode: LiftReason): Observable<PointModerationState> {
    return this.http
      .post(`/admin/moderation/charging-points/${pointId}/lift-restriction`, { reasonCode })
      .pipe(map((response) => mapEnvelope(response, mapPointModerationState).data));
  }
}
