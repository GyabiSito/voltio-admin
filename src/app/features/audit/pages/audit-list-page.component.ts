import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthStore } from '../../../core/auth/auth.store';
import { AdminApiError } from '../../../core/http/admin-api-error';
import { AdminRefreshBus } from '../../../core/http/admin-refresh-bus';
import { captureIdentity, identityIsCurrent } from '../../../core/http/identity-context';
import { CursorListState } from '../../../shared/pagination/cursor-list-state';
import { DateTimeComponent } from '../../../shared/ui/date-time.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { ListFeedbackComponent } from '../../../shared/ui/list-feedback.component';
import { LoadMoreComponent } from '../../../shared/ui/load-more.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { humanize, StatusBadgeComponent } from '../../../shared/ui/status-badge.component';
import { AuditApi } from '../data-access/audit.api';
import {
  AdminAuditEntry,
  AUDIT_ACTIONS,
  AuditFilters,
  AUDIT_SUBJECT_TYPES,
} from '../data-access/audit.models';

@Component({
  selector: 'admin-audit-list-page',
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
      title="Audit trail"
      description="Immutable, privacy-minimized records of effective administrative transitions."
    />

    <form
      class="surface mb-6 grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-5"
      (ngSubmit)="applyFilters()"
    >
      <label class="grid gap-2 text-sm font-bold">
        Action
        <select class="field" name="action" [(ngModel)]="filters.action">
          <option value="">All actions</option>
          @for (action of actions; track action) {
            <option [value]="action">{{ humanize(action) }}</option>
          }
        </select>
      </label>
      <label class="grid gap-2 text-sm font-bold">
        Subject type
        <select class="field" name="subjectType" [(ngModel)]="filters.subjectType">
          <option value="">All subjects</option>
          @for (subject of subjectTypes; track subject) {
            <option [value]="subject">{{ humanize(subject) }}</option>
          }
        </select>
      </label>
      <label class="grid gap-2 text-sm font-bold">
        Subject ID
        <input
          class="field"
          name="subjectId"
          type="number"
          min="1"
          [(ngModel)]="filters.subjectId"
        />
      </label>
      <label class="grid gap-2 text-sm font-bold">
        Actor ID
        <input class="field" name="actorId" type="number" min="1" [(ngModel)]="filters.actorId" />
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
        title="No audit entries match"
        description="No immutable entry matches these filters."
      />
    }

    @if (state.items().length > 0) {
      <section class="surface overflow-hidden" [attr.aria-busy]="state.refreshing()">
        <div class="desktop-table overflow-x-auto">
          <table class="data-table">
            <caption class="sr-only">
              Administrative audit trail
            </caption>
            <thead>
              <tr>
                <th scope="col">Action</th>
                <th scope="col">Actor</th>
                <th scope="col">Subject</th>
                <th scope="col">Reason</th>
                <th scope="col">Created</th>
                <th scope="col"><span class="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody>
              @for (entry of state.items(); track entry.id) {
                <tr>
                  <td>
                    <admin-status-badge [value]="entry.action" />
                    <p class="mt-1 font-mono text-[0.7rem] text-[#667a73]">
                      {{ entry.operationId }}
                    </p>
                  </td>
                  <td>
                    {{ entry.actor.displayName }} <span class="text-xs">#{{ entry.actor.id }}</span>
                  </td>
                  <td>{{ humanize(entry.subject.type) }} #{{ entry.subject.id }}</td>
                  <td>{{ humanize(entry.reasonCode) }}</td>
                  <td><admin-date-time [value]="entry.createdAt" /></td>
                  <td>
                    <a class="font-bold text-[#176b53] underline" [routerLink]="[entry.id]"
                      >Inspect</a
                    >
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <ul class="mobile-card-list gap-3 p-3" aria-label="Administrative audit trail">
          @for (entry of state.items(); track entry.id) {
            <li class="rounded-xl border border-[#dce6e2] p-4">
              <admin-status-badge [value]="entry.action" />
              <p class="mt-3 text-sm font-bold">
                {{ humanize(entry.subject.type) }} #{{ entry.subject.id }}
              </p>
              <p class="text-sm text-[#60756d]">Actor: {{ entry.actor.displayName }}</p>
              <a class="button button-secondary mt-4 w-full" [routerLink]="[entry.id]"
                >Inspect entry</a
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
export class AuditListPageComponent {
  readonly state = new CursorListState<AdminAuditEntry>();
  readonly actions = AUDIT_ACTIONS;
  readonly subjectTypes = AUDIT_SUBJECT_TYPES;
  readonly humanize = humanize;
  filters: AuditFilters = { action: '', subjectType: '', subjectId: '', actorId: '' };
  private readonly api = inject(AuditApi);
  private readonly authStore = inject(AuthStore);
  private readonly refreshBus = inject(AdminRefreshBus);
  private readonly destroyRef = inject(DestroyRef);
  private lifetimeGeneration = 0;
  private initialized = false;

  constructor() {
    this.destroyRef.onDestroy(() => this.lifetimeGeneration++);
    effect(() => {
      this.refreshBus.watch('audit')();
      untracked(() => this.reload(!this.initialized));
      this.initialized = true;
    });
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
                  : 'Audit entries could not be loaded.';
            this.state.fail(message, generation, append);
          }
        },
      });
  }
}
