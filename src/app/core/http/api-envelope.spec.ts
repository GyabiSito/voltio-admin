import { describe, expect, it } from 'vitest';

import { ContractError, positiveInteger } from '../../shared/utilities/runtime';
import { mapCursorMeta, mapCursorPage, mapEnvelope } from './api-envelope';

function success(data: unknown): Record<string, unknown> {
  return {
    success: true,
    message: 'OK',
    data,
    error_code: null,
    errors: null,
    status_code: 200,
  };
}

function cursor(data: unknown[], overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ...success(data),
    meta: {
      generatedAt: '2026-07-29T18:42:01Z',
      timezone: 'UTC',
      limit: 20,
      hasMore: false,
      nextCursor: null,
      ...overrides,
    },
  };
}

describe('API success envelopes', () => {
  it('maps an exact success envelope', () => {
    expect(mapEnvelope(success({ id: 4 }), (value) => value)).toMatchObject({
      success: true,
      data: { id: 4 },
      statusCode: 200,
    });
  });

  it('rejects an error disguised as a success envelope', () => {
    expect(() => mapEnvelope({ ...success(null), success: false }, (value) => value)).toThrow(
      'Invalid success envelope.',
    );
  });

  it('rejects non-2xx success status codes', () => {
    expect(() => mapEnvelope({ ...success(null), status_code: 500 }, (value) => value)).toThrow(
      ContractError,
    );
  });

  it('rejects snake/camel-case drift in envelope fields', () => {
    const value = success(null);
    delete value['status_code'];
    value['statusCode'] = 200;
    expect(() => mapEnvelope(value, (data) => data)).toThrow(ContractError);
  });

  it('rejects unknown envelope fields', () => {
    expect(() =>
      mapEnvelope({ ...success(null), debug: 'sensitive server context' }, (value) => value),
    ).toThrow(ContractError);
  });
});

describe('opaque cursor envelopes', () => {
  it('maps items and exact metadata', () => {
    const page = mapCursorPage(cursor([{ id: 1 }]), (item) => {
      const record = item as { id: unknown };
      return { id: positiveInteger(record.id) };
    });
    expect(page.data).toEqual([{ id: 1 }]);
    expect(page.meta).toEqual({
      generatedAt: '2026-07-29T18:42:01Z',
      timezone: 'UTC',
      limit: 20,
      hasMore: false,
      nextCursor: null,
    });
  });

  it('preserves an opaque cursor byte-for-byte', () => {
    const opaque = 'eyJpZCI6NDIsInNvcnQiOiJhKy9cXHUwMDNkIn0=';
    expect(
      mapCursorMeta({
        generatedAt: '2026-07-29T18:42:01Z',
        timezone: 'UTC',
        limit: 20,
        hasMore: true,
        nextCursor: opaque,
      }).nextCursor,
    ).toBe(opaque);
  });

  it.each([
    { hasMore: true, nextCursor: null },
    { hasMore: false, nextCursor: 'opaque' },
  ])('rejects inconsistent cursor availability: %j', (metadata) => {
    expect(() => mapCursorPage(cursor([], metadata), (item) => item)).toThrow(
      'Inconsistent cursor metadata.',
    );
  });

  it('requires UTC metadata', () => {
    expect(() =>
      mapCursorPage(cursor([], { timezone: 'America/Montevideo' }), (item) => item),
    ).toThrow(ContractError);
  });

  it.each([0, -1, 1.5])('rejects an invalid page limit: %s', (limit) => {
    expect(() => mapCursorPage(cursor([], { limit }), (item) => item)).toThrow(ContractError);
  });

  it('rejects totals and page numbers that are outside the cursor contract', () => {
    const value = cursor([]);
    (value['meta'] as Record<string, unknown>)['total'] = 9;
    expect(() => mapCursorPage(value, (item) => item)).toThrow(ContractError);
  });
});
