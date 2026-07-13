import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isValidElement } from 'react';
import { resolveDocIcon } from '@/lib/docs/source/doc-icons-plugin';

describe('resolveDocIcon', () => {
  it('resolves Lucide icon names', () => {
    const el = resolveDocIcon('LayoutDashboard');
    assert.ok(el);
    assert.equal(isValidElement(el), true);
  });

  it('resolves platform code to bordered favicon frame', () => {
    const el = resolveDocIcon('QIANNIU');
    assert.ok(el);
    assert.equal(isValidElement(el), true);
    assert.equal(el!.type, 'span');
    const className = String((el!.props as { className?: string }).className ?? '');
    assert.match(className, /\bsize-4\b/);
    assert.match(className, /\bborder\b/);
    assert.match(className, /\bshrink-0\b/);

    const children = (el!.props as { children?: unknown }).children;
    assert.ok(isValidElement(children));
    assert.equal(children!.type, 'img');
    assert.equal(
      (children!.props as { src: string }).src,
      '/resources/images/_public/_shared/platform/files/QIANNIU.png',
    );
  });

  it('returns undefined for unknown Lucide / code', () => {
    assert.equal(resolveDocIcon('NotARealIcon_XYZ'), undefined);
    assert.equal(resolveDocIcon('RPA_NOT_EXIST'), undefined);
  });

  it('returns undefined when icon is undefined', () => {
    assert.equal(resolveDocIcon(undefined), undefined);
  });
});
