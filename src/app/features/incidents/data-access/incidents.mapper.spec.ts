import { describe, expect, it } from 'vitest';

import { mapIncidentDetail, mapIncidentListItem } from './incidents.mapper';
import { INCIDENT_TYPES } from './incidents.models';

const NOW = '2026-07-29T18:42:01Z';
const LATER = '2026-07-29T19:42:01Z';

function detail(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 23,
    type: 'access_issue',
    description: 'Gate code did not work.',
    reportedByRole: 'driver',
    reportedAt: NOW,
    reporter: { id: 7, displayName: 'Driver', status: 'active' },
    chargingPoint: {
      id: 5,
      title: 'North charger',
      countryCode: 'CL',
      currency: 'CLP',
      timezone: 'America/Santiago',
      isActive: true,
    },
    booking: { id: 12, status: 'confirmed' },
    session: {
      id: 14,
      status: 'scheduled',
      scheduledStartsAt: NOW,
      scheduledEndsAt: LATER,
    },
    ...overrides,
  };
}

describe('incident contracts', () => {
  it.each(INCIDENT_TYPES)('accepts the closed incident type %s', (type) => {
    expect(mapIncidentDetail(detail({ type })).type).toBe(type);
  });

  it('maps the read-only list contract without description content', () => {
    const result = mapIncidentListItem({
      id: 23,
      type: 'access_issue',
      reportedByRole: 'driver',
      hasDescription: true,
      chargingPoint: { id: 5, title: 'North charger' },
      bookingStatus: 'confirmed',
      sessionStatus: 'scheduled',
      reportedAt: NOW,
    });
    expect(result).toMatchObject({ id: 23, hasDescription: true });
    expect('description' in result).toBe(false);
  });

  it('rejects unknown incident types and reporter roles', () => {
    expect(() => mapIncidentDetail(detail({ type: 'billing_issue' }))).toThrow();
    expect(() => mapIncidentDetail(detail({ reportedByRole: 'admin' }))).toThrow();
  });

  it.each([
    ['HTML', '<svg onload=alert(1)>'],
    ['Markdown', '`code` [link](javascript:alert(1))'],
    ['Unicode', 'Acceso bloqueado 🚧 — portón'],
    ['line breaks', 'First line\nSecond line'],
    ['long text', 'incident '.repeat(500)],
  ])('preserves %s incident description as inert data', (_kind, content) => {
    expect(mapIncidentDetail(detail({ description: content })).description).toBe(content);
  });

  it('accepts a deleted reporter tombstone', () => {
    expect(
      mapIncidentDetail(
        detail({ reporter: { id: 7, displayName: 'Deleted user', status: 'closed' } }),
      ).reporter,
    ).toMatchObject({ displayName: 'Deleted user', status: 'closed' });
  });

  it('rejects unknown nested session fields', () => {
    expect(() =>
      mapIncidentDetail(
        detail({
          session: {
            id: 14,
            status: 'scheduled',
            scheduledStartsAt: NOW,
            scheduledEndsAt: LATER,
            internalTelemetry: 'private',
          },
        }),
      ),
    ).toThrow();
  });

  it('rejects unknown detail fields', () => {
    expect(() => mapIncidentDetail(detail({ severity: 'high' }))).toThrow();
  });

  it('requires strict UTC scheduling timestamps', () => {
    expect(() =>
      mapIncidentDetail(
        detail({
          session: {
            id: 14,
            status: 'scheduled',
            scheduledStartsAt: '2026-07-29T18:42:01-03:00',
            scheduledEndsAt: LATER,
          },
        }),
      ),
    ).toThrow();
  });
});
