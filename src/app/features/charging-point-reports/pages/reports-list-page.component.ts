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
import { humanize, StatusBadgeComponent } from '../../../shared/ui/status-badge.component';
import { ReportsApi } from '../data-access/reports.api';
import {
  ChargingPointReportListItem,
  REPORT_REASONS,
  REPORT_STATUSES,
  ReportFilters,
} from '../data-access/reports.models';

@Component({
  selector: 'admin-reports-list-page',
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
      title="Charging point reports"
      description="Review community reports and apply only the closed moderation transitions."
    />

    <form class="surface mb-6 grid gap-4 p-4 sm:grid-cols-3" (ngSubmit)="applyFilters()">
      <label class="grid gap-2 text-sm font-bold">
        Status
        <select class="field" name="status" [(ngModel)]="filters.status">
          <option value="">All statuses</option>
          @for (status of statuses; track status) {
            <option [value]="status">{{ humanize(status) }}</option>
          }
        </select>
      </label>
      <label class="grid gap-2 text-sm font-bold">
        Reason
        <select class="field" name="reason" [(ngModel)]="filters.reason">
          <option value="">All reasons</option>
          @for (reason of reasons; track reason) {
            <option [value]="reason">{{ humanize(reason) }}</option>
          }
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
      <admin-empty-state
        title="No reports match"
        description="The moderation queue has no items for these filters."
      />
    }

    @if (state.items().length > 0) {
      <section class="surface overflow-hidden" [attr.aria-busy]="state.refreshing()">
        <div class="desktop-table overflow-x-auto">
          <table class="data-table">
            <caption class="sr-only">
              Charging point moderation reports
            </caption>
            <thead>
              <tr>
                <th scope="col">Report</th>
                <th scope="col">Point</th>
                <th scope="col">Reporter</th>
                <th scope="col">Reason</th>
                <th scope="col">Reported</th>
                <th scope="col"><span class="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody>
              @for (report of state.items(); track report.id) {
                <tr>
                  <td>
                    <admin-status-badge [value]="report.status" />
                    <p class="mt-1 text-xs text-[#667a73]">#{{ report.id }}</p>
                  </td>
                  <td>
                    <p class="font-bold">
                      {{ report.chargingPoint?.title ?? 'Unavailable point' }}
                    </p>
                    <p class="text-xs text-[#667a73]">
                      {{
                        report.chargingPoint?.isActive ? 'Publicly active' : 'Not publicly active'
                      }}
                    </p>
                  </td>
                  <td>{{ report.reporter?.displayName ?? 'Anonymous reporter' }}</td>
                  <td>
                    {{ humanize(report.reason) }}
                    @if (report.hasDescription) {
                      <span class="block text-xs text-[#667a73]">Includes description</span>
                    }
                  </td>
                  <td><admin-date-time [value]="report.reportedAt" /></td>
                  <td>
                    <a class="font-bold text-[#176b53] underline" [routerLink]="[report.id]"
                      >Review</a
                    >
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <ul class="mobile-card-list gap-3 p-3" aria-label="Charging point reports">
          @for (report of state.items(); track report.id) {
            <li class="rounded-xl border border-[#dce6e2] p-4">
              <div class="flex items-start justify-between gap-3">
                <p class="font-bold">{{ report.chargingPoint?.title ?? 'Unavailable point' }}</p>
                <admin-status-badge [value]="report.status" />
              </div>
              <p class="mt-3 text-sm">{{ humanize(report.reason) }}</p>
              <p class="mt-1 text-sm text-[#60756d]">
                Reporter: {{ report.reporter?.displayName ?? 'Anonymous' }}
              </p>
              <a class="button button-secondary mt-4 w-full" [routerLink]="[report.id]"
                >Review report</a
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
export class ReportsListPageComponent {
  readonly state = new CursorListState<ChargingPointReportListItem>();
  readonly statuses = REPORT_STATUSES;
  readonly reasons = REPORT_REASONS;
  readonly humanize = humanize;
  filters: ReportFilters = { status: '', reason: '' };
  private readonly api = inject(ReportsApi);
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
                  : 'Reports could not be loaded.';
            this.state.fail(message, generation, append);
          }
        },
      });
  }
}
