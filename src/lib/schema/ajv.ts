/**
 * AJV v8 (Draft 2020-12) validator factory — lazy-loaded at runtime.
 *
 * Exported as plain async functions so callers can dynamic-import this module
 * only when the validation tab is first opened, keeping it out of the main bundle.
 */

export interface SchemaValidateResult {
  valid: boolean;
  data: Record<string, unknown>;
  errors: SchemaValidateError[];
}

export interface SchemaValidateError {
  /** JSON Pointer path, e.g. "/status_tab" or "" for root-level keywords */
  instancePath: string;
  /** AJV error keyword, e.g. "pattern", "dependentRequired", "enum" */
  keyword: string;
  /** Human-readable message from AJV */
  message: string;
  /** The field key extracted from instancePath (empty string = root) */
  field: string;
}

/** Strip keys whose value is "", null, or undefined — treats them as "not provided". */
export function stripEmptyValues(data: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== '' && v !== null && v !== undefined) {
      cleaned[k] = v;
    }
  }
  return cleaned;
}

/**
 * Parse and validate `data` against `schemaText`.
 * Strips empty-string values before validation so that optional fields with
 * `pattern` constraints don't produce false positives when left blank.
 */
export async function validateAgainstSchema(
  schemaText: string,
  data: Record<string, unknown>,
): Promise<SchemaValidateResult> {
  // Dynamic imports — not included in main bundle
  const [{ default: Ajv2020 }, { default: addFormats }] = await Promise.all([
    import('ajv/dist/2020'),
    import('ajv-formats'),
  ]);

  let schema: Record<string, unknown>;
  try {
    schema = JSON.parse(schemaText) as Record<string, unknown>;
  } catch {
    return {
      valid: false,
      data,
      errors: [
        {
          instancePath: '',
          keyword: 'parse',
          message: 'Schema 本身不是合法 JSON',
          field: '',
        },
      ],
    };
  }

  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);

  let validate: ReturnType<typeof ajv.compile>;
  try {
    validate = ajv.compile(schema);
  } catch (e) {
    return {
      valid: false,
      data,
      errors: [
        {
          instancePath: '',
          keyword: 'compile',
          message: `Schema 编译失败：${e instanceof Error ? e.message : String(e)}`,
          field: '',
        },
      ],
    };
  }

  const cleaned = stripEmptyValues(data);
  const valid = validate(cleaned) as boolean;

  if (valid) {
    return { valid: true, data: cleaned, errors: [] };
  }

  const errors: SchemaValidateError[] = (validate.errors ?? []).map((err) => {
    const instancePath = err.instancePath ?? '';
    // "/foo" → "foo"; "" stays ""
    const field = instancePath.startsWith('/') ? instancePath.slice(1) : instancePath;

    let message = err.message ?? '';

    // dependentRequired: AJV puts the dependent key in params.property and missing key in params.missingProperty
    if (err.keyword === 'dependentRequired') {
      const params = err.params as { property?: string; missingProperty?: string } | undefined;
      const dependent = params?.property ?? field;
      const missing = params?.missingProperty;
      if (dependent && missing) {
        message = `"${dependent}" 已填写时，"${missing}" 也必须填写（成对使用）`;
      } else if (missing) {
        message = `缺少必填字段 "${missing}"（与某字段成对使用）`;
      }
    }

    return { instancePath, keyword: err.keyword, message, field };
  });

  return { valid: false, data: cleaned, errors };
}
