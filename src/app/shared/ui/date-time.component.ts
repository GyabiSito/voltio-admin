import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'admin-date-time',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (value(); as timestamp) {
      <time [attr.datetime]="timestamp">{{ timestamp | date: 'medium' : 'UTC' }} UTC</time>
    } @else {
      <span>Not available</span>
    }
  `,
})
export class DateTimeComponent {
  readonly value = input<string | null>(null);
}
