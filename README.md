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
| `PORT` | **宿主机**映射端口（容器内固定 `3000`） | 否 |
| `COMPOSE_IMAGE` | Docker 镜像 tag；同机多实例须不同，避免 build 互相覆盖 | 同机多实例时建议 |
| `COMPOSE_CONTAINER_NAME` | 容器名；同机多实例须不同 | 同机多实例时建议 |
| `COMPOSE_PROJECT_NAME` | Compose 项目名；写在 `.env` 自动生效，隔离 network | 同机多实例时建议 |
| `DOCS_SECRETS_HOST_PATH` | 宿主机 secrets 路径，只读挂载进容器 | SSO 实例必填 |

> **注意**：`NEXT_PUBLIC_*` 变量在 `next build` 时被内联进静态资源，修改后必须重新构建（`--build`），无法通过热改 `.env` 生效。

---

## Docker 部署

### 方式一：Docker Compose（推荐）

```bash
# 首次启动（自动构建镜像）
docker compose up -d --build

# 代码或 NEXT_PUBLIC_* 变更后需重建镜像
docker compose up -d --build

# 仅修改了 .env / .env.local 中的运行时变量（LLM_*、DOCS_* 等）
# 使用 up -d 让 Compose 检测 env 变化并重建容器（不要用 restart）
docker compose up -d

# 可先核对 Compose 解析后的配置
docker compose config
```

服务默认绑定宿主机 `3000` 端口，可在 `.env` 中通过 `PORT` 修改映射端口（容器内始终监听 `3000`）。

#### 同机双实例（内网 + 知识库 SSO）

同一仓库、同一 `main` 分支，在两个部署目录（或同一目录两份 `.env`）各起一套容器，仅靠环境变量区分：

| 实例 | 典型端口 | `DOCS_CUBE_SSO_ENABLED` | 说明 |
|------|---------|-------------------------|------|
| RPA 内网文档 | `3033` | `false` | 内网直连，无 SSO 门禁 |
| 预策知识库 | `3031` | `true` | 公网域名反代，需 SSO + secrets |

**内网实例 `.env` 示例：**

```bash
COMPOSE_PROJECT_NAME=rpa-docs-intranet
COMPOSE_IMAGE=rpa-products-docs:intranet
COMPOSE_CONTAINER_NAME=rpa-products-docs-intranet
PORT=3033
NEXT_PUBLIC_SITE_URL=http://192.168.10.199:3033
DOCS_CUBE_SSO_ENABLED=false
```

**知识库 SSO 实例 `.env` 示例：**

```bash
COMPOSE_PROJECT_NAME=rpa-docs-knowledge
COMPOSE_IMAGE=rpa-products-docs:knowledge
COMPOSE_CONTAINER_NAME=rpa-products-docs-knowledge
PORT=3031
NEXT_PUBLIC_SITE_URL=https://knowledge.yuce-tech.cn
DOCS_CUBE_SSO_ENABLED=true
DOCS_SESSION_SECRET=...
DOCS_SECRETS_FILE=/opt/secrets/secrets.json
DOCS_SECRETS_HOST_PATH=/opt/secrets/secrets.json
```

各目录执行 `docker compose up -d --build` 即可。`COMPOSE_IMAGE` / `COMPOSE_CONTAINER_NAME` / `PORT` 在同机部署时必须互不相同。

> 线上从 `knowledge-sso` 分支切到 `main` 前，可保留原分支作回滚；切换验收稳定后再归档该分支。

#### 宿主机 secrets 管理

嵌入验签密钥由宿主机 CLI 维护（只读挂载进容器）：

```bash
./scripts/manage-secrets.sh list
./scripts/manage-secrets.sh add              # 交互输入 App Secret
./scripts/manage-secrets.sh remove <sh前缀>
./scripts/manage-secrets.sh show <sh前缀> --reveal   # 需二次确认
```

路径默认读项目根 `.env` 的 `DOCS_SECRETS_HOST_PATH`，可用 `--file` 覆盖。变更后请重启对应 Docker 实例。

> **注意**：`docker compose restart` 不会重新加载 `env_file`；改 env 后请用 `docker compose up -d`。  
> `NEXT_PUBLIC_*` 在 `next build` 时内联进客户端 bundle，须 `docker compose up -d --build`；服务端通过 `getSiteName()` 等读取的同名变量在 `up -d` 重建后即可更新。

### 构建加速（国内 / 首构建慢）

- **启用 BuildKit**（本 Dockerfile 已使用 `npm` 缓存挂卷，需 BuildKit 才生效；Compose v2+ 一般默认已开）  
  若需显式打开：`export DOCKER_BUILDKIT=1`
- **拉取 `node:22-bookworm-slim` 慢**：在 Docker 守护进程上配置**镜像加速**（如阿里云、DaoCloud 等）指向 Docker Hub 或自建缓存，会显著减少「大层下载」的等待。
- **不在镜像里装 `git` / 不跑 `apt`**：Fumadocs 的「最后更新」在 Docker 构建中通过环境变量 `FUMADOCS_LAST_MODIFIED=fs` 改为**文件 mtime**（见 `source.config.ts`），避免 `fumadocs-mdx` 调 `git log`。本地开发默认仍用 Git 提交时间；若本机无 git 可在 `.env` 设 `FUMADOCS_LAST_MODIFIED=fs`。

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

1. **deps**：`npm ci`（BuildKit 挂载 `~/.npm` 缓存）
2. **builder**：`ENV FUMADOCS_LAST_MODIFIED=fs` + `postinstall` + `next build`，输出 `output: standalone`（不依赖 `git`）
3. **runner**：复制 standalone、`.next/static`、**`.next/cache`** 与 **`src/fonts`**（动态 `quote.png`）；**不跑 `apt`**，用 `useradd`/`groupadd` 创建 `nextjs` 用户

> **OG 预生成**：`next build` 会静态生成 `/og/docs/.../{cover,image,poster}.png`；runner 须携带 `.next/cache`，且 build 阶段建议设置 `NEXT_PUBLIC_SITE_URL`（poster QR 域名）。

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
