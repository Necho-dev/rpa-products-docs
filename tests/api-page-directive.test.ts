import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  apiPageDirectiveSchema,
  buildApiPageTocHeadings,
  idToTitle,
  operationHeadingTitle,
  readOpenApiDocument,
  resolveApiPageSelection,
  resolveOpenApiDocument,
  resolveOpenApiDocumentPath,
} from '../src/lib/docs/openapi/api-page-directive';
import { resolveDirectiveProxyUrl } from '../src/lib/docs/openapi/config';

const SPEC = readOpenApiDocument(
  resolveOpenApiDocumentPath('./openapi/rpa-runtime-admin.mvp.json'),
);

describe('api-page directive', () => {
  it('parses operations and lowercases methods', () => {
    const parsed = apiPageDirectiveSchema.parse({
      document: './openapi/rpa-runtime-admin.mvp.json',
      operations: [
        { path: '/api/auth/login', method: 'POST' },
        'get_current_user_info_api_auth_me_get',
      ],
    });

    assert.equal(parsed.document, './openapi/rpa-runtime-admin.mvp.json');
    assert.deepEqual(parsed.operations, [
      { path: '/api/auth/login', method: 'post' },
      'get_current_user_info_api_auth_me_get',
    ]);
  });

  it('accepts remote http(s) document URLs', () => {
    const parsed = apiPageDirectiveSchema.parse({
      document: 'https://example.com/openapi.json',
      tag: '认证',
    });
    assert.equal(parsed.document, 'https://example.com/openapi.json');
    assert.deepEqual(resolveOpenApiDocument(parsed.document), {
      kind: 'url',
      href: 'https://example.com/openapi.json',
    });
  });

  it('rejects absolute filesystem document paths', () => {
    assert.throws(
      () =>
        apiPageDirectiveSchema.parse({
          document: '/etc/openapi.json',
          tag: '认证',
        }),
      /相对路径|http\(s\)/,
    );
  });

  it('resolves document relative to the markdown file', () => {
    const fromFile = path.join(process.cwd(), 'content/docs/example/page.md');
    const abs = resolveOpenApiDocumentPath(
      '../../../openapi/rpa-runtime-admin.mvp.json',
      fromFile,
    );
    assert.equal(
      path.basename(abs),
      'rpa-runtime-admin.mvp.json',
    );
  });

  it('rejects missing document files', () => {
    assert.throws(
      () => resolveOpenApiDocumentPath('./openapi/not-in-whitelist.json'),
      /not found/,
    );
  });

  it('expands tag into operations', () => {
    const parsed = apiPageDirectiveSchema.parse({
      document: './openapi/rpa-runtime-admin.mvp.json',
      tag: '认证',
    });
    const selection = resolveApiPageSelection(SPEC, parsed, 'auth.md');
    assert.deepEqual(selection.operations, [
      { path: '/api/auth/login', method: 'post' },
      { path: '/api/auth/me', method: 'get' },
      { path: '/api/auth/users/{user_id}', method: 'get' },
    ]);
    assert.deepEqual(selection.webhooks, []);
  });

  it('builds toc ids for tag selection', () => {
    const selection = resolveApiPageSelection(
      SPEC,
      apiPageDirectiveSchema.parse({
        document: './openapi/rpa-runtime-admin.mvp.json',
        tag: '认证',
      }),
      'auth.md',
    );
    const headings = buildApiPageTocHeadings(SPEC, selection, 3);
    assert.deepEqual(
      headings.map((item) => ({ title: item.title, id: item.id, depth: item.depth })),
      [
        { title: 'Login', id: 'login', depth: 3 },
        { title: 'Get Current User Info', id: 'get-current-user-info', depth: 3 },
        { title: 'Get User', id: 'get-user', depth: 3 },
      ],
    );
  });

  it('falls back from summary to operationId title', () => {
    assert.equal(operationHeadingTitle({ operationId: 'get_user' }, '/x'), 'Get_user');
    assert.equal(idToTitle('health-check'), 'Health check');
  });

  it('resolves proxy yaml to path or undefined', () => {
    assert.equal(resolveDirectiveProxyUrl(false), undefined);
    assert.equal(resolveDirectiveProxyUrl(true), '/api/openapi-proxy');
    assert.equal(resolveDirectiveProxyUrl('/custom-proxy'), '/custom-proxy');
  });
});
