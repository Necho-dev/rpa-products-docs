# syntax=docker/dockerfile:1
# 推荐在 documents/ 用 Compose：docker compose up -d
# 单独构建：docker build -t rpa-products-docs .

# Node 22 满足所有依赖的 engines 要求（chevrotain@12 需要 >=22）
ARG NODE_VERSION=22

# ── 依赖层（可缓存） ──
FROM node:${NODE_VERSION}-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
# --ignore-scripts：跳过 postinstall（fumadocs-mdx 需要源码，在 builder 阶段单独运行）
RUN npm ci --ignore-scripts

# ── 构建 ──
FROM node:${NODE_VERSION}-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update -y && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 源码就位后手动运行 postinstall（fumadocs-mdx 生成类型声明）
RUN npm run postinstall
# 无 public/ 时 Next 不生成该目录，COPY 会失败
RUN mkdir -p public
# NEXT_PUBLIC_* 需在 build 时注入，例如: docker build --build-arg NEXT_PUBLIC_SITE_URL=https://docs.example.com .
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
RUN npm run build

# ── 运行：standalone ──
FROM node:${NODE_VERSION}-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# 容器内需监听 0.0.0.0
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN apt-get update -y && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/* \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
