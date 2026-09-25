import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { AdminLanguageService } from '../../core/i18n';

@Component({
  selector: 'admin-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="status-badge" [class]="classes()">{{ label() }}</span>`,
})
export class StatusBadgeComponent {
  readonly value = input.required<string>();
  private readonly language = inject(AdminLanguageService);
  readonly label = computed(() => this.language.translateStatus(this.value()));
  readonly classes = computed(
    () => `status-badge status-${this.value().toLowerCase().replaceAll('_', '-')}`,
  );
}

export function humanize(value: string): string {
  const normalized = value.replaceAll('_', ' ').replaceAll('.', ' · ');
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}
