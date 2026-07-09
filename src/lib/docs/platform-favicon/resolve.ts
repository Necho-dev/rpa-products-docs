/**
 * 从平台站点 URL 解析 favicon 图标地址（对齐 rpa-bit-admin platform_favicon.py）。
 */

export const DEFAULT_TIMEOUT_MS = 15_000;
export const USER_AGENT = 'Mozilla/5.0 (compatible; RPA-Hero-Docs/1.0)';

const LINK_TAG_RE = /<link\s+([^>]+)>/gi;
const LINK_ATTR_RE = /(rel|href)\s*=\s*(["'])(.*?)\2/gi;

export type IconLink = readonly [rel: string, href: string];

export type ResolvePlatformIconResult = {
  url: string;
  icon: string | null;
};

function normalizeRel(rel: string): string {
  return rel.toLowerCase().split(/\s+/).filter(Boolean).join(' ');
}

function relIsFavicon(rel: string): boolean {
  if (!rel) return false;
  const tokens = new Set(normalizeRel(rel).split(' '));
  if (tokens.has('icon')) return true;
  return rel.toLowerCase().includes('icon');
}

function relIconRank(rel: string): number | null {
  const normalized = normalizeRel(rel);
  const tokens = new Set(normalized.split(' '));
  if (tokens.has('shortcut') && tokens.has('icon')) return 0;
  if (tokens.has('icon')) return 1;
  if (normalized.replace(/\s+/g, '').includes('apple-touch-icon')) return 2;
  if (normalized.includes('icon')) return 1;
  return null;
}

function extractLinksRegex(html: string): IconLink[] {
  const links: IconLink[] = [];
  LINK_TAG_RE.lastIndex = 0;
  let tagMatch: RegExpExecArray | null;
  while ((tagMatch = LINK_TAG_RE.exec(html)) !== null) {
    const attrStr = tagMatch[1] ?? '';
    const attrs: Record<string, string> = {};
    LINK_ATTR_RE.lastIndex = 0;
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = LINK_ATTR_RE.exec(attrStr)) !== null) {
      const name = (attrMatch[1] ?? '').toLowerCase();
      attrs[name] = (attrMatch[3] ?? '').trim();
    }
    const href = attrs.href ?? '';
    const rel = normalizeRel(attrs.rel ?? '');
    if (href && relIsFavicon(rel)) {
      links.push([rel, href]);
    }
  }
  return links;
}

function mergeIconLinks(links: IconLink[]): IconLink[] {
  const seen = new Set<string>();
  const merged: IconLink[] = [];
  for (const [rel, href] of links) {
    const key = `${rel}\0${href}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push([rel, href]);
  }
  return merged;
}

export function normalizeSiteUrl(url: string): string {
  let raw = url.trim();
  if (!raw) throw new Error('链接不能为空');
  if (!/^https?:\/\//i.test(raw)) {
    raw = `https://${raw}`;
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('链接格式无效');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('仅支持 http/https 链接');
  }
  if (!parsed.host) {
    throw new Error('链接格式无效');
  }
  return raw;
}

/**
 * favicon 映射 key：站点 origin 的 host（含非默认端口），不含协议与路径。
 * - `https://mms.pinduoduo.com/` → `mms.pinduoduo.com`
 * - `https://shop.jd.com/jdm/home` → `shop.jd.com`
 */
export function platformFaviconKey(url: string): string {
  const pageUrl = normalizeSiteUrl(url);
  return new URL(pageUrl).host;
}

export function originFaviconUrl(pageUrl: string): string {
  const parsed = new URL(pageUrl);
  return `${parsed.protocol}//${parsed.host}/favicon.ico`;
}

export function pickIconHref(links: IconLink[], pageUrl: string): string | null {
  const ranked: Array<[number, string]> = [];
  for (const [rel, href] of links) {
    const rank = relIconRank(rel);
    if (rank === null) continue;
    ranked.push([rank, new URL(href, pageUrl).href]);
  }
  if (ranked.length === 0) return null;
  ranked.sort((a, b) => a[0] - b[0]);
  return ranked[0]![1];
}

/** 返回 (HTML link 首选图标, 候选 URL 列表)。 */
export function extractIconLinksFromHtml(
  html: string,
  pageUrl: string,
): [htmlIcon: string | null, candidates: string[]] {
  const snippet = html.slice(0, 500_000);
  const allLinks = mergeIconLinks(extractLinksRegex(snippet));
  const htmlIcon = pickIconHref(allLinks, pageUrl);
  const candidates: string[] = [];
  if (htmlIcon) candidates.push(htmlIcon);
  const originIcon = originFaviconUrl(pageUrl);
  if (!candidates.includes(originIcon)) candidates.push(originIcon);
  return [htmlIcon, candidates];
}

