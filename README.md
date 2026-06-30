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
| `DOCS_SECRETS_FILE_PATH` | 宿主机 secrets 文件路径（Compose 挂载至容器 `/opt/secrets/secrets.json`） | SSO 实例必填 |
| `DOCS_OBSERVABILITY_LOG_ENABLED` | 可观测日志（access / mcp / sso，JSON Lines → stdout + 可选落盘） | 生产默认开启 |
| `DOCS_OBSERVABILITY_LOG_PATH` | 落盘目录（`log-YYYYMMDD.jsonl`）；Compose 宿主机默认 `./logs`，容器内 `/app/logs` | Docker 默认 `./logs` |

> **注意**：`NEXT_PUBLIC_*` 变量在 `next build` 时被内联进静态资源，修改后必须重新构建（`--build`），无法通过热改 `.env` 生效。

### 可观测日志

统一开关 `DOCS_OBSERVABILITY_LOG_ENABLED`、落盘路径 `DOCS_OBSERVABILITY_LOG_PATH`；jsonl 内以 `type` 区分 **access**（Proxy 请求）、**sso**（SSO 门禁）、**mcp**（JSON-RPC 调用）。

#### Access（Proxy 层）

Proxy 层对进入应用的请求输出审计日志：

**stdout**（生产 / 开发统一，TTY 下彩色可读行）：

```
2026-06-30 14:49:58.231 [ACCESS] GET /api/search 200 in 1ms (forward · api) (user:alice · origin:https://cube.example.com) (192.168.10.50 · Mozilla/5.0 ...)
```

**jsonl 落盘**（结构化 JSON，便于检索 / 对接日志平台）：

```json
{"timestamp":1719758400000,"time":"2026-06-30T14:00:00.000Z","type":"access","method":"GET","path":"/api/search","query":"query=foo","status":200,"outcome":"forward","category":"api","durationMs":1,"ip":"192.168.10.50","accessUser":"alice","accessOrigin":"https://cube.example.com","authorization":"DOCSESSION","userAgent":"Mozilla/5.0 ..."}
```

- **生产环境默认开启**，开发环境默认关闭（设 `DOCS_OBSERVABILITY_LOG_ENABLED=true` 可本地调试）
- **stdout** 统一 pretty 可读行（TTY 下彩色；`NO_COLOR=1` 禁用颜色）；**jsonl 落盘**始终为 JSON
- Docker Compose **默认落盘**到项目目录 `logs/log-YYYYMMDD.jsonl`（宿主机 `./logs` 挂载至容器 `/app/logs`）
- 本地调试落盘：设 `DOCS_OBSERVABILITY_LOG_PATH=./logs`（相对进程工作目录）
- 改宿主机落盘路径：在 `.env` 设 `DOCS_OBSERVABILITY_LOG_PATH=/your/host/path`（Compose 卷挂载用；容器内写入路径固定为 `/app/logs`）
- 旧变量 `DOCS_ACCESS_LOG_*` 仍可读（兼容迁移），新部署请改用 `DOCS_OBSERVABILITY_LOG_*`
- 自动跳过 `/health` 与 `/_next/*`，避免探活与静态资源刷屏
- Query 中 `sg` / `sh` / `token` 等敏感参数会脱敏为 `[redacted]`
- `timestamp` 为 Unix 毫秒（UTC，供排序/聚合）；`time` 为 ISO 8601 可读时间；`durationMs` 为 Proxy 层耗时（毫秒）
- `outcome` 反映门禁结果：`forward`（放行）、`prefetch`（Next.js 侧边栏预取汇总）、`ua_denied`、`embed_denied` 等（SSO 门禁见下方 `type: "sso"`）
- Next.js Link **prefetch** 不再逐条记日志；同一触发页在 400ms 静默期后合并为 **一条** `outcome: prefetch`（含 `prefetchCount` / `prefetchSample`）

### SSO 门禁审计

