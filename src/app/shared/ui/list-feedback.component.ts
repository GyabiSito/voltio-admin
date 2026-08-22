import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'admin-list-feedback',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="surface grid gap-3 p-6" aria-busy="true" aria-label="Loading list">
        <span class="h-4 animate-pulse rounded bg-[#e2ebe8]"></span>
        <span class="h-4 w-4/5 animate-pulse rounded bg-[#e2ebe8]"></span>
        <span class="h-4 w-3/5 animate-pulse rounded bg-[#e2ebe8]"></span>
      </div>
    }
    @if (error(); as message) {
      <div class="surface border-[#e7b8b4] bg-[#fff8f7] p-5 text-sm text-[#843c36]" role="alert">
        <p class="font-bold">{{ message }}</p>
        <button class="button button-secondary mt-3" type="button" (click)="retry.emit()">
          Reload list
        </button>
      </div>
    }
  `,
})
export class ListFeedbackComponent {
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly retry = output<void>();
}
