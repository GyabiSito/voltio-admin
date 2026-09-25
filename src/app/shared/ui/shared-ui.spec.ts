import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { DateTimeComponent } from './date-time.component';
import { EmptyStateComponent } from './empty-state.component';
import { LoadMoreComponent } from './load-more.component';
import { PageHeaderComponent } from './page-header.component';
import { ReasonDialogComponent } from './reason-dialog.component';
import { StatusBadgeComponent } from './status-badge.component';

describe('accessible shared administrative UI', () => {
  it('renders one focusable page heading and its description', () => {
    const fixture = TestBed.createComponent(PageHeaderComponent);
    fixture.componentRef.setInput('title', 'Users');
    fixture.componentRef.setInput('description', 'Administrative account oversight.');
    fixture.detectChanges();

    const headings = fixture.nativeElement.querySelectorAll('h1');
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toContain('Users');
    expect(headings[0].getAttribute('tabindex')).toBe('-1');
    expect(fixture.nativeElement.textContent).toContain('Administrative account oversight.');
  });

  it('uses a semantic UTC time element', () => {
    const fixture = TestBed.createComponent(DateTimeComponent);
    fixture.componentRef.setInput('value', '2026-07-29T18:42:01Z');
    fixture.detectChanges();

    const time = fixture.nativeElement.querySelector('time');
    expect(time.getAttribute('datetime')).toBe('2026-07-29T18:42:01Z');
    expect(time.textContent).toContain('UTC');
  });

  it('renders explicit fallback text for unavailable dates', () => {
    const fixture = TestBed.createComponent(DateTimeComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No disponible');
  });

  it('never communicates status by color alone', () => {
    const fixture = TestBed.createComponent(StatusBadgeComponent);
    fixture.componentRef.setInput('value', 'restriction_lifted');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Restricción levantada');
  });

  it('uses a real heading for empty states', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.componentRef.setInput('title', 'No reports');
    fixture.componentRef.setInput('description', 'No reports match the current filters.');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h2').textContent).toContain('No reports');
  });

  it('marks load-more errors as alerts', () => {
    const fixture = TestBed.createComponent(LoadMoreComponent);
    fixture.componentRef.setInput('error', 'The next page could not be loaded.');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'The next page could not be loaded.',
    );
  });

  it('disables and marks the load-more button busy during a request', () => {
    const fixture = TestBed.createComponent(LoadMoreComponent);
    fixture.componentRef.setInput('hasMore', true);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
  });

  it('opens the reason dialog when its signal-backed configuration appears', async () => {
    const fixture = TestBed.createComponent(ReasonDialogComponent);
    fixture.detectChanges();
    const dialog: HTMLDialogElement = fixture.nativeElement.querySelector('dialog');
    dialog.showModal = vi.fn(() => dialog.setAttribute('open', ''));

    fixture.componentRef.setInput('config', {
      title: 'Dismiss report',
      description: 'Close this report.',
      options: [{ code: 'not_actionable', label: 'Not actionable' }],
      confirmLabel: 'Dismiss report',
      danger: false,
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(dialog.showModal).toHaveBeenCalledOnce();
    expect(dialog.open).toBe(true);
  });
});
