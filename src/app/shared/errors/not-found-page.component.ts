import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PageHeaderComponent } from '../ui/page-header.component';

@Component({
  selector: 'admin-not-found-page',
  imports: [PageHeaderComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <admin-page-header
      eyebrow="Voltio Admin"
      title="Page not found"
      description="This administrative route does not exist."
    />
    <a class="button button-primary" routerLink="/users">Return to users</a>
  `,
})
export class NotFoundPageComponent {}