Cube SSO 开启时，Proxy 层 **仅对门禁决策** 记 **`type: "sso"`**（未登录跳转、401 拒绝）；鉴权通过后的文档/API 访问记 **`type: "access"`**（见上方 Access 节）。与 access / mcp 同写 `logs/log-YYYYMMDD.jsonl`：

**stdout（TTY 彩色）：**

```
2026-06-30 15:00:00.000 [SSO] GET /docs/foo 302 in 1ms (redirect · docs · → /auth/login?redirect=…) (127.0.0.1 · Mozilla/5.0…)
2026-06-30 15:00:01.000 [SSO] GET /mcp 401 in 0ms (unauthorized · mcp) (127.0.0.1 · curl/8.7.1)
2026-06-30 15:00:02.000 [ACCESS] GET /docs 200 in 1ms (forward · docs) (user:dev-user · origin:http://127.0.0.1:8765) (127.0.0.1 · …)
```

| 字段 | 说明 |
|------|------|
| `type` | 固定为 `sso` |
| `outcome` | `redirect`（未登录跳转）/ `unauthorized`（401）；已登录放行不再写 `sso`，改记 `access` |
| `redirectTo` | 跳转目标（`redirect` 时，如 `/auth/login?redirect=…`） |
| `category` | 路径分类（`docs` / `mcp` 等） |
| `accessUser` | stdout + jsonl：ACCESSUSER Cookie；无 Cookie 时从 token 解析 |
| `accessOrigin` | stdout + jsonl：ACCESSORIGIN Cookie（魔方来源 URL） |
| `authorization` | **仅 jsonl**：`DOCSESSION` / `DOCMCPTOKEN`（门禁验签通过时） |

**stdout** 只展示 `accessUser` / `accessOrigin`；`authorization` 不落 stdout。

默认共用 `DOCS_OBSERVABILITY_LOG_*` 开关与落盘路径。

### MCP 调用审计

MCP 在 `/mcp` 路由层记录 **JSON-RPC 级**审计（与 Proxy 层 access 互补），含真实 Handler 耗时：

**stdout（TTY 彩色）：**

```
2026-06-30 15:00:00.000 [MCP] tools/call search_docs 200 in 42ms (ok · query=connector, limit=5 · cursor@1.0.0) (user:alice) (127.0.0.1 · …)
```

**jsonl 落盘：** 共用 `logs/log-YYYYMMDD.jsonl`（`type: "mcp"` 区分）

| 字段 | 说明 |
|------|------|
| `type` | 固定为 `mcp` |
| `rpcMethod` | `initialize` / `tools/list` / `tools/call` 等 |
| `tool` | `search_docs`、`get_docs_content` 等（`tools/call` 时） |
| `params` | 工具参数摘要（path/query/limit，不含文档正文） |
| `clientName` / `clientVersion` | MCP 客户端（`initialize` 时） |
| `durationMs` | 完整 MCP 请求耗时 |
| `outcome` | `ok` / `error` / `unauthorized` / `invalid` |
| `accessUser` / `accessOrigin` | stdout + jsonl |
| `authorization` | 仅 jsonl：`DOCSESSION` / `DOCMCPTOKEN` |

默认共用 `DOCS_OBSERVABILITY_LOG_*` 开关与落盘路径。

**Docker 落盘示例（Compose 已默认挂载 `./logs`）：**

```bash
# 首次部署确保目录可写（容器内 nextjs 用户 uid=1001）
mkdir -p logs && chown 1001:1001 logs

# 按天查看 / 检索
tail -f logs/log-$(date -u +%Y%m%d).jsonl
grep '"path":"/api/search"' logs/log-*.jsonl
grep '"type":"mcp"' logs/log-*.jsonl
grep '"type":"sso"' logs/log-*.jsonl
grep '"outcome":"redirect"' logs/log-*.jsonl
grep '"tool":"search_docs"' logs/log-*.jsonl
```

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
DOCS_SECRETS_FILE_PATH=/opt/secrets/secrets.json
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

路径默认读项目根 `.env` 的 `DOCS_SECRETS_FILE_PATH`，可用 `--file` 覆盖。变更后请重启对应 Docker 实例。

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
