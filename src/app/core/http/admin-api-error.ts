import { HttpErrorResponse } from '@angular/common/http';

import { isRecord } from '../../shared/utilities/runtime';

const SAFE_VALIDATION_FIELDS = new Set(['email', 'password', 'reasonCode']);

export class AdminApiError extends Error {
  constructor(
    readonly status: number,
    readonly errorCode: string,
    readonly fieldErrors: Readonly<Record<string, readonly string[]>>,
    readonly ambiguous: boolean,
    message = safeMessage(status),
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

export class RateLimitedError extends AdminApiError {
  constructor(readonly retryAfterSeconds: number | null) {
    super(429, 'RATE_LIMITED', {}, false, rateLimitedMessage(retryAfterSeconds));
    this.name = 'RateLimitedError';
  }
}

export function mapHttpError(value: unknown): AdminApiError {
  if (!(value instanceof HttpErrorResponse)) {
    return new AdminApiError(0, 'NETWORK_ERROR', {}, true);
  }

  if (value.status === 429) {
    return new RateLimitedError(parseRetryAfter(value.headers.get('Retry-After')));
  }

  const body = isRecord(value.error) ? value.error : null;
  const errorCode =
    body !== null && typeof body['error_code'] === 'string'
      ? body['error_code']
      : defaultErrorCode(value.status);

  return new AdminApiError(
    value.status,
    errorCode,
    value.status === 422 ? safeFieldErrors(body?.['errors']) : {},
    value.status === 0,
  );
}

export function parseRetryAfter(value: string | null): number | null {
  if (value === null || !/^[1-9]\d{0,5}$/u.test(value)) {
    return null;
  }

  const seconds = Number(value);
  return seconds <= 86_400 ? seconds : null;
}

function safeFieldErrors(value: unknown): Readonly<Record<string, readonly string[]>> {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(
        (entry): entry is [string, string[]] =>
          SAFE_VALIDATION_FIELDS.has(entry[0]) &&
          Array.isArray(entry[1]) &&
          entry[1].every((message) => typeof message === 'string'),
      )
      .map(([field, messages]) => [field, messages.slice(0, 3)]),
  );
}

function defaultErrorCode(status: number): string {
  return status === 401
    ? 'UNAUTHENTICATED'
    : status === 403
      ? 'FORBIDDEN'
      : status === 404
        ? 'NOT_FOUND'
        : status === 409
          ? 'CONFLICT'
          : status === 422
            ? 'VALIDATION_ERROR'
            : 'SERVER_ERROR';
}

function safeMessage(status: number): string {
  return status === 401
    ? 'Your administrative session has ended.'
    : status === 403
      ? 'Administrative access required.'
      : status === 404
        ? 'This resource is no longer available.'
        : status === 409
          ? 'The resource changed. Refresh and review its current state.'
          : status === 422
            ? 'Some submitted values are not valid.'
            : status === 0
              ? 'The server response is unknown. The request was not repeated.'
              : 'Voltio Admin could not complete this request.';
}

function rateLimitedMessage(retryAfterSeconds: number | null): string {
  return retryAfterSeconds === null
    ? 'Too many requests. Try again shortly.'
    : `Too many requests. Try again in ${retryAfterSeconds} seconds.`;
}
