import { describe, expect, it } from 'vitest';

import {
  isDismissReason,
  isLiftReason,
  isRestrictReason,
  REPORT_REASON_CONFIGS,
} from '../components/report-reason-config';
import { transitionApplied } from '../pages/report-detail-page.component';
import {
  mapPointModerationState,
  mapReportDetail,
  mapReportListItem,
  mapReportState,
  mapRestrictResult,
} from './reports.mapper';
import {
  ChargingPointReportDetail,
  DISMISS_REASONS,
  LIFT_REASONS,
  RESTRICT_REASONS,
} from './reports.models';

const NOW = '2026-07-29T18:42:01Z';

function user(): Record<string, unknown> {
  return { id: 3, displayName: 'Reporter', status: 'active' };
}

function point(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 5,
    title: 'North charger',
    isActive: true,
    moderationDisabledAt: null,
    connectorType: 'CCS2',
    powerKw: '50.00',
    host: { id: 4, displayName: 'Host', status: 'active' },
    ...overrides,
  };
}

function detail(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 17,
    status: 'open',
    reason: 'safety_concern',
    description: 'Cable insulation is damaged.',
    createdAt: NOW,
    updatedAt: NOW,
    reporter: user(),
    chargingPoint: point(),
    ...overrides,
  };
}

function mappedDetail(overrides: Record<string, unknown> = {}): ChargingPointReportDetail {
  return mapReportDetail(detail(overrides));
}

describe('charging point report contracts', () => {
  it('maps the list contract without a report description', () => {
    const result = mapReportListItem({
      id: 17,
      status: 'open',
      reason: 'safety_concern',
      hasDescription: true,
      chargingPoint: { id: 5, title: 'North charger', isActive: true },
      reporter: user(),
      reportedAt: NOW,
    });
    expect(result).toMatchObject({ id: 17, hasDescription: true });
    expect('description' in result).toBe(false);
  });

  it('rejects list description leakage', () => {
    expect(() =>
      mapReportListItem({
        id: 17,
        status: 'open',
        reason: 'safety_concern',
        hasDescription: true,
        description: 'private list content',
        chargingPoint: null,
        reporter: null,
        reportedAt: NOW,
      }),
    ).toThrow();
  });

  it('maps a complete detail including restriction state', () => {
    const result = mappedDetail({
      status: 'actioned',
      chargingPoint: point({ isActive: false, moderationDisabledAt: NOW }),
    });
    expect(result.chargingPoint).toMatchObject({
      id: 5,
      isActive: false,
      moderationDisabledAt: NOW,
    });
  });

  it.each([
    ['HTML', '<img src=x onerror=alert(1)>'],
    ['Markdown', '**unsafe-looking** [link](javascript:alert(1))'],
    ['Unicode', 'Cable dañado 🔌 — estación norte'],
    ['line breaks', 'First line\nSecond line'],
    ['long text', 'report '.repeat(500)],
  ])('preserves %s description text as inert data', (_kind, content) => {
    expect(mappedDetail({ description: content }).description).toBe(content);
  });

  it('accepts deleted reporter tombstones only with the canonical display name', () => {
    expect(
      mappedDetail({
        reporter: { id: 3, displayName: 'Deleted user', status: 'closed' },
      }).reporter,
    ).toMatchObject({ displayName: 'Deleted user', status: 'closed' });
    expect(() =>
      mappedDetail({ reporter: { id: 3, displayName: 'Old Name', status: 'closed' } }),
    ).toThrow('Invalid user tombstone.');
  });

  it('rejects an unknown report status or reason', () => {
    expect(() => mappedDetail({ status: 'pending' })).toThrow();
    expect(() => mappedDetail({ reason: 'custom_reason' })).toThrow();
  });

  it('rejects detail fields outside the allowlist', () => {
    expect(() => mappedDetail({ reporterEmail: 'private@example.test' })).toThrow();
  });

  it('maps exact mutation response shapes', () => {
    expect(mapReportState({ id: 17, status: 'dismissed' })).toEqual({
      id: 17,
      status: 'dismissed',
    });
    expect(mapPointModerationState({ id: 5, isActive: false, moderationDisabledAt: NOW })).toEqual({
      id: 5,
      isActive: false,
      moderationDisabledAt: NOW,
    });
    expect(
      mapRestrictResult({
        report: { id: 17, status: 'actioned' },
        chargingPoint: { id: 5, isActive: false, moderationDisabledAt: NOW },
      }),
    ).toMatchObject({ report: { status: 'actioned' }, chargingPoint: { isActive: false } });
  });

  it('rejects unknown mutation response fields', () => {
    expect(() => mapReportState({ id: 17, status: 'dismissed', operationId: 'hidden' })).toThrow();
  });
});

describe('report moderation reconciliation', () => {
  it('recognizes a dismissed report after an ambiguous response', () => {
    expect(transitionApplied(mappedDetail({ status: 'dismissed' }), 'dismiss')).toBe(true);
  });

  it('recognizes an already actioned report as closed for dismissal', () => {
    expect(transitionApplied(mappedDetail({ status: 'actioned' }), 'dismiss')).toBe(true);
  });

  it('requires both actioned report and restriction timestamp for restrict', () => {
    expect(
      transitionApplied(
        mappedDetail({
          status: 'actioned',
          chargingPoint: point({ isActive: false, moderationDisabledAt: NOW }),
        }),
        'restrict',
      ),
    ).toBe(true);
    expect(transitionApplied(mappedDetail({ status: 'actioned' }), 'restrict')).toBe(false);
    expect(
      transitionApplied(mappedDetail({ status: 'actioned', chargingPoint: null }), 'restrict'),
    ).toBe(false);
  });

  it('recognizes lift only from an authoritative point with no restriction timestamp', () => {
    expect(
      transitionApplied(
        mappedDetail({
          status: 'actioned',
          chargingPoint: point({ isActive: false, moderationDisabledAt: null }),
        }),
        'lift',
      ),
    ).toBe(true);
    expect(transitionApplied(mappedDetail({ chargingPoint: null }), 'lift')).toBe(false);
  });
});

describe('closed report reason codes', () => {
  it('uses exactly the backend reason sets in the dialog configuration', () => {
    expect(REPORT_REASON_CONFIGS.dismiss.options.map(({ code }) => code)).toEqual(DISMISS_REASONS);
    expect(REPORT_REASON_CONFIGS.restrict.options.map(({ code }) => code)).toEqual(
      RESTRICT_REASONS,
    );
    expect(REPORT_REASON_CONFIGS.lift.options.map(({ code }) => code)).toEqual(LIFT_REASONS);
  });

  it('does not accept free-form or cross-action reasons', () => {
    expect(isDismissReason('duplicate')).toBe(true);
    expect(isDismissReason('safety_risk')).toBe(false);
    expect(isRestrictReason('safety_risk')).toBe(true);
    expect(isRestrictReason('appeal_accepted')).toBe(false);
    expect(isLiftReason('appeal_accepted')).toBe(true);
    expect(isLiftReason('because I said so')).toBe(false);
  });
});
