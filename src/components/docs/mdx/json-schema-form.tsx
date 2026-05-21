'use client';

/**
 * v1 SchemaForm — covers flat object schemas with:
 *   string, string+enum, string+pattern, number/integer, boolean, array+items.enum
 *
 * Unknown / complex field types (oneOf, $ref, nested object, etc.) render a
 * plain <textarea> for manual JSON input so the form degrades gracefully.
 */

import { useCallback, useMemo, useState } from 'react';
import { ChevronDown, BrushCleaning } from 'lucide-react';
import { cn } from '@/lib/core/cn';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from 'fumadocs-ui/components/ui/popover';

// ── Minimal JSON Schema types ──────────────────────────────────────────────────

export interface JsonSchemaProperty {
  type?: string | string[];
  description?: string;
  enum?: unknown[];
  default?: unknown;
  pattern?: string;
  items?: { type?: string; enum?: unknown[] };
  title?: string;
}

export interface FlatJsonSchema {
  title?: string;
  description?: string;
  type?: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}

export type FormData = Record<string, unknown>;

// ── Helpers ────────────────────────────────────────────────────────────────────

function getDefaultValue(prop: JsonSchemaProperty): unknown {
  if (prop.default !== undefined) return prop.default;
  const t = Array.isArray(prop.type) ? prop.type[0] : prop.type;
  if (t === 'boolean') return false;
  if (t === 'number' || t === 'integer') return '';
  if (t === 'array') return [];
  return '';
}

export function buildInitialFormData(schema: FlatJsonSchema): FormData {
  const data: FormData = {};
  for (const [key, prop] of Object.entries(schema.properties ?? {})) {
    data[key] = getDefaultValue(prop);
  }
  return data;
}

// ── Shared control styles ──────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-md border border-fd-border bg-fd-background px-3 py-1.5 text-sm text-fd-foreground placeholder:text-fd-muted-foreground focus:outline-none focus:ring-2 focus:ring-fd-ring focus:ring-offset-0 transition-colors duration-100';

const labelCls = 'block text-sm font-medium text-fd-foreground mb-1';
const hintCls = 'mt-1 text-xs text-fd-muted-foreground leading-relaxed';
const errorCls = 'mt-1 text-xs text-red-500 dark:text-red-400';

// ── Individual field renderers ─────────────────────────────────────────────────

function StringEnumField({
  id,
  prop,
  value,
  required,
  error,
  onChange,
}: {
  id: string;
  prop: JsonSchemaProperty;
  value: unknown;
  required: boolean;
  error?: string;
  onChange: (v: string) => void;
}) {
  const options = (prop.enum ?? []) as string[];
  const current = typeof value === 'string' ? value : '';
  const [open, setOpen] = useState(false);

  return (
    <div>
      <label className={labelCls}>
        {prop.title ?? id}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <div className={cn(inputCls, 'flex items-center gap-1.5 p-0 overflow-hidden', error && 'border-red-400')}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex flex-1 items-center gap-1.5 px-3 py-2 text-left min-w-0 focus:outline-none"
            >
              <span className={cn('flex-1 truncate', !current && 'text-fd-muted-foreground')}>
                {current || '请选择…'}
              </span>
              <ChevronDown className={cn('size-3.5 shrink-0 text-fd-muted-foreground transition-transform duration-150', open && 'rotate-180')} />
            </button>
          </PopoverTrigger>
          {/* Clear button — only when a value is selected */}
          {current && (
            <button
              type="button"
              aria-label="清除选择"
              title="清除"
              onClick={() => { onChange(''); setOpen(false); }}
              className="flex shrink-0 items-center justify-center px-2 py-2 text-fd-muted-foreground hover:text-fd-foreground focus:outline-none border-l border-fd-border/60"
            >
              <BrushCleaning className="size-3.5" />
            </button>
          )}
        </div>
        <PopoverContent
          align="start"
          className="min-w-(--radix-popover-trigger-width) p-1.5"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {options.map((opt) => {
            const selected = opt === current;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className={cn(
                  'flex w-full items-center rounded-lg px-3 py-1.5 text-sm transition-colors text-left',
                  selected
                    ? 'bg-fd-accent font-semibold text-fd-accent-foreground'
                    : 'text-fd-popover-foreground hover:bg-fd-accent/60',
                )}
              >
                {opt}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>
      {prop.description && <p className={hintCls}>{prop.description}</p>}
      {error && <p className={errorCls}>{error}</p>}
    </div>
  );
}

function StringField({
  id,
  prop,
  value,
  required,
  error,
  onChange,
}: {
  id: string;
  prop: JsonSchemaProperty;
  value: unknown;
  required: boolean;
  error?: string;
  onChange: (v: string) => void;
}) {
  const placeholder = prop.pattern ? `格式：${prop.pattern}` : '';
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {prop.title ?? id}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <input
        id={id}
        type="text"
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(inputCls, error && 'border-red-400 focus:ring-red-400')}
      />
      {prop.description && <p className={hintCls}>{prop.description}</p>}
      {error && <p className={errorCls}>{error}</p>}
    </div>
  );
}

function NumberField({
  id,
  prop,
  value,
  required,
  error,
  onChange,
}: {
  id: string;
  prop: JsonSchemaProperty;
  value: unknown;
  required: boolean;
  error?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {prop.title ?? id}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <input
        id={id}
        type="number"
        value={typeof value === 'string' || typeof value === 'number' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputCls, error && 'border-red-400 focus:ring-red-400')}
      />
      {prop.description && <p className={hintCls}>{prop.description}</p>}
      {error && <p className={errorCls}>{error}</p>}
    </div>
  );
}

