import { isDocsFolderIndexPath } from '@/lib/docs/source/category-config';
import type { DocsViewClientContext } from '@/lib/docs/docs-view-context';

export const MAX_CHAT_IMAGES = 6;
export const IMAGE_ONLY_PROMPT = '请结合附图回答。';
/** 发给模型的长边上限：够认界面即可，不必原图像素 */
export const CHAT_IMAGE_MAX_EDGE = 768;
export const CHAT_IMAGE_JPEG_QUALITY = 0.55;
export const CHAT_IMAGE_MAX_BYTES = 160_000;

const FIGURE_CAPTION_RE = /^图\d+(\s|$)/;
const INDEX_FILE_RE = /(^|\/)index\.mdx?$/i;

export type ChatImageSource = 'article' | 'paste';

export type ChatImageAttachment = {
  mediaType: string;
  data: string;
  alt?: string;
  source: ChatImageSource;
  /** 缩略图：小图 data URL，不依赖页面上的 /_next/image */
  preview?: string;
  /** 点开大图：稳定的文章原图路径 */
  originSrc?: string;
};

export type ChatImageDraft = {
  alt: string;
  mediaType: string;
  data: string;
  source: ChatImageSource;
  preview?: string;
  originSrc?: string;
};

export type ArticleFigure = {
  src: string;
  alt: string;
};

/** 文章页：非目录 index.md / index.mdx */
export function isDocsArticlePagePath(docsPath: string | undefined): boolean {
  if (!docsPath) return false;
  const normalized = docsPath.replace(/\\/g, '/');
  if (isDocsFolderIndexPath(normalized)) return false;
  return !INDEX_FILE_RE.test(normalized);
}

export function isDocFigureSrc(src: string): boolean {
  const path = src.split('?')[0]?.toLowerCase() ?? '';
  return !path.endsWith('.svg') && !path.endsWith('.ico');
}

export function resolveImgSrc(src: unknown): string | undefined {
  if (typeof src === 'string' && src.trim()) return src;
  if (src && typeof src === 'object' && 'src' in src) {
    const inner = (src as { src?: unknown }).src;
    if (typeof inner === 'string' && inner.trim()) return inner;
  }
  return undefined;
}

export function collectArticleFiguresFromRoot(root: ParentNode): ArticleFigure[] {
  const nodes = root.querySelectorAll<HTMLElement>('[data-doc-kind="article"] [data-doc-figure]');
  const out: ArticleFigure[] = [];
  const seen = new Set<string>();
  for (const el of nodes) {
    const img = el.matches('img') ? (el as HTMLImageElement) : el.querySelector('img');
    const src =
      el.getAttribute('data-doc-figure')?.trim() ||
      img?.getAttribute('src')?.trim() ||
      img?.currentSrc?.trim() ||
      '';
    if (!src || seen.has(src) || !isDocFigureSrc(src)) continue;
    seen.add(src);
    out.push({
      src,
      alt: el.getAttribute('data-doc-figure-alt')?.trim() || img?.alt?.trim() || '',
    });
  }
  return out;
}

export function isFigureCaptionText(text: string): boolean {
  return FIGURE_CAPTION_RE.test(text.trim());
}

