import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { CursorPage, mapCursorPage, mapEnvelope } from '../../../core/http/api-envelope';
import { AdminHttpClient } from '../../../core/http/admin-http-client';
import {
  AdminReviewDetail,
  AdminReviewListItem,
  HideReason,
  RestoreReason,
  ReviewFilters,
  ReviewState,
} from './reviews.models';
import { mapReviewDetail, mapReviewListItem, mapReviewState } from './reviews.mapper';

@Injectable({ providedIn: 'root' })
export class ReviewsApi {
  private readonly http = inject(AdminHttpClient);
  private readonly basePath = '/admin/moderation/reviews';

  list(filters: ReviewFilters, cursor: string | null): Observable<CursorPage<AdminReviewListItem>> {
    return this.http
      .get(this.basePath, {
        rating: filters.rating,
        hasComment: filters.hasComment,
        cursor,
      })
      .pipe(map((response) => mapCursorPage(response, mapReviewListItem)));
  }

  detail(id: number): Observable<AdminReviewDetail> {
    return this.http
      .get(`${this.basePath}/${id}`)
      .pipe(map((response) => mapEnvelope(response, mapReviewDetail).data));
  }

  hide(id: number, reasonCode: HideReason): Observable<ReviewState> {
    return this.http
      .post(`${this.basePath}/${id}/hide`, { reasonCode })
      .pipe(map((response) => mapEnvelope(response, mapReviewState).data));
  }

  restore(id: number, reasonCode: RestoreReason): Observable<ReviewState> {
    return this.http
      .post(`${this.basePath}/${id}/restore`, { reasonCode })
      .pipe(map((response) => mapEnvelope(response, mapReviewState).data));
  }
}
