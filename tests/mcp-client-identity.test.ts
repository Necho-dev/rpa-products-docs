import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveMcpClientIdentity } from '../src/lib/observability/mcp-client-identity';
import { extractMcpRpcMeta } from '../src/lib/observability/mcp-audit-log';

describe('resolveMcpClientIdentity', () => {
  it('prefers initialize clientInfo', () => {
    const id = resolveMcpClientIdentity({
      clientName: 'cursor-vscode',
      clientVersion: '1.2.3',
      userAgent: 'node',
    });
    assert.equal(id.family, 'cursor');
    assert.equal(id.name, 'cursor-vscode');
    assert.equal(id.version, '1.2.3');
    assert.equal(id.source, 'initialize');
  });

  it('infers Cursor / Claude Code from User-Agent', () => {
    assert.equal(
      resolveMcpClientIdentity({ userAgent: 'Cursor/1.0.0 node' }).family,
      'cursor',
    );
    assert.equal(
      resolveMcpClientIdentity({ userAgent: 'claude-code/1.0.0' }).family,
      'claude-code',
    );
    assert.equal(resolveMcpClientIdentity({ userAgent: 'Trae/0.9' }).family, 'trae');
  });
});

describe('extractMcpRpcMeta inherits clientInfo in batch', () => {
  it('propagates initialize client to tools/call in same batch', () => {
    const body = JSON.stringify([
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { clientInfo: { name: 'claude-code', version: '2.0' } },
      },
      {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'search_docs', arguments: { query: 'sycm' } },
      },
    ]);
    const metas = extractMcpRpcMeta(body);
    const call = metas.find((m) => m.rpcMethod === 'tools/call');
    assert.equal(call?.clientName, 'claude-code');
    assert.equal(call?.clientVersion, '2.0');
    assert.equal(call?.tool, 'search_docs');
  });
});
