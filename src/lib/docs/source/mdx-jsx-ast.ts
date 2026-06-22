/** Build ESTree literal/object/array nodes for MDX JSX attribute expressions. */
function stripUndefinedForJsx(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => stripUndefinedForJsx(item));
  }

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (val === undefined) continue;
    out[key] = stripUndefinedForJsx(val);
  }
  return out;
}

export function valueToEstree(value: unknown): object {
  if (value === null) return { type: 'Literal', value: null };
  if (typeof value === 'boolean') return { type: 'Literal', value };
  if (typeof value === 'number') return { type: 'Literal', value };
  if (typeof value === 'string') return { type: 'Literal', value };

  if (Array.isArray(value)) {
    return {
      type: 'ArrayExpression',
      elements: value
        .filter((v) => v !== undefined)
        .map((v) => valueToEstree(v)),
    };
  }

  if (typeof value === 'object') {
    return {
      type: 'ObjectExpression',
      properties: Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => ({
          type: 'Property',
          key: { type: 'Identifier', name: k },
          value: valueToEstree(v),
          kind: 'init',
          method: false,
          shorthand: false,
          computed: false,
        })),
    };
  }

  throw new Error(`Unsupported value for MDX JSX expression: ${typeof value}`);
}

export function jsxExpressionAttribute(name: string, value: unknown) {
  const sanitized = stripUndefinedForJsx(value);
  return {
    type: 'mdxJsxAttribute',
    name,
    value: {
      type: 'mdxJsxAttributeValueExpression',
      value: JSON.stringify(sanitized),
      data: {
        estree: {
          type: 'Program',
          body: [
            {
              type: 'ExpressionStatement',
              expression: valueToEstree(sanitized),
            },
          ],
          sourceType: 'module',
        },
      },
    },
  };
}

export function jsxStringAttribute(name: string, value: string) {
  return {
    type: 'mdxJsxAttribute',
    name,
    value,
  };
}

export function jsxBooleanAttribute(name: string, value: boolean) {
  if (!value) return null;
  return jsxExpressionAttribute(name, value);
}
