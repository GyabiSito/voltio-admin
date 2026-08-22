import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';

import { AuthStore } from '../../../core/auth/auth.store';
import { AdminApiError } from '../../../core/http/admin-api-error';
import { AdminRefreshBus } from '../../../core/http/admin-refresh-bus';
import {
  captureIdentity,
  IdentityContext,
  identityIsCurrent,
} from '../../../core/http/identity-context';
import { DateTimeComponent } from '../../../shared/ui/date-time.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { ReasonDialogComponent } from '../../../shared/ui/reason-dialog.component';
import { ReasonDialogConfig } from '../../../shared/ui/reason-dialog.models';
import { humanize, StatusBadgeComponent } from '../../../shared/ui/status-badge.component';
import {
  isDismissReason,
  isLiftReason,
  isRestrictReason,
  REPORT_REASON_CONFIGS,
  ReportMutation,
} from '../components/report-reason-config';
import { ReportsApi } from '../data-access/reports.api';
import { ChargingPointReportDetail } from '../data-access/reports.models';

@Component({
  selector: 'admin-report-detail-page',
  imports: [
    DateTimeComponent,
    PageHeaderComponent,
    ReasonDialogComponent,
    RouterLink,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      class="mb-5 inline-flex font-bold text-[#176b53] underline"
      routerLink="/moderation/charging-point-reports"
      >← Charging point reports</a
    >
    <admin-page-header
      title="Report detail"
      description="Moderated text is displayed as plain text. Transitions are authoritative and audited."
    />

    <div class="sr-only" aria-live="polite">{{ success() }}</div>
    @if (success(); as message) {
      <p
        class="mb-5 rounded-xl border border-[#b8dfcc] bg-[#eef9f3] p-4 text-sm font-bold text-[#176546]"
      >
        {{ message }}
      </p>
    }
    @if (mutationError(); as message) {
      <p
        class="mb-5 rounded-xl border border-[#e2b6b2] bg-[#fff7f6] p-4 text-sm font-bold text-[#8d3933]"
        role="alert"
      >
        {{ message }}
      </p>
    }
    @if (reconciling()) {
      <p
        class="mb-5 rounded-xl bg-[#f5efe0] p-4 text-sm font-bold text-[#705719]"
        aria-live="polite"
      >
        The mutation response was ambiguous. Checking the authoritative resource state…
      </p>
    }

    @if (loading()) {
      <div class="surface p-8" aria-busy="true">Loading report…</div>
    } @else if (error(); as message) {
      <div class="surface border-[#e7b8b4] p-6 text-[#843c36]" role="alert">
        <p class="font-bold">{{ message }}</p>
        <a class="button button-secondary mt-4" routerLink="/moderation/charging-point-reports"
          >Return to reports</a
        >
      </div>
    } @else if (report(); as current) {
      <section class="surface p-5 sm:p-7">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="eyebrow">Report #{{ current.id }}</p>
            <h2 class="mt-2 text-2xl font-bold">{{ humanize(current.reason) }}</h2>
          </div>
          <admin-status-badge [value]="current.status" />
        </div>

        <dl class="detail-grid mt-7">
          <div class="detail-item">
            <dt>Reporter</dt>
            <dd>{{ current.reporter?.displayName ?? 'Anonymous reporter' }}</dd>
          </div>
          <div class="detail-item">
            <dt>Created</dt>
            <dd><admin-date-time [value]="current.createdAt" /></dd>
          </div>
          <div class="detail-item">
            <dt>Updated</dt>
            <dd><admin-date-time [value]="current.updatedAt" /></dd>
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

      <section class="surface mt-6 p-5 sm:p-7" aria-labelledby="point-title">
        <p class="eyebrow">Current target</p>
        <h2 id="point-title" class="mt-2 text-xl font-bold">
          {{ current.chargingPoint?.title ?? 'Charging point unavailable' }}
        </h2>
        @if (current.chargingPoint; as point) {
          <dl class="detail-grid mt-6">
            <div class="detail-item">
              <dt>Point ID</dt>
              <dd>{{ point.id }}</dd>
            </div>
            <div class="detail-item">
              <dt>Public state</dt>
              <dd>{{ point.isActive ? 'Active' : 'Inactive' }}</dd>
            </div>
            <div class="detail-item">
              <dt>Connector</dt>
              <dd>{{ point.connectorType ?? 'Unknown' }}</dd>
            </div>
            <div class="detail-item">
              <dt>Power</dt>
              <dd>{{ point.powerKw ? point.powerKw + ' kW' : 'Unknown' }}</dd>
            </div>
            <div class="detail-item">
              <dt>Current Host</dt>
              <dd>{{ point.host?.displayName ?? 'Unavailable' }}</dd>
            </div>
            <div class="detail-item">
              <dt>Administrative restriction</dt>
              <dd>
                @if (point.moderationDisabledAt) {
                  Restricted since <admin-date-time [value]="point.moderationDisabledAt" />
                } @else {
                  Not restricted
                }
              </dd>
            </div>
          </dl>
        }
      </section>

      @if (current.status === 'open' || current.chargingPoint?.moderationDisabledAt) {
        <section class="surface mt-6 p-5 sm:p-7" aria-labelledby="actions-title">
          <p class="eyebrow">Closed transitions</p>
          <h2 id="actions-title" class="mt-2 text-xl font-bold">Available actions</h2>
          <div class="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            @if (current.status === 'open') {
              <button
                class="button button-secondary"
                type="button"
                [disabled]="busy()"
                (click)="openAction('dismiss')"
              >
                Dismiss report
              </button>
              @if (current.chargingPoint && !current.chargingPoint.moderationDisabledAt) {
                <button
                  class="button button-danger"
                  type="button"
                  [disabled]="busy()"
                  (click)="openAction('restrict')"
                >
                  Restrict charging point
                </button>
              }
            }
            @if (current.chargingPoint?.moderationDisabledAt) {
              <button
                class="button button-primary"
                type="button"
                [disabled]="busy()"
                (click)="openAction('lift')"
              >
                Lift restriction
              </button>
            }
          </div>
        </section>
      }
    }

    <admin-reason-dialog
      [config]="dialogConfig()"
      [busy]="busy()"
      [error]="dialogError()"
      (confirmed)="submitMutation($event)"
      (cancelled)="closeDialog()"
    />
  `,
})
export class ReportDetailPageComponent {
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly report = signal<ChargingPointReportDetail | null>(null);
  readonly dialogConfig = signal<ReasonDialogConfig | null>(null);
  readonly dialogError = signal<string | null>(null);
  readonly busy = signal(false);
  readonly reconciling = signal(false);
  readonly success = signal<string | null>(null);
  readonly mutationError = signal<string | null>(null);
  readonly humanize = humanize;

  private readonly api = inject(ReportsApi);
  private readonly authStore = inject(AuthStore);
  private readonly refreshBus = inject(AdminRefreshBus);
  private readonly destroyRef = inject(DestroyRef);
  private readonly id = parsePositiveId(inject(ActivatedRoute).snapshot.paramMap.get('id'));
  private action: ReportMutation | null = null;
  private detailGeneration = 0;
  private mutationGeneration = 0;
  private lifetimeGeneration = 0;

  constructor() {
    this.destroyRef.onDestroy(() => this.lifetimeGeneration++);
    this.load();
  }

  openAction(action: ReportMutation): void {
    if (this.busy()) {
      return;
    }
    this.action = action;
    this.dialogError.set(null);
    this.mutationError.set(null);
    this.dialogConfig.set(REPORT_REASON_CONFIGS[action]);
  }

  closeDialog(): void {
    if (!this.busy()) {
      this.action = null;
      this.dialogConfig.set(null);
      this.dialogError.set(null);
    }
  }

  submitMutation(reasonCode: string): void {
    const current = this.report();
    const action = this.action;
    if (current === null || action === null || this.busy()) {
      return;
    }

    const request = this.mutationRequest(current, action, reasonCode);
    if (request === null) {
      this.dialogError.set('Choose one of the available reasons.');
      return;
    }

    const generation = ++this.mutationGeneration;
    const identity = captureIdentity(this.authStore, generation, this.lifetimeGeneration);
    this.busy.set(true);
    this.dialogError.set(null);
    this.success.set(null);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        if (this.mutationIsCurrent(identity, generation)) {
          this.finishAppliedMutation(action);
        }
      },
      error: (failure: unknown) => {
        if (!this.mutationIsCurrent(identity, generation)) {
          return;
        }
        if (failure instanceof AdminApiError && failure.ambiguous) {
          this.reconcile(action, identity, generation);
          return;
        }
        this.busy.set(false);
        if (failure instanceof AdminApiError && failure.status === 409) {
          this.dialogConfig.set(null);
          this.action = null;
          this.mutationError.set(failure.message);
          this.load();
        } else {
          this.dialogError.set(
            failure instanceof Error ? failure.message : 'The action could not be completed.',
          );
        }
      },
    });
  }

  private mutationRequest(
    current: ChargingPointReportDetail,
    action: ReportMutation,
    reasonCode: string,
  ): Observable<unknown> | null {
    if (action === 'dismiss' && isDismissReason(reasonCode)) {
      return this.api.dismiss(current.id, reasonCode);
    }
    if (action === 'restrict' && isRestrictReason(reasonCode)) {
      return this.api.restrict(current.id, reasonCode);
    }
    if (
      action === 'lift' &&
      isLiftReason(reasonCode) &&
      current.chargingPoint?.moderationDisabledAt
    ) {
      return this.api.lift(current.chargingPoint.id, reasonCode);
    }
    return null;
  }

  private reconcile(
    action: ReportMutation,
    identity: IdentityContext | null,
    generation: number,
  ): void {
    if (this.id === null) {
      return;
    }
    this.reconciling.set(true);
    this.api
      .detail(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (authoritative) => {
          if (!this.mutationIsCurrent(identity, generation)) {
            return;
          }
          this.report.set(authoritative);
          this.reconciling.set(false);
          this.busy.set(false);
          if (transitionApplied(authoritative, action)) {
            this.dialogConfig.set(null);
            this.action = null;
            this.success.set('The server state confirms that the transition was applied.');
            this.refreshBus.invalidate('reports', 'audit');
          } else {
            this.dialogError.set(
              'The server state did not change. You may retry this action manually.',
            );
          }
        },
        error: () => {
          if (this.mutationIsCurrent(identity, generation)) {
            this.reconciling.set(false);
            this.busy.set(false);
            this.dialogConfig.set(null);
            this.action = null;
            this.mutationError.set(
              'The result is still unknown. Reload the report before taking another action.',
            );
          }
        },
      });
  }

  private finishAppliedMutation(action: ReportMutation): void {
    this.busy.set(false);
    this.dialogConfig.set(null);
    this.action = null;
    this.success.set(
      action === 'dismiss'
        ? 'Report dismissed.'
        : action === 'restrict'
          ? 'Charging point restricted.'
          : 'Charging point restriction lifted.',
    );
    this.refreshBus.invalidate('reports', 'audit');
    this.load();
  }

  private load(): void {
    if (this.id === null) {
      this.loading.set(false);
      this.error.set('This report is not available.');
      return;
    }
    const generation = ++this.detailGeneration;
    const identity = captureIdentity(this.authStore, generation, this.lifetimeGeneration);
    this.loading.set(this.report() === null);
    this.error.set(null);
    this.api
      .detail(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (report) => {
          if (identityIsCurrent(identity, this.authStore, generation, this.lifetimeGeneration)) {
            this.report.set(report);
            this.loading.set(false);
          }
        },
        error: (failure: unknown) => {
          if (identityIsCurrent(identity, this.authStore, generation, this.lifetimeGeneration)) {
            this.loading.set(false);
            this.error.set(
              failure instanceof Error ? failure.message : 'This report is not available.',
            );
          }
        },
      });
  }

  private mutationIsCurrent(identity: IdentityContext | null, generation: number): boolean {
    return identityIsCurrent(identity, this.authStore, generation, this.lifetimeGeneration);
  }
}

export function transitionApplied(
  report: ChargingPointReportDetail,
  action: ReportMutation,
): boolean {
  return action === 'dismiss'
    ? report.status === 'dismissed' || report.status === 'actioned'
    : action === 'restrict'
      ? report.status === 'actioned' &&
        report.chargingPoint !== null &&
        report.chargingPoint.moderationDisabledAt !== null
      : report.chargingPoint !== null && report.chargingPoint.moderationDisabledAt === null;
}

function parsePositiveId(value: string | null): number | null {
  return value !== null && /^[1-9]\d*$/u.test(value) ? Number(value) : null;
}
