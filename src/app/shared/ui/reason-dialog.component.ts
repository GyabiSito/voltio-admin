import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ReasonDialogConfig } from './reason-dialog.models';

@Component({
  selector: 'admin-reason-dialog',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      class="m-auto w-[min(92vw,34rem)] rounded-2xl border border-[#d7e2de] bg-white p-0 text-[#13211c] shadow-2xl"
      [attr.aria-labelledby]="titleId"
      [attr.aria-describedby]="descriptionId"
      (cancel)="cancelDialog($event)"
      (close)="restoreFocus()"
    >
      @if (config(); as current) {
        <form class="p-6 sm:p-8" (submit)="submit($event)">
          <p class="eyebrow">Administrative action</p>
          <h2 [id]="titleId" class="mt-2 text-2xl font-bold">{{ current.title }}</h2>
          <p [id]="descriptionId" class="mt-3 text-sm leading-6 text-[#5e746c]">
            {{ current.description }}
          </p>

          <fieldset class="mt-6 grid gap-2">
            <legend class="mb-2 text-sm font-bold">Choose a reason</legend>
            @for (option of current.options; track option.code) {
              <label
                class="flex cursor-pointer items-center gap-3 rounded-xl border border-[#d9e4e0] px-4 py-3 has-[:checked]:border-[#176b53] has-[:checked]:bg-[#edf7f3]"
              >
                <input
                  type="radio"
                  name="reasonCode"
                  [value]="option.code"
                  [(ngModel)]="selectedReason"
                  required
                />
                <span class="font-semibold">{{ option.label }}</span>
              </label>
            }
          </fieldset>

          @if (error()) {
            <p class="mt-4 text-sm font-semibold text-[#963e38]" role="alert">{{ error() }}</p>
          }

          <div class="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              class="button button-secondary"
              type="button"
              [disabled]="busy()"
              (click)="close()"
            >
              Cancel
            </button>
            <button
              class="button"
              [class.button-danger]="current.danger"
              [class.button-primary]="!current.danger"
              type="submit"
              [disabled]="busy() || selectedReason === null"
              [attr.aria-busy]="busy()"
            >
              {{ busy() ? 'Submitting…' : current.confirmLabel }}
            </button>
          </div>
        </form>
      }
    </dialog>
  `,
})
export class ReasonDialogComponent {
  readonly config = input<ReasonDialogConfig | null>(null);
  readonly busy = input(false);
  readonly error = input<string | null>(null);
  readonly confirmed = output<string>();
  readonly cancelled = output<void>();
  readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  readonly titleId = `reason-dialog-title-${crypto.randomUUID()}`;
  readonly descriptionId = `reason-dialog-description-${crypto.randomUUID()}`;
  selectedReason: string | null = null;
  private trigger: HTMLElement | null = null;

  constructor() {
    afterRenderEffect(() => {
      const config = this.config();
      const element = this.dialog().nativeElement;
      if (config !== null && !element.open) {
        this.trigger =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
        this.selectedReason = null;
        element.showModal();
      } else if (config === null && element.open) {
        element.close();
      }
    });
  }

  submit(event: Event): void {
    event.preventDefault();
    if (!this.busy() && this.selectedReason !== null) {
      this.confirmed.emit(this.selectedReason);
    }
  }

  close(): void {
    if (!this.busy()) {
      this.dialog().nativeElement.close();
      this.cancelled.emit();
    }
  }

  cancelDialog(event: Event): void {
    event.preventDefault();
    this.close();
  }

  restoreFocus(): void {
    this.trigger?.focus();
    this.trigger = null;
  }
}
