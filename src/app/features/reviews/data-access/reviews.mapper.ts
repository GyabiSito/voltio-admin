import {
  booleanValue,
  enumValue,
  exactRecord,
  integerInRange,
  isoUtcTimestamp,
  nonEmptyString,
  nullableString,
  positiveInteger,
} from '../../../shared/utilities/runtime';
import {
  mapChargingPointReference,
  mapUserReference,
} from '../../../shared/utilities/admin-references';
import {
  AdminReviewDetail,
  AdminReviewListItem,
  REVIEW_STATUSES,
  ReviewState,
} from './reviews.models';

export function mapReviewListItem(value: unknown): AdminReviewListItem {
  const record = exactRecord(
    value,
    ['id', 'status', 'rating', 'hasComment', 'author', 'chargingPoint', 'createdAt'],
    'review list item',
  );
  return {
    id: positiveInteger(record['id']),
    status: enumValue(record['status'], REVIEW_STATUSES, 'review status'),
    rating: integerInRange(record['rating'], 1, 5),
    hasComment: booleanValue(record['hasComment']),
    author: mapUserReference(record['author']),
    chargingPoint: mapChargingPointReference(record['chargingPoint']),
    createdAt: isoUtcTimestamp(record['createdAt']),
  };
}

export function mapReviewDetail(value: unknown): AdminReviewDetail {
  const record = exactRecord(
    value,
    [
      'id',
      'status',
      'rating',
      'comment',
      'createdAt',
      'updatedAt',
      'author',
      'subject',
      'chargingPoint',
      'booking',
    ],
    'review detail',
  );
  const point = exactRecord(record['chargingPoint'], ['id', 'title', 'isActive'], 'review point');
  const booking = exactRecord(record['booking'], ['id', 'status'], 'review booking');

  return {
    id: positiveInteger(record['id']),
    status: enumValue(record['status'], REVIEW_STATUSES, 'review status'),
    rating: integerInRange(record['rating'], 1, 5),
    comment: nullableString(record['comment']),
    createdAt: isoUtcTimestamp(record['createdAt']),
    updatedAt: isoUtcTimestamp(record['updatedAt']),
    author: mapUserReference(record['author']),
    subject: mapUserReference(record['subject']),
    chargingPoint: {
      ...mapChargingPointReference({ id: point['id'], title: point['title'] }),
      isActive: booleanValue(point['isActive']),
    },
    booking: {
      id: positiveInteger(booking['id']),
      status: nonEmptyString(booking['status'], 'booking status'),
    },
  };
}

export function mapReviewState(value: unknown): ReviewState {
  const record = exactRecord(value, ['id', 'status'], 'review moderation state');
  return {
    id: positiveInteger(record['id']),
    status: enumValue(record['status'], REVIEW_STATUSES, 'review status'),
  };
}
