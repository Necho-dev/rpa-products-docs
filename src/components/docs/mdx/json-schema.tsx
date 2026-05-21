'use client';

import { useState, useCallback, useRef } from 'react';
import { Check, Copy, FileDown, FileJson2, PanelTopClose, PanelTopOpen } from 'lucide-react';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import { cn } from '@/lib/core/cn';
import { downloadTextAsFile, safeWriteClipboard } from '@/lib/ui/code-block-utils';
import { shikiDocsThemes } from '@/lib/ui/shiki-docs-themes';
import {
  buildInitialFormData,
  SchemaForm,
  type FlatJsonSchema,
  type FormData,
} from './json-schema-form';
import type { SchemaValidateResult, SchemaValidateError } from '@/lib/schema/ajv';

// ── Shared icon button style — same as code-block-with-download ────────────────

const btnCls =
  'inline-flex items-center justify-center rounded-md p-1 text-sm transition-colors duration-100 hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring';

// svg inside these buttons must carry this class for consistent sizing
const iconCls = 'size-4';

// ── Validation result panel ────────────────────────────────────────────────────

function mapErrorToFieldName(
  schema: FlatJsonSchema,
  error: SchemaValidateError,
): string {
  const key = error.field || error.instancePath.replace(/^\//, '');
  if (!key) return '不满足完整性约束';
  const prop = schema.properties?.[key];
  const desc = prop?.description;
  if (desc) {
    // Use first clause of description (up to first Chinese comma / semicolon) as friendly name
    const short = desc.split(/[，,；;]/)[0].slice(0, 24);
    return `${key}（${short}）`;
  }
  return key;
}

function ValidationResult({
  result,
  schema,
}: {
  result: SchemaValidateResult;
  schema: FlatJsonSchema;
}) {
  const [copied, setCopied] = useState(false);
  const outputJson = JSON.stringify(result.data, null, 2);

  const handleCopy = () => {
    void safeWriteClipboard(outputJson).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (result.valid) {
    return (
      <div className="rounded-lg border border-green-500/30 bg-green-500/5 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-green-500/20 px-3 py-2">
          <span className="size-2 rounded-full bg-green-500" />
          <span className="flex-1 text-xs font-semibold text-green-700 dark:text-green-400">
            校验通过
          </span>
          <button
            type="button"
            title={copied ? '已复制' : '复制 JSON'}
            onClick={handleCopy}
            className={cn(btnCls, 'text-green-600 dark:text-green-400')}
          >
            {copied ? <Check className={iconCls} /> : <Copy className={iconCls} />}
          </button>
        </div>
        <pre className="overflow-x-auto px-3 py-2.5 font-mono text-[11px] leading-relaxed text-green-800 dark:text-green-300 whitespace-pre">
          {outputJson}
        </pre>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-red-400/30 bg-red-500/5 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-red-400/20 px-3 py-2">
        <span className="size-2 rounded-full bg-red-500" />
        <span className="text-xs font-semibold text-red-700 dark:text-red-400">
          校验失败（{result.errors.length} 个错误）
        </span>
      </div>
      <ul className="divide-y divide-red-400/10">
        {result.errors.map((err, i) => (
          <li key={i} className="px-3 py-2">
            <p className="text-xs font-medium text-red-700 dark:text-red-400">
              {mapErrorToFieldName(schema, err)}
            </p>
            <p className="mt-0.5 text-xs text-fd-muted-foreground">{err.message}</p>
            {err.keyword !== err.message && (
              <code className="mt-0.5 inline-block rounded bg-fd-muted/60 px-1 py-0.5 font-mono text-[10px] text-fd-muted-foreground">
                {err.keyword}
              </code>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function JsonSchema({
  schema: schemaText,
  defaultCollapsed = false,
}: {
  schema: string;
  /** 默认折叠，对应 json-schema 代码块 meta 中的 `collapsed` 关键字 */
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [tab, setTab] = useState<'schema' | 'validate'>('validate');
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState<FormData>(() => {
    try {
      const parsed = JSON.parse(schemaText) as FlatJsonSchema;
      return buildInitialFormData(parsed);
    } catch {
      return {};
    }
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<SchemaValidateResult | null>(null);

  // Keep AJV module cached after first load
  const ajvModuleRef = useRef<typeof import('@/lib/schema/ajv') | null>(null);

  const parsedSchema = useCallback((): FlatJsonSchema | null => {
    try {
      return JSON.parse(schemaText) as FlatJsonSchema;
    } catch {
      return null;
    }
  }, [schemaText]);

  const schema = parsedSchema();
  const isParseError = schema === null;

  const handleCopy = () => {
    void safeWriteClipboard(schemaText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Derive a safe filename from the schema title or fallback to "schema"
  const schemaFilename = (() => {
    const raw = schema?.title ?? 'schema';
    return raw.replace(/[^\w\u4e00-\u9fa5.-]/g, '_').slice(0, 60) || 'schema';
  })();

  const handleDownload = () => {
    downloadTextAsFile(schemaText, 'json', schemaFilename);
  };

  const handleFieldChange = useCallback((key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    // Clear per-field error on edit
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setResult(null);
  }, []);

  const handleValidate = async () => {
    setValidating(true);
    setFieldErrors({});
    setResult(null);

    try {
      if (!ajvModuleRef.current) {
        ajvModuleRef.current = await import('@/lib/schema/ajv');
      }
      const { validateAgainstSchema } = ajvModuleRef.current;
      const res = await validateAgainstSchema(schemaText, formData);

      // Build per-field error map for inline highlighting
      if (!res.valid) {
        const errs: Record<string, string> = {};
        for (const err of res.errors) {
          if (err.field && !errs[err.field]) {
            errs[err.field] = err.message;
          }
        }
        setFieldErrors(errs);
      }
      setResult(res);
    } finally {
      setValidating(false);
    }
  };

  return (
    <figure className="my-4 overflow-hidden rounded-xl border border-fd-border/70 bg-fd-card text-sm shadow-sm not-prose focus:outline-none">
      {/* ── Title bar — same structure & height as fumadocs CodeBlock titled header ── */}
      <div
        className="flex text-fd-muted-foreground items-center gap-2 border-fd-border/60 px-4"
        style={{
          height: '2.375rem',
          borderBottomWidth: collapsed ? 0 : 1,
          borderBottomStyle: 'solid',
        }}
      >
        <FileJson2 className="size-3.5 shrink-0" aria-hidden />

        {/* Lang badge */}
        <span className="shrink-0 rounded border border-fd-border/80 bg-fd-muted/60 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide">
          JSON SCHEMA
        </span>

        {/* Schema title — highlighted */}
        {schema?.title && (
          <figcaption className="min-w-0 flex-1 truncate">
            <span className="truncate text-xs font-semibold text-fd-muted-foreground">{schema.title}</span>
          </figcaption>
        )}
        {!schema?.title && <span className="flex-1" />}

        {/* Tab switchers (only when expanded and schema is valid) */}
        {!isParseError && !collapsed && (
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setTab('validate')}
              title="切换到校验模式"
              className={cn(
                'flex h-6 items-center rounded px-2 font-mono text-[10px] font-semibold tracking-wide transition-colors',
                tab === 'validate'
                  ? 'bg-fd-accent text-fd-accent-foreground'
                  : 'hover:text-fd-foreground',
              )}
            >
              在线校验
            </button>
            <button
              type="button"
              onClick={() => setTab('schema')}
              title="查看 Schema 定义"
              className={cn(
                'flex h-6 items-center rounded px-2 font-mono text-[10px] font-semibold tracking-wide transition-colors',
                tab === 'schema'
                  ? 'bg-fd-accent text-fd-accent-foreground'
                  : 'hover:text-fd-foreground',
              )}
            >
              查看定义
            </button>
            <div className="ms-1 h-3.5 w-px bg-fd-border/70" />
          </div>
        )}

        {/* Icon actions: Copy · Download · Collapse
            -me-2 exactly mirrors CodeBlock's Actions({ className: "-me-2" }) */}
        <div className="flex items-center -me-2">
          <button
            type="button"
            aria-label={copied ? '已复制' : '复制 Schema'}
            title={copied ? '已复制' : '复制 Schema'}
            onClick={handleCopy}
            className={btnCls}
          >
            {copied ? <Check className={iconCls} /> : <Copy className={iconCls} />}
          </button>

          <button
            type="button"
            aria-label="下载 JSON Schema 文件"
            title="下载 .json 文件"
            onClick={handleDownload}
            className={btnCls}
          >
            <FileDown className={iconCls} />
          </button>

          <button
            type="button"
            aria-label={collapsed ? '展开' : '折叠'}
            title={collapsed ? '展开' : '折叠'}
            onClick={() => setCollapsed((v) => !v)}
            className={btnCls}
          >
            {collapsed ? <PanelTopOpen className={iconCls} /> : <PanelTopClose className={iconCls} />}
          </button>
        </div>
      </div>

      {/* ── Body (hidden when collapsed) ── */}
      {!collapsed && (
        <>
          {/* Schema Tab */}
          {tab === 'schema' && (
            <div className="[&_.fd-codeblock]:my-0 [&_.fd-codeblock]:rounded-none [&_.fd-codeblock]:border-0 [&_.fd-codeblock]:shadow-none [&_.fd-codeblock]:ring-0">
              {isParseError ? (
                <div className="px-4 py-3 font-mono text-xs text-amber-700 dark:text-amber-400 bg-amber-500/8 border-b border-amber-500/20">
                  Schema 不是合法 JSON，已显示原始文本
                </div>
              ) : null}
              <DynamicCodeBlock
                lang="json"
                code={schemaText}
                options={{ themes: { ...shikiDocsThemes } }}
                codeblock={{ allowCopy: false, className: 'my-0 rounded-none border-0 shadow-none ring-0' }}
              />
            </div>
          )}

          {/* Validate Tab */}
          {tab === 'validate' && schema && (
            <div className="px-4 py-4 flex flex-col gap-4">

              {/* Form */}
              <SchemaForm
                schema={schema}
                formData={formData}
                fieldErrors={fieldErrors}
                onChange={handleFieldChange}
              />

              {/* Submit */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => void handleValidate()}
                  disabled={validating}
                  className="inline-flex items-center gap-1.5 rounded-md bg-fd-primary px-3 py-1.5 text-xs font-semibold text-fd-primary-foreground transition-colors hover:bg-fd-primary/80 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {validating ? (
                    <>
                      <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      正在校验中…
                    </>
                  ) : (
                    <>
                      <FileJson2 className="size-3.5" />
                      提交校验
                    </>
                  )}
                </button>
                {result && (
                  <span className="text-xs text-fd-muted-foreground">
                    {result.valid ? '✓ 通过' : `✗ ${result.errors.length} 个错误`}
                  </span>
                )}
              </div>

              {/* Result panel */}
              {result && <ValidationResult result={result} schema={schema} />}
            </div>
          )}

          {/* Fallback if schema text is invalid JSON and user tries to switch to validate */}
          {tab === 'validate' && isParseError && (
            <div className="px-4 py-4 text-sm text-red-600 dark:text-red-400">
              无法解析 Schema JSON，请检查文档中 `json-schema` 代码块内容是否合法。
            </div>
          )}
        </>
      )}
    </figure>
  );
}

// Convenience alias used in mdx.tsx
export { JsonSchema as default };
