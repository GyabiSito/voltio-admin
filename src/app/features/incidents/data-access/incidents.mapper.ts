import {
  booleanValue,
  enumValue,
  exactRecord,
  isoUtcTimestamp,
  nonEmptyString,
  nullableString,
  positiveInteger,
} from '../../../shared/utilities/runtime';
import {
  mapChargingPointReference,
  mapChargingPointTerritoryReference,
  mapUserReference,
} from '../../../shared/utilities/admin-references';
import {
  AdminIncidentDetail,
  AdminIncidentListItem,
  INCIDENT_TYPES,
  REPORTER_ROLES,
} from './incidents.models';

export function mapIncidentListItem(value: unknown): AdminIncidentListItem {
  const record = exactRecord(
    value,
    [
      'id',
      'type',
      'reportedByRole',
      'hasDescription',
      'chargingPoint',
      'bookingStatus',
      'sessionStatus',
      'reportedAt',
    ],
    'incident list item',
  );
  return {
    id: positiveInteger(record['id']),
    type: enumValue(record['type'], INCIDENT_TYPES, 'incident type'),
    reportedByRole: enumValue(record['reportedByRole'], REPORTER_ROLES, 'reporter role'),
    hasDescription: booleanValue(record['hasDescription']),
    chargingPoint: mapChargingPointReference(record['chargingPoint']),
    bookingStatus: nonEmptyString(record['bookingStatus'], 'booking status'),
    sessionStatus: nonEmptyString(record['sessionStatus'], 'session status'),
    reportedAt: isoUtcTimestamp(record['reportedAt']),
  };
}

export function mapIncidentDetail(value: unknown): AdminIncidentDetail {
  const record = exactRecord(
    value,
    [
      'id',
      'type',
      'description',
      'reportedByRole',
      'reportedAt',
      'reporter',
      'chargingPoint',
      'booking',
      'session',
    ],
    'incident detail',
  );
  const point = exactRecord(
    record['chargingPoint'],
    ['id', 'title', 'countryCode', 'currency', 'timezone', 'isActive'],
    'incident point',
  );
  const booking = exactRecord(record['booking'], ['id', 'status'], 'incident booking');
  const session = exactRecord(
    record['session'],
    ['id', 'status', 'scheduledStartsAt', 'scheduledEndsAt'],
    'incident session',
  );

  return {
    id: positiveInteger(record['id']),
    type: enumValue(record['type'], INCIDENT_TYPES, 'incident type'),
    description: nullableString(record['description']),
    reportedByRole: enumValue(record['reportedByRole'], REPORTER_ROLES, 'reporter role'),
    reportedAt: isoUtcTimestamp(record['reportedAt']),
    reporter: record['reporter'] === null ? null : mapUserReference(record['reporter']),
    chargingPoint: {
      ...mapChargingPointTerritoryReference({
        id: point['id'],
        title: point['title'],
        countryCode: point['countryCode'],
        currency: point['currency'],
        timezone: point['timezone'],
      }),
      isActive: booleanValue(point['isActive']),
    },
    booking: {
      id: positiveInteger(booking['id']),
      status: nonEmptyString(booking['status'], 'booking status'),
    },
    session: {
      id: positiveInteger(session['id']),
      status: nonEmptyString(session['status'], 'session status'),
      scheduledStartsAt: isoUtcTimestamp(session['scheduledStartsAt']),
      scheduledEndsAt: isoUtcTimestamp(session['scheduledEndsAt']),
    },
  };
}
