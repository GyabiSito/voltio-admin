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
import { IncidentsApi } from '../data-access/incidents.api';
import {
  AdminIncidentListItem,
  INCIDENT_TYPES,
  IncidentFilters,
  REPORTER_ROLES,
} from '../data-access/incidents.models';

@Component({
  selector: 'admin-incidents-list-page',
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
      title="Incidents"
      description="Incidents are append-only and cannot be resolved from the admin console."
    />

    <form class="surface mb-6 grid gap-4 p-4 sm:grid-cols-3" (ngSubmit)="applyFilters()">
      <label class="grid gap-2 text-sm font-bold">
        Incident type
        <select class="field" name="type" [(ngModel)]="filters.type">
          <option value="">All types</option>
          @for (type of types; track type) {
            <option [value]="type">{{ humanize(type) }}</option>
          }
        </select>
      </label>
      <label class="grid gap-2 text-sm font-bold">
        Reported by
        <select class="field" name="reportedByRole" [(ngModel)]="filters.reportedByRole">
          <option value="">Driver or Host</option>
          @for (role of roles; track role) {
            <option [value]="role">{{ humanize(role) }}</option>
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
        title="No incidents match"
        description="No append-only incident matches these filters."
      />
    }

    @if (state.items().length > 0) {
      <section class="surface overflow-hidden" [attr.aria-busy]="state.refreshing()">
        <div class="desktop-table overflow-x-auto">
          <table class="data-table">
            <caption class="sr-only">
              Charging session incidents
            </caption>
            <thead>
              <tr>
                <th scope="col">Incident</th>
                <th scope="col">Charging point</th>
                <th scope="col">Reporter role</th>
                <th scope="col">Booking / Session</th>
                <th scope="col">Reported</th>
                <th scope="col"><span class="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody>
              @for (incident of state.items(); track incident.id) {
                <tr>
                  <td>
                    <p class="font-bold">{{ humanize(incident.type) }}</p>
                    <p class="text-xs text-[#667a73]">
                      #{{ incident.id }} ·
                      {{ incident.hasDescription ? 'Has description' : 'No description' }}
                    </p>
                  </td>
                  <td>{{ incident.chargingPoint.title }}</td>
                  <td><admin-status-badge [value]="incident.reportedByRole" /></td>
                  <td>
                    {{ humanize(incident.bookingStatus) }} / {{ humanize(incident.sessionStatus) }}
                  </td>
                  <td><admin-date-time [value]="incident.reportedAt" /></td>
                  <td>
                    <a class="font-bold text-[#176b53] underline" [routerLink]="[incident.id]"
                      >Review</a
                    >
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <ul class="mobile-card-list gap-3 p-3" aria-label="Charging session incidents">
          @for (incident of state.items(); track incident.id) {
            <li class="rounded-xl border border-[#dce6e2] p-4">
              <div class="flex justify-between gap-3">
                <p class="font-bold">{{ humanize(incident.type) }}</p>
                <admin-status-badge [value]="incident.reportedByRole" />
              </div>
              <p class="mt-3 text-sm">{{ incident.chargingPoint.title }}</p>
              <p class="text-sm text-[#60756d]">
                {{ humanize(incident.bookingStatus) }} / {{ humanize(incident.sessionStatus) }}
              </p>
              <a class="button button-secondary mt-4 w-full" [routerLink]="[incident.id]"
                >Review incident</a
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
export class IncidentsListPageComponent {
  readonly state = new CursorListState<AdminIncidentListItem>();
  readonly types = INCIDENT_TYPES;
  readonly roles = REPORTER_ROLES;
  readonly humanize = humanize;
  filters: IncidentFilters = { type: '', reportedByRole: '' };
  private readonly api = inject(IncidentsApi);
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
                  : 'Incidents could not be loaded.';
            this.state.fail(message, generation, append);
          }
        },
      });
  }
}
