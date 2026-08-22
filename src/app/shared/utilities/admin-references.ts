import { enumValue, exactRecord, nonEmptyString, positiveInteger } from './runtime';

export const REFERENCE_STATUSES = ['active', 'closed'] as const;

export interface AdminUserReference {
  id: number;
  displayName: string;
  status: (typeof REFERENCE_STATUSES)[number];
}

export interface AdminChargingPointReference {
  id: number;
  title: string;
}

export function mapUserReference(value: unknown): AdminUserReference {
  const record = exactRecord(value, ['id', 'displayName', 'status'], 'user reference');
  const status = enumValue(record['status'], REFERENCE_STATUSES, 'reference status');
  const displayName = nonEmptyString(record['displayName'], 'display name');
  if (status === 'closed' && displayName !== 'Deleted user') {
    throw new Error('Invalid user tombstone.');
  }
  return { id: positiveInteger(record['id']), displayName, status };
}

export function mapChargingPointReference(value: unknown): AdminChargingPointReference {
  const record = exactRecord(value, ['id', 'title'], 'charging point reference');
  return {
    id: positiveInteger(record['id']),
    title: nonEmptyString(record['title'], 'charging point title'),
  };
}
