import { describe, expect, it } from 'vitest';

import { auditStateRows } from '../components/audit-state.presenter';
import { mapAuditEntry } from './audit.mapper';

const NOW = '2026-07-29T18:42:01Z';
const OPERATION_ID = '123e4567-e89b-42d3-a456-426614174000';

function entry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 31,
    operationId: OPERATION_ID,
    actor: { id: 1, displayName: 'Ada Admin', status: 'active' },
    action: 'review.hidden',
    subject: { type: 'review', id: 19 },
    reasonCode: 'spam',
    before: { status: 'published' },
    after: { status: 'hidden' },
    createdAt: NOW,
    ...overrides,
  };
}

describe('audit contracts', () => {
  it('maps a status transition with its operation ID', () => {
    expect(mapAuditEntry(entry())).toMatchObject({
      id: 31,
      operationId: OPERATION_ID,
      action: 'review.hidden',
      before: { kind: 'status', status: 'published' },
      after: { kind: 'status', status: 'hidden' },
    });
  });

  it('maps the charging point restriction allowlist', () => {
    expect(
      mapAuditEntry(
        entry({
          action: 'charging_point.restricted',
          subject: { type: 'charging_point', id: 5 },
          reasonCode: 'safety_risk',
          before: { isActive: true, moderationDisabledAt: null },
          after: { isActive: false, moderationDisabledAt: NOW },
        }),
      ),
    ).toMatchObject({
      before: { kind: 'chargingPoint', isActive: true, moderationDisabledAt: null },
      after: { kind: 'chargingPoint', isActive: false, moderationDisabledAt: NOW },
    });
  });

  it('rejects a malformed operation ID', () => {
    expect(() => mapAuditEntry(entry({ operationId: 'not-a-uuid' }))).toThrow(
      'Invalid audit contract.',
    );
  });

  it('rejects a subject type inconsistent with the action', () => {
    expect(() => mapAuditEntry(entry({ subject: { type: 'charging_point', id: 19 } }))).toThrow(
      'Invalid audit contract.',
    );
  });

  it('rejects a reason from another action', () => {
    expect(() => mapAuditEntry(entry({ reasonCode: 'appeal_accepted' }))).toThrow(
      'Invalid audit contract.',
    );
  });

  it('rejects unknown audit actions', () => {
    expect(() => mapAuditEntry(entry({ action: 'user.impersonated' }))).toThrow();
  });

  it('rejects hidden fields in status snapshots', () => {
    expect(() =>
      mapAuditEntry(entry({ before: { status: 'published', comment: 'private' } })),
    ).toThrow();
  });

  it('rejects hidden fields in charging point snapshots', () => {
    expect(() =>
      mapAuditEntry(
        entry({
          action: 'charging_point.restricted',
          subject: { type: 'charging_point', id: 5 },
          reasonCode: 'safety_risk',
          before: { isActive: true, moderationDisabledAt: null, hostEmail: 'private@example.test' },
          after: { isActive: false, moderationDisabledAt: NOW },
        }),
      ),
    ).toThrow();
  });

  it('rejects invalid status transitions', () => {
    expect(() => mapAuditEntry(entry({ after: { status: 'deleted' } }))).toThrow(
      'Invalid audit status transition.',
    );
  });

  it('accepts every delivered action with a compatible reason and subject', () => {
    const cases: Record<
      string,
      { subject: string; reason: string; before: string; after: string }
    > = {
      'charging_point_report.dismissed': {
        subject: 'charging_point_report',
        reason: 'duplicate',
        before: 'open',
        after: 'dismissed',
      },
      'charging_point_report.actioned': {
        subject: 'charging_point_report',
        reason: 'safety_risk',
        before: 'open',
        after: 'actioned',
      },
      'review.hidden': {
        subject: 'review',
        reason: 'spam',
        before: 'published',
        after: 'hidden',
      },
      'review.restored': {
        subject: 'review',
        reason: 'appeal_accepted',
        before: 'hidden',
        after: 'published',
      },
    };

    for (const [action, value] of Object.entries(cases)) {
      expect(
        mapAuditEntry(
          entry({
            action,
            subject: { type: value.subject, id: 9 },
            reasonCode: value.reason,
            before: { status: value.before },
            after: { status: value.after },
          }),
        ).action,
      ).toBe(action);
    }

    for (const action of ['charging_point.restricted', 'charging_point.restriction_lifted']) {
      expect(
        mapAuditEntry(
          entry({
            action,
            subject: { type: 'charging_point', id: 5 },
            reasonCode: action === 'charging_point.restricted' ? 'safety_risk' : 'appeal_accepted',
            before: { isActive: false, moderationDisabledAt: NOW },
            after: { isActive: false, moderationDisabledAt: null },
          }),
        ).action,
      ).toBe(action);
    }
  });
});

describe('allowlisted audit presentation', () => {
  it('presents only the before/after status row', () => {
    expect(auditStateRows(mapAuditEntry(entry()))).toEqual([
      { label: 'Status', before: 'published', after: 'hidden' },
    ]);
  });

  it('presents only activity and restriction timestamp for point state', () => {
    const mapped = mapAuditEntry(
      entry({
        action: 'charging_point.restricted',
        subject: { type: 'charging_point', id: 5 },
        reasonCode: 'safety_risk',
        before: { isActive: true, moderationDisabledAt: null },
        after: { isActive: false, moderationDisabledAt: NOW },
      }),
    );
    expect(auditStateRows(mapped)).toEqual([
      { label: 'Public activity', before: 'Active', after: 'Inactive' },
      { label: 'Restriction timestamp', before: 'No restriction', after: NOW },
    ]);
  });
});
