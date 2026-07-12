import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readModuleFrontmatter } from '@/lib/docs/source/module-frontmatter';

describe('readModuleFrontmatter', () => {
  it('reads nested module config', () => {
    assert.deepEqual(
      readModuleFrontmatter({
        module: {
          title: '短标题',
          link: 'https://example.com',
          group: 'taobao',
          icon: { comp: 'Bot', color: '#0284c7' },
          cover: true,
        },
      }),
      {
        title: '短标题',
        link: 'https://example.com',
        group: 'taobao',
        icon: { comp: 'Bot', color: '#0284c7' },
        cover: true,
      },
    );
  });

  it('falls back to legacy flat fields', () => {
    assert.deepEqual(
      readModuleFrontmatter({
        moduleTitle: '旧标题',
        moduleUrl: 'https://legacy.example',
        moduleGroup: 'rpa',
        moduleIcon: 'KeyRound',
        moduleCover: false,
      }),
      {
        title: '旧标题',
        link: 'https://legacy.example',
        group: 'rpa',
        icon: { comp: 'KeyRound' },
        cover: false,
      },
    );
  });

  it('prefers nested module over legacy fields', () => {
    assert.equal(
      readModuleFrontmatter({
        moduleGroup: 'legacy',
        module: { group: 'nested' },
      }).group,
      'nested',
    );
  });
});
