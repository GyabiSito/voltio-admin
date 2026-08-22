import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuthStore } from '../../../core/auth/auth.store';
import { captureIdentity, identityIsCurrent } from '../../../core/http/identity-context';
import { DateTimeComponent } from '../../../shared/ui/date-time.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { humanize, StatusBadgeComponent } from '../../../shared/ui/status-badge.component';
import { IncidentsApi } from '../data-access/incidents.api';
import { AdminIncidentDetail } from '../data-access/incidents.models';

@Component({
  selector: 'admin-incident-detail-page',
  imports: [DateTimeComponent, PageHeaderComponent, RouterLink, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      class="mb-5 inline-flex font-bold text-[#176b53] underline"
      routerLink="/moderation/incidents"
      >← Incidents</a
    >
    <admin-page-header
      title="Incident detail"
      description="Incidents are append-only and cannot be resolved from the admin console."
    />

    @if (loading()) {
      <div class="surface p-8" aria-busy="true">Loading incident…</div>
    } @else if (error(); as message) {
      <div class="surface border-[#e7b8b4] p-6 text-[#843c36]" role="alert">
        <p class="font-bold">{{ message }}</p>
        <a class="button button-secondary mt-4" routerLink="/moderation/incidents"
          >Return to incidents</a
        >
      </div>
    } @else if (incident(); as current) {
      <section class="surface p-5 sm:p-7">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="eyebrow">Incident #{{ current.id }}</p>
            <h2 class="mt-2 text-2xl font-bold">{{ humanize(current.type) }}</h2>
          </div>
          <admin-status-badge [value]="current.reportedByRole" />
        </div>

        <dl class="detail-grid mt-7">
          <div class="detail-item">
            <dt>Reporter</dt>
            <dd>{{ current.reporter?.displayName ?? 'Unavailable' }}</dd>
          </div>
          <div class="detail-item">
            <dt>Charging point</dt>
            <dd>{{ current.chargingPoint.title }}</dd>
          </div>
          <div class="detail-item">
            <dt>Point state</dt>
            <dd>{{ current.chargingPoint.isActive ? 'Active' : 'Inactive' }}</dd>
          </div>
          <div class="detail-item">
            <dt>Booking</dt>
            <dd>#{{ current.booking.id }} · {{ humanize(current.booking.status) }}</dd>
          </div>
          <div class="detail-item">
            <dt>Session</dt>
            <dd>#{{ current.session.id }} · {{ humanize(current.session.status) }}</dd>
          </div>
          <div class="detail-item">
            <dt>Reported</dt>
            <dd><admin-date-time [value]="current.reportedAt" /></dd>
          </div>
          <div class="detail-item">
            <dt>Scheduled start</dt>
            <dd><admin-date-time [value]="current.session.scheduledStartsAt" /></dd>
          </div>
          <div class="detail-item">
            <dt>Scheduled end</dt>
            <dd><admin-date-time [value]="current.session.scheduledEndsAt" /></dd>
          </div>
        </dl>

        <div class="mt-7 border-t border-[#e1e9e6] pt-6">
          <h3 class="text-sm font-extrabold uppercase tracking-wider text-[#60756d]">
            Description
          </h3>
          <p class="untrusted-text mt-3 leading-7">
            {{ current.description ?? 'No description was supplied.' }}
          </p>
        </div>
      </section>

      <aside class="mt-6 rounded-xl border border-[#d5dfdc] bg-[#edf3f0] p-4 text-sm font-semibold">
        Incidents are append-only and cannot be resolved from the admin console.
      </aside>
    }
  `,
})
export class IncidentDetailPageComponent {
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly incident = signal<AdminIncidentDetail | null>(null);
  readonly humanize = humanize;
  private readonly api = inject(IncidentsApi);
  private readonly authStore = inject(AuthStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly id = parsePositiveId(inject(ActivatedRoute).snapshot.paramMap.get('id'));
  private generation = 0;
  private lifetimeGeneration = 0;

  constructor() {
    this.destroyRef.onDestroy(() => this.lifetimeGeneration++);
    this.load();
  }

  private load(): void {
    if (this.id === null) {
      this.loading.set(false);
      this.error.set('This incident is not available.');
      return;
    }
    const generation = ++this.generation;
    const identity = captureIdentity(this.authStore, generation, this.lifetimeGeneration);
    this.api
      .detail(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (incident) => {
          if (identityIsCurrent(identity, this.authStore, generation, this.lifetimeGeneration)) {
            this.incident.set(incident);
            this.loading.set(false);
          }
        },
        error: (failure: unknown) => {
          if (identityIsCurrent(identity, this.authStore, generation, this.lifetimeGeneration)) {
            this.loading.set(false);
            this.error.set(
              failure instanceof Error ? failure.message : 'This incident is not available.',
            );
          }
        },
      });
  }
}

function parsePositiveId(value: string | null): number | null {
  return value !== null && /^[1-9]\d*$/u.test(value) ? Number(value) : null;
}
