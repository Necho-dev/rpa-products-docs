import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { authorizeMcpDocsImageAccess } from '@/lib/docs/resources/mcp-docs-image-access';

const IMAGE =
  'rpa/_public/images/qianniu/finance_bail_account_detail_20260715.png';

function pageWithImage(referenced: boolean, access?: string) {
  const raw = referenced
    ? '![x](../_public/images/qianniu/finance_bail_account_detail_20260715.png)\n'
    : 'no images here\n';
  return {
    path: 'rpa/RPA_QIANNIU/rpa-conn-qianniu-finance-bail-account-detail.md',
    url: '/docs/rpa/RPA_QIANNIU/rpa-conn-qianniu-finance-bail-account-detail',
    data: {
      access,
      getText: async () => raw,
    },
  };
}

describe('authorizeMcpDocsImageAccess', () => {
  const prevSso = process.env.DOCS_CUBE_SSO_ENABLED;
  const prevToken = process.env.DOCS_PRIVATE_ACCESS_TOKEN;

  before(() => {
    process.env.DOCS_CUBE_SSO_ENABLED = 'false';
  });

  after(() => {
    if (prevSso === undefined) delete process.env.DOCS_CUBE_SSO_ENABLED;
    else process.env.DOCS_CUBE_SSO_ENABLED = prevSso;
    if (prevToken === undefined) delete process.env.DOCS_PRIVATE_ACCESS_TOKEN;
    else process.env.DOCS_PRIVATE_ACCESS_TOKEN = prevToken;
  });

  it('allows when caller has private access (SSO / token)', async () => {
    process.env.DOCS_PRIVATE_ACCESS_TOKEN = 'unit-private-token';
    const out = await authorizeMcpDocsImageAccess(IMAGE, {
      canAccessPrivate: true,
    });
    assert.deepEqual(out, { ok: true, relativePath: IMAGE });
  });

  it('allows when private-doc gate is not configured', async () => {
    delete process.env.DOCS_PRIVATE_ACCESS_TOKEN;
    const out = await authorizeMcpDocsImageAccess(IMAGE, {
      canAccessPrivate: false,
    });
    assert.equal(out.ok, true);
  });

  it('denies without page when PRIVATE_ACCESS_TOKEN mode and unauthorized', async () => {
    process.env.DOCS_PRIVATE_ACCESS_TOKEN = 'unit-private-token';
    const out = await authorizeMcpDocsImageAccess(IMAGE, {
      canAccessPrivate: false,
    });
    assert.equal(out.ok, false);
    if (out.ok) return;
    assert.equal(out.status, 403);
    assert.match(out.error, /pass page=/i);
  });

  it('allows when accessible page references the image', async () => {
    process.env.DOCS_PRIVATE_ACCESS_TOKEN = 'unit-private-token';
    const page = pageWithImage(true);
    const out = await authorizeMcpDocsImageAccess(
      IMAGE,
      { canAccessPrivate: false },
      {
        pagePath: '/docs/rpa/RPA_QIANNIU/rpa-conn-qianniu-finance-bail-account-detail',
        resolvePage: () => page,
        isPageAccessible: () => true,
      },
    );
    assert.deepEqual(out, { ok: true, relativePath: IMAGE });
  });

  it('denies when page is not accessible (cannot read doc → cannot read image)', async () => {
    process.env.DOCS_PRIVATE_ACCESS_TOKEN = 'unit-private-token';
    const page = pageWithImage(true, 'private');
    const out = await authorizeMcpDocsImageAccess(
      IMAGE,
      { canAccessPrivate: false },
      {
        pagePath: '/docs/private/page',
        resolvePage: () => page,
        isPageAccessible: () => false,
      },
    );
    assert.equal(out.ok, false);
    if (out.ok) return;
    assert.match(out.error, /not accessible/i);
  });

  it('denies when accessible page does not reference the image', async () => {
    process.env.DOCS_PRIVATE_ACCESS_TOKEN = 'unit-private-token';
    const page = pageWithImage(false);
    const out = await authorizeMcpDocsImageAccess(
      IMAGE,
      { canAccessPrivate: false },
      {
        pagePath: '/docs/rpa/RPA_1688',
        resolvePage: () => page,
        isPageAccessible: () => true,
      },
    );
    assert.equal(out.ok, false);
    if (out.ok) return;
    assert.match(out.error, /not referenced/i);
  });
});
