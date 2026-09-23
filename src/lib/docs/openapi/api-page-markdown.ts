import {
  operationHeadingTitle,
  type HttpMethod,
  type OpenApiDocumentLike,
  type OperationItem,
  type WebhookItem,
} from '@/lib/docs/openapi/api-page-directive';

type Json = Record<string, unknown>;

type ApiDocument = OpenApiDocumentLike & {
  servers?: Array<{ url?: unknown; description?: unknown }>;
  components?: {
    schemas?: Record<string, Json>;
    securitySchemes?: Record<string, Json>;
  };
};

export type RenderApiPageMarkdownOptions = {
  document: OpenApiDocumentLike;
  selection: { operations: OperationItem[]; webhooks: WebhookItem[] };
  server?: string;
  showTitle?: boolean;
  showDescription?: boolean;
  showExample?: boolean;
  headingLevel?: number;
};

function asRecord(value: unknown): Json | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as Json;
}

function heading(level: number, text: string): string {
  const depth = Math.min(6, Math.max(1, level));
  return `${'#'.repeat(depth)} ${text}`;
}

function cell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
}

function refName(ref: string): string {
  const name = ref.split('/').pop();
  return name || ref;
}

function resolveSchema(schema: Json, document: ApiDocument, seen = new Set<string>()): Json {
  const ref = schema.$ref;
  if (typeof ref !== 'string') return schema;
  if (seen.has(ref)) return { title: refName(ref) };
  const name = refName(ref);
  const target = document.components?.schemas?.[name];
  if (!target) return { title: name };
  const next = new Set(seen);
  next.add(ref);
  return resolveSchema(target, document, next);
}

function formatType(schema: Json | undefined, document: ApiDocument): string {
  if (!schema) return '';
  if (typeof schema.$ref === 'string') return refName(schema.$ref);

  const anyOf = schema.anyOf ?? schema.oneOf;
  if (Array.isArray(anyOf)) {
    const parts = anyOf
      .map((item) => formatType(asRecord(item), document))
      .filter(Boolean);
    return [...new Set(parts)].join(' | ');
  }

  if (schema.type === 'array') {
    const item = formatType(asRecord(schema.items), document) || 'any';
    return `${item}[]`;
  }

  if (Array.isArray(schema.enum) && schema.enum.length > 0 && schema.enum.length <= 8) {
    return schema.enum.map((item) => JSON.stringify(item)).join(' | ');
  }

  if (typeof schema.type === 'string') {
    return schema.format ? `${schema.type} (${schema.format})` : schema.type;
  }

  if (schema.properties) return 'object';
  if (typeof schema.title === 'string') return schema.title;
  return 'any';
}

function schemaDescription(schema: Json | undefined): string {
  if (!schema || typeof schema.description !== 'string') return '';
  return schema.description.trim();
}

function fieldTable(schema: Json, document: ApiDocument): string | undefined {
  const resolved = resolveSchema(schema, document);
  const properties = asRecord(resolved.properties);
  if (!properties) return undefined;
  const required = new Set(
    Array.isArray(resolved.required)
      ? resolved.required.filter((item): item is string => typeof item === 'string')
      : [],
  );
  const rows = Object.entries(properties).map(([name, raw]) => {
    const field = asRecord(raw) ?? {};
    return `| ${cell(name)} | ${cell(formatType(field, document))} | ${required.has(name) ? '是' : '否'} | ${cell(schemaDescription(field))} |`;
  });
  if (rows.length === 0) return undefined;
  return ['| 字段 | 类型 | 必填 | 说明 |', '| --- | --- | --- | --- |', ...rows].join('\n');
}

function exampleBlock(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  const body = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  if (!body.trim()) return undefined;
  const fence = body.includes('```') ? '~~~~' : '```';
  return `${fence}json\n${body}\n${fence}`;
}

function mediaExample(media: Json): unknown {
  if ('example' in media) return media.example;
  const examples = asRecord(media.examples);
  if (!examples) return undefined;
  for (const item of Object.values(examples)) {
    const record = asRecord(item);
    if (record && 'value' in record) return record.value;
  }
  return undefined;
}

function renderContent(
  content: unknown,
  document: ApiDocument,
  showExample: boolean,
): string[] {
  const record = asRecord(content);
  if (!record) return [];
  const blocks: string[] = [];
  for (const [mediaType, raw] of Object.entries(record)) {
    const media = asRecord(raw);
    if (!media) continue;
    blocks.push(`\`${mediaType}\``);
    const schema = asRecord(media.schema);
    if (schema) {
      const resolved = resolveSchema(schema, document);
      const description = schemaDescription(resolved);
      if (description) blocks.push(description);
      const table = fieldTable(schema, document);
      if (table) blocks.push(table);
      else if (!resolved.properties) {
        blocks.push(`类型：\`${formatType(resolved, document)}\``);
      }
    }
    if (showExample) {
      const example = exampleBlock(mediaExample(media) ?? asRecord(media.schema)?.example);
      if (example) blocks.push(example);
    }
  }
  return blocks;
}

