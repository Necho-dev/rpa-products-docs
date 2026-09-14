import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getPublicSiteUrlIfSet,
  getSiteDescription,
  getSiteName,
  getKnowledgeSkillName,
} from '../src/lib/core/knowledge-env';

function withEnv(pairs: Record<string, string | undefined>, run: () => void): void {
  const prev: Record<string, string | undefined> = {};
  for (const key of Object.keys(pairs)) {
    prev[key] = process.env[key];
    const next = pairs[key];
    if (next === undefined) delete process.env[key];
    else process.env[key] = next;
  }
  try {
    run();
  } finally {
    for (const [key, value] of Object.entries(prev)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

describe('knowledge-env', () => {
  it('prefers KNOWLEDGE_SITE_URL over NEXT_PUBLIC_SITE_URL', () => {
    withEnv(
      {
        KNOWLEDGE_SITE_URL: 'https://knowledge.example/',
        NEXT_PUBLIC_SITE_URL: 'https://legacy.example',
      },
      () => {
        assert.equal(getPublicSiteUrlIfSet(), 'https://knowledge.example');
      },
    );
  });

  it('falls back to NEXT_PUBLIC_SITE_URL when KNOWLEDGE_ is unset', () => {
    withEnv(
      {
        KNOWLEDGE_SITE_URL: undefined,
        NEXT_PUBLIC_SITE_URL: 'https://legacy.example/',
      },
      () => {
        assert.equal(getPublicSiteUrlIfSet(), 'https://legacy.example');
      },
    );
  });

  it('returns undefined when neither site URL is set', () => {
    withEnv(
      {
        KNOWLEDGE_SITE_URL: undefined,
        NEXT_PUBLIC_SITE_URL: undefined,
      },
      () => {
        assert.equal(getPublicSiteUrlIfSet(), undefined);
      },
    );
  });

  it('prefers KNOWLEDGE_SITE_NAME', () => {
    withEnv(
      {
        KNOWLEDGE_SITE_NAME: '知识库',
        NEXT_PUBLIC_SITE_NAME: '旧名',
      },
      () => {
        assert.equal(getSiteName(), '知识库');
        assert.ok(getSiteDescription().includes('知识库'));
      },
    );
  });

  it('reads KNOWLEDGE_SKILL_NAME before NEXT_PUBLIC_SKILL_NAME', () => {
    withEnv(
      {
        KNOWLEDGE_SKILL_NAME: 'new-skill',
        NEXT_PUBLIC_SKILL_NAME: 'old-skill',
      },
      () => {
        assert.equal(getKnowledgeSkillName(), 'new-skill');
      },
    );
  });
});
