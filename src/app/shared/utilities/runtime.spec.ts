import { describe, expect, it } from 'vitest';

import {
  arrayOf,
  booleanValue,
  ContractError,
  enumValue,
  exactRecord,
  integerInRange,
  isoUtcTimestamp,
  nonEmptyString,
  nonNegativeInteger,
  nullableIsoUtcTimestamp,
  nullableString,
  positiveInteger,
  stringArray,
} from './runtime';

describe('runtime contract validators', () => {
  it('accepts an exact object shape regardless of key order', () => {
    expect(exactRecord({ second: 2, first: 1 }, ['first', 'second'])).toEqual({
      first: 1,
      second: 2,
    });
  });

  it.each([null, [], 'object', 42])('rejects a non-object record: %j', (value) => {
    expect(() => exactRecord(value, [])).toThrow(ContractError);
  });

  it('rejects missing fields', () => {
    expect(() => exactRecord({ id: 1 }, ['id', 'status'])).toThrow('Unexpected response shape.');
  });

  it('rejects unknown fields so accidental PII is never consumed', () => {
    expect(() => exactRecord({ id: 1, email: 'private@example.test' }, ['id'])).toThrow(
      'Unexpected response shape.',
    );
  });

  it.each([1, 23, Number.MAX_SAFE_INTEGER])('accepts a positive integer: %d', (value) => {
    expect(positiveInteger(value)).toBe(value);
  });

  it.each([0, -1, 1.2, '1', Number.NaN])('rejects an invalid positive integer: %j', (value) => {
    expect(() => positiveInteger(value)).toThrow(ContractError);
  });

  it.each([0, 8])('accepts a non-negative integer: %d', (value) => {
    expect(nonNegativeInteger(value)).toBe(value);
  });

  it.each([-1, 1.5, '0'])('rejects an invalid count: %j', (value) => {
    expect(() => nonNegativeInteger(value)).toThrow(ContractError);
  });

  it('enforces inclusive numeric ranges', () => {
    expect(integerInRange(1, 1, 5)).toBe(1);
    expect(integerInRange(5, 1, 5)).toBe(5);
    expect(() => integerInRange(6, 1, 5)).toThrow(ContractError);
  });

  it('preserves non-empty strings without silently trimming content', () => {
    expect(nonEmptyString('  operational text  ')).toBe('  operational text  ');
  });

  it.each(['', '   ', null, 5])('rejects a missing string: %j', (value) => {
    expect(() => nonEmptyString(value)).toThrow(ContractError);
  });

  it('accepts only real booleans', () => {
    expect(booleanValue(false)).toBe(false);
    expect(() => booleanValue(0)).toThrow(ContractError);
  });

  it('accepts nullable strings without coercion', () => {
    expect(nullableString(null)).toBeNull();
    expect(nullableString('')).toBe('');
    expect(() => nullableString(false)).toThrow(ContractError);
  });

  it.each(['2026-07-29T18:42:01Z', '2026-07-29T18:42:01.123456Z'])(
    'accepts a strict UTC timestamp: %s',
    (value) => {
      expect(isoUtcTimestamp(value)).toBe(value);
    },
  );

  it.each([
    '2026-07-29T18:42:01+00:00',
    '2026-07-29 18:42:01Z',
    '2026-13-29T18:42:01Z',
    'not-a-date',
    null,
  ])('rejects a non-contract timestamp: %j', (value) => {
    expect(() => isoUtcTimestamp(value)).toThrow(ContractError);
  });

  it('accepts a nullable UTC timestamp', () => {
    expect(nullableIsoUtcTimestamp(null)).toBeNull();
    expect(nullableIsoUtcTimestamp('2026-07-29T18:42:01Z')).toBe('2026-07-29T18:42:01Z');
  });

  it('validates closed enums', () => {
    expect(enumValue('open', ['open', 'closed'] as const)).toBe('open');
    expect(() => enumValue('pending', ['open', 'closed'] as const)).toThrow(ContractError);
  });

  it('copies and validates string collections', () => {
    const source = ['admin'];
    const result = stringArray(source, ['admin']);
    source.push('driver');
    expect(result).toEqual(['admin']);
    expect(() => stringArray(['superadmin'], ['admin'])).toThrow(ContractError);
  });

  it('maps arrays without accepting array-like objects', () => {
    expect(arrayOf([1, 2], positiveInteger)).toEqual([1, 2]);
    expect(() => arrayOf({ 0: 1 }, positiveInteger)).toThrow(ContractError);
  });
});
