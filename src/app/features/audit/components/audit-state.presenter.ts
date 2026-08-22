import { AdminAuditEntry, AuditState } from '../data-access/audit.models';

export interface AuditStateRow {
  label: string;
  before: string;
  after: string;
}

export function auditStateRows(entry: AdminAuditEntry): readonly AuditStateRow[] {
  if (entry.before.kind === 'status' && entry.after.kind === 'status') {
    return [{ label: 'Status', before: entry.before.status, after: entry.after.status }];
  }
  if (entry.before.kind === 'chargingPoint' && entry.after.kind === 'chargingPoint') {
    return [
      {
        label: 'Public activity',
        before: yesNo(entry.before.isActive),
        after: yesNo(entry.after.isActive),
      },
      {
        label: 'Restriction timestamp',
        before: timestamp(entry.before),
        after: timestamp(entry.after),
      },
    ];
  }
  return [];
}

function yesNo(value: boolean): string {
  return value ? 'Active' : 'Inactive';
}

function timestamp(state: Extract<AuditState, { kind: 'chargingPoint' }>): string {
  return state.moderationDisabledAt ?? 'No restriction';
}