/** 根据魔数判断是否为真实图片（拒绝 HTML 登录页伪装的 favicon.ico）。 */
export function sniffImageExt(bytes: Uint8Array): string | null {
  if (bytes.byteLength < 4) return null;
  // PNG
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'png';
  }
  // JPEG
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
  // GIF
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'gif';
  // WEBP (RIFF....WEBP)
  if (
    bytes.byteLength >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'webp';
  }
  // ICO / CUR
  if (bytes[0] === 0x00 && bytes[1] === 0x00 && (bytes[2] === 0x01 || bytes[2] === 0x02)) {
    return 'ico';
  }
  // SVG（文本）
  const head = new TextDecoder().decode(bytes.slice(0, Math.min(bytes.byteLength, 256))).trimStart();
  if (head.startsWith('<svg') || head.startsWith('<?xml')) {
    if (head.toLowerCase().includes('<svg')) return 'svg';
  }
  return null;
}

async function resourceExists(
  url: string,
  fetchImpl: typeof fetch,
  signal?: AbortSignal,
): Promise<boolean> {
  const headers: Record<string, string> = {
    'User-Agent': USER_AGENT,
    Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
  };

  try {
    const get = await fetchImpl(url, {
      method: 'GET',
      headers: { ...headers, Range: 'bytes=0-2048' },
      redirect: 'follow',
      signal,
    });
    if (get.status >= 400) return false;
    const buf = new Uint8Array(await get.arrayBuffer());
    return sniffImageExt(buf) !== null;
  } catch {
    return false;
  }
}

const LINK_TAG_RE_FULL = /<link\b([^>]+)>/gi;
const LINK_ATTR_ANY_RE = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;

const CSS_URL_RE = /url\(\s*(['"]?)([^"')]+)\1\s*\)/gi;

function parseLinkTagAttrs(attrStr: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  LINK_ATTR_ANY_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = LINK_ATTR_ANY_RE.exec(attrStr)) !== null) {
    const name = (match[1] ?? '').toLowerCase();
    const value = (match[2] ?? match[3] ?? match[4] ?? '').trim();
    attrs[name] = value;
  }
  return attrs;
}

/** 从 HTML 提取 stylesheet URL，供无 <link rel=icon> 的 SPA 登录页兜底（兼容无引号 href）。 */
export function extractStylesheetHrefs(html: string, pageUrl: string): string[] {
  const hrefs: string[] = [];
  const seen = new Set<string>();
  LINK_TAG_RE_FULL.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = LINK_TAG_RE_FULL.exec(html)) !== null) {
    const attrs = parseLinkTagAttrs(match[1] ?? '');
    const rel = (attrs.rel ?? '').toLowerCase();
    if (!rel.split(/\s+/).includes('stylesheet')) continue;
    const raw = (attrs.href ?? '').trim();
    if (!raw) continue;
    try {
      const abs = new URL(raw.startsWith('//') ? `https:${raw}` : raw, pageUrl).href;
      if (seen.has(abs)) continue;
      seen.add(abs);
      hrefs.push(abs);
    } catch {
      // ignore
    }
  }
  return hrefs;
}

/**
 * 从 CSS 提取可能的图标 URL：优先方形尺寸文件名（如 124-124.png）、含 icon/favicon 的路径。
 */
