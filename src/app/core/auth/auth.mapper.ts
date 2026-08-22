import {
  enumValue,
  exactRecord,
  isoUtcTimestamp,
  nonEmptyString,
  positiveInteger,
  stringArray,
} from '../../shared/utilities/runtime';
import { mapEnvelope } from '../http/api-envelope';
import { ADMIN_ROLE, AdminIdentity, AUTH_ROLES, AuthRole, LoginResult } from './auth.models';

const USER_KEYS = [
  'id',
  'displayName',
  'email',
  'role',
  'roleKey',
  'roles',
  'permissions',
  'created_at',
] as const;

export function mapAdminIdentity(value: unknown): AdminIdentity {
  const record = exactRecord(value, USER_KEYS, 'authenticated user');
  const roles = stringArray(record['roles'], AUTH_ROLES) as AuthRole[];
  const roleKey =
    record['roleKey'] === null ? null : enumValue(record['roleKey'], AUTH_ROLES, 'primary role');
  const role = record['role'];
  if (
    (roleKey === null && role !== null) ||
    (roleKey !== null && role !== roleKey.toUpperCase()) ||
    (roleKey !== null && !roles.includes(roleKey))
  ) {
    throw new Error('Inconsistent authenticated role response.');
  }

  stringArray(record['permissions']);

  return {
    id: positiveInteger(record['id']),
    displayName: nonEmptyString(record['displayName'], 'display name'),
    email: nonEmptyString(record['email'], 'email'),
    roles,
    createdAt: isoUtcTimestamp(record['created_at']),
  };
}

export function mapLoginResponse(value: unknown): LoginResult {
  return mapEnvelope(value, (data) => {
    const record = exactRecord(data, ['user', 'token', 'token_type'], 'login data');
    if (record['token_type'] !== 'Bearer') {
      throw new Error('Invalid authentication token type.');
    }
    return {
      token: nonEmptyString(record['token'], 'token'),
      tokenType: 'Bearer' as const,
      user: mapAdminIdentity(record['user']),
    };
  }).data;
}

export function mapMeResponse(value: unknown): AdminIdentity {
  return mapEnvelope(value, (data) => {
    const record = exactRecord(data, ['user'], 'session data');
    return mapAdminIdentity(record['user']);
  }).data;
}

export function hasAdministrativeRole(identity: AdminIdentity): boolean {
  return identity.roles.includes(ADMIN_ROLE);
}
