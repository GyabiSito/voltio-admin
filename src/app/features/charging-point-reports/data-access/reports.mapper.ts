import {
  booleanValue,
  enumValue,
  exactRecord,
  isoUtcTimestamp,
  nullableIsoUtcTimestamp,
  nullableString,
  positiveInteger,
} from '../../../shared/utilities/runtime';
import {
  mapChargingPointReference,
  mapUserReference,
} from '../../../shared/utilities/admin-references';
import {
  ChargingPointReportDetail,
  ChargingPointReportListItem,
  PointModerationState,
  REPORT_REASONS,
  REPORT_STATUSES,
  ReportPointDetail,
  ReportPointListReference,
  ReportState,
  RestrictResult,
} from './reports.models';

export function mapReportListItem(value: unknown): ChargingPointReportListItem {
  const record = exactRecord(
    value,
    ['id', 'status', 'reason', 'hasDescription', 'chargingPoint', 'reporter', 'reportedAt'],
    'report list item',
  );
  return {
    id: positiveInteger(record['id']),
    status: enumValue(record['status'], REPORT_STATUSES, 'report status'),
    reason: enumValue(record['reason'], REPORT_REASONS, 'report reason'),
    hasDescription: booleanValue(record['hasDescription']),
    chargingPoint:
      record['chargingPoint'] === null ? null : mapReportPointList(record['chargingPoint']),
    reporter: record['reporter'] === null ? null : mapUserReference(record['reporter']),
    reportedAt: isoUtcTimestamp(record['reportedAt']),
  };
}

export function mapReportDetail(value: unknown): ChargingPointReportDetail {
  const record = exactRecord(
    value,
    [
      'id',
      'status',
      'reason',
      'description',
      'createdAt',
      'updatedAt',
      'reporter',
      'chargingPoint',
    ],
    'report detail',
  );
  return {
    id: positiveInteger(record['id']),
    status: enumValue(record['status'], REPORT_STATUSES, 'report status'),
    reason: enumValue(record['reason'], REPORT_REASONS, 'report reason'),
    description: nullableString(record['description']),
    createdAt: isoUtcTimestamp(record['createdAt']),
    updatedAt: isoUtcTimestamp(record['updatedAt']),
    reporter: record['reporter'] === null ? null : mapUserReference(record['reporter']),
    chargingPoint:
      record['chargingPoint'] === null ? null : mapReportPointDetail(record['chargingPoint']),
  };
}

export function mapReportState(value: unknown): ReportState {
  const record = exactRecord(value, ['id', 'status'], 'report state');
  return {
    id: positiveInteger(record['id']),
    status: enumValue(record['status'], REPORT_STATUSES, 'report status'),
  };
}

export function mapPointModerationState(value: unknown): PointModerationState {
  const record = exactRecord(
    value,
    ['id', 'isActive', 'moderationDisabledAt'],
    'point moderation state',
  );
  return {
    id: positiveInteger(record['id']),
    isActive: booleanValue(record['isActive']),
    moderationDisabledAt: nullableIsoUtcTimestamp(record['moderationDisabledAt']),
  };
}

export function mapRestrictResult(value: unknown): RestrictResult {
  const record = exactRecord(value, ['report', 'chargingPoint'], 'restriction result');
  return {
    report: mapReportState(record['report']),
    chargingPoint: mapPointModerationState(record['chargingPoint']),
  };
}

function mapReportPointList(value: unknown): ReportPointListReference {
  const record = exactRecord(value, ['id', 'title', 'isActive'], 'report point reference');
  return {
    ...mapChargingPointReference({ id: record['id'], title: record['title'] }),
    isActive: booleanValue(record['isActive']),
  };
}

function mapReportPointDetail(value: unknown): ReportPointDetail {
  const keys = [
    'id',
    'title',
    'isActive',
    'moderationDisabledAt',
    'connectorType',
    'powerKw',
    'host',
  ] as const;
  const record = exactRecord(value, keys, 'report point detail');
  return {
    ...mapChargingPointReference({ id: record['id'], title: record['title'] }),
    isActive: booleanValue(record['isActive']),
    moderationDisabledAt: nullableIsoUtcTimestamp(record['moderationDisabledAt']),
    connectorType: nullableString(record['connectorType']),
    powerKw: nullableString(record['powerKw']),
    host: record['host'] === null ? null : mapUserReference(record['host']),
  };
}
