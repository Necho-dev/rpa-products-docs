import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildBacklinks,
  defaultModeForKind,
  normalizeReferencePlacement,
  normalizeReferencesInput,
  referenceDirectiveSchema,
  referencesSchema,
  resolvePlacedReference,
  resolveReferencesWith,
  type ReferenceLookup,
} from '../src/lib/docs/doc-references-core';
import {
  pageSlugFromDocFile,
  pageSlugFromDocPageFile,
} from '../src/lib/docs/source/scan-sibling-docs';

const QIANNIU_AUTH = '/docs/auth/YUCE_RPA/RPA_QIANNIU';
const CMA = '/docs/rpa/RPA_UNIVERSAL/rpa-conn-universal-weather-cma-forecast-detail';
const DEP_BADGE = { label: '前置依赖' };
const FALL_BADGE = { label: '备选方案' };

function lookupFrom(pages: Record<string, unknown>): ReferenceLookup {
  return (slugs) => {
    const key = slugs.join('/');
    if (!(key in pages)) return undefined;
    return { references: pages[key] };
  };
}

describe('normalizeReferencesInput', () => {
  it('handles absent and ignores inherit leftovers', () => {
    assert.deepEqual(normalizeReferencesInput(undefined), { edges: [] });
    assert.deepEqual(normalizeReferencesInput('inherit'), { edges: [] });
    assert.deepEqual(normalizeReferencesInput([{ inherit: true }]), { edges: [] });
  });

  it('keeps only path+kind and strips trailing slash', () => {
    const result = normalizeReferencesInput([
      { kind: 'dependency', path: `${QIANNIU_AUTH}/` },
      { kind: 'nope', path: QIANNIU_AUTH },
      { kind: 'fallback' },
      { kind: 'fallback', path: 'https://example.com/x' },
      'garbage',
    ]);
    assert.deepEqual(result.edges, [{ kind: 'dependency', path: QIANNIU_AUTH }]);
  });
});

describe('resolveReferencesWith', () => {
  it('returns empty when the page declares nothing', () => {
    const lookup = lookupFrom({ 'rpa/RPA_QIANNIU/conn': undefined });
    assert.deepEqual(resolveReferencesWith(['rpa', 'RPA_QIANNIU', 'conn'], lookup), []);
  });

  it('does not walk ancestors', () => {
    const lookup = lookupFrom({
      'rpa/RPA_QIANNIU/conn': undefined,
      'rpa/RPA_QIANNIU': [{ kind: 'dependency', path: QIANNIU_AUTH }],
    });
    assert.deepEqual(resolveReferencesWith(['rpa', 'RPA_QIANNIU', 'conn'], lookup), []);
  });

  it('fills default mode and badge per kind', () => {
    assert.equal(defaultModeForKind('dependency'), 'summary');
    assert.equal(defaultModeForKind('fallback'), 'summary');

    const lookup = lookupFrom({
      page: [
        { kind: 'dependency', path: QIANNIU_AUTH },
        { kind: 'fallback', path: CMA },
      ],
    });
    assert.deepEqual(resolveReferencesWith(['page'], lookup), [
      { kind: 'dependency', path: QIANNIU_AUTH, mode: 'summary', badge: DEP_BADGE },
      { kind: 'fallback', path: CMA, mode: 'summary', badge: FALL_BADGE },
    ]);
  });
});

describe('resolvePlacedReference', () => {
  const graph = [{ kind: 'dependency' as const, path: QIANNIU_AUTH }];

  it('returns null when path is not in frontmatter', () => {
    const warnings: string[] = [];
    assert.equal(
      resolvePlacedReference(graph, { path: CMA }, (m) => warnings.push(m)),
      null,
    );
    assert.equal(warnings.length, 1);
  });

  it('merges display fields onto the graph kind', () => {
    assert.deepEqual(
      resolvePlacedReference(graph, {
        path: QIANNIU_AUTH,
        mode: 'preview',
        size: 'large',
        badge: { label: '授权依赖' },
        prompt: { label: '请提前完成授权配置', type: 'warning' },
      }),
      {
        kind: 'dependency',
        path: QIANNIU_AUTH,
        mode: 'preview',
        size: 'large',
        badge: { label: '授权依赖' },
        prompt: { label: '请提前完成授权配置', type: 'warning' },
      },
    );
  });

  it('defaults preview size to medium and ignores size on summary', () => {
    assert.equal(
      resolvePlacedReference(graph, { path: QIANNIU_AUTH, mode: 'preview' })?.size,
      'medium',
    );
    const warnings: string[] = [];
    const placed = resolvePlacedReference(
      graph,
      { path: QIANNIU_AUTH, mode: 'summary', size: 'large' },
      (m) => warnings.push(m),
    );
    assert.equal(placed?.size, undefined);
    assert.equal(warnings.length, 1);
  });
});

