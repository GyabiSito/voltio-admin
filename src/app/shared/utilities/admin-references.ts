import {
  enumValue,
  exactRecord,
  nonEmptyString,
  nullableString,
  positiveInteger,
} from './runtime';

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

export interface AdminChargingPointTerritoryReference extends AdminChargingPointReference {
  countryCode: string | null;
  currency: string | null;
  timezone: string | null;
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

export function mapChargingPointTerritoryReference(
  value: unknown,
): AdminChargingPointTerritoryReference {
  const record = exactRecord(
    value,
    ['id', 'title', 'countryCode', 'currency', 'timezone'],
    'charging point territory reference',
  );
  return {
    ...mapChargingPointReference({ id: record['id'], title: record['title'] }),
    countryCode: nullableString(record['countryCode']),
    currency: nullableString(record['currency']),
    timezone: nullableString(record['timezone']),
  };
}
