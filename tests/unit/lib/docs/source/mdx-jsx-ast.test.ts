import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { jsxExpressionAttribute, valueToEstree } from '@/lib/docs/source/mdx-jsx-ast';

describe('valueToEstree', () => {
  it('skips undefined object properties', () => {
    const tree = valueToEstree({
      taobao: { label: '淘宝 / 天猫', icon: undefined },
    }) as { properties: unknown[] };

    assert.equal(tree.properties.length, 1);
  });

  it('skips undefined array elements', () => {
    const tree = valueToEstree(['connectors', undefined, 'x']) as {
      elements: unknown[];
    };

    assert.equal(tree.elements.length, 2);
  });
});

describe('jsxExpressionAttribute', () => {
  it('sanitizes nested undefined before building estree', () => {
    const attr = jsxExpressionAttribute('groups', {
      taobao: { label: '淘宝 / 天猫', icon: undefined },
    }) as {
      value: { data: { estree: { body: { expression: { properties: unknown[] } }[] } } };
    };

    const props =
      attr.value.data.estree.body[0]!.expression.properties;
    const taobao = props[0] as { value: { properties: unknown[] } };
    assert.equal(taobao.value.properties.length, 1);
  });
});
