import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'admin-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-7">
      <p class="eyebrow">{{ eyebrow() }}</p>
      <h1 class="page-title" tabindex="-1">{{ title() }}</h1>
      @if (description()) {
        <p class="mt-3 max-w-3xl text-sm leading-6 text-[#587068]">{{ description() }}</p>
      }
    </header>
  `,
})
export class PageHeaderComponent {
  readonly eyebrow = input('Voltio operations');
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
}