function renderParameters(parameters: unknown, document: ApiDocument): string | undefined {
  if (!Array.isArray(parameters) || parameters.length === 0) return undefined;
  const rows: string[] = [];
  for (const raw of parameters) {
    const param = asRecord(raw);
    if (!param || typeof param.name !== 'string') continue;
    const schema = asRecord(param.schema);
    const where = typeof param.in === 'string' ? param.in : '';
    const description =
      typeof param.description === 'string' ? param.description : schemaDescription(schema);
    rows.push(
      `| ${cell(param.name)} | ${cell(where)} | ${cell(formatType(schema, document))} | ${param.required === true ? '是' : '否'} | ${cell(description)} |`,
    );
  }
  if (rows.length === 0) return undefined;
  return ['| 名称 | 位置 | 类型 | 必填 | 说明 |', '| --- | --- | --- | --- | --- |', ...rows].join('\n');
}

function securityLine(security: unknown, document: ApiDocument): string | undefined {
  if (!Array.isArray(security) || security.length === 0) return undefined;
  const names: string[] = [];
  for (const item of security) {
    const record = asRecord(item);
    if (!record) continue;
    for (const name of Object.keys(record)) {
      const scheme = document.components?.securitySchemes?.[name];
      const schemeName = scheme && typeof scheme.scheme === 'string' ? scheme.scheme : '';
      const type = scheme && typeof scheme.type === 'string' ? scheme.type : '';
      const detail = [type, schemeName].filter(Boolean).join(' ');
      names.push(detail ? `${name} (${detail})` : name);
    }
  }
  if (names.length === 0) return undefined;
  return names.join('、');
}

function serverLine(document: ApiDocument, override?: string): string | undefined {
  if (override) return override;
  const urls = (document.servers ?? [])
    .map((item) => (typeof item.url === 'string' ? item.url.trim() : ''))
    .filter(Boolean);
  if (urls.length === 0) return undefined;
  return urls.join('、');
}

function renderOperation(options: {
  title: string;
  method: HttpMethod;
  target: string;
  kind: 'http' | 'webhook';
  operation: Json | undefined;
  document: ApiDocument;
  showTitle: boolean;
  showDescription: boolean;
  showExample: boolean;
  headingLevel: number;
}): string {
  const lines: string[] = [];
  if (options.showTitle) lines.push(heading(options.headingLevel, options.title), '');
  const method = options.method.toUpperCase();
  const signature =
    options.kind === 'webhook'
      ? `WEBHOOK ${method} ${options.target}`
      : `${method} ${options.target}`;
  lines.push(`\`${signature}\``);

  const operation = options.operation;
  if (options.showDescription && typeof operation?.description === 'string') {
    const description = operation.description.trim();
    if (description) lines.push('', description);
  }
  if (typeof operation?.operationId === 'string' && operation.operationId.trim()) {
    lines.push('', `operationId: \`${operation.operationId.trim()}\``);
  }

  const section = options.headingLevel + 1;
  const auth = securityLine(operation?.security, options.document);
  if (auth) {
    lines.push('', heading(section, '鉴权'), '', auth);
  }

  const parameters = renderParameters(operation?.parameters, options.document);
  if (parameters) {
    lines.push('', heading(section, '参数'), '', parameters);
  }

  const requestBody = asRecord(operation?.requestBody);
  if (requestBody) {
    lines.push('', heading(section, '请求体'), '');
    if (requestBody.required === true) lines.push('必填。');
    if (options.showDescription && typeof requestBody.description === 'string') {
      const description = requestBody.description.trim();
      if (description) lines.push(description);
    }
    lines.push(...renderContent(requestBody.content, options.document, options.showExample));
  }

  const responses = asRecord(operation?.responses);
  if (responses && Object.keys(responses).length > 0) {
    lines.push('', heading(section, '响应'), '');
    for (const [status, raw] of Object.entries(responses)) {
      const response = asRecord(raw);
      if (!response) continue;
      const description =
        options.showDescription && typeof response.description === 'string'
          ? ` ${response.description.trim()}`
          : '';
      lines.push(`**${status}**${description}`);
      lines.push(...renderContent(response.content, options.document, options.showExample));
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * `llms.mdx` / MCP 用的接口说明。只展开本页选中的 operation / webhook，
 * 不保留 `:::api-page` 指令，也不输出 Playground。
 */
export function renderApiPageMarkdown(options: RenderApiPageMarkdownOptions): string {
  const document = options.document as ApiDocument;
  const showTitle = options.showTitle !== false;
  const showDescription = options.showDescription !== false;
  const showExample = options.showExample !== false;
  const headingLevel = options.headingLevel ?? 2;
  const blocks: string[] = [];

  const server = serverLine(document, options.server);
  if (server) blocks.push(`Server: \`${server}\``);

  for (const item of options.selection.operations) {
    const operation = asRecord(document.paths?.[item.path]?.[item.method]);
    blocks.push(
      renderOperation({
        title: operationHeadingTitle(operation, item.path),
        method: item.method,
        target: item.path,
        kind: 'http',
        operation,
        document,
        showTitle,
        showDescription,
        showExample,
        headingLevel,
      }),
    );
  }

  for (const item of options.selection.webhooks) {
    const operation = asRecord(document.webhooks?.[item.name]?.[item.method]);
    blocks.push(
      renderOperation({
        title: operationHeadingTitle(operation, item.name),
        method: item.method,
        target: item.name,
        kind: 'webhook',
        operation,
        document,
        showTitle,
        showDescription,
        showExample,
        headingLevel,
      }),
    );
  }

  return `${blocks.join('\n\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}
