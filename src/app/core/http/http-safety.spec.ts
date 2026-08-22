import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import { isVoltioApiUrl } from '../config/api.config';
import { mapHttpError, parseRetryAfter, RateLimitedError } from './admin-api-error';

describe('API URL boundary', () => {
  const baseUrl = 'https://api.voltio.app/api/v1';

  it.each(['https://api.voltio.app/api/v1', 'https://api.voltio.app/api/v1/admin/users'])(
    'accepts the configured API origin and path: %s',
    (url) => {
      expect(isVoltioApiUrl(url, baseUrl)).toBe(true);
    },
  );

  it.each([
    'https://api.voltio.app/api/v10/admin/users',
    'https://api.voltio.app/other',
    'https://api.voltio.app.evil.test/api/v1/admin/users',
    'https://evil.test/api/v1/admin/users',
    'not a url',
  ])('rejects a URL outside the API boundary: %s', (url) => {
    expect(isVoltioApiUrl(url, baseUrl)).toBe(false);
  });

  it('supports the independent local admin/API origins', () => {
    expect(
      isVoltioApiUrl(
        'http://localhost:8000/api/v1/admin/audit?cursor=opaque',
        'http://localhost:8000/api/v1',
      ),
    ).toBe(true);
  });
});

describe('safe API errors', () => {
  it('maps non-HTTP failures to an ambiguous network error', () => {
    const error = mapHttpError(new Error('raw socket details'));
    expect(error).toMatchObject({
      status: 0,
      errorCode: 'NETWORK_ERROR',
      ambiguous: true,
      fieldErrors: {},
    });
    expect(error.message).not.toContain('socket');
  });

  it('does not expose a server-provided message', () => {
    const error = mapHttpError(
      new HttpErrorResponse({
        status: 500,
        error: {
          message: 'SQLSTATE with sensitive connection details',
          error_code: 'INTERNAL_ERROR',
        },
      }),
    );
    expect(error.message).toBe('Voltio Admin could not complete this request.');
    expect(error.message).not.toContain('SQLSTATE');
  });

  it.each([
    [401, 'UNAUTHENTICATED'],
    [403, 'FORBIDDEN'],
    [404, 'NOT_FOUND'],
    [409, 'CONFLICT'],
    [422, 'VALIDATION_ERROR'],
    [503, 'SERVER_ERROR'],
  ])('uses a safe fallback code for HTTP %d', (status, errorCode) => {
    expect(mapHttpError(new HttpErrorResponse({ status })).errorCode).toBe(errorCode);
  });

  it('allows only known validation fields and caps their messages', () => {
    const error = mapHttpError(
      new HttpErrorResponse({
        status: 422,
        error: {
          errors: {
            reasonCode: ['one', 'two', 'three', 'four'],
            internal_trace: ['private'],
            email: ['invalid'],
          },
        },
      }),
    );
    expect(error.fieldErrors).toEqual({
      reasonCode: ['one', 'two', 'three'],
      email: ['invalid'],
    });
  });

  it('drops malformed validation errors', () => {
    const error = mapHttpError(
      new HttpErrorResponse({
        status: 422,
        error: { errors: { reasonCode: ['valid', { private: true }], password: 'wrong shape' } },
      }),
    );
    expect(error.fieldErrors).toEqual({});
  });

  it('does not expose validation fields on non-422 responses', () => {
    const error = mapHttpError(
      new HttpErrorResponse({ status: 409, error: { errors: { email: ['private'] } } }),
    );
    expect(error.fieldErrors).toEqual({});
  });

  it.each([
    ['1', 1],
    ['60', 60],
    ['86400', 86_400],
    [null, null],
    ['0', null],
    ['-1', null],
    ['1.5', null],
    ['86401', null],
    ['internal', null],
  ])('parses a safe Retry-After value %s', (value, expected) => {
    expect(parseRetryAfter(value)).toBe(expected);
  });

  it('maps 429 to the typed local error without internal server fields', () => {
    const error = mapHttpError(
      new HttpErrorResponse({
        status: 429,
        headers: new HttpHeaders({ 'Retry-After': '12' }),
        error: { error_code: 'RATE_LIMITED', bucket: 'admin:7', ip: '127.0.0.1' },
      }),
    );

    expect(error).toBeInstanceOf(RateLimitedError);
    expect(error).toMatchObject({
      status: 429,
      errorCode: 'RATE_LIMITED',
      retryAfterSeconds: 12,
      message: 'Too many requests. Try again in 12 seconds.',
    });
    expect(error).not.toHaveProperty('bucket');
    expect(error).not.toHaveProperty('ip');
  });
});
