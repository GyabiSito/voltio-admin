import {
  AdminChargingPointReference,
  AdminChargingPointTerritoryReference,
  AdminUserReference,
} from '../../../shared/utilities/admin-references';

export const REVIEW_STATUSES = ['published', 'hidden'] as const;
export const HIDE_REASONS = [
  'inappropriate_content',
  'harassment',
  'personal_information',
  'spam',
  'other',
] as const;
export const RESTORE_REASONS = ['appeal_accepted', 'moderation_error', 'other'] as const;

export type ReviewStatus = (typeof REVIEW_STATUSES)[number];
export type HideReason = (typeof HIDE_REASONS)[number];
export type RestoreReason = (typeof RESTORE_REASONS)[number];

export interface AdminReviewListItem {
  id: number;
  status: ReviewStatus;
  rating: number;
  hasComment: boolean;
  author: AdminUserReference;
  chargingPoint: AdminChargingPointReference;
  createdAt: string;
}

export interface ReviewPointReference extends AdminChargingPointTerritoryReference {
  isActive: boolean;
}

export interface ReviewBookingReference {
  id: number;
  status: string;
}

export interface AdminReviewDetail {
  id: number;
  status: ReviewStatus;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  author: AdminUserReference;
  subject: AdminUserReference;
  chargingPoint: ReviewPointReference;
  booking: ReviewBookingReference;
}

export interface ReviewFilters {
  rating: number | '';
  hasComment: 'true' | 'false' | '';
}

export interface ReviewState {
  id: number;
  status: ReviewStatus;
}
