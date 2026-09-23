import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import GithubSlugger from 'github-slugger';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

export const HTTP_METHODS = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];

const httpMethodSchema = z
  .string()
  .trim()
  .min(1)
  .transform((value) => value.toLowerCase())
  .refine((value): value is HttpMethod =>
    (HTTP_METHODS as readonly string[]).includes(value),
  );

export const apiPageOperationObjectSchema = z.object({
  path: z.string().trim().min(1),
  method: httpMethodSchema,
});

export const apiPageWebhookSchema = z.object({
  name: z.string().trim().min(1),
  method: httpMethodSchema,
});

const operationRefSchema = z.union([
  z.string().trim().min(1),
  apiPageOperationObjectSchema,
]);

const tagsInputSchema = z
  .union([z.string().trim().min(1), z.array(z.string().trim().min(1))])
  .optional();

export const apiPageDirectiveSchema = z
  .object({
    document: z.string().trim().min(1),
    tag: z.string().trim().min(1).optional(),
    tags: tagsInputSchema,
    operations: z.preprocess(
      (value) => (value == null ? [] : value),
      z.array(operationRefSchema),
    ),
    webhooks: z.preprocess(
      (value) => (value == null ? [] : value),
      z.array(z.union([z.string().trim().min(1), apiPageWebhookSchema])),
    ),
    showTitle: z.boolean().optional(),
    showDescription: z.boolean().optional(),
    playground: z.boolean().optional(),
    showExample: z.boolean().optional(),
    headingLevel: z.coerce.number().int().min(2).max(6).optional(),
    server: z.string().trim().min(1).optional(),
    proxy: z.union([z.boolean(), z.string().trim().min(1)]).optional(),
  })
  .superRefine((value, ctx) => {
    if (!isAllowedOpenApiDocument(value.document)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['document'],
        message:
          'document 只能是 http(s) URL, 或仓库内相对路径(相对当前 md 或仓库根, 文件类型: .json / .yaml / .yml)',
      });
    }
    const tags = normalizeTags(value.tag, value.tags);
    const hasOps = Boolean(value.operations?.length);
    const hasHooks = Boolean(value.webhooks?.length);
    if (!hasOps && tags.length === 0 && !hasHooks) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '须配置 operations、tag/tags 或 webhooks 之一',
      });
    }
  });

export type ApiPageDirective = z.infer<typeof apiPageDirectiveSchema>;

export type OperationItem = { path: string; method: HttpMethod };
export type WebhookItem = { name: string; method: HttpMethod };

export function normalizeTags(
  tag?: string,
  tags?: string | string[],
): string[] {
  const list: string[] = [];
  if (tag) list.push(tag);
  if (typeof tags === 'string') list.push(tags);
  else if (Array.isArray(tags)) list.push(...tags);
  return [...new Set(list.map((item) => item.trim()).filter(Boolean))];
}

/** 与 fumadocs-openapi `idToTitle` 一致 */
export function idToTitle(id: string): string {
  let result: string[] = [];
  for (const c of id) {
    if (result.length === 0) result.push(c.toLocaleUpperCase());
    else if (c === '.') result = [];
    else if (/^[A-Z]$/.test(c) && result.at(-1) !== ' ') result.push(' ', c);
    else if (c === '-') result.push(' ');
    else result.push(c);
  }
  return result.join('');
}

const OPENAPI_DOCUMENT_EXTS = new Set(['.json', '.yaml', '.yml']);

