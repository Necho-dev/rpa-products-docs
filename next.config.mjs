import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMDX } from 'fumadocs-mdx/next';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  /** Docker 等多阶段部署：产出 `.next/standalone`，运行时镜像只需 Node + 该目录 */
  output: 'standalone',
  /** 多 lockfile/嵌套工作区时，避免 Next 把仓库根当项目根，导致 standalone 路径错乱 */
  turbopack: {
    root: __dirname,
  },
  // MDX 内嵌图通过 `ImageZoom` 使用 `quality={95}`，需显式加入允许列表（Next 16+）
  images: {
    qualities: [75, 95],
  },
};

export default withMDX(config);
