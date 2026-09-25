import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuthStore } from '../../../core/auth/auth.store';
import { captureIdentity, identityIsCurrent } from '../../../core/http/identity-context';
import { AdminLanguageService } from '../../../core/i18n/admin-language.service';
import { DateTimeComponent } from '../../../shared/ui/date-time.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge.component';
import { UsersApi } from '../data-access/users.api';
import { AdminUserDetail } from '../data-access/users.models';

@Component({
  selector: 'admin-user-detail-page',
  imports: [DateTimeComponent, PageHeaderComponent, RouterLink, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="mb-5 inline-flex font-bold text-[#176b53] underline" routerLink="/users">← Users</a>
    <admin-page-header
      title="User detail"
      description="Current identity and aggregate footprint. No account mutations are available."
    />

    @if (loading()) {
      <div class="surface p-8" aria-busy="true">Loading user…</div>
    } @else if (error(); as message) {
      <div class="surface border-[#e7b8b4] p-6 text-[#843c36]" role="alert">
        <p class="font-bold">{{ message }}</p>
        <a class="button button-secondary mt-4" routerLink="/users">Return to users</a>
      </div>
    } @else if (user(); as current) {
      <section class="surface p-5 sm:p-7">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="eyebrow">Account #{{ current.id }}</p>
            <h2 class="mt-2 text-2xl font-bold" data-i18n-ignore>{{ current.displayName }}</h2>
          </div>
          <admin-status-badge [value]="current.status" />
        </div>

        <dl class="detail-grid mt-7">
          <div class="detail-item">
            <dt>Email</dt>
            <dd [attr.data-i18n-ignore]="current.email !== null">{{ current.email ?? 'Not available' }}</dd>
          </div>
          <div class="detail-item">
            <dt>Email verification</dt>
            <dd>{{ current.emailVerified ? 'Verified' : 'Not verified' }}</dd>
          </div>
          <div class="detail-item">
            <dt>Roles</dt>
            <dd>{{ roleLabels(current) }}</dd>
          </div>
          <div class="detail-item">
            <dt>Created</dt>
            <dd><admin-date-time [value]="current.createdAt" /></dd>
          </div>
          <div class="detail-item">
            <dt>Updated</dt>
            <dd><admin-date-time [value]="current.updatedAt" /></dd>
          </div>
          <div class="detail-item">
            <dt>Closed</dt>
            <dd><admin-date-time [value]="current.closedAt" /></dd>
          </div>
        </dl>
      </section>

      <section class="surface mt-6 p-5 sm:p-7" aria-labelledby="footprint-title">
        <p class="eyebrow">Operational footprint</p>
        <h2 id="footprint-title" class="mt-2 text-xl font-bold">Current aggregate counts</h2>
        <dl class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          @for (item of footprint(current); track item.label) {
            <div class="rounded-xl bg-[#f2f6f4] p-4">
              <dt class="text-sm font-semibold text-[#5c7169]">{{ item.label }}</dt>
              <dd class="mt-1 text-2xl font-bold text-[#17352a]">{{ item.value }}</dd>
            </div>
          }
        </dl>
      </section>
    }
  `,
})
export class UserDetailPageComponent {
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly user = signal<AdminUserDetail | null>(null);
  private readonly api = inject(UsersApi);
  private readonly language = inject(AdminLanguageService);
  private readonly authStore = inject(AuthStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly id = parsePositiveId(inject(ActivatedRoute).snapshot.paramMap.get('id'));
  private generation = 0;
  private lifetimeGeneration = 0;

  constructor() {
    this.destroyRef.onDestroy(() => this.lifetimeGeneration++);
    this.load();
  }

  roleLabels(user: AdminUserDetail): string {
    return user.roles.length === 0
      ? this.language.translate('misc.none')
      : user.roles.map((role) => this.language.translateStatus(role)).join(', ');
  }

  footprint(user: AdminUserDetail): readonly { label: string; value: number }[] {
    return [
      {
        label: 'Currently owned charging points',
        value: user.footprint.currentlyOwnedChargingPoints,
      },
      { label: 'Active charging points', value: user.footprint.activeChargingPoints },
      { label: 'Driver bookings', value: user.footprint.driverBookings },
      {
        label: 'Bookings on currently owned points',
        value: user.footprint.bookingsOnCurrentlyOwnedPoints,
      },
      { label: 'Charging sessions as driver', value: user.footprint.chargingSessionsAsDriver },
      { label: 'Reviews authored', value: user.footprint.reviewsAuthored },
      { label: 'Incidents reported', value: user.footprint.incidentsReported },
    ];
  }

  private load(): void {
    if (this.id === null) {
      this.loading.set(false);
      this.error.set('This user is not available.');
      return;
    }

    const generation = ++this.generation;
    const identity = captureIdentity(this.authStore, generation, this.lifetimeGeneration);
    this.loading.set(true);
    this.error.set(null);
    this.api
      .detail(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          if (identityIsCurrent(identity, this.authStore, generation, this.lifetimeGeneration)) {
            this.user.set(user);
            this.loading.set(false);
          }
        },
        error: (failure: unknown) => {
          if (identityIsCurrent(identity, this.authStore, generation, this.lifetimeGeneration)) {
            this.loading.set(false);
            this.error.set(
              failure instanceof Error ? failure.message : 'This user is not available.',
            );
          }
        },
      });
  }
}

function parsePositiveId(value: string | null): number | null {
  return value !== null && /^[1-9]\d*$/u.test(value) ? Number(value) : null;
}
