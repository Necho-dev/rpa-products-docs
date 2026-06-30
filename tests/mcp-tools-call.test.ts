import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { NextRequest } from 'next/server';
import { resetSecretsCache } from '../src/lib/auth/cube';
import { DOCS_MCP_TOKEN_COOKIE } from '../src/lib/auth/cookie-names';
import { issueMcpToken } from '../src/lib/auth/mcp-token';
import { observabilityLogFilePathForDate } from '../src/lib/observability/access-log-file';
import {
  buildMcpAuditEntry,
  extractMcpRpcMeta,
  formatMcpAuditPretty,
  writeMcpAuditLog,
} from '../src/lib/observability/mcp-audit-log';

const MCP_TOOLS = ['search_docs', 'get_docs_content', 'get_docs_meta', 'list_docs'] as const;

/** NextRequest 会将 127.0.0.1 规范化为 localhost，单测须与 mcpResourceUrlsForRequest 一致 */
const UNIT_MCP_ORIGIN = 'http://localhost:3000';

function toolsCallBody(
  tool: (typeof MCP_TOOLS)[number],
  args: Record<string, string | number | boolean>,
  id: string | number = 1,
): string {
  return JSON.stringify({
    jsonrpc: '2.0',
    id,
    method: 'tools/call',
    params: { name: tool, arguments: args },
  });
}

function devSecretSh(): string {
  const raw = JSON.parse(readFileSync('.secrets/dev-secrets.json', 'utf8')) as Record<string, string>;
  const [sh] = Object.entries(raw).find(([, v]) => typeof v === 'string' && v.length > 0) ?? [];
  if (!sh) throw new Error('missing dev secret');
  return sh;
}

function issueTestMcpBearer(aud = `${UNIT_MCP_ORIGIN}/mcp`): string {
  const sh = devSecretSh();
  return issueMcpToken({ u: 'mcp-test-user', s: sh, aud });
}

async function serverUp(base = 'http://127.0.0.1:3000'): Promise<boolean> {
  try {
    const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(800) });
    return res.ok;
  } catch {
    return false;
  }
}

