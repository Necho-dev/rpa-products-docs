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

  it('resolves platform code to borderless favicon tile', () => {
    const el = resolveDocIcon('ICO_QIANNIU');
    assert.ok(el);
    assert.equal(isValidElement(el), true);
    assert.equal(el!.type, 'span');
    const props = el!.props as { className?: string; 'data-platform-icon'?: string };
    const className = String(props.className ?? '');
    assert.equal(props['data-platform-icon'], '');
    assert.match(className, /--docs-sidebar-icon/);
    assert.match(className, /\bp-0\b/);
    assert.doesNotMatch(className, /p-0\.5/);
    assert.match(className, /rounded-\[4px\]/);
    assert.match(className, /bg-fd-muted\/70/);
    assert.match(className, /box-border/);
    assert.doesNotMatch(className, /(?:^|\s)border(?:\/|\s|$)/);
    assert.match(className, /\bshrink-0\b/);

    const children = (el!.props as { children?: unknown }).children;
    assert.ok(isValidElement(children));
    assert.equal(children!.type, 'img');
    assert.equal(
      (children!.props as { src: string }).src,
      '/resources/images/_public/_shared/platform/files/ICO_QIANNIU.png',
    );
  });

  it('inlines platform SVG instead of img', () => {
    const el = resolveDocIcon('ICO_DEWU');
    assert.ok(el);
    assert.equal(el!.type, 'span');
    const props = el!.props as {
      className?: string;
      dangerouslySetInnerHTML?: { __html: string };
    };
    assert.doesNotMatch(String(props.className), /scale-\[/);
    assert.match(String(props.className), /bg-fd-muted\/70/);
    assert.match(props.dangerouslySetInnerHTML?.__html ?? '', /<svg\b/);
    assert.match(props.dangerouslySetInnerHTML?.__html ?? '', /geometricPrecision/);
    assert.equal((el!.props as { children?: unknown }).children, undefined);
  });

  it('does not resolve RPA_ or bare platform CODE', () => {
    assert.equal(resolveDocIcon('RPA_QIANNIU'), undefined);
    assert.equal(resolveDocIcon('QIANNIU'), undefined);
    assert.equal(resolveDocIcon('ALI1688'), undefined);
  });

  it('returns undefined for unknown Lucide / code', () => {
    assert.equal(resolveDocIcon('NotARealIcon_XYZ'), undefined);
    assert.equal(resolveDocIcon('RPA_NOT_EXIST'), undefined);
  });

  it('returns undefined when icon is undefined', () => {
    assert.equal(resolveDocIcon(undefined), undefined);
  });
});
