import {
  arrayOf,
  booleanValue,
  ContractError,
  exactRecord,
  integerInRange,
  isoUtcTimestamp,
  nullableString,
  positiveInteger,
} from '../../shared/utilities/runtime';

export interface ApiEnvelope<T> {
  success: true;
  message: string;
  data: T;
  errorCode: null;
  errors: null;
  statusCode: number;
}

export interface CursorMeta {
  generatedAt: string;
  timezone: 'UTC';
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface CursorPage<T> extends ApiEnvelope<T[]> {
  meta: CursorMeta;
}

const SUCCESS_KEYS = ['success', 'message', 'data', 'error_code', 'errors', 'status_code'] as const;

export function mapEnvelope<T>(value: unknown, mapData: (data: unknown) => T): ApiEnvelope<T> {
  const record = exactRecord(value, SUCCESS_KEYS, 'API envelope');
  if (
    record['success'] !== true ||
    record['error_code'] !== null ||
    record['errors'] !== null ||
    typeof record['message'] !== 'string'
  ) {
    throw new ContractError('Invalid success envelope.');
  }

  return {
    success: true,
    message: record['message'],
    data: mapData(record['data']),
    errorCode: null,
    errors: null,
    statusCode: integerInRange(record['status_code'], 200, 299),
  };
}

export function mapCursorPage<T>(value: unknown, mapItem: (item: unknown) => T): CursorPage<T> {
  const record = exactRecord(value, [...SUCCESS_KEYS, 'meta'], 'cursor envelope');
  if (
    record['success'] !== true ||
    record['error_code'] !== null ||
    record['errors'] !== null ||
    typeof record['message'] !== 'string'
  ) {
    throw new ContractError('Invalid cursor envelope.');
  }

  return {
    success: true,
    message: record['message'],
    data: arrayOf(record['data'], mapItem),
    errorCode: null,
    errors: null,
    statusCode: integerInRange(record['status_code'], 200, 299),
    meta: mapCursorMeta(record['meta']),
  };
}

export function mapCursorMeta(value: unknown): CursorMeta {
  const record = exactRecord(
    value,
    ['generatedAt', 'timezone', 'limit', 'hasMore', 'nextCursor'],
    'cursor metadata',
  );
  const hasMore = booleanValue(record['hasMore']);
  const nextCursor = nullableString(record['nextCursor']);
  if (record['timezone'] !== 'UTC' || hasMore !== (nextCursor !== null)) {
    throw new ContractError('Inconsistent cursor metadata.');
  }

  return {
    generatedAt: isoUtcTimestamp(record['generatedAt']),
    timezone: 'UTC',
    limit: positiveInteger(record['limit'], 'cursor limit'),
    hasMore,
    nextCursor,
  };
}
