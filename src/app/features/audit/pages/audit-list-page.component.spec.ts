import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AuthStore } from '../../../core/auth/auth.store';
import { CursorPage } from '../../../core/http/api-envelope';
import { AuditApi } from '../data-access/audit.api';
import { AdminAuditEntry } from '../data-access/audit.models';
import { AuditListPageComponent } from './audit-list-page.component';

describe('AuditListPageComponent', () => {
  it('does not reload when accepting the response updates list state', async () => {
    const responses = new Subject<CursorPage<AdminAuditEntry>>();
    const list = vi.fn(() => responses.asObservable());

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuditApi, useValue: { list } },
        {
          provide: AuthStore,
          useValue: {
            user: signal({
              id: 1,
              displayName: 'Ada Admin',
              email: 'ada@example.test',
              roles: ['admin'],
              createdAt: '2026-07-30T00:00:00Z',
            }),
            identityGeneration: signal(1),
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(AuditListPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(list).toHaveBeenCalledOnce();

    responses.next({
      success: true,
      message: 'Audit entries retrieved.',
      data: [],
      errorCode: null,
      errors: null,
      statusCode: 200,
      meta: {
        generatedAt: '2026-07-30T00:00:00Z',
        timezone: 'UTC',
        limit: 20,
        hasMore: false,
        nextCursor: null,
      },
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(list).toHaveBeenCalledOnce();
  });
});