export function isHttpOpenApiDocumentUrl(document: string): boolean {
  try {
    const url = new URL(document);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isRepoRelativeOpenApiDocument(document: string): boolean {
  const trimmed = document.trim();
  if (!trimmed || path.isAbsolute(trimmed) || /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return false;
  }
  return OPENAPI_DOCUMENT_EXTS.has(path.extname(trimmed).toLowerCase());
}

export function isAllowedOpenApiDocument(document: string): boolean {
  return isHttpOpenApiDocumentUrl(document) || isRepoRelativeOpenApiDocument(document);
}

export type ResolvedOpenApiDocument =
  | { kind: 'url'; href: string }
  | { kind: 'file'; absPath: string; document: string };

export function resolveOpenApiDocument(
  document: string,
  fromFile?: string,
): ResolvedOpenApiDocument {
  if (isHttpOpenApiDocumentUrl(document)) {
    return { kind: 'url', href: document.trim() };
  }
  const absPath = resolveOpenApiDocumentPath(document, fromFile);
  return { kind: 'file', absPath, document: toRepoRelativeOpenApiPath(absPath) };
}

export function resolveOpenApiDocumentPath(document: string, fromFile?: string): string {
  if (!isRepoRelativeOpenApiDocument(document)) {
    throw new Error(
      `document 只能是仓库内相对路径(相对当前 md 或仓库根, 文件类型: .json / .yaml / .yml): ${document}`,
    );
  }

  const root = process.cwd();
  const candidates: string[] = [];
  if (fromFile) {
    candidates.push(path.resolve(path.dirname(fromFile), document));
  }
  candidates.push(path.resolve(root, document));

  for (const candidate of candidates) {
    const rel = path.relative(root, candidate);
    if (rel.startsWith('..') || path.isAbsolute(rel)) continue;
    if (existsSync(candidate)) return candidate;
  }

  throw new Error(`OpenAPI document file not found: ${document}`);
}

export function toRepoRelativeOpenApiPath(absPath: string): string {
  const rel = path.relative(process.cwd(), absPath).split(path.sep).join('/');
  return rel.startsWith('.') ? rel : `./${rel}`;
}

type OpenApiOperationLike = {
  summary?: unknown;
  operationId?: unknown;
  tags?: unknown;
};

type PathItemLike = Record<string, OpenApiOperationLike | undefined>;

export type OpenApiDocumentLike = {
  paths?: Record<string, PathItemLike | undefined>;
  webhooks?: Record<string, PathItemLike | undefined>;
};

export function operationHeadingTitle(
  operation: OpenApiOperationLike | undefined,
  fallback: string,
): string {
  const summary = typeof operation?.summary === 'string' ? operation.summary.trim() : '';
  if (summary) return summary;
  const operationId =
    typeof operation?.operationId === 'string' ? operation.operationId.trim() : '';
  if (operationId) return idToTitle(operationId);
  return fallback;
}

function parseOpenApiObject(source: string, raw: string): OpenApiDocumentLike {
  const ext = isHttpOpenApiDocumentUrl(source)
    ? path.extname(new URL(source).pathname).toLowerCase()
    : path.extname(source).toLowerCase();
  const looksYaml =
    ext === '.yaml' ||
    ext === '.yml' ||
    (!ext && /^\s*[{[]/.test(raw) === false);
  let parsed: unknown;
  try {
    parsed = looksYaml && ext !== '.json' ? parseYaml(raw) : JSON.parse(raw);
  } catch {
    parsed = parseYaml(raw);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${source}: OpenAPI document must be a JSON/YAML object`);
  }
  return parsed as OpenApiDocumentLike;
}

export function readOpenApiDocument(filePath: string): OpenApiDocumentLike {
  return parseOpenApiObject(filePath, readFileSync(filePath, 'utf8'));
}

export async function fetchOpenApiDocument(url: string): Promise<OpenApiDocumentLike> {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`OpenAPI document fetch failed: ${url} (${response.status})`);
  }
  return parseOpenApiObject(url, await response.text());
}

export async function loadOpenApiDocument(
  resolved: ResolvedOpenApiDocument,
): Promise<OpenApiDocumentLike> {
  if (resolved.kind === 'url') return fetchOpenApiDocument(resolved.href);
  return readOpenApiDocument(resolved.absPath);
}

function isHttpMethod(value: string): value is HttpMethod {
  return (HTTP_METHODS as readonly string[]).includes(value);
}

function operationTags(operation: OpenApiOperationLike | undefined): string[] {
  if (!Array.isArray(operation?.tags)) return [];
  return operation.tags.filter((item): item is string => typeof item === 'string');
}

function operationIdOf(operation: OpenApiOperationLike | undefined): string | undefined {
  return typeof operation?.operationId === 'string' ? operation.operationId.trim() : undefined;
}

export function listPathOperations(
  document: OpenApiDocumentLike,
): Array<OperationItem & { operation?: OpenApiOperationLike; tags: string[]; operationId?: string }> {
  const out: Array<
    OperationItem & { operation?: OpenApiOperationLike; tags: string[]; operationId?: string }
  > = [];
  for (const [pathKey, pathItem] of Object.entries(document.paths ?? {})) {
    if (!pathItem) continue;
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation) continue;
      out.push({
        path: pathKey,
        method,
        operation,
        tags: operationTags(operation),
        operationId: operationIdOf(operation),
      });
    }
  }
  return out;
}

export function listWebhookOperations(
  document: OpenApiDocumentLike,
): Array<WebhookItem & { operation?: OpenApiOperationLike; tags: string[]; operationId?: string }> {
  const out: Array<
    WebhookItem & { operation?: OpenApiOperationLike; tags: string[]; operationId?: string }
  > = [];
  for (const [name, pathItem] of Object.entries(document.webhooks ?? {})) {
    if (!pathItem) continue;
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation) continue;
      out.push({
        name,
        method,
        operation,
        tags: operationTags(operation),
        operationId: operationIdOf(operation),
      });
    }
  }
  return out;
}

function opKey(item: OperationItem): string {
  return `${item.method}:${item.path}`;
}

function hookKey(item: WebhookItem): string {
  return `${item.method}:${item.name}`;
}

export function resolveApiPageSelection(
  document: OpenApiDocumentLike,
  directive: ApiPageDirective,
  filePath: string,
): { operations: OperationItem[]; webhooks: WebhookItem[] } {
  const allOps = listPathOperations(document);
  const allHooks = listWebhookOperations(document);
  const tags = normalizeTags(directive.tag, directive.tags);

  const operations: OperationItem[] = [];
  const seenOps = new Set<string>();
  const pushOp = (item: OperationItem) => {
    const key = opKey(item);
    if (seenOps.has(key)) return;
    seenOps.add(key);
    operations.push({ path: item.path, method: item.method });
  };

  const webhooks: WebhookItem[] = [];
  const seenHooks = new Set<string>();
  const pushHook = (item: WebhookItem) => {
    const key = hookKey(item);
    if (seenHooks.has(key)) return;
    seenHooks.add(key);
    webhooks.push({ name: item.name, method: item.method });
  };

  if (tags.length > 0) {
    for (const item of allOps) {
      if (item.tags.some((tag) => tags.includes(tag))) pushOp(item);
    }
    for (const item of allHooks) {
      if (item.tags.some((tag) => tags.includes(tag))) pushHook(item);
    }
    if (operations.length === 0 && webhooks.length === 0) {
      throw new Error(`${filePath}: no operations/webhooks for tag(s): ${tags.join(', ')}`);
    }
  }

  for (const ref of directive.operations ?? []) {
    if (typeof ref === 'string') {
      const found = allOps.find((item) => item.operationId === ref);
      if (!found) {
        throw new Error(`${filePath}: operationId not found: ${ref}`);
      }
      pushOp(found);
      continue;
    }
    const found = allOps.find(
      (item) => item.path === ref.path && item.method === ref.method,
    );
    if (!found) {
      throw new Error(`${filePath}: OpenAPI ${ref.method.toUpperCase()} ${ref.path} not found`);
    }
    pushOp(found);
  }

  for (const ref of directive.webhooks ?? []) {
    if (typeof ref === 'string') {
      const found = allHooks.find((item) => item.operationId === ref || item.name === ref);
      if (!found) {
        throw new Error(`${filePath}: webhook not found: ${ref}`);
      }
      pushHook(found);
      continue;
    }
    const found = allHooks.find(
      (item) => item.name === ref.name && item.method === ref.method,
    );
    if (!found) {
      throw new Error(
        `${filePath}: webhook ${ref.method.toUpperCase()} ${ref.name} not found`,
      );
    }
    pushHook(found);
  }

  if (operations.length === 0 && webhooks.length === 0) {
    throw new Error(`${filePath}: :::api-page resolved empty operations and webhooks`);
  }

  return { operations, webhooks };
}

export type ApiPageTocHeading = {
  title: string;
  id: string;
  depth: 2 | 3 | 4 | 5 | 6;
};

export function buildApiPageTocHeadings(
  document: OpenApiDocumentLike,
  selection: { operations: OperationItem[]; webhooks: WebhookItem[] },
  headingLevel = 2,
): ApiPageTocHeading[] {
  const slugger = new GithubSlugger();
  const depth = headingLevel as ApiPageTocHeading['depth'];
  const headings: ApiPageTocHeading[] = [];

  for (const item of selection.operations) {
    const operation = document.paths?.[item.path]?.[item.method];
    const title = operationHeadingTitle(operation, item.path);
    headings.push({ title, id: slugger.slug(title), depth });
  }

  for (const item of selection.webhooks) {
    const operation = document.webhooks?.[item.name]?.[item.method];
    const title = operationHeadingTitle(operation, item.name);
    headings.push({ title, id: slugger.slug(title), depth });
  }

  return headings;
}

export { isHttpMethod };
