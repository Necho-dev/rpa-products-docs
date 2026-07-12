import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  loginOptionsSchema,
  normalizeLoginOptions,
} from '@/lib/docs/source/remark-mdx-doc-blocks';

describe('normalizeLoginOptions', () => {
  it('expands object text / type / custom icon items', () => {
    const parsed = loginOptionsSchema.parse([
      { text: '账号密码' },
      { type: 'sms' },
      { text: '钉钉扫码', icon: 'QrCode' },
      {
        text: '企业微信',
        icon: 'MessageSquareText',
        color: '#07c160',
      },
    ]);
    assert.deepEqual(normalizeLoginOptions(parsed), [
      { text: '账号密码' },
      { text: '短信验证码', icon: 'MessageSquareText' },
      { text: '钉钉扫码', icon: 'QrCode' },
      {
        text: '企业微信',
        icon: 'MessageSquareText',
        color: '#07c160',
      },
    ]);
  });

  it('supports string shorthand for text and builtins', () => {
    const parsed = loginOptionsSchema.parse(['账号密码', 'sms']);
    assert.deepEqual(normalizeLoginOptions(parsed), [
      { text: '账号密码' },
      { text: '短信验证码', icon: 'MessageSquareText' },
    ]);
  });

  it('rejects items that set both text and type', () => {
    assert.throws(() =>
      loginOptionsSchema.parse([{ text: 'x', type: 'sms' }]),
    );
  });

  it('rejects builtin type with icon', () => {
    assert.throws(() =>
      loginOptionsSchema.parse([{ type: 'sms', icon: 'QrCode' }]),
    );
  });
});