describe('mcp tools/call 审计', () => {
  it('extractMcpRpcMeta 解析 search_docs 参数', () => {
    const metas = extractMcpRpcMeta(
      toolsCallBody('search_docs', { query: 'connector', limit: 5, locale: 'zh' }),
    );
    assert.equal(metas[0]?.tool, 'search_docs');
    assert.deepEqual(metas[0]?.params, { query: 'connector', limit: 5, locale: 'zh' });
  });

  it('extractMcpRpcMeta 解析 get_docs_content path', () => {
    const metas = extractMcpRpcMeta(
      toolsCallBody('get_docs_content', { path: '/docs/connectors/rpa-conn-qianniu-all' }),
    );
    assert.equal(metas[0]?.tool, 'get_docs_content');
    assert.deepEqual(metas[0]?.params, { path: '/docs/connectors/rpa-conn-qianniu-all' });
  });

  it('extractMcpRpcMeta 解析 get_docs_meta path', () => {
    const metas = extractMcpRpcMeta(
      toolsCallBody('get_docs_meta', { path: '/docs' }),
    );
    assert.equal(metas[0]?.tool, 'get_docs_meta');
    assert.deepEqual(metas[0]?.params, { path: '/docs' });
  });

  it('extractMcpRpcMeta 解析 list_docs locale', () => {
    const metas = extractMcpRpcMeta(toolsCallBody('list_docs', { locale: 'zh' }));
    assert.equal(metas[0]?.tool, 'list_docs');
    assert.deepEqual(metas[0]?.params, { locale: 'zh' });
  });

  it('extractMcpRpcMeta 仅保留白名单参数，丢弃正文等字段', () => {
    const metas = extractMcpRpcMeta(
      toolsCallBody('search_docs', {
        query: 'foo',
        limit: 3,
        body: 'must-not-appear',
        content: 'secret-chunk',
      } as Record<string, string | number>),
    );
    assert.deepEqual(metas[0]?.params, { query: 'foo', limit: 3 });
  });

  it('buildMcpAuditEntry tools/call 含 Bearer 身份字段', () => {
    const prevSecret = process.env.DOCS_SESSION_SECRET;
    const prevSso = process.env.DOCS_CUBE_SSO_ENABLED;
    const prevSecrets = process.env.DOCS_SECRETS_FILE_PATH;
    process.env.DOCS_SESSION_SECRET = 'dev-session-secret';
    process.env.DOCS_CUBE_SSO_ENABLED = 'true';
    process.env.DOCS_SECRETS_FILE_PATH = '.secrets/dev-secrets.json';
    resetSecretsCache();
    try {
      const token = issueTestMcpBearer();
      const req = new NextRequest(`${UNIT_MCP_ORIGIN}/mcp`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
      });
      const meta = extractMcpRpcMeta(
        toolsCallBody('search_docs', { query: 'rpa', limit: 2 }),
      )[0]!;
      const entry = buildMcpAuditEntry(meta, req, { canAccessPrivate: true }, 200, Date.now() - 12);
      assert.equal(entry.rpcMethod, 'tools/call');
      assert.equal(entry.tool, 'search_docs');
      assert.equal(entry.outcome, 'ok');
      assert.equal(entry.accessUser, 'mcp-test-user');
      assert.equal(entry.authorization, DOCS_MCP_TOKEN_COOKIE);
    } finally {
      if (prevSecret === undefined) delete process.env.DOCS_SESSION_SECRET;
      else process.env.DOCS_SESSION_SECRET = prevSecret;
      if (prevSso === undefined) delete process.env.DOCS_CUBE_SSO_ENABLED;
      else process.env.DOCS_CUBE_SSO_ENABLED = prevSso;
      if (prevSecrets === undefined) delete process.env.DOCS_SECRETS_FILE_PATH;
      else process.env.DOCS_SECRETS_FILE_PATH = prevSecrets;
    }
  });

  it('formatMcpAuditPretty tools/call 含 [MCP] 与身份分组', () => {
    const line = formatMcpAuditPretty(
      {
        timestamp: 1,
        time: '2026-06-30T16:00:00.000Z',
        type: 'mcp',
        rpcMethod: 'tools/call',
        tool: 'get_docs_content',
        params: { path: '/docs' },
        status: 200,
        outcome: 'ok',
        durationMs: 18,
        accessUser: 'dev-user',
        accessOrigin: 'http://127.0.0.1:8765',
        ip: '127.0.0.1',
      },
      { useColors: false },
    );
    assert.match(
      line,
      /^2026-06-30 16:00:00\.000 \[MCP\] tools\/call get_docs_content 200 in 18ms/,
    );
    assert.match(line, /\(ok · path=\/docs\)/);
    assert.match(line, /\(user:dev-user · origin:http:\/\/127\.0\.0\.1:8765\)/);
    assert.match(line, /\(127\.0\.0\.1\)$/);
  });

  it('writeMcpAuditLog tools/call 写入 jsonl', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'docs-mcp-tools-'));
    const prevPath = process.env.DOCS_OBSERVABILITY_LOG_PATH;
    const prevEnabled = process.env.DOCS_OBSERVABILITY_LOG_ENABLED;
    process.env.DOCS_OBSERVABILITY_LOG_PATH = dir;
    process.env.DOCS_OBSERVABILITY_LOG_ENABLED = 'true';
    try {
      writeMcpAuditLog({
        timestamp: Date.now(),
        time: new Date().toISOString(),
        type: 'mcp',
        rpcMethod: 'tools/call',
        tool: 'search_docs',
        params: { query: 'connector', limit: 5 },
        status: 200,
        outcome: 'ok',
        durationMs: 42,
        accessUser: 'dev-user',
        authorization: DOCS_MCP_TOKEN_COOKIE,
      });
      await new Promise((r) => setTimeout(r, 50));
      const filePath = observabilityLogFilePathForDate(new Date(), dir)!;
      const content = await readFile(filePath, 'utf8');
      const row = JSON.parse(content.trim().split('\n').at(-1)!);
      assert.equal(row.type, 'mcp');
      assert.equal(row.rpcMethod, 'tools/call');
      assert.equal(row.tool, 'search_docs');
      assert.equal(row.params.query, 'connector');
      assert.equal(row.authorization, DOCS_MCP_TOKEN_COOKIE);
      assert.equal(row.accessUser, 'dev-user');
    } finally {
      if (prevPath === undefined) delete process.env.DOCS_OBSERVABILITY_LOG_PATH;
      else process.env.DOCS_OBSERVABILITY_LOG_PATH = prevPath;
      if (prevEnabled === undefined) delete process.env.DOCS_OBSERVABILITY_LOG_ENABLED;
      else process.env.DOCS_OBSERVABILITY_LOG_ENABLED = prevEnabled;
    }
  });
});

