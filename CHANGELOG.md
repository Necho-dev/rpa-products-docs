# Changelog

本文件记录 HeroKnowledge 面向使用者的版本变化。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

当前发布版本见 [`package.json`](package.json) 的 `version`（**0.6.6**）。未发布改动记在 **[Unreleased]**，发版时再截成 `## [x.y.z]`。

## [Unreleased]

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
