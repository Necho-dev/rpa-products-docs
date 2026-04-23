# RPA Hero 文档站

基于 [Fumadocs](https://fumadocs.vercel.app/) + Next.js 构建的文档站点，支持本地开发、静态构建与 Docker 部署。

---

## 目录结构

```
documents/
├── content/
│   └── docs/                   # 文档正文（Markdown / MDX）
│       ├── index.mdx            # 文档首页
│       ├── meta.json            # 侧边栏顺序与分组配置
│       ├── apps/                # 应用相关文档
│       ├── components/          # 组件相关文档
│       ├── connectors/          # 连接器相关文档
│       ├── changelogs.md        # 更新日志
│       └── public/              # 文档内静态资源（图片等）
├── src/
│   ├── app/                     # Next.js App Router 路由
│   │   ├── layout.tsx           # 根布局（字体、主题）
│   │   ├── global.css           # 全局样式 + Tailwind
│   │   ├── docs/                # /docs/* 文档页路由
│   │   ├── og/                  # OG 图片生成路由
│   │   ├── api/                 # API 路由（搜索、AI 问答、MCP）
│   │   └── ...
│   ├── components/              # 共享 React 组件
│   ├── fonts/                   # 本地字体文件（woff2 + TTF）
│   ├── lib/                     # 工具函数、source 配置
│   └── server/                  # 服务端专用逻辑
├── Dockerfile                   # 多阶段 Docker 构建
├── docker-compose.yml           # Compose 一键部署配置
├── .env.example                 # 环境变量模板
├── next.config.mjs              # Next.js 配置
├── source.config.ts             # Fumadocs 内容源配置
└── package.json
```

> **文档内容维护**：只需编辑 `content/docs/` 下的 `.md` / `.mdx` 文件，无需修改 `src/` 中的代码。

---

## 本地开发

### 前置要求

- Node.js ≥ 20
- npm ≥ 10

### 安装依赖

```bash
npm install
```

`postinstall` 钩子会自动运行 `fumadocs-mdx`，生成类型声明文件。

### 启动开发服务器

```bash
npm run dev
```

默认监听 [http://localhost:3000](http://localhost:3000)，修改 `content/docs/` 内容后热更新生效。

### 其他常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（热更新） |
| `npm run build` | 生产构建（输出 `.next/standalone`） |
| `npm run start` | 本地预览生产构建结果 |
| `npm run types:check` | 类型检查（含 MDX 类型生成） |
| `npm run lint` | ESLint 代码检查 |

---

## 环境变量

复制模板后按需填写：

```bash
cp .env.example .env
```

| 变量 | 说明 | 是否必填 |
|------|------|----------|
| `NEXT_PUBLIC_SITE_URL` | 站点公开 URL，用于 RSS / OG / MCP 绝对链接生成 | 建议生产环境设置 |
| `PORT` | 容器/进程监听端口，默认 `3000` | 否 |

> **注意**：`NEXT_PUBLIC_*` 变量在 `next build` 时被内联进静态资源，修改后必须重新构建（`--build`），无法通过热改 `.env` 生效。

---

## Docker 部署

### 方式一：Docker Compose（推荐）

```bash
# 首次启动（自动构建镜像）
docker compose up -d

# 代码或 NEXT_PUBLIC_* 变更后需重建镜像
docker compose up -d --build

# 仅修改了 .env 中的运行时变量（非 NEXT_PUBLIC_*）
# 不需要重建镜像，只需重启容器
docker compose up -d
```

服务默认绑定宿主机 `3000` 端口，可在 `.env` 中通过 `PORT` 变量修改映射端口。

### 构建加速（国内 / 首构建慢）

- **启用 BuildKit**（本 Dockerfile 已使用 `npm` 缓存挂卷，需 BuildKit 才生效；Compose v2+ 一般默认已开）  
  若需显式打开：`export DOCKER_BUILDKIT=1`
- **拉取 `node:22-bookworm-slim` 慢**：在 Docker 守护进程上配置**镜像加速**（如阿里云、DaoCloud 等）指向 Docker Hub 或自建缓存，会显著减少「大层下载」的等待。
- **避免重复 `apt-get`**：当前 Dockerfile 在依赖与构建阶段**不再**安装 `ca-certificates`（`node:bookworm-slim` 已含运行 Node 与访问 npm 所需根证书；运行阶段用 `useradd` 建非 root 用户，**不跑** `apt`），避免以前每个 stage 各花几分钟连 `deb.debian.org` 的问题。

### 方式二：手动 docker build

```bash
# 在 documents/ 目录下执行
docker build \
  --build-arg NEXT_PUBLIC_SITE_URL=https://docs.example.com \
  -t rpa-products-docs:latest .

docker run -d \
  -p 3000:3000 \
  -e NODE_ENV=production \
  --name rpa-products-docs \
  rpa-products-docs:latest
```

### 构建说明

Dockerfile 采用三阶段构建：

1. **deps**：`npm ci`（BuildKit 挂载 `~/.npm` 缓存；不跑 `apt`）
2. **builder**：`postinstall` + `next build`，输出 `output: standalone`
3. **runner**：复制 standalone 与静态资源；**不跑 `apt`**，用 `useradd`/`groupadd` 创建 `nextjs` 用户

---

## 常见问题

**Q：修改了文档内容，Docker 容器需要重启吗？**

需要重新构建镜像（`docker compose up -d --build`），因为文档内容在构建时被静态化处理。

**Q：`npm run dev` 报 `Cannot find module '.fumadocs-mdx/...'`？**

重新运行 `npm install`，`postinstall` 会重新生成 fumadocs 类型文件。

**Q：如何在新机器上克隆并启动？**

```bash
# 主仓库包含此目录为 submodule，克隆时需带 --recurse-submodules
git clone --recurse-submodules <主仓库地址>
cd rpa-hero-products/documents
npm install
npm run dev
```
