import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
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
import { StatusBadgeComponent } from '../../../shared/ui/status-badge.component';
import {
  isHideReason,
  isRestoreReason,
  REVIEW_REASON_CONFIGS,
  ReviewMutation,
} from '../components/review-reason-config';
import { ReviewsApi } from '../data-access/reviews.api';
import { AdminReviewDetail } from '../data-access/reviews.models';

@Component({
  selector: 'admin-review-detail-page',
  imports: [
    DateTimeComponent,
    PageHeaderComponent,
    ReasonDialogComponent,
    RouterLink,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="mb-5 inline-flex font-bold text-[#176b53] underline" routerLink="/moderation/reviews"
      >← Reviews</a
    >
    <admin-page-header
      title="Review detail"
      description="Historical review content is read-only and rendered as plain text."
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
        The mutation response was ambiguous. Checking the authoritative review state…
      </p>
    }

    @if (loading()) {
      <div class="surface p-8" aria-busy="true">Loading review…</div>
    } @else if (error(); as message) {
      <div class="surface border-[#e7b8b4] p-6 text-[#843c36]" role="alert">
        <p class="font-bold">{{ message }}</p>
        <a class="button button-secondary mt-4" routerLink="/moderation/reviews"
          >Return to reviews</a
        >
      </div>
    } @else if (review(); as current) {
      <section class="surface p-5 sm:p-7">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="eyebrow">Review #{{ current.id }}</p>
            <h2
              class="mt-2 text-2xl font-bold"
              [attr.aria-label]="current.rating + ' out of 5 stars'"
            >
              {{ starLabel(current.rating) }}
            </h2>
          </div>
          <admin-status-badge [value]="current.status" />
        </div>

        <dl class="detail-grid mt-7">
          <div class="detail-item">
            <dt>Author</dt>
            <dd>{{ current.author.displayName }}</dd>
          </div>
          <div class="detail-item">
            <dt>Subject</dt>
            <dd>{{ current.subject.displayName }}</dd>
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
            <dt>Country</dt>
            <dd>{{ current.chargingPoint.countryCode ?? 'Not available' }}</dd>
          </div>
          <div class="detail-item">
            <dt>Currency</dt>
            <dd>{{ current.chargingPoint.currency ?? 'Not available' }}</dd>
          </div>
          <div class="detail-item">
            <dt>Timezone</dt>
            <dd>{{ current.chargingPoint.timezone ?? 'Not available' }}</dd>
          </div>
          <div class="detail-item">
            <dt>Booking</dt>
            <dd>#{{ current.booking.id }} · {{ current.booking.status }}</dd>
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
          <h3 class="text-sm font-extrabold uppercase tracking-wider text-[#60756d]">Comment</h3>
          <p class="untrusted-text mt-3 leading-7">
            {{ current.comment ?? 'No comment was supplied.' }}
          </p>
        </div>
      </section>

      <section class="surface mt-6 p-5 sm:p-7" aria-labelledby="review-actions-title">
        <p class="eyebrow">Closed transitions</p>
        <h2 id="review-actions-title" class="mt-2 text-xl font-bold">Available action</h2>
        <div class="mt-5">
          @if (current.status === 'published') {
            <button
              class="button button-danger"
              type="button"
              [disabled]="busy()"
              (click)="openAction('hide')"
            >
              Hide review
            </button>
          } @else {
            <button
              class="button button-primary"
              type="button"
              [disabled]="busy()"
              (click)="openAction('restore')"
            >
              Restore review
            </button>
          }
        </div>
      </section>
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
export class ReviewDetailPageComponent {
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly review = signal<AdminReviewDetail | null>(null);
  readonly dialogConfig = signal<ReasonDialogConfig | null>(null);
  readonly dialogError = signal<string | null>(null);
  readonly busy = signal(false);
  readonly reconciling = signal(false);
  readonly success = signal<string | null>(null);
  readonly mutationError = signal<string | null>(null);
  private readonly api = inject(ReviewsApi);
  private readonly authStore = inject(AuthStore);
  private readonly refreshBus = inject(AdminRefreshBus);
  private readonly destroyRef = inject(DestroyRef);
  private readonly id = parsePositiveId(inject(ActivatedRoute).snapshot.paramMap.get('id'));
  private action: ReviewMutation | null = null;
  private detailGeneration = 0;
  private mutationGeneration = 0;
  private lifetimeGeneration = 0;

  constructor() {
    this.destroyRef.onDestroy(() => this.lifetimeGeneration++);
    this.load();
  }

  starLabel(rating: number): string {
    return `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`;
  }

  openAction(action: ReviewMutation): void {
    if (!this.busy()) {
      this.action = action;
      this.dialogError.set(null);
      this.mutationError.set(null);
      this.dialogConfig.set(REVIEW_REASON_CONFIGS[action]);
    }
  }

  closeDialog(): void {
    if (!this.busy()) {
      this.action = null;
      this.dialogConfig.set(null);
      this.dialogError.set(null);
    }
  }

  submitMutation(reasonCode: string): void {
    const current = this.review();
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
    current: AdminReviewDetail,
    action: ReviewMutation,
    reasonCode: string,
  ): Observable<unknown> | null {
    return action === 'hide' && isHideReason(reasonCode)
      ? this.api.hide(current.id, reasonCode)
      : action === 'restore' && isRestoreReason(reasonCode)
        ? this.api.restore(current.id, reasonCode)
        : null;
  }

  private reconcile(
    action: ReviewMutation,
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
          this.review.set(authoritative);
          this.reconciling.set(false);
          this.busy.set(false);
          if (
            (action === 'hide' && authoritative.status === 'hidden') ||
            (action === 'restore' && authoritative.status === 'published')
          ) {
            this.dialogConfig.set(null);
            this.action = null;
            this.success.set('The server state confirms that the transition was applied.');
            this.refreshBus.invalidate('reviews', 'audit');
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
              'The result is still unknown. Reload the review before taking another action.',
            );
          }
        },
      });
  }

  private finishAppliedMutation(action: ReviewMutation): void {
    this.busy.set(false);
    this.dialogConfig.set(null);
    this.action = null;
    this.success.set(action === 'hide' ? 'Review hidden.' : 'Review restored.');
    this.refreshBus.invalidate('reviews', 'audit');
    this.load();
  }

  private load(): void {
    if (this.id === null) {
      this.loading.set(false);
      this.error.set('This review is not available.');
      return;
    }
    const generation = ++this.detailGeneration;
    const identity = captureIdentity(this.authStore, generation, this.lifetimeGeneration);
    this.loading.set(this.review() === null);
    this.error.set(null);
    this.api
      .detail(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (review) => {
          if (identityIsCurrent(identity, this.authStore, generation, this.lifetimeGeneration)) {
            this.review.set(review);
            this.loading.set(false);
          }
        },
        error: (failure: unknown) => {
          if (identityIsCurrent(identity, this.authStore, generation, this.lifetimeGeneration)) {
            this.loading.set(false);
            this.error.set(
              failure instanceof Error ? failure.message : 'This review is not available.',
            );
          }
        },
      });
  }

  private mutationIsCurrent(identity: IdentityContext | null, generation: number): boolean {
    return identityIsCurrent(identity, this.authStore, generation, this.lifetimeGeneration);
  }
}

function parsePositiveId(value: string | null): number | null {
  return value !== null && /^[1-9]\d*$/u.test(value) ? Number(value) : null;
}
