import { strict as assert } from 'node:assert';
import test from 'node:test';

import { analyzeToml } from '../src/index.js';

test('accepts TOML 1.1 values and containers', () => {
  const source = [
    'title = "TOML Example"',
    'basic = "hello\\x20world\\e"',
    "literal = 'hello'",
    'multiline_basic = """hello"""',
    "multiline_literal = '''hello'''",
    'integer = 42',
    'hex = 0xDEAD_BEEF',
    'octal = 0o755',
    'binary = 0b1101',
    'float = 3.14',
    'exponent = 5e+22',
    'positive_inf = inf',
    'negative_inf = -inf',
    'not_a_number = nan',
    'truth = true',
    'offset_datetime = 1979-05-27T07:32:00Z',
    'local_datetime = 1979-05-27T07:32',
    'local_date = 1979-05-27',
    'local_time = 07:32',
    'array = [1, 2]',
    'inline = { name = "x", nested = { ok = true, }, }',
    '[owner]',
    'name = "Tom"',
    '[[products]]',
    'name = "Hammer"',
    ''
  ].join('\n');

  assert.deepEqual(analyzeToml(source), { diagnostics: [] });
});

test('accepts bare, quoted, and dotted keys', () => {
  const source = [
    'bare-key = 1',
    '"quoted key" = 2',
    'dotted.key = 3',
    '"dotted key"."quoted leaf" = 4',
    ''
  ].join('\n');

  assert.deepEqual(analyzeToml(source), { diagnostics: [] });
});

test('accepts multiline inline tables and trailing commas', () => {
  const source = [
    'value = {',
    '  first = 1,',
    '  second = {',
    '    third = 3,',
    '  },',
    '}',
    ''
  ].join('\n');

  assert.deepEqual(analyzeToml(source), { diagnostics: [] });
});

test('returns one diagnostic for an invalid character', () => {
  const source = 'value = @';
  const analysis = analyzeToml(source);

  assert.equal(analysis.diagnostics.length, 1);
  assert.equal(analysis.diagnostics[0]?.startOffset, source.indexOf('@'));
  assert.equal(analysis.diagnostics[0]?.endOffset, source.indexOf('@') + 1);
  assert.match(analysis.diagnostics[0]?.message ?? '', /found/);
});

test('maps parser positions after CRLF and non-ASCII text to UTF-16 offsets', () => {
  const source = '"名前" = "😀"\r\nvalue = @';
  const invalidOffset = source.indexOf('@');
  const analysis = analyzeToml(source);

  assert.equal(analysis.diagnostics.length, 1);
  assert.equal(analysis.diagnostics[0]?.startOffset, invalidOffset);
  assert.equal(analysis.diagnostics[0]?.endOffset, invalidOffset + 1);
});

test('maps an error at the beginning of a document', () => {
  const source = '@ = 1';
  const analysis = analyzeToml(source);

  assert.equal(analysis.diagnostics.length, 1);
  assert.equal(analysis.diagnostics[0]?.startOffset, 0);
  assert.equal(analysis.diagnostics[0]?.endOffset, 1);
});

test('uses the preceding character through EOF for unterminated input', () => {
  for (const source of ['value =', 'value = [', 'value = {', 'value = "']) {
    const analysis = analyzeToml(source);

    assert.equal(analysis.diagnostics.length, 1);
    assert.equal(analysis.diagnostics[0]?.startOffset, source.length - 1);
    assert.equal(analysis.diagnostics[0]?.endOffset, source.length);
  }
});

test('handles an empty document as valid', () => {
  assert.deepEqual(analyzeToml(''), { diagnostics: [] });
});

test('reports semantic errors at the parser-reported key', () => {
  const source = 'value = 1\nvalue = 2';
  const secondKeyOffset = source.lastIndexOf('value');
  const analysis = analyzeToml(source);

  assert.equal(analysis.diagnostics.length, 1);
  assert.equal(analysis.diagnostics[0]?.startOffset, secondKeyOffset);
  assert.equal(analysis.diagnostics[0]?.endOffset, secondKeyOffset + 1);
  assert.match(analysis.diagnostics[0]?.message ?? '', /redefine/);
});

test('returns only the first diagnostic', () => {
  const analysis = analyzeToml('first = @\nsecond = @');

  assert.equal(analysis.diagnostics.length, 1);
  assert.equal(analysis.diagnostics[0]?.startOffset, 'first = '.length);
});

test('rejects invalid values, dates, numbers, and unclosed structures', () => {
  const invalidSources = [
    'value = 01',
    'value = 2024-02-30',
    'value = "line\nfeed"',
    'value = [1,',
    'value = { key = 1'
  ];

  for (const source of invalidSources) {
    assert.equal(analyzeToml(source).diagnostics.length, 1, source);
  }
});

test('accepts the maximum parser nesting depth and rejects the next level', () => {
  const atLimit = 'value = ' + '['.repeat(255) + '0' + ']'.repeat(255);
  const overLimit = 'value = ' + '['.repeat(256) + '0' + ']'.repeat(256);

  assert.deepEqual(analyzeToml(atLimit), { diagnostics: [] });
  assert.equal(analyzeToml(overLimit).diagnostics.length, 1);
  assert.match(analyzeToml(overLimit).diagnostics[0]?.message ?? '', /nesting depth/);
});

test('rethrows unexpected exceptions from the parser', () => {
  assert.throws(
    () => analyzeToml(null as unknown as string),
    TypeError
  );
});
