import { ReasonDialogConfig } from '../../../shared/ui/reason-dialog.models';
import {
  HIDE_REASONS,
  HideReason,
  RESTORE_REASONS,
  RestoreReason,
} from '../data-access/reviews.models';

export type ReviewMutation = 'hide' | 'restore';

export const REVIEW_REASON_CONFIGS: Readonly<Record<ReviewMutation, ReasonDialogConfig>> = {
  hide: {
    title: 'Hide review',
    description: 'The review will leave public surfaces while its historical record remains.',
    options: [
      { code: HIDE_REASONS[0], label: 'Inappropriate content' },
      { code: HIDE_REASONS[1], label: 'Harassment' },
      { code: HIDE_REASONS[2], label: 'Personal information' },
      { code: HIDE_REASONS[3], label: 'Spam' },
      { code: HIDE_REASONS[4], label: 'Other' },
    ],
    confirmLabel: 'Hide review',
    danger: true,
  },
  restore: {
    title: 'Restore review',
    description: 'The preserved review will return to its public surfaces.',
    options: [
      { code: RESTORE_REASONS[0], label: 'Appeal accepted' },
      { code: RESTORE_REASONS[1], label: 'Moderation error' },
      { code: RESTORE_REASONS[2], label: 'Other' },
    ],
    confirmLabel: 'Restore review',
    danger: false,
  },
};

export function isHideReason(value: string): value is HideReason {
  return (HIDE_REASONS as readonly string[]).includes(value);
}

export function isRestoreReason(value: string): value is RestoreReason {
  return (RESTORE_REASONS as readonly string[]).includes(value);
}
