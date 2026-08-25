import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildBacklinks,
  defaultModeForKind,
  normalizeReferencesInput,
  parentIndexSlugs,
  referencesSchema,
  resolveReferencesWith,
  type ReferenceLookup,
} from '../src/lib/docs/doc-references-core';

const QIANNIU_AUTH = '/docs/auth/ACCOUNT_PASSWORD/RPA_QIANNIU';
const CMA = '/docs/rpa/RPA_UNIVERSAL/rpa-conn-universal-weather-cma-forecast-detail';
const DEP_BADGE = { label: '前置依赖' };
const FALL_BADGE = { label: '备选方案' };
const AUTH_PROMPT = { label: '请提前完成授权配置', type: 'warning' as const };

/** 用 slug 路径当 key 的假页面表 */
function lookupFrom(pages: Record<string, unknown>): ReferenceLookup {
  return (slugs) => {
    const key = slugs.join('/');
    if (!(key in pages)) return undefined;
    return { references: pages[key] };
  };
}

describe('normalizeReferencesInput', () => {
  it('handles absent and both inherit spellings', () => {
    assert.deepEqual(normalizeReferencesInput(undefined), { inherit: false, edges: [] });
    assert.deepEqual(normalizeReferencesInput('inherit'), { inherit: true, edges: [] });
    assert.deepEqual(normalizeReferencesInput([{ inherit: true }]), {
      inherit: true,
      edges: [],
    });
  });

  it('drops malformed items and strips trailing slash', () => {
    const result = normalizeReferencesInput([
      { kind: 'dependency', path: `${QIANNIU_AUTH}/` },
      { kind: 'nope', path: QIANNIU_AUTH },
      { kind: 'fallback' },
      { kind: 'fallback', path: 'https://example.com/x' },
      'garbage',
    ]);
    assert.equal(result.inherit, false);
    assert.deepEqual(result.edges, [{ kind: 'dependency', path: QIANNIU_AUTH }]);
  });
});

describe('parentIndexSlugs', () => {
  it('walks one level up and stops at site root', () => {
    assert.deepEqual(parentIndexSlugs(['rpa', 'RPA_ALIMM', 'conn']), ['rpa', 'RPA_ALIMM']);
    assert.deepEqual(parentIndexSlugs(['rpa', 'RPA_ALIMM']), ['rpa']);
    assert.deepEqual(parentIndexSlugs(['rpa']), []);
    assert.equal(parentIndexSlugs([]), null);
  });
});

