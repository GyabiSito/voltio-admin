import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { AdminLanguageService } from '../../core/i18n';

@Component({
  selector: 'admin-date-time',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (value(); as timestamp) {
      <time [attr.datetime]="timestamp">{{ language.formatDate(timestamp, { timeStyle: 'short' }) }} UTC</time>
    } @else {
      <span>{{ language.translate('common.notAvailable') }}</span>
    }
  `,
})
export class DateTimeComponent {
  readonly value = input<string | null>(null);
  readonly language = inject(AdminLanguageService);
}
