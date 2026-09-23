# Changelog

本文件记录 HeroKnowledge 面向使用者的版本变化。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

当前发布版本见 [`package.json`](package.json) 的 `version`（**0.7.0**）。未发布改动记在 **[Unreleased]**，发版时再截成 `## [x.y.z]`。

## [Unreleased]

## [0.7.0] - 2026-09-23

### Added

- `*.md` 用 `:::api-page` 包装官方 Fumadocs `APIPage`，只渲染本页选中的接口。lib 不写 spec 白名单，用哪份文档由页面自己指定。

  指令体是 YAML。`document` 必填。`tag` / `tags`、`operations`、`webhooks` 至少写一类；多类同时写时取并集。

  - `document`：仓库内相对路径，或编译时拉取的 `http(s)` URL。相对路径先相对当前 md，找不到再相对仓库根。只接受 `.json` / `.yaml` / `.yml`。拒绝本机绝对路径。
  - `tag`：一个 tag 名。`tags`：一个名字，或名字数组。命中该 tag 的 path 和 webhook 都会进来。
  - `operations`：`operationId` 字符串，或 `{ path, method }`。`method` 不区分大小写，支持 get / post / put / patch / delete / head / options。
  - `webhooks`：webhook 名或它的 `operationId`，或 `{ name, method }`。
  - `showTitle`：默认 `true`。接口标题进入页面右侧目录。标题优先用 `summary`，否则把 `operationId` 转成可读标题，再否则用 path 或 webhook 名。`false` 时不显示这些标题。
  - `showDescription`：默认 `true`。端点描述紧跟在标题下一行。
  - `headingLevel`：默认 `2`，范围 2–6。决定接口标题相对页面的层级。
  - `playground`：默认 `true`。官方 Playground，文案与站点 UI 一样是中文。鉴权、Path、Query、Body 等折叠面板默认展开，仍可收起。`false` 时不渲染 Playground。
  - `showExample`：默认 `true`。请求代码示例和响应示例都用站点的 `CodeBlockTabs`。多个状态码、同一状态码的多个示例都走这一套标签。`false` 时不渲染这些示例。
  - `server`：覆盖本页 Playground 使用的 Server URL，不改 spec 文件。不写则用 spec 里的 `servers`。
  - `proxy`：Playground 是否经文档站转发。默认不写，等于关闭，浏览器直连 `server`。非必要不要开。
    - 不写：跟随站点开关。站点默认关闭。
    - `false`：本页强制直连，不受站点开关影响。
    - `true`：本页走 `/api/openapi-proxy`。
    - 字符串：改用这个代理路径或 URL。
    - 站点开关：`DOCS_OPENAPI_PROXY_ENABLED=true`，或设置 `DOCS_OPENAPI_PROXY_URL`。允许转发的 origin 默认只有 `http://127.0.0.1:8000` 与 `http://localhost:8000`。额外地址用 `DOCS_OPENAPI_PROXY_ALLOWED_ORIGINS`（逗号分隔）。不在名单里的目标会拒绝转发。

  页面顺序（只作用在这个包装里）：标题和描述、Playground、鉴权、参数、请求体、响应、回调，最后是请求/响应示例。

  `.md` 示例：

  ```md
  :::api-page
  document: ./openapi/rpa-runtime-admin.mvp.json
  tag: 认证
  server: http://127.0.0.1:8000
  proxy: false
  :::
  ```

  同一页的 `llms.mdx` 与 MCP 正文按同一套选择结果写成 Markdown：Server、方法与路径、描述、`operationId`、鉴权、参数表、请求体字段、响应状态与字段。`$ref` 展开到 `components.schemas`。遵守本页的 `showTitle`、`showDescription`、`showExample`、`server`、`headingLevel`。不含 Playground，也不保留指令原文，也不写 `proxy`：

  ```md
  Server: `http://127.0.0.1:8000`

  ## Login

  `POST /api/auth/login`

  用户登录（带登录尝试限制和安全日志）

  operationId: `login_api_auth_login_post`

  ### 请求体

  必填。
  `application/json`
  用户登录请求（账密登录）
  | 字段 | 类型 | 必填 | 说明 |
  | --- | --- | --- | --- |
  | email | string | 是 | 邮箱地址 |
  | password | string | 是 | 密码 |

  ### 响应

  **200** Successful Response
  `application/json`
  Token 响应
  | 字段 | 类型 | 必填 | 说明 |
  | --- | --- | --- | --- |
  | access_token | string | 是 | 访问令牌 |
  | token_type | string | 否 | 令牌类型 |
  | expires_in | integer | 是 | 令牌有效秒数 |
  | user | UserResponse | 是 | 用户信息 |
  ```

### Changed

- 全页 SSO callback 先走用户中心 `userInfoByAuth`，失败再回退 `secrets.json` AES。
- 用户中心地址为 `{DOCS_USER_CENTRE_BASE_URL}/open/oidc/userInfoByAuth`，不再带 `/api` 前缀。
- 跳转与嵌入 Query 增加可选 `saas`，与 `ed` / `sh` / `sg` / `tm` 并列，转成用户中心 `isSaas`。只认 `true` / `false`；不传、空串或其它值都是 `false`，以兼容未带该参数的老链接。去掉环境变量 `DOCS_USER_CENTRE_IS_SAAS`。
- 用户 / `cubeOrigin` 只从用户中心 `userInfoByAuth` 读取，嵌入与 callback Query 不再携带；`cubeOrigin` 缺省时用请求 `Referer` / `Origin` 兜底。
- 用户中心会话标识优先 `customerIdentify`，缺省回退 `tenantId`（再缺省 `orgId`）。`cubeOrigin` 优先读 `data.ext.cubeOrigin`，仍兼容 `data.cubeOrigin` 与 `extraInfo.cubeOrigin`。
- 嵌入通道只认登录包 `ed/sh/sg/tm`（经用户中心校验），不再使用 path HMAC。
- Markdown 配图改为文档站签发的短时 `?sign=` 直链；删除魔方 `docsResources`。
- `docsAuth` 不再接受 `mode=` / `render=`；嵌入只走 `docsContent`。
- 嵌入改为 `mode=page|llms`（page=React，llms=`/llms.mdx`）；MCP 删除 `get_docs_image`，配图统一短时 `?sign=`。
- 嵌入只认 Query 登录包，前端 iframe 直连；不再支持 `X-Cube-*` / `X-Docs-Mode` Header。

## [0.6.6] - 2026-09-14

### Added

- 站点根与展示名改为运行时 `KNOWLEDGE_*`（回退旧 `NEXT_PUBLIC_*`），换域名重启即可，不必重建镜像。
- 浏览器 Sentry 经 `globalThis.__KNOWLEDGE_PUBLIC_CONFIG__` 注入；`SENTRY_DSN` 为运行时，无 token 则跳过 source map。
- OG `/og/docs/...` 改为请求期渲染 + 进程内 LRU / 单飞缓存（`variant + origin + 路径`）。
- [`deploy/dual-instance/`](deploy/dual-instance/)：一次 build、同一镜像、`.env.intranet` + `.env.production` 两容器（3033 无 SSO / 3031 SSO）。
- `deploy/dual-instance/deploy.sh` 与 `scripts/deplpy.sh`：构建前打 `<repo>:previous`；探活成功只留最新镜像；失败自动回退。`.dockerignore` 排除 `logs/`、`.secrets/`。
- 两套部署脚本均支持 `--force`，跳过 Git 更新检查，按当前工作区构建（首次配置或手动重建）。

### Changed

- 根目录 `docker-compose.yml` / `scripts/deplpy.sh` 仍为单实例路径；同机双实例不再要求两套 `COMPOSE_IMAGE`。
- `NODE_ENV=production` 与 `SENTRY_ENVIRONMENT` 解耦；双实例分别用 `intranet` / `production`。
- README 按能力 / 快速开始 / 部署 / FAQ 重排，版本说明迁至本文件。

## [0.6.5] - 2026-09

### Added

- Chat 可按确认打开文档：`openDocumentationPage` 默认右侧预览（`target=peek`），也可左侧整页（`target=main`）。
- 页脚模型展示名：`LLM_MODEL_DISPLAY`（未设则回退 `LLM_MODEL`）。

### Changed

- 连接器调度与前置依赖从 `get_docs_meta` 读取（`dataReady` / `estimatedDuration` / `minInterval` / `references`）。

## [0.6.4] - 2026-09

### Added

- `list_docs` / `listDocumentationPages` 支持 `tag`（分区）与 `prefix`（路径前缀）。

## [0.6.3] - 2026-08

### Changed

- `categoryNav` 只过滤侧栏菜单，不再根据当前文档反向定位芯片。
- 点侧栏时带上当前 `?nav=`，筛选不被路径推断冲掉。

## [0.6.2] - 2026-08

### Changed

- 连接器与授权帮助按平台 CODE / 子平台分层；列表页用 `:::category-filter`（不再用模块网格）。
- 有子平台的站点用文件夹 + `meta.json` / `index.md` 划分（如 `RPA_1688/SZYX`）。
- 原「账密托管」改为 **预策RPA**（`YUCE_RPA`）；概览为「授权类型 + 平台」两级。
- 登录 badge：预策RPA 叶子页为「账密登录」或「扫码登录」（目前仅微信小店为扫码）。
- `/docs/auth/ACCOUNT_PASSWORD/...` 308 到 `/docs/auth/YUCE_RPA/...`。
- 平台图标资源统一 `ICO_` 前缀。

## [0.6.1] - 2026-08

### Changed

- 双栏区分**目录**与**外壳**：默认导航（选择刷新右栏），「锁定右栏」才进入对照（选择改左栏、右栏不动）。
- 顶栏分区整页跳转并关闭双栏；左栏面包屑整页回祖先，无 hover 预览。
- 右栏内链接只改右栏栈；外链仍弹出操作菜单。
- 栏宽不够时目录收成竖轨，hover 再展开；中间可拖动手柄。
- `?peek=` 分享链接在右栏打开目标；带 `#章节` 时滚到对应标题（右栏 id 加 `peek--`）。
- 双栏状态只活在当前会话 RSC 刷新里，浏览器刷新不恢复右栏。
- 打开双栏时 AI 问答带上 `layout: split | sheet` 以及左右栏 `path` / `title` / `url`。
- 章节锚点按吸顶顶栏高度平滑滚动；切文档滚回内容顶部。

## [0.6.0] - 2026-07

### Added

- 文档引用：frontmatter `references` 只声明 `path` + `kind`；正文用 `:::references` 控制位置、`mode`、`prompt`。
- 页底「指标注释」「本文被引用」同一 Tab；右侧目录同级列出并带数量。
- 站内 hover 预览卡：正文无首图时不显示预览图区域。
- `/llms.mdx` 去掉 `fd-steps` 包装，还原有序列表标题。
- 右栏对齐 Copy Markdown、MCP、分享、最后更新。
