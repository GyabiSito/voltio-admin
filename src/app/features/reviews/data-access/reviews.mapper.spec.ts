import { describe, expect, it } from 'vitest';

import {
  isHideReason,
  isRestoreReason,
  REVIEW_REASON_CONFIGS,
} from '../components/review-reason-config';
import { mapReviewDetail, mapReviewListItem, mapReviewState } from './reviews.mapper';
import { HIDE_REASONS, RESTORE_REASONS } from './reviews.models';

const NOW = '2026-07-29T18:42:01Z';

function user(name = 'Reviewer'): Record<string, unknown> {
  return { id: 8, displayName: name, status: 'active' };
}

function detail(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 19,
    status: 'published',
    rating: 4,
    comment: 'Reliable charger.',
    createdAt: NOW,
    updatedAt: NOW,
    author: user(),
    subject: { id: 9, displayName: 'Host', status: 'active' },
    chargingPoint: {
      id: 5,
      title: 'North charger',
      countryCode: 'AR',
      currency: 'ARS',
      timezone: 'America/Argentina/Buenos_Aires',
      isActive: true,
    },
    booking: { id: 12, status: 'completed' },
    ...overrides,
  };
}

describe('review contracts', () => {
  it('maps the list contract without comment content', () => {
    const result = mapReviewListItem({
      id: 19,
      status: 'published',
      rating: 4,
      hasComment: true,
      author: user(),
      chargingPoint: { id: 5, title: 'North charger' },
      createdAt: NOW,
    });
    expect(result).toMatchObject({ id: 19, hasComment: true });
    expect('comment' in result).toBe(false);
  });

  it('rejects a comment leaked into the list contract', () => {
    expect(() =>
      mapReviewListItem({
        id: 19,
        status: 'published',
        rating: 4,
        hasComment: true,
        comment: 'should not be listed',
        author: user(),
        chargingPoint: { id: 5, title: 'North charger' },
        createdAt: NOW,
      }),
    ).toThrow();
  });

  it.each([1, 3, 5])('accepts a contract rating of %d', (rating) => {
    expect(mapReviewDetail(detail({ rating })).rating).toBe(rating);
  });

  it.each([0, 6, 4.5, '5'])('rejects an invalid rating: %j', (rating) => {
    expect(() => mapReviewDetail(detail({ rating }))).toThrow();
  });

  it.each([
    ['HTML', '<script>document.cookie</script>'],
    ['Markdown', '# Heading\n[link](javascript:alert(1))'],
    ['Unicode', 'Carga rápida ⚡ — très bien'],
    ['line breaks', 'First line\nSecond line'],
    ['long text', 'review '.repeat(500)],
  ])('preserves %s review text as plain data', (_kind, content) => {
    expect(mapReviewDetail(detail({ comment: content })).comment).toBe(content);
  });

  it('maps the exact nested booking and point references', () => {
    expect(mapReviewDetail(detail())).toMatchObject({
      booking: { id: 12, status: 'completed' },
      chargingPoint: {
        id: 5,
        title: 'North charger',
        countryCode: 'AR',
        currency: 'ARS',
        timezone: 'America/Argentina/Buenos_Aires',
        isActive: true,
      },
    });
  });

  it('rejects unknown nested fields', () => {
    expect(() =>
      mapReviewDetail(
        detail({ booking: { id: 12, status: 'completed', driverEmail: 'private@example.test' } }),
      ),
    ).toThrow();
  });

  it('maps only published/hidden moderation states', () => {
    expect(mapReviewState({ id: 19, status: 'hidden' })).toEqual({ id: 19, status: 'hidden' });
    expect(() => mapReviewState({ id: 19, status: 'deleted' })).toThrow();
  });

  it('rejects unknown detail fields', () => {
    expect(() => mapReviewDetail(detail({ internalNote: 'private' }))).toThrow();
  });
});

describe('closed review reason codes', () => {
  it('uses exactly the backend hide and restore reason sets', () => {
    expect(REVIEW_REASON_CONFIGS.hide.options.map(({ code }) => code)).toEqual(HIDE_REASONS);
    expect(REVIEW_REASON_CONFIGS.restore.options.map(({ code }) => code)).toEqual(RESTORE_REASONS);
  });

  it('does not accept free-form or cross-action reasons', () => {
    expect(isHideReason('spam')).toBe(true);
    expect(isHideReason('appeal_accepted')).toBe(false);
    expect(isRestoreReason('appeal_accepted')).toBe(true);
    expect(isRestoreReason('spam')).toBe(false);
    expect(isRestoreReason('custom explanation')).toBe(false);
  });
});
