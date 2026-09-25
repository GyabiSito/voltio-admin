import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { AuthStore } from '../../../core/auth/auth.store';
import { AdminApiError } from '../../../core/http/admin-api-error';
import { captureIdentity, identityIsCurrent } from '../../../core/http/identity-context';
import { AdminLanguageService } from '../../../core/i18n/admin-language.service';
import { CursorListState } from '../../../shared/pagination/cursor-list-state';
import { DateTimeComponent } from '../../../shared/ui/date-time.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { ListFeedbackComponent } from '../../../shared/ui/list-feedback.component';
import { LoadMoreComponent } from '../../../shared/ui/load-more.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge.component';
import { UsersApi } from '../data-access/users.api';
import {
  AdminUserListItem,
  USER_ROLES,
  USER_STATUSES,
  UserFilters,
} from '../data-access/users.models';

@Component({
  selector: 'admin-users-list-page',
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
      title="Users"
      description="Read-only account identities and their current operational footprint."
    />

    <form
      class="surface mb-6 grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4"
      (ngSubmit)="applyFilters()"
    >
      <label class="grid gap-2 text-sm font-bold">
        Status
        <select class="field" name="status" [(ngModel)]="filters.status">
          <option value="">All statuses</option>
          @for (status of statuses; track status) {
            <option [value]="status">{{ language.translateStatus(status) }}</option>
          }
        </select>
      </label>
      <label class="grid gap-2 text-sm font-bold">
        Role
        <select class="field" name="role" [(ngModel)]="filters.role">
          <option value="">All roles</option>
          @for (role of roles; track role) {
            <option [value]="role">{{ language.translateStatus(role) }}</option>
          }
        </select>
      </label>
      <label class="grid gap-2 text-sm font-bold">
        Email verification
        <select class="field" name="emailVerified" [(ngModel)]="filters.emailVerified">
          <option value="">Any verification</option>
          <option value="true">Verified</option>
          <option value="false">Not verified</option>
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
        title="No users match"
        description="Try a different combination of the supported account filters."
      />
    }

    @if (state.items().length > 0) {
      <section class="surface overflow-hidden" [attr.aria-busy]="state.refreshing()">
        <div class="desktop-table overflow-x-auto">
          <table class="data-table">
            <caption class="sr-only">
              Voltio user accounts
            </caption>
            <thead>
              <tr>
                <th scope="col">Identity</th>
                <th scope="col">Roles</th>
                <th scope="col">Status</th>
                <th scope="col">Email verified</th>
                <th scope="col">Created</th>
                <th scope="col"><span class="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody>
              @for (user of state.items(); track user.id) {
                <tr>
                  <td>
                    <p class="font-bold" data-i18n-ignore>{{ user.displayName }}</p>
                    <p class="text-xs text-[#667a73]">ID {{ user.id }}</p>
                  </td>
                  <td>{{ roleLabels(user) }}</td>
                  <td><admin-status-badge [value]="user.status" /></td>
                  <td>{{ user.emailVerified ? 'Verified' : 'Not verified' }}</td>
                  <td><admin-date-time [value]="user.createdAt" /></td>
                  <td>
                    <a class="font-bold text-[#176b53] underline" [routerLink]="[user.id]">View</a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <ul class="mobile-card-list gap-3 p-3" aria-label="Voltio user accounts">
          @for (user of state.items(); track user.id) {
            <li class="rounded-xl border border-[#dce6e2] p-4">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-bold" data-i18n-ignore>{{ user.displayName }}</p>
                  <p class="text-xs text-[#667a73]">ID {{ user.id }}</p>
                </div>
                <admin-status-badge [value]="user.status" />
              </div>
              <dl class="mt-4 grid gap-2 text-sm">
                <div>
                  <dt class="font-bold">Roles</dt>
                  <dd>{{ roleLabels(user) }}</dd>
                </div>
                <div>
                  <dt class="font-bold">Email</dt>
                  <dd>{{ user.emailVerified ? 'Verified' : 'Not verified' }}</dd>
                </div>
              </dl>
              <a class="button button-secondary mt-4 w-full" [routerLink]="[user.id]">View user</a>
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
export class UsersListPageComponent {
  readonly state = new CursorListState<AdminUserListItem>();
  readonly statuses = USER_STATUSES;
  readonly roles = USER_ROLES;
  readonly language = inject(AdminLanguageService);
  filters: UserFilters = { status: '', role: '', emailVerified: '' };

  private readonly api = inject(UsersApi);
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

  roleLabels(user: AdminUserListItem): string {
    return user.roles.length === 0
      ? this.language.translate('misc.none')
      : user.roles.map((role) => this.language.translateStatus(role)).join(', ');
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
                  : 'Users could not be loaded.';
            this.state.fail(message, generation, append);
          }
        },
      });
  }
}