describe('normalizeReferencePlacement', () => {
  it('parses display YAML and drops kind', () => {
    assert.deepEqual(
      normalizeReferencePlacement({
        path: `${QIANNIU_AUTH}/`,
        mode: 'summary',
        prompt: { label: '请提前完成授权配置', type: 'warning' },
      }),
      {
        path: QIANNIU_AUTH,
        mode: 'summary',
        prompt: { label: '请提前完成授权配置', type: 'warning' },
      },
    );
  });
});

describe('referencesSchema', () => {
  it('accepts path+kind only', () => {
    assert.equal(referencesSchema.safeParse(undefined).success, true);
    assert.equal(
      referencesSchema.safeParse([{ kind: 'dependency', path: QIANNIU_AUTH }]).success,
      true,
    );
  });

  it('rejects inherit, mode, prompt, and off-site paths', () => {
    const bad = [
      'inherit',
      [{ inherit: true }],
      [{ kind: 'dependency', path: QIANNIU_AUTH, mode: 'summary' }],
      [{ kind: 'dependency', path: QIANNIU_AUTH, prompt: { label: 'x' } }],
      [{ kind: 'dependency', path: 'https://example.com/docs/x' }],
      [{ kind: 'dependency', path: '/mcp' }],
      [{ kind: 'auth', path: QIANNIU_AUTH }],
    ];
    for (const value of bad) {
      assert.equal(referencesSchema.safeParse(value).success, false, JSON.stringify(value));
    }
  });
});

describe('referenceDirectiveSchema', () => {
  it('accepts display fields and rejects kind', () => {
    assert.equal(
      referenceDirectiveSchema.safeParse({
        path: QIANNIU_AUTH,
        mode: 'preview',
        size: 'small',
        prompt: { label: '请提前完成授权配置', type: 'warning' },
      }).success,
      true,
    );
    assert.equal(
      referenceDirectiveSchema.safeParse({
        path: QIANNIU_AUTH,
        kind: 'dependency',
      }).success,
      false,
    );
    assert.equal(
      referenceDirectiveSchema.safeParse({ path: QIANNIU_AUTH, size: 'huge' }).success,
      false,
    );
  });
});

describe('pageSlugFromDocPageFile', () => {
  it('keeps leaf filenames and folds index into the directory', () => {
    assert.deepEqual(
      pageSlugFromDocPageFile('/repo/content/docs/rpa/RPA_ALIMM/index.md'),
      ['rpa', 'RPA_ALIMM'],
    );
    assert.deepEqual(
      pageSlugFromDocPageFile(
        '/repo/content/docs/rpa/RPA_QIANNIU/rpa-conn-foo.md',
      ),
      ['rpa', 'RPA_QIANNIU', 'rpa-conn-foo'],
    );
    assert.deepEqual(pageSlugFromDocFile('/repo/content/docs/rpa/index.mdx'), ['rpa']);
  });
});

describe('buildBacklinks', () => {
  it('indexes explicit edges by target and sorts referrers by title', () => {
    const map = buildBacklinks([
      { url: '/docs/rpa/RPA_SYCM', title: '生意参谋', explicitPaths: [QIANNIU_AUTH] },
      { url: '/docs/rpa/RPA_QIANNIU', title: '千牛', icon: 'ICO_QIANNIU', explicitPaths: [QIANNIU_AUTH] },
      { url: '/docs/rpa/RPA_UNIVERSAL/nmc', title: '中央气象台7天预报', explicitPaths: [CMA] },
    ]);

    assert.deepEqual(map.get(QIANNIU_AUTH), [
      { url: '/docs/rpa/RPA_QIANNIU', title: '千牛', icon: 'ICO_QIANNIU' },
      { url: '/docs/rpa/RPA_SYCM', title: '生意参谋' },
    ]);
    assert.deepEqual(map.get(CMA), [
      { url: '/docs/rpa/RPA_UNIVERSAL/nmc', title: '中央气象台7天预报' },
    ]);
  });

  it('dedupes repeated targets and skips self-references', () => {
    const map = buildBacklinks([
      {
        url: '/docs/rpa/RPA_QIANNIU',
        title: '千牛',
        explicitPaths: [QIANNIU_AUTH, `${QIANNIU_AUTH}/`, '/docs/rpa/RPA_QIANNIU'],
      },
    ]);
    assert.equal(map.get(QIANNIU_AUTH)?.length, 1);
    assert.equal(map.has('/docs/rpa/RPA_QIANNIU'), false);
  });
});