function BooleanField({
  id,
  prop,
  value,
  required,
  error,
  onChange,
}: {
  id: string;
  prop: JsonSchemaProperty;
  value: unknown;
  required: boolean;
  error?: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <div>
      <label className={cn(labelCls, 'flex items-center gap-2 cursor-pointer select-none')}>
        <input
          id={id}
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="size-4 rounded border-fd-border accent-fd-primary"
        />
        {prop.title ?? id}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {prop.description && <p className={hintCls}>{prop.description}</p>}
      {error && <p className={errorCls}>{error}</p>}
    </div>
  );
}

function ArrayEnumField({
  id,
  prop,
  value,
  required,
  error,
  onChange,
}: {
  id: string;
  prop: JsonSchemaProperty;
  value: unknown;
  required: boolean;
  error?: string;
  onChange: (v: string[]) => void;
}) {
  const options = (prop.items?.enum ?? []) as string[];
  const selected = Array.isArray(value) ? (value as string[]) : [];

  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((v) => v !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <div>
      <p className={labelCls}>
        {prop.title ?? id}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-1.5 cursor-pointer select-none text-sm text-fd-foreground">
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => toggle(opt)}
              className="size-3.5 rounded border-fd-border accent-fd-primary"
            />
            {opt}
          </label>
        ))}
      </div>
      {prop.description && <p className={hintCls}>{prop.description}</p>}
      {error && <p className={errorCls}>{error}</p>}
    </div>
  );
}

function FallbackJsonField({
  id,
  prop,
  value,
  required,
  error,
  onChange,
}: {
  id: string;
  prop: JsonSchemaProperty;
  value: unknown;
  required: boolean;
  error?: string;
  onChange: (v: unknown) => void;
}) {
  const text = value === '' || value === undefined || value === null ? '' : JSON.stringify(value, null, 2);
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {prop.title ?? id}
        {required && <span className="ml-0.5 text-red-500">*</span>}
        <span className="ml-1.5 rounded border border-fd-border/60 bg-fd-muted/60 px-1 py-0.5 font-mono text-[10px] text-fd-muted-foreground">
          JSON
        </span>
      </label>
      <textarea
        id={id}
        rows={3}
        defaultValue={text}
        onChange={(e) => {
          try {
            onChange(JSON.parse(e.target.value));
          } catch {
            onChange(e.target.value);
          }
        }}
        className={cn(inputCls, 'font-mono text-xs resize-y', error && 'border-red-400 focus:ring-red-400')}
      />
      {prop.description && <p className={hintCls}>{prop.description}</p>}
      {error && <p className={errorCls}>{error}</p>}
    </div>
  );
}

// ── SchemaForm ─────────────────────────────────────────────────────────────────

interface SchemaFormProps {
  schema: FlatJsonSchema;
  formData: FormData;
  fieldErrors: Record<string, string>;
  onChange: (key: string, value: unknown) => void;
}

export function SchemaForm({ schema, formData, fieldErrors, onChange }: SchemaFormProps) {
  const properties = schema.properties ?? {};
  const required = useMemo(() => new Set(schema.required ?? []), [schema.required]);

  const renderField = useCallback(
    (key: string, prop: JsonSchemaProperty) => {
      const type = Array.isArray(prop.type) ? prop.type[0] : prop.type;
      const isRequired = required.has(key);
      const error = fieldErrors[key];
      const value = formData[key];

      // string + enum → select
      if (prop.enum && prop.enum.length > 0) {
        return (
          <StringEnumField
            id={key}
            prop={prop}
            value={value}
            required={isRequired}
            error={error}
            onChange={(v) => onChange(key, v)}
          />
        );
      }

      if (type === 'string') {
        return (
          <StringField
            id={key}
            prop={prop}
            value={value}
            required={isRequired}
            error={error}
            onChange={(v) => onChange(key, v)}
          />
        );
      }

      if (type === 'integer' || type === 'number') {
        return (
          <NumberField
            id={key}
            prop={prop}
            value={value}
            required={isRequired}
            error={error}
            onChange={(v) => onChange(key, v === '' ? '' : Number(v))}
          />
        );
      }

      if (type === 'boolean') {
        return (
          <BooleanField
            id={key}
            prop={prop}
            value={value}
            required={isRequired}
            error={error}
            onChange={(v) => onChange(key, v)}
          />
        );
      }

      if (type === 'array' && prop.items?.enum) {
        return (
          <ArrayEnumField
            id={key}
            prop={prop}
            value={value}
            required={isRequired}
            error={error}
            onChange={(v) => onChange(key, v)}
          />
        );
      }

      // Fallback for complex / unknown types
      return (
        <FallbackJsonField
          id={key}
          prop={prop}
          value={value}
          required={isRequired}
          error={error}
          onChange={(v) => onChange(key, v)}
        />
      );
    },
    [formData, fieldErrors, required, onChange],
  );

  if (Object.keys(properties).length === 0) {
    return (
      <p className="py-4 text-center text-sm text-fd-muted-foreground">该 Schema 没有定义任何属性字段</p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {Object.entries(properties).map(([key, prop]) => (
        <div key={key}>{renderField(key, prop)}</div>
      ))}
    </div>
  );
}
