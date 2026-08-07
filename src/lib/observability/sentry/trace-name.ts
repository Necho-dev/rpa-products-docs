import {
  SEMANTIC_ATTRIBUTE_SENTRY_SOURCE,
  getActiveSpan,
  getClient,
  getCurrentScope,
  getRootSpan,
  updateSpanName,
} from '@sentry/core';
import { isSentryEnabled } from '@/lib/observability/sentry/env';

/** Proxy 显式写入的可读名；优先于从 http.target 推导 */
export const TRACE_NAME_ATTR = 'knowledge.trace_name';

type AttrMap = Record<string, unknown>;

type MutableName = {
  attributes: AttrMap;
  getName: () => string | undefined;
  setName: (name: string) => void;
};

/** 去掉 query / fragment，控制基数与隐私 */
export function stripPathQuery(target: string): string {
  const q = target.indexOf('?');
  const h = target.indexOf('#');
  let end = target.length;
  if (q >= 0) end = Math.min(end, q);
  if (h >= 0) end = Math.min(end, h);
  const path = target.slice(0, end);
  return path.length > 0 ? path : '/';
}

/** SDK 默认名是否属于不可读（middleware 折叠 / 动态路由模板） */
export function isOpaqueTraceName(name: string | undefined): boolean {
  if (!name) return true;
  if (/^middleware\s+/i.test(name)) return true;
  // Next.js 动态段：/docs/[[...slug]]、/api/[id] 等
  if (name.includes('[') && name.includes(']')) return true;
  return false;
}

function readHttpMethod(attrs: AttrMap): string {
  const method = attrs['http.request.method'] ?? attrs['http.method'];
  return typeof method === 'string' && method ? method : 'GET';
}

function readHttpPath(attrs: AttrMap): string | undefined {
  const target = attrs['http.target'] ?? attrs['url.path'];
  if (typeof target !== 'string' || !target) return undefined;
  return stripPathQuery(target);
}

/**
 * 从 span attributes 解析可读 Trace 名：`GET /docs/rpa/foo`
 * 优先 knowledge.trace_name，其次 http.target（生产上 middleware / RSC 均有此字段）。
 */
export function resolveReadableTraceName(
  attrs: AttrMap,
  currentName?: string,
): string | undefined {
  const custom = attrs[TRACE_NAME_ATTR];
  if (typeof custom === 'string' && custom.trim()) {
    return custom.trim();
  }

  const path = readHttpPath(attrs);
  if (!path) return undefined;

  // 已是真实路径则不动，避免重复改写
  if (currentName && !isOpaqueTraceName(currentName)) {
    return undefined;
  }

  return `${readHttpMethod(attrs)} ${path}`;
}

/** 在 SDK enhance* 之后调用，覆盖 middleware GET / 路由模板名 */
export function applyReadableTraceName(span: MutableName): boolean {
  const next = resolveReadableTraceName(span.attributes, span.getName());
  if (!next) return false;

  span.setName(next);
  span.attributes[SEMANTIC_ATTRIBUTE_SENTRY_SOURCE] = 'custom';
  span.attributes[TRACE_NAME_ATTR] = next;
  // streamed segment 可能已拷贝旧名到此 attribute
  if ('sentry.segment.name' in span.attributes) {
    span.attributes['sentry.segment.name'] = next;
  }
  return true;
}

/**
 * Proxy 入口：尽量当场改名，并写入 knowledge.trace_name。
 * 注意：@sentry/nextjs 会在 preprocessEvent / processSegmentSpan 里再次折叠为
 * `middleware GET`，因此必须配合 registerReadableTraceNameHooks 在 enhance 之后再盖一次。
 */
export function setProxyTraceName(method: string, pathname: string): void {
  if (!isSentryEnabled()) return;

  const name = `${method} ${pathname || '/'}`;
  try {
    getCurrentScope().setTransactionName(name);
    const active = getActiveSpan();
    const root = active ? getRootSpan(active) : undefined;
    if (root) {
      updateSpanName(root, name);
      root.setAttribute(TRACE_NAME_ATTR, name);
    }
  } catch {
    /* Sentry 未就绪时忽略 */
  }
}

/**
 * 在 Sentry.init() 之后注册。监听器晚于 SDK 内置 enhance*，才能最终生效。
 * edge（Proxy/Middleware）与 nodejs（RSC / Route Handler）都需要。
 */
export function registerReadableTraceNameHooks(): void {
  if (!isSentryEnabled()) return;

  const client = getClient();
  if (!client) return;

  client.on('preprocessEvent', (event) => {
    if (event.type !== 'transaction') return;
    const data = event.contexts?.trace?.data;
    if (!data || typeof data !== 'object') return;

    applyReadableTraceName({
      attributes: data as AttrMap,
      getName: () => event.transaction,
      setName: (name) => {
        event.transaction = name;
      },
    });
  });

  client.on('processSegmentSpan', (span) => {
    const attributes = (span.attributes ?? (span.attributes = {})) as AttrMap;
    applyReadableTraceName({
      attributes,
      getName: () => span.name,
      setName: (name) => {
        span.name = name;
      },
    });
  });
}
