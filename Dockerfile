# syntax=docker/dockerfile:1.4
# 推荐在 documents/ 用 Compose：docker compose up -d
# 单独构建：docker build -t rpa-products-docs .
# 拉取基镜像/国内加速见 README「Docker 部署 / 构建加速」

# Node 22 满足所有依赖的 engines 要求（chevrotain@12 需要 >=22）
ARG NODE_VERSION=22

# ── 依赖层（可缓存）──
FROM node:${NODE_VERSION}-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# 不跑 apt：避免每个 stage 都连接 debian 源（国内常极慢，且与 deps 重复三次）
# BuildKit 缓存加速重复执行 npm 时的元数据与包缓存
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
  npm ci --ignore-scripts

# ── 构建 ──
FROM node:${NODE_VERSION}-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# fumadocs-mdx 在 postinstall / `next build` 处理 MDX 时会 spawn git（如元数据/最后修改时间）
# slim 镜像无 git，需显式安装；仅 builder 需装，用 apt 缓存减轻重复构建
RUN --mount=type=cache,id=apt-lists,sharing=locked,target=/var/lib/apt/lists \
  --mount=type=cache,id=apt-cache,sharing=locked,target=/var/cache/apt \
  apt-get update \
  && apt-get install -y --no-install-recommends git \
  && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
  npm run postinstall
RUN mkdir -p public
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
  npm run build

# ── 运行：standalone（无 apt，用 useradd 建非 root 用户，秒级）──
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