describe('mcp tools/call 联调', () => {
  const base = process.env.DOCS_MCP_TEST_BASE_URL ?? 'http://127.0.0.1:3000';

  function ensureMcpTokenEnv(): void {
    process.env.DOCS_SESSION_SECRET = process.env.DOCS_SESSION_SECRET ?? 'dev-session-secret';
    process.env.DOCS_SECRETS_FILE_PATH = process.env.DOCS_SECRETS_FILE_PATH ?? '.secrets/dev-secrets.json';
    resetSecretsCache();
  }

  async function postToolsCall(
    tool: (typeof MCP_TOOLS)[number],
    args: Record<string, string | number | boolean>,
    bearer?: string,
  ): Promise<Response> {
    return fetch(`${base}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
      body: toolsCallBody(tool, args, randomUUID()),
      signal: AbortSignal.timeout(30_000),
    });
  }

  it('live search_docs 需 Bearer 且返回 JSON-RPC 结果', async (t) => {
    if (!(await serverUp(base))) {
      t.skip('文档站未启动');
      return;
    }
    ensureMcpTokenEnv();

    const unauth = await postToolsCall('search_docs', { query: 'connector', limit: 3 });
    assert.equal(unauth.status, 401);

    const bearer = issueTestMcpBearer(`${base}/mcp`);
    const res = await postToolsCall('search_docs', { query: 'connector', limit: 3 }, bearer);
    const text = await res.text();
    assert.equal(res.status, 200, text);

    const payload: unknown = JSON.parse(text);
    assert.ok(payload && typeof payload === 'object' && 'result' in payload);
  });

  it('live get_docs_meta 返回页面元信息', async (t) => {
    if (!(await serverUp(base))) {
      t.skip('文档站未启动');
      return;
    }
    ensureMcpTokenEnv();

    const bearer = issueTestMcpBearer(`${base}/mcp`);
    const res = await postToolsCall('get_docs_meta', { path: '/docs' }, bearer);
    const text = await res.text();
    assert.equal(res.status, 200, text);

    const payload = JSON.parse(text) as { result?: { content?: { text?: string }[] } };
    const meta = payload.result?.content?.[0]?.text ?? '';
    assert.ok(meta.length > 20, '元信息过短');
    assert.match(meta, /\/docs|title|docs/i);
  });

  it('live get_docs_content 可读文档页', async (t) => {
    if (!(await serverUp(base))) {
      t.skip('文档站未启动');
      return;
    }
    ensureMcpTokenEnv();

    const bearer = issueTestMcpBearer(`${base}/mcp`);
    const res = await postToolsCall('get_docs_content', { path: '/docs' }, bearer);
    const text = await res.text();
    assert.equal(res.status, 200, text);

    const payload = JSON.parse(text) as { result?: { content?: { text?: string }[] } };
    const body = payload.result?.content?.[0]?.text ?? '';
    assert.ok(body.length > 100, '文档正文过短');
  });

  it('live list_docs 返回目录', async (t) => {
    if (!(await serverUp(base))) {
      t.skip('文档站未启动');
      return;
    }
    ensureMcpTokenEnv();

    const bearer = issueTestMcpBearer(`${base}/mcp`);
    const res = await postToolsCall('list_docs', {}, bearer);
    const text = await res.text();
    assert.equal(res.status, 200, text);

    const payload = JSON.parse(text) as { result?: { content?: { text?: string }[] } };
    const listing = payload.result?.content?.[0]?.text ?? '';
    assert.match(listing, /\/docs/);
  });
});
