import {
  AdminChargingPointReference,
  AdminUserReference,
} from '../../../shared/utilities/admin-references';

export const REPORT_STATUSES = ['open', 'dismissed', 'actioned'] as const;
export const REPORT_REASONS = [
  'inaccurate_information',
  'safety_concern',
  'access_problem',
  'unavailable_charger',
  'inappropriate_content',
  'other',
] as const;

export const DISMISS_REASONS = [
  'not_actionable',
  'duplicate',
  'insufficient_evidence',
  'other',
] as const;
export const RESTRICT_REASONS = [
  'safety_risk',
  'inaccurate_information',
  'access_problem',
  'unavailable_charger',
  'inappropriate_content',
  'other',
] as const;
export const LIFT_REASONS = [
  'appeal_accepted',
  'moderation_error',
  'issue_resolved',
  'other',
] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number];
export type ReportReason = (typeof REPORT_REASONS)[number];
export type DismissReason = (typeof DISMISS_REASONS)[number];
export type RestrictReason = (typeof RESTRICT_REASONS)[number];
export type LiftReason = (typeof LIFT_REASONS)[number];

export interface ReportPointListReference extends AdminChargingPointReference {
  isActive: boolean;
}

export interface ChargingPointReportListItem {
  id: number;
  status: ReportStatus;
  reason: ReportReason;
  hasDescription: boolean;
  chargingPoint: ReportPointListReference | null;
  reporter: AdminUserReference | null;
  reportedAt: string;
}

export interface ReportPointDetail extends ReportPointListReference {
  moderationDisabledAt: string | null;
  connectorType: string | null;
  powerKw: string | null;
  host: AdminUserReference | null;
}

export interface ChargingPointReportDetail {
  id: number;
  status: ReportStatus;
  reason: ReportReason;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  reporter: AdminUserReference | null;
  chargingPoint: ReportPointDetail | null;
}

export interface ReportFilters {
  status: ReportStatus | '';
  reason: ReportReason | '';
}

export interface ReportState {
  id: number;
  status: ReportStatus;
}

export interface PointModerationState {
  id: number;
  isActive: boolean;
  moderationDisabledAt: string | null;
}

export interface RestrictResult {
  report: ReportState;
  chargingPoint: PointModerationState;
}
