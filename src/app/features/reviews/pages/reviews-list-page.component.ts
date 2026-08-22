import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthStore } from '../../../core/auth/auth.store';
import { AdminApiError } from '../../../core/http/admin-api-error';
import { captureIdentity, identityIsCurrent } from '../../../core/http/identity-context';
import { CursorListState } from '../../../shared/pagination/cursor-list-state';
import { DateTimeComponent } from '../../../shared/ui/date-time.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { ListFeedbackComponent } from '../../../shared/ui/list-feedback.component';
import { LoadMoreComponent } from '../../../shared/ui/load-more.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge.component';
import { ReviewsApi } from '../data-access/reviews.api';
import { AdminReviewListItem, ReviewFilters } from '../data-access/reviews.models';

@Component({
  selector: 'admin-reviews-list-page',
  imports: [
    DateTimeComponent,
    EmptyStateComponent,
    FormsModule,
    ListFeedbackComponent,
    LoadMoreComponent,
    PageHeaderComponent,
    RouterLink,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <admin-page-header
      title="Reviews"
      description="Inspect published and hidden reviews without editing historical content."
    />

    <form class="surface mb-6 grid gap-4 p-4 sm:grid-cols-3" (ngSubmit)="applyFilters()">
      <label class="grid gap-2 text-sm font-bold">
        Rating
        <select class="field" name="rating" [(ngModel)]="filters.rating">
          <option value="">All ratings</option>
          @for (rating of ratings; track rating) {
            <option [ngValue]="rating">{{ rating }} stars</option>
          }
        </select>
      </label>
      <label class="grid gap-2 text-sm font-bold">
        Comment
        <select class="field" name="hasComment" [(ngModel)]="filters.hasComment">
          <option value="">With or without comment</option>
          <option value="true">Has comment</option>
          <option value="false">No comment</option>
        </select>
      </label>
      <div class="flex items-end">
        <button class="button button-primary w-full" type="submit" [disabled]="state.refreshing()">
          Apply filters
        </button>
      </div>
    </form>

    <admin-list-feedback
      [loading]="state.initialLoading()"
      [error]="state.error()"
      (retry)="reload()"
    />

    @if (!state.initialLoading() && !state.error() && state.items().length === 0) {
      <admin-empty-state title="No reviews match" description="No review matches these filters." />
    }

    @if (state.items().length > 0) {
      <section class="surface overflow-hidden" [attr.aria-busy]="state.refreshing()">
        <div class="desktop-table overflow-x-auto">
          <table class="data-table">
            <caption class="sr-only">
              Administrative review oversight
            </caption>
            <thead>
              <tr>
                <th scope="col">Review</th>
                <th scope="col">Rating</th>
                <th scope="col">Author</th>
                <th scope="col">Charging point</th>
                <th scope="col">Created</th>
                <th scope="col"><span class="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody>
              @for (review of state.items(); track review.id) {
                <tr>
                  <td>
                    <admin-status-badge [value]="review.status" />
                    <p class="mt-1 text-xs text-[#667a73]">#{{ review.id }}</p>
                  </td>
                  <td>
                    <span [attr.aria-label]="review.rating + ' out of 5 stars'">
                      {{ starLabel(review.rating) }}
                    </span>
                    <span class="block text-xs text-[#667a73]">{{
                      review.hasComment ? 'Has comment' : 'No comment'
                    }}</span>
                  </td>
                  <td>{{ review.author.displayName }}</td>
                  <td>{{ review.chargingPoint.title }}</td>
                  <td><admin-date-time [value]="review.createdAt" /></td>
                  <td>
                    <a class="font-bold text-[#176b53] underline" [routerLink]="[review.id]"
                      >Review</a
                    >
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <ul class="mobile-card-list gap-3 p-3" aria-label="Administrative reviews">
          @for (review of state.items(); track review.id) {
            <li class="rounded-xl border border-[#dce6e2] p-4">
              <div class="flex justify-between gap-3">
                <p class="font-bold" [attr.aria-label]="review.rating + ' out of 5 stars'">
                  {{ starLabel(review.rating) }}
                </p>
                <admin-status-badge [value]="review.status" />
              </div>
              <p class="mt-3 text-sm">{{ review.chargingPoint.title }}</p>
              <p class="text-sm text-[#60756d]">Author: {{ review.author.displayName }}</p>
              <a class="button button-secondary mt-4 w-full" [routerLink]="[review.id]"
                >Review entry</a
              >
            </li>
          }
        </ul>
      </section>

      <admin-load-more
        [hasMore]="state.hasMore()"
        [loading]="state.loadingMore()"
        [error]="state.loadMoreError()"
        (load)="loadMore()"
      />
    }
  `,
})
export class ReviewsListPageComponent {
  readonly state = new CursorListState<AdminReviewListItem>();
  readonly ratings = [1, 2, 3, 4, 5] as const;
  filters: ReviewFilters = { rating: '', hasComment: '' };
  private readonly api = inject(ReviewsApi);
  private readonly authStore = inject(AuthStore);
  private readonly destroyRef = inject(DestroyRef);
  private lifetimeGeneration = 0;

  constructor() {
    this.destroyRef.onDestroy(() => this.lifetimeGeneration++);
    this.reload(true);
  }

  applyFilters(): void {
    this.reload(true);
  }

  reload(reset = false): void {
    const generation = reset ? this.state.reset() : this.state.beginRefresh();
    this.requestPage(generation, null, false);
  }

  loadMore(): void {
    const generation = this.state.beginLoadMore();
    if (generation !== null) {
      this.requestPage(generation, this.state.nextCursor(), true);
    }
  }

  starLabel(rating: number): string {
    return `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`;
  }

  private requestPage(generation: number, cursor: string | null, append: boolean): void {
    const identity = captureIdentity(this.authStore, generation, this.lifetimeGeneration);
    this.api
      .list({ ...this.filters }, cursor)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          if (identityIsCurrent(identity, this.authStore, generation, this.lifetimeGeneration)) {
            this.state.accept(page, generation, append);
          }
        },
        error: (failure: unknown) => {
          if (identityIsCurrent(identity, this.authStore, generation, this.lifetimeGeneration)) {
            const message =
              failure instanceof AdminApiError && failure.status === 422 && append
                ? 'This cursor is no longer valid. Reload the list.'
                : failure instanceof Error
                  ? failure.message
                  : 'Reviews could not be loaded.';
            this.state.fail(message, generation, append);
          }
        },
      });
  }
}
