import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuthStore } from '../../../core/auth/auth.store';
import { captureIdentity, identityIsCurrent } from '../../../core/http/identity-context';
import { DateTimeComponent } from '../../../shared/ui/date-time.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { humanize, StatusBadgeComponent } from '../../../shared/ui/status-badge.component';
import { auditStateRows } from '../components/audit-state.presenter';
import { AuditApi } from '../data-access/audit.api';
import { AdminAuditEntry } from '../data-access/audit.models';

@Component({
  selector: 'admin-audit-detail-page',
  imports: [DateTimeComponent, PageHeaderComponent, RouterLink, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="mb-5 inline-flex font-bold text-[#176b53] underline" routerLink="/audit"
      >← Audit trail</a
    >
    <admin-page-header
      title="Audit entry"
      description="This append-only entry cannot be updated or deleted."
    />

    @if (loading()) {
      <div class="surface p-8" aria-busy="true">Loading audit entry…</div>
    } @else if (error(); as message) {
      <div class="surface border-[#e7b8b4] p-6 text-[#843c36]" role="alert">
        <p class="font-bold">{{ message }}</p>
        <a class="button button-secondary mt-4" routerLink="/audit">Return to audit trail</a>
      </div>
    } @else if (entry(); as current) {
      <section class="surface p-5 sm:p-7">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="eyebrow">Audit entry #{{ current.id }}</p>
            <h2 class="mt-2 text-xl font-bold">{{ humanize(current.action) }}</h2>
          </div>
          <admin-status-badge [value]="current.actor.status" />
        </div>

        <dl class="detail-grid mt-7">
          <div class="detail-item">
            <dt>Actor</dt>
            <dd>{{ current.actor.displayName }} · #{{ current.actor.id }}</dd>
          </div>
          <div class="detail-item">
            <dt>Subject</dt>
            <dd>{{ humanize(current.subject.type) }} · #{{ current.subject.id }}</dd>
          </div>
          <div class="detail-item">
            <dt>Reason</dt>
            <dd>{{ humanize(current.reasonCode) }}</dd>
          </div>
          <div class="detail-item">
            <dt>Created</dt>
            <dd><admin-date-time [value]="current.createdAt" /></dd>
          </div>
          <div class="detail-item sm:col-span-2">
            <dt>Operation ID</dt>
            <dd class="font-mono text-sm">{{ current.operationId }}</dd>
          </div>
        </dl>
      </section>

      <section class="surface mt-6 overflow-hidden" aria-labelledby="state-title">
        <div class="p-5 sm:p-7">
          <p class="eyebrow">Allowlisted transition</p>
          <h2 id="state-title" class="mt-2 text-xl font-bold">Before and after</h2>
        </div>
        <div class="overflow-x-auto">
          <table class="data-table">
            <caption class="sr-only">
              Allowlisted audit state transition
            </caption>
            <thead>
              <tr>
                <th scope="col">Field</th>
                <th scope="col">Before</th>
                <th scope="col">After</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(current); track row.label) {
                <tr>
                  <th scope="row">{{ row.label }}</th>
                  <td>{{ row.before }}</td>
                  <td>{{ row.after }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    }
  `,
})
export class AuditDetailPageComponent {
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly entry = signal<AdminAuditEntry | null>(null);
  readonly humanize = humanize;
  readonly rows = auditStateRows;
  private readonly api = inject(AuditApi);
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
      this.error.set('This audit entry is not available.');
      return;
    }
    const generation = ++this.generation;
    const identity = captureIdentity(this.authStore, generation, this.lifetimeGeneration);
    this.api
      .detail(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (entry) => {
          if (identityIsCurrent(identity, this.authStore, generation, this.lifetimeGeneration)) {
            this.entry.set(entry);
            this.loading.set(false);
          }
        },
        error: (failure: unknown) => {
          if (identityIsCurrent(identity, this.authStore, generation, this.lifetimeGeneration)) {
            this.loading.set(false);
            this.error.set(
              failure instanceof Error ? failure.message : 'This audit entry is not available.',
            );
          }
        },
      });
  }
}

function parsePositiveId(value: string | null): number | null {
  return value !== null && /^[1-9]\d*$/u.test(value) ? Number(value) : null;
}
