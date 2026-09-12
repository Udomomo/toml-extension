import * as toml from 'toml';

import type { TomlAnalysis, TomlDiagnostic } from './types.js';

const PARSE_OPTIONS: toml.ParseOptions = {
  bigint: true,
  maxDepth: 256
};

interface SourcePosition {
  readonly line: number;
  readonly column: number;
}

interface SourceLocation {
  readonly start: SourcePosition;
  readonly end: SourcePosition;
}

interface ParserError {
  readonly message: string;
  readonly line?: number;
  readonly column?: number;
  readonly location?: SourceLocation;
}

export function analyzeToml(source: string): TomlAnalysis {
  try {
    toml.parse(source, PARSE_OPTIONS);
    return { diagnostics: [] };
  } catch (error: unknown) {
    if (!isParserError(error)) {
      throw error;
    }

    return {
      diagnostics: [toDiagnostic(source, error)]
    };
  }
}

function isParserError(error: unknown): error is ParserError {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as {
    readonly message?: unknown;
    readonly line?: unknown;
    readonly column?: unknown;
    readonly location?: unknown;
  };

  if (typeof candidate.message !== 'string') {
    return false;
  }

  if (hasSourceLocation(candidate.location)) {
    return true;
  }

  return typeof candidate.line === 'number' &&
    Number.isInteger(candidate.line) &&
    candidate.line >= 1 &&
    typeof candidate.column === 'number' &&
    Number.isInteger(candidate.column) &&
    candidate.column >= 1;
}

function hasSourceLocation(location: unknown): location is SourceLocation {
  if (typeof location !== 'object' || location === null) {
    return false;
  }

  const candidate = location as {
    readonly start?: unknown;
    readonly end?: unknown;
  };

  return isSourcePosition(candidate.start) && isSourcePosition(candidate.end);
}

function isSourcePosition(position: unknown): position is SourcePosition {
  if (typeof position !== 'object' || position === null) {
    return false;
  }

  const candidate = position as {
    readonly line?: unknown;
    readonly column?: unknown;
  };

  return typeof candidate.line === 'number' &&
    Number.isInteger(candidate.line) &&
    candidate.line >= 1 &&
    typeof candidate.column === 'number' &&
    Number.isInteger(candidate.column) &&
    candidate.column >= 1;
}

function toDiagnostic(source: string, error: ParserError): TomlDiagnostic {
  const message = error.message;
  const location = error.location;

  if (location && isEofError(source, message, location)) {
    return {
      message,
      startOffset: Math.max(0, source.length - 1),
      endOffset: source.length
    };
  }

  const position = location?.start ?? {
    line: error.line ?? 1,
    column: error.column ?? 1
  };
  const startOffset = offsetAt(source, position);

  return {
    message,
    startOffset: Math.min(startOffset, source.length),
    endOffset: Math.min(startOffset + 1, source.length)
  };
}

function isEofError(
  source: string,
  message: string,
  location: SourceLocation
): boolean {
  if (message.includes('end of input found')) {
    return true;
  }

  const startOffset = offsetAt(source, location.start);
  const endOffset = offsetAt(source, location.end);
  return startOffset === source.length && endOffset === source.length;
}

function offsetAt(source: string, position: SourcePosition): number {
  let line = 1;
  let lineStart = 0;

  for (let offset = 0; offset < source.length && line < position.line; offset++) {
    if (source.charCodeAt(offset) === 10) {
      line++;
      lineStart = offset + 1;
    }
  }

  return lineStart + position.column - 1;
}
