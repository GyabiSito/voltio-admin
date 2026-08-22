import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthSessionService } from '../../core/auth/auth-session.service';
import { AuthStore } from '../../core/auth/auth.store';
import { AdminLayoutComponent } from './admin-layout.component';

describe('AdminLayoutComponent', () => {
  it('provides one main landmark and moves focus through the first skip link', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLayoutComponent],
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: { user: signal(null) } },
        { provide: AuthSessionService, useValue: { logout: () => Promise.resolve() } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AdminLayoutComponent);
    fixture.detectChanges();
    const focusable = fixture.nativeElement.querySelector(
      'a[href], button, input, select, textarea',
    );
    const skipLink = fixture.nativeElement.querySelector(
      'a[href="#main-content"]',
    ) as HTMLAnchorElement;
    const main = fixture.nativeElement.querySelector('#main-content') as HTMLElement;

    expect(fixture.nativeElement.querySelectorAll('main')).toHaveLength(1);
    expect(focusable).toBe(skipLink);
    expect(skipLink.textContent).toContain('Skip to main content');

    skipLink.click();
    await new Promise((resolve) => setTimeout(resolve));
    expect(document.activeElement).toBe(main);
  });
});
