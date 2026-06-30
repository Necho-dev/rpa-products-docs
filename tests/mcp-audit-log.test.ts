import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  extractMcpRpcMeta,
  formatMcpAuditPretty,
  mcpAuditOutcome,
} from '../src/lib/observability/mcp-audit-log';

describe('mcp-audit-log', () => {
  it('extractMcpRpcMeta 解析 tools/call', () => {
    const body = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'search_docs',
        arguments: { query: 'connector', limit: 5 },
      },
    });
    const metas = extractMcpRpcMeta(body);
    assert.equal(metas.length, 1);
    assert.equal(metas[0]?.rpcMethod, 'tools/call');
    assert.equal(metas[0]?.tool, 'search_docs');
    assert.deepEqual(metas[0]?.params, { query: 'connector', limit: 5 });
  });

  it('extractMcpRpcMeta 解析 initialize 客户端信息', () => {
    const body = JSON.stringify({
      jsonrpc: '2.0',
      id: 0,
      method: 'initialize',
      params: {
        clientInfo: { name: 'cursor', version: '1.0.0' },
      },
    });
    const metas = extractMcpRpcMeta(body);
    assert.equal(metas[0]?.clientName, 'cursor');
    assert.equal(metas[0]?.clientVersion, '1.0.0');
  });

  it('formatMcpAuditPretty 展示 tool 与参数', () => {
    const line = formatMcpAuditPretty(
      {
        timestamp: 1,
        time: '2026-06-30T15:00:00.000Z',
        type: 'mcp',
        rpcMethod: 'tools/call',
        tool: 'search_docs',
        params: { query: 'foo', limit: 10 },
        status: 200,
        outcome: 'ok',
        durationMs: 42,
        ip: '10.0.0.1',
      },
      { useColors: false },
    );
    assert.match(line, /^2026-06-30 15:00:00\.000 \[MCP\] tools\/call search_docs 200 in 42ms/);
    assert.match(line, /query=foo, limit=10/);
  });

  it('mcpAuditOutcome 识别未授权', () => {
    assert.equal(mcpAuditOutcome(401, 'tools/call'), 'unauthorized');
    assert.equal(mcpAuditOutcome(200, 'tools/call'), 'ok');
  });
});
