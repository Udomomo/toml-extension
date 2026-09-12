import { readFileSync } from 'node:fs';

import { Temporal } from '@js-temporal/polyfill';
import * as toml from 'toml';

const PARSE_OPTIONS: toml.ParseOptions = {
  bigint: true,
  maxDepth: 256,
  temporal: Temporal,
  useTemporal: true
};

type TaggedValue = {
  readonly type: string;
  readonly value: string | TaggedValue[];
};

function main(): void {
  try {
    const source = readFileSync(0, 'utf8');
    const parsed = toml.parse(source, PARSE_OPTIONS);
    process.stdout.write(`${JSON.stringify(toTomlTestValue(parsed))}\n`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}

function toTomlTestValue(value: unknown): Record<string, unknown> | TaggedValue | TaggedValue[] {
  if (value instanceof Temporal.ZonedDateTime) {
    return tagged('datetime', value.toInstant().toString());
  }
  if (value instanceof Temporal.PlainDateTime) {
    return tagged('datetime-local', value.toString());
  }
  if (value instanceof Temporal.PlainDate) {
    return tagged('date-local', value.toString());
  }
  if (value instanceof Temporal.PlainTime) {
    return tagged('time-local', value.toString());
  }
  if (typeof value === 'bigint') {
    return tagged('integer', value.toString());
  }
  if (typeof value === 'number') {
    if (Number.isNaN(value)) {
      return tagged('float', 'nan');
    }
    if (value === Number.POSITIVE_INFINITY) {
      return tagged('float', 'inf');
    }
    if (value === Number.NEGATIVE_INFINITY) {
      return tagged('float', '-inf');
    }
    return tagged('float', String(value));
  }
  if (typeof value === 'boolean') {
    return tagged('bool', String(value));
  }
  if (typeof value === 'string') {
    return tagged('string', value);
  }
  if (Array.isArray(value)) {
    return value.map(toTomlTestValue) as TaggedValue[];
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, toTomlTestValue(child)])
    );
  }

  throw new Error(`Unsupported parsed TOML value: ${String(value)}`);
}

function tagged(type: string, value: string): TaggedValue {
  return { type, value };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

main();
