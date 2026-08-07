import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, utimesSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { getSecretByHash, loadSecrets, resetSecretsCache } from '../src/lib/auth/cube';
import { formatSecretsCountLabel } from '../src/lib/observability/secrets-audit-log';

describe('secrets mtime reload', () => {
  const prevPath = process.env.DOCS_SECRETS_FILE_PATH;
  const prevObs = process.env.DOCS_OBSERVABILITY_LOG_ENABLED;
  let dir: string;
  let file: string;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), 'docs-secrets-'));
    file = join(dir, 'secrets.json');
    process.env.DOCS_SECRETS_FILE_PATH = file;
    process.env.DOCS_OBSERVABILITY_LOG_ENABLED = 'false';
    resetSecretsCache();
  });

  after(() => {
    resetSecretsCache();
    if (prevPath === undefined) delete process.env.DOCS_SECRETS_FILE_PATH;
    else process.env.DOCS_SECRETS_FILE_PATH = prevPath;
    if (prevObs === undefined) delete process.env.DOCS_OBSERVABILITY_LOG_ENABLED;
    else process.env.DOCS_OBSERVABILITY_LOG_ENABLED = prevObs;
    rmSync(dir, { recursive: true, force: true });
  });

  it('mtime 变更后无需 reset 即可读到新密钥', () => {
    writeFileSync(
      file,
      JSON.stringify({
        aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa: '0123456789abcdef',
      }),
    );
    resetSecretsCache();

    const first = loadSecrets();
    assert.equal(Object.keys(first).length, 1);
    assert.equal(
      getSecretByHash('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),
      '0123456789abcdef',
    );

    writeFileSync(
      file,
      JSON.stringify({
        aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa: '0123456789abcdef',
        bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb: 'fedcba9876543210',
      }),
    );
    const touched = new Date();
    utimesSync(file, touched, new Date(touched.getTime() + 2000));

    const second = loadSecrets();
    assert.equal(Object.keys(second).length, 2);
    assert.equal(
      getSecretByHash('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'),
      'fedcba9876543210',
    );
  });

  it('mtime 未变时复用缓存（同引用）', () => {
    writeFileSync(
      file,
      JSON.stringify({
        cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc: '1111222233334444',
      }),
    );
    const touched = new Date();
    utimesSync(file, touched, touched);
    resetSecretsCache();

    const a = loadSecrets();
    const b = loadSecrets();
    assert.equal(a, b);
  });
});

describe('formatSecretsCountLabel', () => {
  it('首次加载只显示当前数量', () => {
    assert.equal(formatSecretsCountLabel({ secretCount: 2 }), 'count=2');
  });

  it('变更时显示前后数量与增减', () => {
    assert.equal(
      formatSecretsCountLabel({ secretCount: 3, previousCount: 2 }),
      'count=2→3 (+1)',
    );
    assert.equal(
      formatSecretsCountLabel({ secretCount: 1, previousCount: 3 }),
      'count=3→1 (-2)',
    );
    assert.equal(
      formatSecretsCountLabel({ secretCount: 2, previousCount: 2 }),
      'count=2→2 (±0)',
    );
  });
});
