import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMDX } from 'fumadocs-mdx/next';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const withMDX = createMDX();

function devAllowedOrigins() {
  const hosts = new Set(['localhost', '127.0.0.1']);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteUrl) {
    try {
      hosts.add(new URL(siteUrl).hostname);
    } catch {
      /* ignore */
    }
  }
  const extra = process.env.DOCS_ALLOWED_DEV_ORIGINS?.split(',').map((item) => item.trim()) ?? [];
  for (const item of extra) {
    if (item) hosts.add(item);
  }
  return [...hosts];
}

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  /** Docker 等多阶段部署：产出 `.next/standalone`，运行时镜像只需 Node + 该目录 */
  output: 'standalone',
  /** 多 lockfile/嵌套工作区时，避免 Next 把仓库根当项目根，导致 standalone 路径错乱 */
  turbopack: {
    root: __dirname,
  },
  // 局域网 / localhost 混访 dev 时允许 HMR 与静态资源跨 Host 加载
  allowedDevOrigins: devAllowedOrigins(),
  // MDX 内嵌图通过 `ImageZoom` 使用 `quality={95}`，需显式加入允许列表（Next 16+）
  images: {
    qualities: [75, 95],
  },
};

export default withMDX(config);