export function extractIconCandidatesFromCss(css: string, cssUrl: string): string[] {
  const scored: Array<{ score: number; href: string }> = [];
  const seen = new Set<string>();
  CSS_URL_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = CSS_URL_RE.exec(css)) !== null) {
    const raw = (match[2] || '').trim();
    if (!raw || raw.startsWith('data:')) continue;
    let abs: string;
    try {
      abs = new URL(raw.startsWith('//') ? `https:${raw}` : raw, cssUrl).href;
    } catch {
      continue;
    }
    if (seen.has(abs)) continue;
    seen.add(abs);

    const lower = abs.toLowerCase();
    if (!/\.(png|jpe?g|gif|webp|ico|svg)(\?|#|$)/i.test(lower)) continue;
    // 排除字体图标 / 雪碧图碎片
    if (/#iconfont|\/font_|at\.alicdn\.com\/t\//i.test(lower)) continue;

    let score = 0;
    if (/favicon|apple-touch-icon/i.test(lower)) score += 50;
    else if (/(^|\/)icon[-_.]/i.test(lower)) score += 30;
    // 文件名含方形尺寸：…-48-48.ico / …-124-124.png
    const dim = lower.match(/(\d{2,4})-(\d{2,4})\.(png|jpe?g|webp|gif|ico)/i);
    if (dim) {
      const w = Number(dim[1]);
      const h = Number(dim[2]);
      if (w === h) {
        score += 20 + Math.min(w, 256) / 4;
        if (w >= 48 && w <= 256) score += 30;
        if (w < 24) score -= 40;
        // 同尺寸下优先 .ico（更接近浏览器 favicon）
        if (dim[3] === 'ico') score += 25;
      } else {
        score -= 10;
      }
    }
    if (score <= 0) continue;
    scored.push({ score, href: abs });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.map((item) => item.href);
}

export async function resolvePlatformIcon(
  url: string,
  options?: { timeoutMs?: number; fetchImpl?: typeof fetch },
): Promise<ResolvePlatformIconResult> {
  const pageUrl = normalizeSiteUrl(url);
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchImpl = options?.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let htmlIcon: string | null = null;
  let candidates: string[] = [];

  try {
    try {
      const resp = await fetchImpl(pageUrl, {
        method: 'GET',
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,*/*',
        },
        redirect: 'follow',
        signal: controller.signal,
      });
      const contentType = (resp.headers.get('content-type') ?? '').toLowerCase();
      const text = await resp.text();
      if (
        resp.status < 400 &&
        (contentType.includes('html') || text.slice(0, 2000).toLowerCase().includes('<link'))
      ) {
        [htmlIcon, candidates] = extractIconLinksFromHtml(text, pageUrl);
      }
    } catch {
      // ignore page fetch errors
    }

    if (candidates.length === 0) {
      candidates.push(originFaviconUrl(pageUrl));
    }

    const seen = new Set<string>();
    for (const candidate of candidates) {
      if (seen.has(candidate)) continue;
      seen.add(candidate);
      if (await resourceExists(candidate, fetchImpl, controller.signal)) {
        return { url: pageUrl, icon: candidate };
      }
    }

    // HTML 声明的 icon：仅当探测通过才返回；不再盲信（避免 HTML 登录页当 favicon）
    // 自动解析失败时由 sync 脚本交互提示用户提供 URL；不从 CSS 猜图（易误选）。
    if (htmlIcon && (await resourceExists(htmlIcon, fetchImpl, controller.signal))) {
      return { url: pageUrl, icon: htmlIcon };
    }

    return { url: pageUrl, icon: null };
  } finally {
    clearTimeout(timer);
  }
}

/** 可服务的图片扩展名（与 /resources/images 白名单对齐）。 */
export const SERVABLE_IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']);

export function extFromContentType(contentType: string | null): string | undefined {
  const ct = (contentType ?? '').toLowerCase().split(';')[0]?.trim() ?? '';
  switch (ct) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/gif':
      return 'gif';
    case 'image/webp':
      return 'webp';
    case 'image/svg+xml':
      return 'svg';
    case 'image/x-icon':
    case 'image/vnd.microsoft.icon':
      return 'ico';
    default:
      return undefined;
  }
}

export function extFromUrl(iconUrl: string): string | undefined {
  try {
    const pathname = new URL(iconUrl).pathname;
    const ext = pathname.split('.').pop()?.toLowerCase();
    if (!ext || ext.length > 5) return undefined;
    return ext;
  } catch {
    return undefined;
  }
}

export type DownloadIconResult = {
  bytes: Uint8Array;
  ext: string;
  contentType: string | null;
};

/**
 * 下载 icon 二进制。优先落盘为 png/webp/svg/jpg；
 * 若仅为 .ico，仍返回 ext=ico（由调用方决定是否允许或跳过）。
 */
export async function downloadIcon(
  iconUrl: string,
  options?: { timeoutMs?: number; fetchImpl?: typeof fetch },
): Promise<DownloadIconResult> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchImpl = options?.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetchImpl(iconUrl, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    if (resp.status >= 400) {
      throw new Error(`下载失败 HTTP ${resp.status}`);
    }
    const contentType = resp.headers.get('content-type');
    const buf = new Uint8Array(await resp.arrayBuffer());
    if (buf.byteLength === 0) {
      throw new Error('下载内容为空');
    }

    const sniffed = sniffImageExt(buf);
    if (!sniffed) {
      throw new Error(
        `下载内容不是图片（可能是 HTML 登录页），content-type=${contentType ?? 'unknown'}`,
      );
    }

    const fromCt = extFromContentType(contentType);
    const fromUrl = extFromUrl(iconUrl);
    let ext = sniffed ?? fromCt ?? fromUrl ?? 'png';
    if (ext === 'jpeg') ext = 'jpg';

    return { bytes: buf, ext, contentType };
  } finally {
    clearTimeout(timer);
  }
}

export function hostFromPageUrl(pageUrl: string): string {
  return platformFaviconKey(pageUrl);
}
