import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'admin-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="surface px-6 py-12 text-center">
      <div class="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-[#e4efeb] text-xl">
        ○
      </div>
      <h2 class="text-lg font-bold text-[#17352a]">{{ title() }}</h2>
      <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-[#60766e]">{{ description() }}</p>
    </div>
  `,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}