export function uniqueClipboardImageFiles(input: {
  files?: ArrayLike<File>;
  items?: ArrayLike<{ kind: string; type: string; getAsFile: () => File | null }>;
}): File[] {
  const fromFiles = Array.from(input.files ?? []).filter((file) => file.type.startsWith('image/'));
  if (fromFiles.length > 0) return fromFiles;

  const seen = new Set<string>();
  const out: File[] = [];
  for (const item of Array.from(input.items ?? [])) {
    if (item.kind !== 'file' || !item.type.startsWith('image/')) continue;
    const file = item.getAsFile();
    if (!file) continue;
    const key = `${file.name}:${file.size}:${file.type}:${file.lastModified}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(file);
  }
  return out;
}

export function toRelativeImageSrc(src: string): string {
  const trimmed = src.trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const url = new URL(trimmed);
      return `${url.pathname}${url.search}`;
    }
  } catch {
    /* keep original */
  }
  return trimmed;
}

export function isStableChatImageSrc(src: string | undefined): boolean {
  if (!src?.trim()) return false;
  const value = toRelativeImageSrc(src);
  if (value.startsWith('blob:')) return false;
  if (value.startsWith('/_next/image')) return false;
  return value.startsWith('data:image/') || value.startsWith('/');
}

export function chatImageDataUrl(image: {
  mediaType?: string;
  data?: string;
}): string | null {
  if (!image.data) return null;
  const raw = rawImageBase64(image.data);
  if (!raw) return null;
  return `data:${image.mediaType || 'image/jpeg'};base64,${raw}`;
}

export function chatImagePreviewSrc(image: {
  mediaType?: string;
  data?: string;
  preview?: string;
  originSrc?: string;
}): string | null {
  const preview = image.preview?.trim();
  if (preview?.startsWith('data:image/')) return preview;
  if (preview && isStableChatImageSrc(preview)) return toRelativeImageSrc(preview);
  const origin = image.originSrc?.trim();
  if (origin && isStableChatImageSrc(origin)) return toRelativeImageSrc(origin);
  return chatImageDataUrl(image);
}

export function chatImageLightboxSrc(image: {
  mediaType?: string;
  data?: string;
  preview?: string;
  originSrc?: string;
}): string | null {
  const origin = image.originSrc?.trim();
  if (origin && isStableChatImageSrc(origin)) return toRelativeImageSrc(origin);
  const preview = image.preview?.trim();
  if (preview && !preview.startsWith('blob:')) return toRelativeImageSrc(preview);
  return chatImageDataUrl(image);
}

export function rawImageBase64(value: string): string {
  const trimmed = value.trim();
  const marker = 'base64,';
  const index = trimmed.indexOf(marker);
  if (trimmed.startsWith('data:') && index >= 0) {
    return trimmed.slice(index + marker.length);
  }
  return trimmed;
}

export function convertChatDataPart(
  part: { type: string; data?: unknown },
  options: { visionEnabled: boolean },
): { type: 'text'; text: string } | { type: 'file'; mediaType: string; data: string } | undefined {
  if (part.type === 'data-client') {
    return {
      type: 'text',
      text: `[Client Context: ${JSON.stringify(part.data)}]`,
    };
  }
  if (part.type !== 'data-image') return undefined;
  if (!options.visionEnabled) return undefined;
  if (!part.data || typeof part.data !== 'object') return undefined;
  const image = part.data as Partial<ChatImageAttachment>;
  const data = typeof image.data === 'string' ? rawImageBase64(image.data) : '';
  if (!data) return undefined;
  const mediaType =
    typeof image.mediaType === 'string' && image.mediaType.startsWith('image/')
      ? image.mediaType
      : 'image/jpeg';
  return { type: 'file', mediaType, data };
}

export function buildUserChatParts(input: {
  client: DocsViewClientContext & {
    selection?: { text: string; pageTitle?: string; pageUrl?: string };
  };
  text: string;
  images: ChatImageDraft[];
}): Array<
  | { type: 'data-client'; data: typeof input.client }
  | { type: 'text'; text: string }
  | { type: 'data-image'; data: ChatImageAttachment }
> {
  const images = input.images.slice(0, MAX_CHAT_IMAGES);
  const parts: Array<
    | { type: 'data-client'; data: typeof input.client }
    | { type: 'text'; text: string }
    | { type: 'data-image'; data: ChatImageAttachment }
  > = [
    {
      type: 'data-client',
      data: input.client,
    },
  ];

  images.forEach((image, index) => {
    const caption = image.alt.trim() ? `图${index + 1} ${image.alt.trim()}` : `图${index + 1}`;
    parts.push({ type: 'text', text: caption });
    parts.push({
      type: 'data-image',
      data: {
        mediaType: image.mediaType,
        data: rawImageBase64(image.data),
        alt: image.alt,
        source: image.source,
        ...(image.preview?.startsWith('data:image/') ? { preview: image.preview } : {}),
        ...(image.originSrc && isStableChatImageSrc(image.originSrc)
          ? { originSrc: toRelativeImageSrc(image.originSrc) }
          : {}),
      },
    });
  });

  const text = input.text.trim() || (images.length > 0 ? IMAGE_ONLY_PROMPT : '');
  if (text) {
    parts.push({ type: 'text', text });
  }

  return parts;
}
