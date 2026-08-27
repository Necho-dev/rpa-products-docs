import { withSentryConfig } from '@sentry/nextjs';
import { createMDX } from 'fumadocs-mdx/next';

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
  /**
   * 将 SENTRY_* 内联进客户端包，统一只用 SENTRY_DSN（无需单独写 NEXT_PUBLIC_）。
   * 同时冗余 NEXT_PUBLIC_SENTRY_*，便于静态字符串替换。
   * 注意：业务代码必须静态访问 `process.env.SENTRY_DSN`，禁止 `process.env[key]`。
   */
  env: {
    SENTRY_DSN: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN ?? '',
    SENTRY_ENVIRONMENT:
      process.env.SENTRY_ENVIRONMENT ?? process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? 'dev',
    SENTRY_RELEASE:
      process.env.SENTRY_RELEASE ??
      process.env.NEXT_PUBLIC_SENTRY_RELEASE ??
      process.env.GIT_SHA ??
      '',
    NEXT_PUBLIC_SENTRY_DSN: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN ?? '',
    NEXT_PUBLIC_SENTRY_ENVIRONMENT:
      process.env.SENTRY_ENVIRONMENT ?? process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? 'dev',
    NEXT_PUBLIC_SENTRY_RELEASE:
      process.env.SENTRY_RELEASE ??
      process.env.NEXT_PUBLIC_SENTRY_RELEASE ??
      process.env.GIT_SHA ??
      '',
  },
  /** Docker 等多阶段部署：产出 `.next/standalone`，运行时镜像只需 Node + 该目录 */
  output: 'standalone',
  /**
   * 禁止设置 `turbopack.root: <本项目目录>`:
   * Next 16 Turbopack 在 root === projectDir 时会把 CSS `@import` 解析上下文
   * 错误计算到父目录 (Can't resolve 'tailwindcss' in `../<项目父目录>`)
   * @see https://github.com/vercel/next.js/issues/90307
   */
  // 局域网 / localhost 混访 dev 时允许 HMR 与静态资源跨 Host 加载
  allowedDevOrigins: devAllowedOrigins(),
  // MDX 内嵌图通过 `ImageZoom` 使用 `quality={95}`，需显式加入允许列表（Next 16+）
  images: {
    qualities: [75, 95],
  },
  async redirects() {
    /**
     * DOCS_DEFAULT_SLUG: /docs 根路径的默认重定向目标分区（默认 `rpa`）。
     * DOCS_LEGACY_SLUG_PREFIX: 旧 URL 一级段（如 `RPA_`），满足此前缀时重定向到默认分区下。
     * 设为空字符串可禁用对应重定向。
     */
    const defaultSlug = process.env.DOCS_DEFAULT_SLUG?.trim() || 'rpa';
    const legacyPrefix = process.env.DOCS_LEGACY_SLUG_PREFIX?.trim() ?? 'RPA_';

    const rules = [];

    if (defaultSlug) {
      rules.push({
        source: '/docs',
        destination: `/docs/${defaultSlug}`,
        permanent: true,
      });
    }

    if (legacyPrefix && defaultSlug) {
      rules.push(
        {
          source: `/docs/${legacyPrefix}:platform`,
          destination: `/docs/${defaultSlug}/${legacyPrefix}:platform`,
          permanent: true,
        },
        {
          source: `/docs/${legacyPrefix}:platform/:path*`,
          destination: `/docs/${defaultSlug}/${legacyPrefix}:platform/:path*`,
          permanent: true,
        },
      );
    }

    const accountPasswordNested = {
      RPA_1688_SZYX: 'RPA_1688/SZYX',
      RPA_1688_SJGZT: 'RPA_1688/SJGZT',
      RPA_XIAOHONGSHU_PGY: 'RPA_XIAOHONGSHU/PGY',
      RPA_XIAOHONGSHU_QF: 'RPA_XIAOHONGSHU/QF',
      RPA_XIAOHONGSHU_QFTG: 'RPA_XIAOHONGSHU/QFTG',
      RPA_WEIPINHUI_GYS: 'RPA_WEIPINHUI/GYS',
      RPA_WEIPINHUI_YX: 'RPA_WEIPINHUI/YX',
      RPA_WEIXIN_XD: 'RPA_WEIXIN/XD',
    };
    for (const [from, to] of Object.entries(accountPasswordNested)) {
      rules.push({
        source: `/docs/auth/ACCOUNT_PASSWORD/${from}`,
        destination: `/docs/auth/YUCE_RPA/${to}`,
        permanent: true,
      });
    }
    rules.push(
      {
        source: '/docs/auth/ACCOUNT_PASSWORD',
        destination: '/docs/auth/YUCE_RPA',
        permanent: true,
      },
      {
        source: '/docs/auth/ACCOUNT_PASSWORD/:page',
        destination: '/docs/auth/YUCE_RPA/:page',
        permanent: true,
      },
    );

    const pinduoduoMmsToPromotion = {
      'rpa-conn-pinduoduo-mms-goods-report-download':
        'rpa-conn-pinduoduo-promotion-goods-report-download',
      'rpa-conn-pinduoduo-mms-live-report-download':
        'rpa-conn-pinduoduo-promotion-live-report-download',
      'rpa-conn-pinduoduo-mms-star-report-download':
        'rpa-conn-pinduoduo-promotion-star-report-download',
    };
    for (const [from, to] of Object.entries(pinduoduoMmsToPromotion)) {
      rules.push({
        source: `/docs/rpa/RPA_PINDUODUO/${from}`,
        destination: `/docs/rpa/RPA_PINDUODUO/${to}`,
        permanent: true,
      });
    }

    return rules;
  },
  async rewrites() {
    // quote 需 force-dynamic(读 headers 验签), 内部重定向到 /og/quote
    return [
      {
        source: '/og/docs/quote.png',
        destination: '/og/quote',
      },
      {
        source: '/og/docs/:path+/quote.png',
        destination: '/og/quote/:path+',
      },
    ];
  },
};

export default withSentryConfig(withMDX(config), {
  org: process.env.SENTRY_ORG ?? 'sentry',
  project: process.env.SENTRY_PROJECT ?? 'knowledge',
  // 自托管 Sentry（非 sentry.io）
  sentryUrl: process.env.SENTRY_URL ?? 'https://sentry.yuce-tech.cn',
  authToken: process.env.SENTRY_AUTH_TOKEN,

  widenClientFileUpload: true,

  // 绕过广告拦截：浏览器经同源 /monitoring 转发事件
  tunnelRoute: '/monitoring',

  silent: !process.env.CI,

  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
