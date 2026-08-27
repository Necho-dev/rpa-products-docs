import path from 'node:path';

/**
 * 文档源码根目录（`content/docs`）。
 * `process.cwd()` 加 turbopackIgnore，避免 NFT 把整个仓库打进追踪图。
 */
export function docsContentRoot(): string {
  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    'content',
    'docs',
  );
}

/** 拼到 `content/docs` 下；拒绝越出该目录的相对段。 */
export function resolveDocsContentPath(...segments: string[]): string | null {
  const root = path.normalize(docsContentRoot());
  const abs = path.normalize(path.join(root, ...segments.filter(Boolean)));
  if (abs !== root && !abs.startsWith(root + path.sep)) return null;
  return abs;
}
