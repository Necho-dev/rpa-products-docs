import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  readOpenApiDocument,
  resolveApiPageSelection,
  resolveOpenApiDocumentPath,
  apiPageDirectiveSchema,
} from '../src/lib/docs/openapi/api-page-directive';
import { renderApiPageMarkdown } from '../src/lib/docs/openapi/api-page-markdown';

const SPEC = readOpenApiDocument(
  resolveOpenApiDocumentPath('./openapi/rpa-runtime-admin.mvp.json'),
);

function render(raw: Record<string, unknown>, server?: string) {
  const directive = apiPageDirectiveSchema.parse({
    document: './openapi/rpa-runtime-admin.mvp.json',
    ...raw,
  });
  const selection = resolveApiPageSelection(SPEC, directive, 'test.md');
  return renderApiPageMarkdown({
    document: SPEC,
    selection,
    server,
    showDescription: directive.showDescription,
    showExample: directive.showExample,
    showTitle: directive.showTitle,
  });
}

describe('api-page markdown', () => {
  it('expands a tag into method, path, and description', () => {
    const text = render({ tag: '健康检查' });

    assert.match(text, /## Health\n\n`GET \/healthz`/);
    assert.match(text, /健康检查。/);
    assert.match(text, /## Health Check\n\n`GET \/api\/health`/);
    assert.match(text, /运行时服务健康检查接口/);
    assert.doesNotMatch(text, /:::api-page/);
    assert.match(text, /Server: `http:\/\/127\.0\.0\.1:8000`/);
  });

  it('resolves request and response schemas', () => {
    const text = render({ operations: [{ path: '/api/auth/login', method: 'post' }] });

    assert.match(text, /## Login/);
    assert.match(text, /`POST \/api\/auth\/login`/);
    assert.match(text, /\| email \| string \| 是 \| 邮箱地址 \|/);
    assert.match(text, /\| password \| string \| 是 \| 密码 \|/);
  });

  it('lists auth and path parameters', () => {
    const text = render({ tag: '认证' });

    assert.match(text, /### 鉴权\n\nHTTPBearer \(http bearer\)/);
    assert.match(text, /\| user_id \| path \| integer \| 是 \|/);
    assert.match(text, /\| id \| integer \| 是 \| 用户ID \|/);
    assert.ok(text.includes('| role_detail | RoleBriefResponse \\| null | 否 | 角色详情 |'));
  });

  it('uses the page server and can hide descriptions', () => {
    const text = render(
      {
        tag: '健康检查',
        showDescription: false,
        server: 'https://runtime.example.com',
      },
      'https://runtime.example.com',
    );

    assert.match(text, /Server: `https:\/\/runtime\.example\.com`/);
    assert.doesNotMatch(text, /健康检查。/);
    assert.match(text, /`GET \/healthz`/);
  });
});
