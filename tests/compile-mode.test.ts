import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { isRuntimePartition, runtimePartitionNames } from '../src/lib/docs/source/compile-mode';

describe('partition compile mode', () => {
  const roots: string[] = [];

  after(() => {
    for (const root of roots) rmSync(root, { recursive: true, force: true });
  });

  it('reads compile only from a top-level partition meta.json', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'docs-compile-'));
    roots.push(root);
    mkdirSync(path.join(root, 'rpa'));
    writeFileSync(path.join(root, 'rpa', 'meta.json'), JSON.stringify({ root: true }));
    mkdirSync(path.join(root, 'auth'));
    writeFileSync(path.join(root, 'auth', 'meta.json'), JSON.stringify({ compile: 'build' }));
    mkdirSync(path.join(root, 'api', 'nested'), { recursive: true });
    writeFileSync(path.join(root, 'api', 'meta.json'), JSON.stringify({ compile: 'runtime' }));
    writeFileSync(path.join(root, 'api', 'nested', 'meta.json'), JSON.stringify({ compile: 'build' }));

    assert.deepEqual(runtimePartitionNames(root), ['api']);
  });

  it('follows a symlinked partition directory', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'docs-compile-link-'));
    roots.push(root);
    const real = path.join(root, 'real-api');
    const docs = path.join(root, 'docs');
    mkdirSync(real);
    mkdirSync(docs);
    writeFileSync(path.join(real, 'meta.json'), JSON.stringify({ compile: 'runtime' }));
    symlinkSync(real, path.join(docs, 'api'), 'dir');

    assert.deepEqual(runtimePartitionNames(docs), ['api']);
  });

  it('does not mark current partitions as runtime unless meta.json says so', () => {
    const names = runtimePartitionNames();
    assert.equal(names.includes('rpa'), false);
    assert.equal(names.includes('auth'), false);
    assert.equal(names.includes('api'), true);
    assert.equal(isRuntimePartition('rpa'), false);
    assert.equal(isRuntimePartition('api'), true);
    assert.equal(isRuntimePartition(undefined), false);
  });
});
