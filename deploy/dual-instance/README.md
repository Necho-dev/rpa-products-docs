# 一镜像、两容器（intranet + production）

同一份 Docker 镜像、一次 `next build`，用两份运行时 env 拉起两个容器：

| 服务 | 默认端口 | SSO | 说明 |
|------|----------|-----|------|
| `intranet` | `3033` | 关 | 内网直连，不挂 secrets |
| `production` | `3031` | 开 | 公网知识库，挂 `/opt/secrets` |

根目录的 `docker-compose.yml` / `scripts/deplpy.sh` 仍是单实例路径，互不影响。

## 文件

| 文件 | 用途 |
|------|------|
| `.env` | Compose 插值：镜像名、端口、日志目录、`PRODUCTION_SECRETS_DIR`、构建期 `SENTRY_AUTH_*` |
| `.env.intranet` | 仅 intranet 容器（`KNOWLEDGE_*`、`SENTRY_ENVIRONMENT=intranet`） |
| `.env.production` | 仅 production 容器（SSO + `SENTRY_ENVIRONMENT=production`） |
| `deploy.sh` | 检查主仓 / auth submodule；有更新则一次 `--build` 并滚动两个容器。`--force` 跳过检查 |

`env_file` 不会改 YAML 里的 `${INTRANET_PORT}`。改端口或宿主机挂载请编辑 `.env`，不要写在实例文件里。

## 首次启动

```bash
cd deploy/dual-instance
cp .env.example .env
cp .env.intranet.example .env.intranet
cp .env.production.example .env.production
# 按需改 KNOWLEDGE_SITE_URL、LLM_*、DOCS_SESSION_SECRET、SENTRY_DSN
./deploy.sh --force
```

只起一个实例：`docker compose up -d intranet`。

改运行时变量后用 `docker compose up -d`（不要 `restart`），不必 `--build`。

### production secrets

宿主机目录由 `.env` 的 `PRODUCTION_SECRETS_DIR`（默认 `/opt/secrets`）挂到容器 `/opt/secrets`，文件名固定 `secrets.json`。

在仓库根维护：

```bash
./scripts/manage-secrets.sh --file /opt/secrets/secrets.json list
./scripts/manage-secrets.sh --file /opt/secrets/secrets.json add
```

intranet 不读这套密钥。

## 滚动更新（1Panel / cron）

```bash
# 仓库根可用 DEPLOY_PATH 覆盖（默认：本脚本的 ../..）
/path/to/repo/deploy/dual-instance/deploy.sh
```

无远程更新时跳过构建。首次配置或只想按当前代码重建时：`./deploy.sh --force`（不 fetch / 不 pull）。切到本方案后，不要再跑根目录 `scripts/deplpy.sh`，以免单实例容器名冲突。

构建前会把当前 `COMPOSE_IMAGE` 另打为 `<repo>:previous`。两个容器都 healthy 之后只保留最新镜像（去掉 `:previous`、同仓库其它标签、dangling 层和未用 BuildKit 缓存）。探活失败则自动 `docker tag :previous` 回退并 `compose up -d`；回退成功后同样只留这一版。可用 `HEALTH_WAIT_SECONDS`（默认 180）拉长探活等待。

## 抽检

```bash
curl -sS http://127.0.0.1:3033/health   # cubeSsoEnabled=false
curl -sS http://127.0.0.1:3031/health   # cubeSsoEnabled=true
docker compose config                   # 两服务 image 相同，仅 intranet 有 build
```
