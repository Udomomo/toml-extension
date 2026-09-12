import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { arch, platform } from 'node:process';
import { test } from 'node:test';
import path from 'node:path';

const ROOT = process.cwd();
const DECODER = path.join(ROOT, 'analyzer/test/conformance/decoder.ts');

// These are the six official invalid-encoding cases that cannot reach a
// JavaScript decoder as their original invalid UTF-8 bytes. The names are
// deliberately explicit so that a newly passing skipped test fails the run.
const INVALID_UTF8_TESTS = [
  'invalid/encoding/bad-codepoint',
  'invalid/encoding/bad-utf8-in-comment',
  'invalid/encoding/bad-utf8-in-multiline',
  'invalid/encoding/bad-utf8-in-multiline-literal',
  'invalid/encoding/bad-utf8-in-string',
  'invalid/encoding/bad-utf8-in-string-literal'
] as const;

// The v2.2.0 release currently contains 214 valid and 467 invalid TOML 1.1
// cases. Six invalid UTF-8 cases are skipped by the documented limitation.
const EXPECTED = {
  valid: 214,
  invalid: 461,
  skipped: 6
} as const;

test('official toml-test v2.2.0 TOML 1.1 conformance', () => {
  const binary = selectTomlTestBinary();
  const decoderCommand = `${process.execPath} --import tsx/esm ${DECODER}`;
  const args = [
    'test',
    '-toml=1.1',
    `-decoder=${decoderCommand}`,
    ...INVALID_UTF8_TESTS.flatMap((testName) => ['-skip', testName]),
    '-skip-must-err',
    '-parallel=4',
    '-timeout=10s',
    '-color=never'
  ];
  const result = spawnSync(binary, args, {
    cwd: ROOT,
    encoding: 'utf8'
  });
  const output = `${result.stdout}${result.stderr}`;

  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, output);
  assert.match(output, new RegExp(`valid tests:\\s+${EXPECTED.valid} passed,\\s+0 failed`));
  assert.match(output, new RegExp(`invalid tests:\\s+${EXPECTED.invalid} passed,\\s+0 failed`));
  assert.match(output, new RegExp(`skipped tests:\\s+${EXPECTED.skipped}`));
});

function selectTomlTestBinary(): string {
  if (platform === 'darwin' && arch === 'arm64') {
    return path.join(ROOT, 'tools/toml-test/v2.2.0/darwin-arm64/toml-test');
  }
  if (platform === 'linux' && arch === 'x64') {
    return path.join(ROOT, 'tools/toml-test/v2.2.0/linux-amd64/toml-test');
  }

  throw new Error(
    `公式toml-test v2.2.0の適合性テストは未対応環境です: ${platform}/${arch}. ` +
    '対応環境はdarwin/arm64とlinux/x64です。'
  );
}
