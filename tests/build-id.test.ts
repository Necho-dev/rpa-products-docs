import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { DEV_APP_RELEASE } from '../src/lib/observability/app-release';
import { getAppRelease, readBuildId, readBuildIdBuiltAt } from '../src/lib/observability/build-id';

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

function makeBuildDir(buildId: string): string {
  const root = mkdtempSync(join(tmpdir(), 'docs-build-id-'));
  tempDirs.push(root);
  mkdirSync(join(root, '.next'), { recursive: true });
  writeFileSync(join(root, '.next', 'BUILD_ID'), `${buildId}\n`, 'utf8');
  return root;
}

describe('readBuildId', () => {
  it('reads trimmed BUILD_ID from cwd/.next/BUILD_ID', () => {
    const root = makeBuildDir('H1Ge17lJqYyAGKsRJ21Im');
    assert.equal(readBuildId(root), 'H1Ge17lJqYyAGKsRJ21Im');
  });

  it('returns undefined when missing or empty', () => {
    const root = mkdtempSync(join(tmpdir(), 'docs-build-id-missing-'));
    tempDirs.push(root);
    assert.equal(readBuildId(root), undefined);

    mkdirSync(join(root, '.next'), { recursive: true });
    writeFileSync(join(root, '.next', 'BUILD_ID'), '   \n', 'utf8');
    assert.equal(readBuildId(root), undefined);
  });

  it('readBuildIdBuiltAt returns ISO mtime when file exists', () => {
    const root = makeBuildDir('mtime-id');
    const builtAt = readBuildIdBuiltAt(root);
    assert.ok(builtAt);
    assert.equal(Number.isNaN(Date.parse(builtAt!)), false);
  });
});

describe('getAppRelease', () => {
  it('returns DEV_APP_RELEASE in development', () => {
    const root = makeBuildDir('prod-looking-id');
    assert.equal(getAppRelease(root, 'development'), DEV_APP_RELEASE);
  });

  it('returns BUILD_ID in production', () => {
    const root = makeBuildDir('prod-build-xyz');
    assert.equal(getAppRelease(root, 'production'), 'prod-build-xyz');
  });

  it('falls back to DEV_APP_RELEASE when BUILD_ID missing in production', () => {
    const root = mkdtempSync(join(tmpdir(), 'docs-build-id-empty-'));
    tempDirs.push(root);
    assert.equal(getAppRelease(root, 'production'), DEV_APP_RELEASE);
  });
});
