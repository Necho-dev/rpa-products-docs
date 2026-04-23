# syntax=docker/dockerfile:1.4
# 推荐在 documents/ 用 Compose：docker compose up -d
# 单独构建：docker build -t rpa-products-docs .
# 拉取基镜像/国内加速见 README「Docker 部署 / 构建加速」
#
# 构建必要条件（不装 git / 不跑 apt）：
# - FUMADOCS_LAST_MODIFIED=fs，见 source.config（lastModified 用文件 mtime，避免 fumadocs 调 git log）
# - Node 22、npm ci、postinstall、next build

# Node 22 满足所有依赖的 engines 要求（chevrotain@12 需要 >=22）
ARG NODE_VERSION=22

# ── 依赖层（可缓存）──
FROM node:${NODE_VERSION}-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
  npm ci --ignore-scripts

# ── 构建 ──
FROM node:${NODE_VERSION}-bookworm-slim AS builder
WORKDIR /app
# 在 copy 与任何 fumadocs 步骤之前设置，使 postinstall 与 next build 均不依赖 git
ENV NEXT_TELEMETRY_DISABLED=1
ENV FUMADOCS_LAST_MODIFIED=fs
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
  npm run postinstall
RUN mkdir -p public
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
  npm run build

# ── 运行：standalone ──
FROM node:${NODE_VERSION}-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN groupadd -r -g 1001 nodejs && useradd -r -u 1001 -g nodejs -s /usr/sbin/nologin nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
