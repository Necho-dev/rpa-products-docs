# HeroKnowledge

基于 [Fumadocs](https://fumadocs.vercel.app/) + Next.js 构建的文档站点（HeroKnowledge），支持本地开发、静态构建与 Docker 部署。当前版本 **0.6.5**。

---

## 对话与 MCP 工具（0.6.4 / 0.6.5）

- Chat 可按确认打开文档：`openDocumentationPage` 默认右侧预览（`target=peek`），也可左侧整页（`target=main`）
- `list_docs` / `listDocumentationPages` 支持 `tag`（分区）与 `prefix`（路径前缀）
- 连接器调度与前置依赖从 `get_docs_meta` 读取（`dataReady` / `estimatedDuration` / `minInterval` / `references`）
- 页脚模型展示名可用 `LLM_MODEL_DISPLAY`（未设则回退 `LLM_MODEL`）

## 分类导航（0.6.3）

`categoryNav` 只过滤侧栏菜单，不再根据当前文档反向定位芯片。点侧栏时会带上当前 `?nav=`，筛选不会被路径推断冲掉。

## 文档目录与授权帮助（0.6.2）

连接器与授权帮助按**平台 CODE / 子平台**分层，列表页用 `:::category-filter` 筛选（不再用模块网格）。

| 能力 | 行为 |
|------|------|
| RPA 目录 | 有子平台的站点用文件夹 + `meta.json` / `index.md` 划分（如 `RPA_1688/SZYX`）；路径可由平台 CODE 推导 |
| 授权帮助 | 原「账密托管」改为 **预策RPA**（`YUCE_RPA`）；概览为「授权类型 + 平台」两级，卡片直达授权正文 |
| 登录 badge | 预策RPA 叶子页为「账密登录」或「扫码登录」（目前仅微信小店为扫码） |
| 旧链 | `/docs/auth/ACCOUNT_PASSWORD/...` 308 到 `/docs/auth/YUCE_RPA/...` |
| 平台图标 | 资源文件统一 `ICO_` 前缀 |

## 阅读体验（0.6.1）

在 0.6.0 之上，双栏区分**目录**与**外壳**：默认是导航（选择刷新右栏），「锁定右栏」才进入对照（选择改左栏、右栏不动）。

| 入口 | 未锁定（导航） | 锁定右栏（对照） |
|------|----------------|------------------|
| 侧栏、平台模块卡片、正文站内链接、授权/引用卡片 | 覆盖右栏，地址栏仍是左栏页 | 左栏整页跳转，右栏保持 |
| 右栏内链接与右栏面包屑 | 只改右栏栈（可后退） | 同左 |
| 顶栏分区（首页 / RPA 连接器 / 授权帮助） | 整页跳转并**关闭双栏** | 同左 |
| 左栏面包屑 | 整页回到祖先并关闭双栏；**无 hover 预览** | 同左 |
| 外链 | 仍弹出操作菜单 | 同左 |

单栏时：正文链接仍打开右侧并排（窄屏为浮层）；模块卡片仍整页打开。分屏打开后，卡片才走右栏。右栏按钮文案为「锁定右栏」/「取消锁定」。悬停工具条「左栏 / 右栏 / 整屏」语义不变。

0.6.0 已有能力：

| 能力 | 行为 |
|------|------|
| 文档引用 | frontmatter `references` 只声明 `path` + `kind`（供「本文被引用」反查）；正文用 `:::references` 控制位置、`mode`、`prompt`。未放置则不出卡片。 |
| 页底元信息 | 「指标注释」「本文被引用」同一 Tab 模块；右侧目录同级列出并带数量，中间短线靠左向右淡出 |
| 链接预览 | 站内 hover 卡：正文无首图时不显示预览图区域 |
| LLM 导出 | `/llms.mdx` 去掉 `fd-steps` 包装，还原 `1.` / `2.` 标题 |

双栏中间有可拖动手柄，拖动时列宽即时跟随指针。右栏正文与左栏对齐：Copy Markdown、MCP、分享、最后更新。栏宽不够时目录收成钉钉式竖轨，hover 再展开完整大纲。

`?peek=` 分享链接会在右栏打开目标文档；带 `#章节` 时滚到对应标题（右栏标题 id 加 `peek--` 前缀，避免与左栏抢锚点）。双栏状态只活在当前会话的 RSC 刷新里，**浏览器刷新不会恢复右栏**。打开双栏时 AI 问答会带上 `layout: split \| sheet` 以及左右栏 `path` / `title` / `url`，便于指「这篇 / 左边 / 右边」。

目录与页内章节锚点会平滑滚到标题处；停靠位置按当前吸顶顶栏的实际高度计算。切换文档会滚回真正的内容顶部（`html` 不用平滑滚动，避免半途停下）。

---

## 目录结构

```
documents/
├── content/
│   └── docs/                    # 文档正文（Markdown / MDX）
│       ├── meta.json            # 顶层导航：./rpa、./auth
│       ├── _public/             # 跨文档区共享静态资源（平台图标等）
│       ├── rpa/                 # RPA 连接器文档（主仓库跟踪）
│       │   ├── index.mdx
│       │   ├── meta.json
│       │   ├── RPA_*/           # 各平台连接器
│       │   └── _public/         # rpa 区图片等
│       └── auth/                # 授权帮助（Git Submodule → connectors-auth-docs）
│           ├── index.mdx
│           ├── meta.json
│           ├── YUCE_RPA/
│           ├── ISV/
│           ├── SELF_DEVELOPED/
│           └── _public/
├── scripts/
│   └── deplpy.sh                # 1Panel 拉取主仓 + Submodule 并重建
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
├── .gitmodules                  # Submodule 定义（auth 使用 SSH URL）
├── Dockerfile                   # 多阶段 Docker 构建
├── docker-compose.yml           # Compose 一键部署配置
├── .env.example                 # 环境变量模板
├── next.config.mjs              # Next.js 配置
├── source.config.ts             # Fumadocs 内容源配置
└── package.json
```

> **文档内容维护**：编辑 `content/docs/rpa/` 或 `content/docs/auth/` 下的 `.md` / `.mdx` 即可。`auth` 为独立仓库，改完后需在 Submodule 目录内单独 commit / push。

---

## 本地开发

### 前置要求

- Node.js ≥ 20
- npm ≥ 10
- 克隆时带上 Submodule（见下方「常见问题」），否则 `/docs/auth` 无内容

### 安装依赖

```bash
npm install
```

`postinstall` 钩子会自动运行 `fumadocs-mdx`，生成类型声明文件。

### 启动开发服务器

```bash
npm run dev
```

默认监听 [http://localhost:3000](http://localhost:3000)，修改 `content/docs/` 内容后热更新生效。可抽检：

- [/docs/rpa](http://localhost:3000/docs/rpa)
- [/docs/auth](http://localhost:3000/docs/auth)

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
| `DOCS_SECRETS_FILE_PATH` | secrets JSON 文件路径（应用与 `manage-secrets.sh` 读写）；容器内固定 `/opt/secrets/secrets.json` | SSO 实例必填 |
| `DOCS_SECRETS_DIR` | **宿主机** secrets 目录（Compose 挂载至容器 `/opt/secrets`）；目录内须有 `secrets.json` | Docker SSO 实例必填 |
| `DOCS_OBSERVABILITY_LOG_ENABLED` | 可观测日志（access / mcp / sso / secrets，JSON Lines → stdout + 可选落盘） | 生产默认开启 |
| `DOCS_OBSERVABILITY_LOG_PATH` | 落盘目录（`log-YYYYMMDD.jsonl`）；Compose 宿主机默认 `./logs`，容器内 `/app/logs` | Docker 默认 `./logs` |
| `SENTRY_DSN` | Sentry DSN；未设置则关闭 Sentry。build 期内联到客户端（改后须重建） | 可选 |
| `SENTRY_ENVIRONMENT` | Sentry environment，默认 `dev` | 否 |
| `SENTRY_AUTH_TOKEN` | 构建期上传 source map（自托管 `SENTRY_URL` + `SENTRY_ORG` / `SENTRY_PROJECT`） | 可选 |

> **注意**：`NEXT_PUBLIC_*` 与经 `next.config` `env` 内联的变量（含 `SENTRY_DSN`）在 `next build` 时写入静态资源，修改后必须重新构建（`--build`），无法通过热改 `.env` 生效。

### Sentry

接入 `@sentry/nextjs`（项目 `knowledge` @ `https://sentry.yuce-tech.cn`）。**未配置 `SENTRY_DSN` 时不初始化 SDK。**

- **Errors**：`global-error.tsx` + `onRequestError`
- **Tracing**：服务端请求 / 客户端路由导航；全局采样由 `SENTRY_TRACES_SAMPLE_RATE` 控制（默认 `1`）。导出前用 `http.target` 把 SDK 默认的 `middleware GET` / `GET /docs/[[...slug]]` 改成真实路径（见 `registerReadableTraceNameHooks`）。`cube.origin` / `client.ip` / `browser.name` 等会写到 **span attributes + isolation tags**（`attachTraceContext`），可在 Explore Traces 中 Group By
- **Session Replay**：会话 100%、出错会话 100%；同源隧道 `/monitoring`（已从 Proxy SSO matcher 排除）。**客户端 DSN 须 build 期静态内联**（`process.env.SENTRY_DSN`，禁动态 key）
- **Logs**：三端 `enableLogs` + `consoleLoggingIntegration`（warn/error）
- **业务审计（Sentry Logs）**（目录 `src/lib/observability/sentry/`）：与本地 `DOCS_OBSERVABILITY_LOG_*` **解耦**，仅由 `SENTRY_DSN` 开关
  - `docs.view`：真实文档浏览（`/docs`、`/embed/docs`；排除 prefetch）
  - `mcp.call`：已鉴权的 MCP `tools/call`
  - `mcp.deny`：MCP Token / 未登录拒绝（扫描、过期 token）
  - `sso.redirect` / `sso.deny`：SSO 门禁拦截（踢登录 / 401；`pass` 不上报）
  - `auth.deny`：UA / 嵌入验签 / OG 等 Proxy 拒绝（`auth.reason`）
- **AI Monitoring**：`vercelAIIntegration`；chat / ai-answer 在 DSN 存在时开 `experimental_telemetry`
- **MCP Monitoring**：`wrapMcpServerWithSentry`（`/mcp`）产生 `mcp.server` spans，进入 Insights → AI / MCP；业务审计 Logs 另记 `mcp.call` / `mcp.deny`

SDK 入口：`src/instrumentation.ts`、`src/instrumentation-client.ts`、`src/sentry.server.config.ts`、`src/sentry.edge.config.ts`。业务审计入口：`src/lib/observability/sentry/`。

### 可观测日志

统一开关 `DOCS_OBSERVABILITY_LOG_ENABLED`、落盘路径 `DOCS_OBSERVABILITY_LOG_PATH`；jsonl 内以 `type` 区分 **access**（Proxy 请求）、**sso**（SSO 门禁）、**mcp**（JSON-RPC 调用）、**secrets**（密钥文件加载 / mtime 热重载）。

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

### Secrets 加载 / 热重载审计

应用按 `secrets.json` 的 **mtime** 失效内存缓存；Compose 使用 `DOCS_SECRETS_DIR` **目录挂载**后，宿主机 `manage-secrets.sh add/remove` 无需重启容器。加载与重载写 **`type: "secrets"`**（不含明文密钥）：

**stdout（TTY 彩色）：**

```
2026-06-30 15:00:00.000 [SECRETS] load count=2 /opt/secrets/secrets.json
2026-06-30 15:05:00.000 [SECRETS] reload count=2→3 (+1) /opt/secrets/secrets.json
2026-06-30 15:06:00.000 [SECRETS] reload count=3→1 (-2) /opt/secrets/secrets.json
```

| 字段 | 说明 |
|------|------|
| `type` | 固定为 `secrets` |
| `outcome` | `load`（首次）/ `reload`（mtime 变更）/ `empty`（文件不存在） |
| `path` | 容器内 secrets 文件路径 |
| `secretCount` | 当前密钥条数（加载/重载后） |
| `previousCount` | 变更前条数（仅 `reload`，或由有密钥变为文件缺失的 `empty`） |
| `delta` | `secretCount - previousCount`（有 `previousCount` 时） |
| `mtimeMs` | 文件 mtime（毫秒） |

默认共用 `DOCS_OBSERVABILITY_LOG_*` 开关与落盘路径（stdout + `log-YYYYMMDD.jsonl`）。

**Docker 落盘示例（Compose 已默认挂载 `./logs`）：**

```bash
# 镜像 entrypoint 启动时会 chown /app/logs → nextjs(1001)；若仍 EACCES（如 NFS root_squash），宿主机手动：
mkdir -p logs && chown 1001:1001 logs

# 按天查看 / 检索
tail -f logs/log-$(date -u +%Y%m%d).jsonl
grep '"path":"/api/search"' logs/log-*.jsonl
grep '"type":"mcp"' logs/log-*.jsonl
grep '"type":"sso"' logs/log-*.jsonl
grep '"type":"secrets"' logs/log-*.jsonl
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
DOCS_SECRETS_DIR=/opt/secrets
DOCS_SECRETS_FILE_PATH=/opt/secrets/secrets.json
```

各目录执行 `docker compose up -d --build` 即可。`COMPOSE_IMAGE` / `COMPOSE_CONTAINER_NAME` / `PORT` 在同机部署时必须互不相同。

> 线上从 `knowledge-sso` 分支切到 `main` 前，可保留原分支作回滚；切换验收稳定后再归档该分支。

#### 宿主机 secrets 管理

嵌入验签密钥由宿主机 CLI 维护（**目录**只读挂载进容器；应用按文件 mtime 热加载，**add/remove 后无需重启**）：

```bash
./scripts/manage-secrets.sh list
./scripts/manage-secrets.sh add              # 交互输入 App Secret
./scripts/manage-secrets.sh remove <sh前缀>
./scripts/manage-secrets.sh show <sh前缀> --reveal   # 需二次确认
./scripts/manage-secrets.sh fix-perms        # 修复已有文件的容器可读权限（nextjs 1001:1001）
```

路径默认读项目根 `.env` 的 `DOCS_SECRETS_FILE_PATH`，可用 `--file` 覆盖。`add` / `remove` 写入后会自动 `chown` 为容器用户（默认 `1001:1001`，可用 `DOCS_SECRETS_UID` / `DOCS_SECRETS_GID` 覆盖）。

Compose 使用 `DOCS_SECRETS_DIR`（默认 `/opt/secrets`）挂载整个目录到容器 `/opt/secrets`，容器内文件路径固定为 `/opt/secrets/secrets.json`。勿再使用单文件 bind mount，否则宿主机 `mv` 换 inode 后容器可能读不到更新。

应用侧首次加载与 mtime 热重载会写 `type=secrets` 到可观测日志（stdout + `log-YYYYMMDD.jsonl`）。

> 若 SSO callback 报 `EACCES: permission denied, open '/opt/secrets/secrets.json'`，在宿主机执行 `sudo ./scripts/manage-secrets.sh fix-perms`；权限修复后下一次验签即可（无需重启）。

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

> **OG 图片**：`next build` 静态预生成 `/og/docs/.../{cover,image,poster}.png`（`generateStaticParams` + Full Route Cache）；runner 须携带 `.next/cache`，build 阶段建议设置 `NEXT_PUBLIC_SITE_URL`（poster QR 域名）。选词分享图 `/og/docs/.../quote.png` 为运行时动态渲染（内部 rewrite 至 `/og/quote`）；预签名由 `POST /api/docs/quote-pre-signed` 在服务端生成（需 `DOCS_QUOTE_SIGN_SECRET`）。

---

## 常见问题

**Q：修改了文档内容，Docker 容器需要重启吗？**

需要重新构建镜像（`docker compose up -d --build`），因为文档内容在构建时被静态化处理。

**Q：`npm run dev` 报 `Cannot find module '.fumadocs-mdx/...'`？**

重新运行 `npm install`，`postinstall` 会重新生成 fumadocs 类型文件。

**Q：如何在新机器上克隆并启动？**

文档分区：

| 路径 | 站点路由 | 归属 |
|------|----------|------|
| `content/docs/rpa/` | `/docs/rpa` | 主仓库 |
| `content/docs/auth/` | `/docs/auth` | Submodule：[connectors-auth-docs](https://codeup.aliyun.com/yuce-tech/knowledge/connectors-auth-docs)（`.gitmodules` 为 SSH：`git@codeup.aliyun.com:yuce-tech/knowledge/connectors-auth-docs.git`） |

```bash
# 必须带 --recurse-submodules，否则 auth 目录为空
git clone --recurse-submodules <主仓库地址>
cd rpa-products-docs   # 或本地 monorepo 下的 documents/
npm install
npm run dev
```

已有克隆补拉 Submodule：

```bash
git submodule sync --recursive
git submodule update --init --recursive
```

本地需能访问云效：HTTPS（凭据）与/或 SSH 公钥均可；服务器部署推荐 SSH Deploy Key（主仓 + auth 仓都要有读权限）。

**Q：如何单独更新授权文档（auth Submodule）？**

```bash
cd content/docs/auth
# 编辑后…
git add -A && git commit -m "docs: …" && git push origin main
cd ../../..
# 若要把主仓锁定的 gitlink 钉到新版本：
git add content/docs/auth && git commit -m "chore: bump auth submodule"
```

1Panel 上的 [`scripts/deplpy.sh`](scripts/deplpy.sh) 会跟踪 auth 远程 tip，**即使主仓未 bump gitlink**，auth 有更新也会重建发布。

脚本在构建前后会做 **Sentry DSN 内联检查**：

- `SENTRY_DSN` 必须写在项目根 **`.env`**（只写 `.env.local` 会直接失败并提示）
- 启动时把 `.env` 中的构建相关键 **export** 进当前进程（避免 1Panel/cron 空环境变量盖掉 Compose 插值）
- 用 `docker compose config --format json` 校验 `build.args.SENTRY_DSN` 非空
- 若 `.env` 已配置 DSN 但当前镜像未内联 → **即使代码无变更也会强制 `--build`**
- `up -d --build` 完成后再次 `grep` 镜像内 **`/app/.next/static`**（客户端包；服务端有 DSN 不算），失败则部署中止

**Q：1Panel 自动部署如何配置分支？**

[`scripts/deplpy.sh`](scripts/deplpy.sh) 用环境变量覆盖（默认均为 `main`）：

| 变量 | 含义 |
|------|------|
| `DEPLOY_PATH` | 服务器上的仓库目录 |
| `BRANCH` | 主仓跟踪分支 |
| `AUTH_BRANCH` | auth Submodule 跟踪分支 |

脚本内 `SUBMODULES` 为 `path|branch` 列表，当前仅登记 auth；日后若把 rpa 也拆成 Submodule，追加一行即可。主仓或任一已登记 Submodule 有远程更新时会 `docker compose up -d --build`。

首次拉到含 Submodule 的提交后，在服务器执行一次 `git submodule update --init --recursive`（或直接跑一遍 `deplpy.sh`）。
