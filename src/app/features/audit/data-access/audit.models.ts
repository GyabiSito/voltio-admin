import { AdminUserReference } from '../../../shared/utilities/admin-references';

export const AUDIT_ACTIONS = [
  'charging_point_report.dismissed',
  'charging_point_report.actioned',
  'charging_point.restricted',
  'charging_point.restriction_lifted',
  'review.hidden',
  'review.restored',
] as const;
export const AUDIT_SUBJECT_TYPES = ['charging_point_report', 'charging_point', 'review'] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
export type AuditSubjectType = (typeof AUDIT_SUBJECT_TYPES)[number];

export interface StatusAuditState {
  kind: 'status';
  status: string;
}

export interface ChargingPointAuditState {
  kind: 'chargingPoint';
  isActive: boolean;
  moderationDisabledAt: string | null;
}

export type AuditState = StatusAuditState | ChargingPointAuditState;

export interface AdminAuditEntry {
  id: number;
  operationId: string;
  actor: AdminUserReference;
  action: AuditAction;
  subject: { type: AuditSubjectType; id: number };
  reasonCode: string;
  before: AuditState;
  after: AuditState;
  createdAt: string;
}

export interface AuditFilters {
  action: AuditAction | '';
  subjectType: AuditSubjectType | '';
  subjectId: number | '';
  actorId: number | '';
}