describe('resolveReferencesWith', () => {
  it('returns empty when the page declares nothing', () => {
    const lookup = lookupFrom({ 'rpa/RPA_QIANNIU/conn': undefined });
    assert.deepEqual(resolveReferencesWith(['rpa', 'RPA_QIANNIU', 'conn'], lookup), []);
  });

  it('returns empty when inherit finds no parent index or an empty one', () => {
    const noParent = lookupFrom({ 'rpa/RPA_QIANNIU/conn': 'inherit' });
    assert.deepEqual(resolveReferencesWith(['rpa', 'RPA_QIANNIU', 'conn'], noParent), []);

    const emptyParent = lookupFrom({
      'rpa/RPA_QIANNIU/conn': 'inherit',
      'rpa/RPA_QIANNIU': undefined,
    });
    assert.deepEqual(resolveReferencesWith(['rpa', 'RPA_QIANNIU', 'conn'], emptyParent), []);
  });

  it('expands inherit from the nearest ancestor index', () => {
    const lookup = lookupFrom({
      'rpa/RPA_QIANNIU/conn': 'inherit',
      'rpa/RPA_QIANNIU': [
        { kind: 'dependency', path: QIANNIU_AUTH, prompt: AUTH_PROMPT },
      ],
    });
    assert.deepEqual(resolveReferencesWith(['rpa', 'RPA_QIANNIU', 'conn'], lookup), [
      {
        kind: 'dependency',
        path: QIANNIU_AUTH,
        mode: 'summary',
        badge: DEP_BADGE,
        prompt: AUTH_PROMPT,
      },
    ]);
  });

  it('keeps walking up when the parent also inherits, capped at depth 2', () => {
    const twoLevels = lookupFrom({
      'rpa/RPA_QIANNIU/conn': 'inherit',
      'rpa/RPA_QIANNIU': 'inherit',
      rpa: [{ kind: 'dependency', path: QIANNIU_AUTH }],
    });
    assert.deepEqual(resolveReferencesWith(['rpa', 'RPA_QIANNIU', 'conn'], twoLevels), [
      { kind: 'dependency', path: QIANNIU_AUTH, mode: 'summary', badge: DEP_BADGE },
    ]);

    // 第三级超出 MAX_INHERIT_DEPTH，不再向上取
    const threeLevels = lookupFrom({
      'a/b/c/d': 'inherit',
      'a/b/c': 'inherit',
      'a/b': 'inherit',
      a: [{ kind: 'dependency', path: QIANNIU_AUTH }],
    });
    assert.deepEqual(resolveReferencesWith(['a', 'b', 'c', 'd'], threeLevels), []);
  });

  it('does not loop when a page inherits from itself', () => {
    const lookup: ReferenceLookup = () => ({ references: 'inherit' });
    assert.deepEqual(resolveReferencesWith(['rpa', 'RPA_QIANNIU'], lookup), []);
  });

  it('appends own edges after inherited ones and sorts dependency first', () => {
    const lookup = lookupFrom({
      'rpa/RPA_UNIVERSAL/nmc': [
        { inherit: true },
        { kind: 'fallback', path: CMA },
      ],
      'rpa/RPA_UNIVERSAL': [{ kind: 'dependency', path: QIANNIU_AUTH }],
    });
    assert.deepEqual(resolveReferencesWith(['rpa', 'RPA_UNIVERSAL', 'nmc'], lookup), [
      { kind: 'dependency', path: QIANNIU_AUTH, mode: 'summary', badge: DEP_BADGE },
      { kind: 'fallback', path: CMA, mode: 'summary', badge: FALL_BADGE },
    ]);
  });

  it('lets an explicit edge override the inherited one on the same path', () => {
    const lookup = lookupFrom({
      'rpa/RPA_QIANNIU/conn': [
        { inherit: true },
        { kind: 'dependency', path: QIANNIU_AUTH, mode: 'link' },
      ],
      'rpa/RPA_QIANNIU': [
        { kind: 'dependency', path: QIANNIU_AUTH, prompt: AUTH_PROMPT },
      ],
    });
    assert.deepEqual(resolveReferencesWith(['rpa', 'RPA_QIANNIU', 'conn'], lookup), [
      { kind: 'dependency', path: QIANNIU_AUTH, mode: 'link', badge: DEP_BADGE },
    ]);
  });

  it('fills default mode per kind', () => {
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

  it('fills default four-character badges and keeps custom badge / prompt', () => {
    const lookup = lookupFrom({
      page: [
        {
          kind: 'dependency',
          path: QIANNIU_AUTH,
          badge: { label: '  授权依赖  ', color: '#16A34A' },
          prompt: { label: '  请提前完成授权配置  ', type: 'warning' },
        },
        { kind: 'fallback', path: CMA, prompt: { label: '   ' } },
      ],
    });
    assert.deepEqual(resolveReferencesWith(['page'], lookup), [
      {
        kind: 'dependency',
        path: QIANNIU_AUTH,
        mode: 'summary',
        badge: { label: '授权依赖', color: '#16A34A' },
        prompt: { label: '请提前完成授权配置', type: 'warning' },
      },
      { kind: 'fallback', path: CMA, mode: 'summary', badge: FALL_BADGE },
    ]);
  });

  it('defaults prompt type to info when omitted', () => {
    const lookup = lookupFrom({
      page: [{ kind: 'dependency', path: QIANNIU_AUTH, prompt: { label: '注意登录态' } }],
    });
    assert.deepEqual(resolveReferencesWith(['page'], lookup), [
      {
        kind: 'dependency',
        path: QIANNIU_AUTH,
        mode: 'summary',
        badge: DEP_BADGE,
        prompt: { label: '注意登录态', type: 'info' },
      },
    ]);
  });
});

describe('referencesSchema', () => {
  it('accepts both inherit spellings and well-formed edges', () => {
    assert.equal(referencesSchema.safeParse(undefined).success, true);
    assert.equal(referencesSchema.safeParse('inherit').success, true);
    assert.equal(referencesSchema.safeParse([{ inherit: true }]).success, true);
    assert.equal(
      referencesSchema.safeParse([
        { kind: 'dependency', path: QIANNIU_AUTH, prompt: AUTH_PROMPT },
        { kind: 'fallback', path: CMA, mode: 'summary' },
      ]).success,
      true,
    );
  });

  it('rejects off-site paths, the access gate, and unknown enum values', () => {
    const bad = [
      [{ kind: 'dependency', path: 'https://example.com/docs/x' }],
      [{ kind: 'dependency', path: '/mcp' }],
      [{ kind: 'dependency', path: '/docs/access' }],
      [{ kind: 'auth', path: QIANNIU_AUTH }],
      [{ kind: 'dependency', path: QIANNIU_AUTH, mode: 'art' }],
      [{ kind: 'dependency', path: QIANNIU_AUTH, mode: 'richcard' }],
      [{ kind: 'dependency', path: QIANNIU_AUTH, tips: '旧字段' }],
      ['inherit'],
    ];
    for (const value of bad) {
      assert.equal(referencesSchema.safeParse(value).success, false, JSON.stringify(value));
    }
  });

  it('accepts optional badge and prompt within length caps', () => {
    assert.equal(
      referencesSchema.safeParse([
        {
          kind: 'dependency',
          path: QIANNIU_AUTH,
          badge: { label: '授权依赖', color: '#16A34A' },
          prompt: { label: '请提前完成授权配置', type: 'warning' },
        },
      ]).success,
      true,
    );
    assert.equal(
      referencesSchema.safeParse([
        { kind: 'dependency', path: QIANNIU_AUTH, prompt: { label: 'x'.repeat(81) } },
      ]).success,
      false,
    );
    assert.equal(
      referencesSchema.safeParse([
        { kind: 'dependency', path: QIANNIU_AUTH, badge: { color: 'green' } },
      ]).success,
      false,
    );
  });
});

describe('buildBacklinks', () => {
  it('indexes explicit edges by target and sorts referrers by title', () => {
    const map = buildBacklinks([
      { url: '/docs/rpa/RPA_SYCM', title: '生意参谋', explicitPaths: [QIANNIU_AUTH] },
      { url: '/docs/rpa/RPA_QIANNIU', title: '千牛', icon: 'QIANNIU', explicitPaths: [QIANNIU_AUTH] },
      { url: '/docs/rpa/RPA_UNIVERSAL/nmc', title: '中央气象台7天预报', explicitPaths: [CMA] },
    ]);

    assert.deepEqual(map.get(QIANNIU_AUTH), [
      { url: '/docs/rpa/RPA_QIANNIU', title: '千牛', icon: 'QIANNIU' },
      { url: '/docs/rpa/RPA_SYCM', title: '生意参谋' },
    ]);
    assert.deepEqual(map.get(CMA), [
      { url: '/docs/rpa/RPA_UNIVERSAL/nmc', title: '中央气象台7天预报' },
    ]);
  });

  it('ignores inherit-derived edges because callers only pass explicit ones', () => {
    // 连接器页 inherit 到千牛授权，但 explicitPaths 为空 → 不进反查
    const map = buildBacklinks([
      { url: '/docs/rpa/RPA_QIANNIU', title: '千牛', explicitPaths: [QIANNIU_AUTH] },
      { url: '/docs/rpa/RPA_QIANNIU/conn-a', title: '连接器A', explicitPaths: [] },
      { url: '/docs/rpa/RPA_QIANNIU/conn-b', title: '连接器B', explicitPaths: [] },
    ]);
    assert.deepEqual(map.get(QIANNIU_AUTH), [{ url: '/docs/rpa/RPA_QIANNIU', title: '千牛' }]);
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
