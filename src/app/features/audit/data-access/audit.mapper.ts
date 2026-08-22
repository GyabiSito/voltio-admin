import {
  booleanValue,
  enumValue,
  exactRecord,
  isoUtcTimestamp,
  nullableIsoUtcTimestamp,
  positiveInteger,
} from '../../../shared/utilities/runtime';
import { mapUserReference } from '../../../shared/utilities/admin-references';
import {
  AdminAuditEntry,
  AUDIT_ACTIONS,
  AuditAction,
  AuditState,
  AUDIT_SUBJECT_TYPES,
} from './audit.models';

const REASONS: Readonly<Record<AuditAction, readonly string[]>> = {
  'charging_point_report.dismissed': [
    'not_actionable',
    'duplicate',
    'insufficient_evidence',
    'other',
  ],
  'charging_point_report.actioned': [
    'safety_risk',
    'inaccurate_information',
    'access_problem',
    'unavailable_charger',
    'inappropriate_content',
    'other',
  ],
  'charging_point.restricted': [
    'safety_risk',
    'inaccurate_information',
    'access_problem',
    'unavailable_charger',
    'inappropriate_content',
    'other',
  ],
  'charging_point.restriction_lifted': [
    'appeal_accepted',
    'moderation_error',
    'issue_resolved',
    'other',
  ],
  'review.hidden': ['inappropriate_content', 'harassment', 'personal_information', 'spam', 'other'],
  'review.restored': ['appeal_accepted', 'moderation_error', 'other'],
};

export function mapAuditEntry(value: unknown): AdminAuditEntry {
  const record = exactRecord(
    value,
    [
      'id',
      'operationId',
      'actor',
      'action',
      'subject',
      'reasonCode',
      'before',
      'after',
      'createdAt',
    ],
    'audit entry',
  );
  const action = enumValue(record['action'], AUDIT_ACTIONS, 'audit action');
  const subject = exactRecord(record['subject'], ['type', 'id'], 'audit subject');
  const subjectType = enumValue(subject['type'], AUDIT_SUBJECT_TYPES, 'audit subject type');
  const expectedSubjectType = action.startsWith('charging_point_report.')
    ? 'charging_point_report'
    : action.startsWith('charging_point.')
      ? 'charging_point'
      : 'review';

  if (
    subjectType !== expectedSubjectType ||
    typeof record['operationId'] !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      record['operationId'],
    ) ||
    typeof record['reasonCode'] !== 'string' ||
    !REASONS[action].includes(record['reasonCode'])
  ) {
    throw new Error('Invalid audit contract.');
  }

  return {
    id: positiveInteger(record['id']),
    operationId: record['operationId'],
    actor: mapUserReference(record['actor']),
    action,
    subject: { type: subjectType, id: positiveInteger(subject['id']) },
    reasonCode: record['reasonCode'],
    before: mapAuditState(record['before'], action),
    after: mapAuditState(record['after'], action),
    createdAt: isoUtcTimestamp(record['createdAt']),
  };
}

function mapAuditState(value: unknown, action: AuditAction): AuditState {
  if (action.startsWith('charging_point.')) {
    const record = exactRecord(
      value,
      ['isActive', 'moderationDisabledAt'],
      'charging point audit state',
    );
    return {
      kind: 'chargingPoint',
      isActive: booleanValue(record['isActive']),
      moderationDisabledAt: nullableIsoUtcTimestamp(record['moderationDisabledAt']),
    };
  }

  const record = exactRecord(value, ['status'], 'status audit state');
  const allowed = action.startsWith('review.')
    ? ['published', 'hidden']
    : ['open', 'dismissed', 'actioned'];
  if (typeof record['status'] !== 'string' || !allowed.includes(record['status'])) {
    throw new Error('Invalid audit status transition.');
  }
  return { kind: 'status', status: record['status'] };
}
