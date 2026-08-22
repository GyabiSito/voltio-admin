import {
  booleanValue,
  enumValue,
  exactRecord,
  isoUtcTimestamp,
  nonEmptyString,
  nonNegativeInteger,
  nullableIsoUtcTimestamp,
  nullableString,
  positiveInteger,
  stringArray,
} from '../../../shared/utilities/runtime';
import {
  AdminUserDetail,
  AdminUserFootprint,
  AdminUserListItem,
  USER_ROLES,
  USER_STATUSES,
  UserRole,
} from './users.models';

const LIST_KEYS = [
  'id',
  'displayName',
  'roles',
  'status',
  'emailVerified',
  'createdAt',
  'closedAt',
] as const;

export function mapAdminUserListItem(value: unknown): AdminUserListItem {
  const record = exactRecord(value, LIST_KEYS, 'user list item');
  const status = enumValue(record['status'], USER_STATUSES, 'user status');
  const roles = stringArray(record['roles'], USER_ROLES) as UserRole[];
  const closedAt = nullableIsoUtcTimestamp(record['closedAt']);

  if ((status === 'closed') !== (closedAt !== null) || (status === 'closed' && roles.length > 0)) {
    throw new Error('Inconsistent user tombstone.');
  }

  return {
    id: positiveInteger(record['id']),
    displayName: nonEmptyString(record['displayName'], 'display name'),
    roles,
    status,
    emailVerified: booleanValue(record['emailVerified']),
    createdAt: isoUtcTimestamp(record['createdAt']),
    closedAt,
  };
}

export function mapAdminUserDetail(value: unknown): AdminUserDetail {
  const record = exactRecord(
    value,
    [...LIST_KEYS, 'email', 'updatedAt', 'footprint'],
    'user detail',
  );
  const base = mapAdminUserListItem(Object.fromEntries(LIST_KEYS.map((key) => [key, record[key]])));
  const email = nullableString(record['email']);
  if ((base.status === 'closed' && email !== null) || (base.status === 'active' && !email)) {
    throw new Error('Inconsistent user email visibility.');
  }

  return {
    ...base,
    email,
    updatedAt: isoUtcTimestamp(record['updatedAt']),
    footprint: mapFootprint(record['footprint']),
  };
}

function mapFootprint(value: unknown): AdminUserFootprint {
  const keys = [
    'currentlyOwnedChargingPoints',
    'activeChargingPoints',
    'driverBookings',
    'bookingsOnCurrentlyOwnedPoints',
    'chargingSessionsAsDriver',
    'reviewsAuthored',
    'incidentsReported',
  ] as const;
  const record = exactRecord(value, keys, 'user footprint');

  return {
    currentlyOwnedChargingPoints: nonNegativeInteger(record['currentlyOwnedChargingPoints']),
    activeChargingPoints: nonNegativeInteger(record['activeChargingPoints']),
    driverBookings: nonNegativeInteger(record['driverBookings']),
    bookingsOnCurrentlyOwnedPoints: nonNegativeInteger(record['bookingsOnCurrentlyOwnedPoints']),
    chargingSessionsAsDriver: nonNegativeInteger(record['chargingSessionsAsDriver']),
    reviewsAuthored: nonNegativeInteger(record['reviewsAuthored']),
    incidentsReported: nonNegativeInteger(record['incidentsReported']),
  };
}
