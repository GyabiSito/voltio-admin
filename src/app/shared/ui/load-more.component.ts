import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'admin-load-more',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (error(); as message) {
      <p class="mt-4 text-sm font-semibold text-[#8f3434]" role="alert">{{ message }}</p>
    }
    @if (hasMore()) {
      <button
        class="button button-secondary mt-5 w-full sm:w-auto"
        type="button"
        [disabled]="loading()"
        [attr.aria-busy]="loading()"
        (click)="load.emit()"
      >
        {{ loading() ? 'Loading…' : 'Load more' }}
      </button>
    }
  `,
})
export class LoadMoreComponent {
  readonly hasMore = input(false);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly load = output<void>();
}
