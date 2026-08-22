import { ReasonDialogConfig } from '../../../shared/ui/reason-dialog.models';
import {
  DISMISS_REASONS,
  DismissReason,
  LIFT_REASONS,
  LiftReason,
  RESTRICT_REASONS,
  RestrictReason,
} from '../data-access/reports.models';

export type ReportMutation = 'dismiss' | 'restrict' | 'lift';

export const REPORT_REASON_CONFIGS: Readonly<Record<ReportMutation, ReasonDialogConfig>> = {
  dismiss: {
    title: 'Dismiss report',
    description: 'Close this report without restricting its charging point.',
    options: [
      { code: DISMISS_REASONS[0], label: 'Not actionable' },
      { code: DISMISS_REASONS[1], label: 'Duplicate' },
      { code: DISMISS_REASONS[2], label: 'Insufficient evidence' },
      { code: DISMISS_REASONS[3], label: 'Other' },
    ],
    confirmLabel: 'Dismiss report',
    danger: false,
  },
  restrict: {
    title: 'Restrict charging point',
    description:
      'The point will become inactive and cannot be reactivated by its Host until the restriction is lifted.',
    options: [
      { code: RESTRICT_REASONS[0], label: 'Safety risk' },
      { code: RESTRICT_REASONS[1], label: 'Inaccurate information' },
      { code: RESTRICT_REASONS[2], label: 'Access problem' },
      { code: RESTRICT_REASONS[3], label: 'Unavailable charger' },
      { code: RESTRICT_REASONS[4], label: 'Inappropriate content' },
      { code: RESTRICT_REASONS[5], label: 'Other' },
    ],
    confirmLabel: 'Restrict point',
    danger: true,
  },
  lift: {
    title: 'Lift charging point restriction',
    description:
      'The point will remain inactive. Its Host may choose to activate it through the normal Host flow.',
    options: [
      { code: LIFT_REASONS[0], label: 'Appeal accepted' },
      { code: LIFT_REASONS[1], label: 'Moderation error' },
      { code: LIFT_REASONS[2], label: 'Issue resolved' },
      { code: LIFT_REASONS[3], label: 'Other' },
    ],
    confirmLabel: 'Lift restriction',
    danger: false,
  },
};

export function isDismissReason(value: string): value is DismissReason {
  return (DISMISS_REASONS as readonly string[]).includes(value);
}

export function isRestrictReason(value: string): value is RestrictReason {
  return (RESTRICT_REASONS as readonly string[]).includes(value);
}

export function isLiftReason(value: string): value is LiftReason {
  return (LIFT_REASONS as readonly string[]).includes(value);
}
