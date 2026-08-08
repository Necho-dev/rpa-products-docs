import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { DEV_APP_RELEASE } from '@/lib/observability/app-release';

export { DEV_APP_RELEASE };

function buildIdPath(cwd: string): string {
  return join(cwd, '.next', 'BUILD_ID');
}

/**
 * 读取 Next.js 构建产物 `.next/BUILD_ID`。
 * standalone 运行时 cwd 下通常为 `/app/.next/BUILD_ID`。
 */
export function readBuildId(cwd: string = process.cwd()): string | undefined {
  try {
    const raw = readFileSync(buildIdPath(cwd), 'utf8').trim();
    return raw === '' ? undefined : raw;
  } catch {
    return undefined;
  }
}

/** BUILD_ID 文件 mtime, 近似构建完成时间 (ISO) */
export function readBuildIdBuiltAt(cwd: string = process.cwd()): string | undefined {
  try {
    return statSync(buildIdPath(cwd)).mtime.toISOString();
  } catch {
    return undefined;
  }
}

/**
 * 供客户端更新探测的 release：生产用 BUILD_ID；开发固定 `dev`（避免 HMR 误报）。
 * `nodeEnv` 可注入，便于单测（勿直接改只读的 `process.env.NODE_ENV`）。
 */
export function getAppRelease(
  cwd: string = process.cwd(),
  nodeEnv: string | undefined = process.env.NODE_ENV,
): string {
  if (nodeEnv === 'development') {
    return DEV_APP_RELEASE;
  }
  return readBuildId(cwd) ?? DEV_APP_RELEASE;
}
