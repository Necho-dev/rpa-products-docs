# Cube SSO 集成契约

文档站与魔方 SSO 的对接约定。生产部署前请与魔方侧确认以下项。

## 登录

1. 未认证用户访问文档站 → `/auth/login`
2. 若存在 `ACCESSORIGIN` Cookie → 302 `{cubeOrigin}/api/docsAuth?redirect={站内路径}`
3. 魔方验登录用户 → 302 文档站 `/auth/callback?ed&sh&sg&tm`
4. 文档站验签 → 写 `DOCSESSION` + `ACCESSORIGIN` → 302 目标页

## 登出（必须）

魔方 logout **必须**链式清除文档站 Cookie，否则用户 logout 后文档站仍可使用（浏览器最长约 7 天，MCP Bearer 最长 30 天）。

推荐跳转：

```
GET https://{docs-host}/auth/logout?redirect={encodeURIComponent(cubeOrigin)}
```

示例（魔方 logout 处理逻辑）：

```python
docs_base = os.environ["DOCS_BASE_URL"]  # e.g. https://docs.yucekj.com
cube_origin = "https://cube.yucekj.com"
logout_url = f"{docs_base}/auth/logout?redirect={quote(cube_origin + '/', safe='')}"
return RedirectResponse(logout_url)
```

本地 Mock 已实现：`scripts/mock-cube-docs-auth.py` 的 `/logout` 路由。

## 会话复检

- `DOCS_SESSION_REAUTH_AFTER`（默认 7 天）：浏览器 Session 需重新经 docsAuth
- `DOCS_MCP_TOKEN_TTL`（默认 30 天）：MCP Bearer 独立 TTL，不与 7 天绑定

## 环境变量（SSO 生产）

| 变量 | 必需 | 说明 |
|------|------|------|
| `DOCS_CUBE_SSO_ENABLED` | 是 | `true` |
| `DOCS_SESSION_SECRET` | 是 | 文档站会话签名密钥 |
| `DOCS_SECRETS_FILE` | 是 | 与魔方 `sh` 对应的 secrets.json |
| `NEXT_PUBLIC_SITE_URL` | 是 | canonical URL，影响 MCP aud |
| `DOCS_PRIVATE_ACCESS_TOKEN` | **否** | SSO 下不使用，请勿配置 |

## Nginx

见 [`nginx/docs.conf.example`](nginx/docs.conf.example)：`auth_request /auth/validate` + Set-Cookie 透传。
