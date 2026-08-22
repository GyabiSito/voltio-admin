export type RuntimeRecord = Record<string, unknown>;

export class ContractError extends Error {
  constructor(message = 'The server returned an unexpected response.') {
    super(message);
    this.name = 'ContractError';
  }
}

export function exactRecord(
  value: unknown,
  keys: readonly string[],
  context = 'response',
): RuntimeRecord {
  if (!isRecord(value)) {
    throw new ContractError(`Invalid ${context}.`);
  }

  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new ContractError(`Unexpected ${context} shape.`);
  }

  return value;
}

export function isRecord(value: unknown): value is RuntimeRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function positiveInteger(value: unknown, context = 'ID'): number {
  if (!Number.isInteger(value) || (value as number) <= 0) {
    throw new ContractError(`Invalid ${context}.`);
  }
  return value as number;
}

export function nonNegativeInteger(value: unknown, context = 'count'): number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new ContractError(`Invalid ${context}.`);
  }
  return value as number;
}

export function integerInRange(value: unknown, minimum: number, maximum: number): number {
  if (!Number.isInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    throw new ContractError('Invalid numeric value.');
  }
  return value as number;
}

export function nonEmptyString(value: unknown, context = 'string'): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ContractError(`Invalid ${context}.`);
  }
  return value;
}

export function nullableString(value: unknown): string | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new ContractError('Invalid nullable string.');
  }
  return value;
}

export function booleanValue(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new ContractError('Invalid boolean.');
  }
  return value;
}

export function isoUtcTimestamp(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/u.test(value) ||
    Number.isNaN(Date.parse(value))
  ) {
    throw new ContractError('Invalid UTC timestamp.');
  }
  return value;
}

export function nullableIsoUtcTimestamp(value: unknown): string | null {
  return value === null ? null : isoUtcTimestamp(value);
}

export function enumValue<const T extends string>(
  value: unknown,
  allowed: readonly T[],
  context = 'enum',
): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new ContractError(`Invalid ${context}.`);
  }
  return value as T;
}

export function stringArray(value: unknown, allowed?: readonly string[]): string[] {
  if (
    !Array.isArray(value) ||
    !value.every(
      (item) => typeof item === 'string' && (allowed === undefined || allowed.includes(item)),
    )
  ) {
    throw new ContractError('Invalid string collection.');
  }
  return [...value];
}

export function arrayOf<T>(value: unknown, mapper: (item: unknown) => T): T[] {
  if (!Array.isArray(value)) {
    throw new ContractError('Invalid collection.');
  }
  return value.map(mapper);
}
