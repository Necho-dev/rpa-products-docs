#!/usr/bin/env python3
"""
本地 Mock：对齐 Java RemoteDocsController（docsAuth / docsContent / logout）。

真实魔方在 docsAuth 服务端用 LoginContext 识别已登录用户，不向文档站透传 Session Cookie；
本 Mock 同样假定调用 docsAuth 时用户已在魔方侧登录，仅用 MOCK_CUBE_USER 写入加密载荷。

────────────────────────────────────────────────────────────────────────
双通道 Mock 说明

通道 B（SSO 全页）：
  /docsAuth?redirect=/docs                → 302 callback → 全页 HTML

通道 A 方案 A（扩展 docsAuth + render）：
  /docsAuth?redirect=/docs/xxx&render=html     → 服务端拉取文档 → 200 HTML
  /docsAuth?redirect=/docs/xxx&render=markdown → 服务端拉取文档 → 200 Markdown

通道 A 方案 B（独立 docsContent 接口）：
  /docsContent?path=/docs/xxx&render=html      → 服务端拉取文档 → 200 HTML
  /docsContent?path=/docs/xxx&render=markdown  → 服务端拉取文档 → 200 Markdown

两方案在文档站侧完全一致（均通过 X-Render-Mode + BFF 签名访问），
魔方侧只需选一种暴露给前端即可。
────────────────────────────────────────────────────────────────────────

依赖:
  python3 -m pip install fastapi uvicorn pycryptodome httpx

用法:
  cd documents
  python3 scripts/mock-cube-docs-auth.py

环境变量（均可选）:
  MOCK_CUBE_APP_SECRET     与 docs secrets.json 中 sh 对应的明文密钥
  MOCK_CUBE_SECRETS_FILE   默认 .secrets/dev-secrets.json（取首个 value）
  MOCK_CUBE_DOCS_BASE_URL  文档站根地址，默认 http://127.0.0.1:3000
  MOCK_CUBE_BASE_HOST      cubeOrigin / 错误回跳，默认 http://127.0.0.1:8765
  MOCK_CUBE_USER           模拟魔方当前登录用户名，默认 dev-user
  MOCK_CUBE_HOST           监听地址，默认 0.0.0.0
  MOCK_CUBE_PORT           监听端口，默认 8765

文档站需开启:
  DOCS_CUBE_SSO_ENABLED=true
  DOCS_SECRETS_FILE=.secrets/dev-secrets.json

联调 — SSO 全页:
  http://127.0.0.1:8765/docsAuth?redirect=/docs

联调 — 嵌入 Markdown（方案 A）:
  http://127.0.0.1:8765/docsAuth?redirect=/docs/connectors/rpa-conn-qianniu-all&render=markdown

联调 — 嵌入 HTML（方案 A）:
  http://127.0.0.1:8765/docsAuth?redirect=/docs/connectors/rpa-conn-qianniu-all&render=html

联调 — 嵌入 HTML（方案 B）:
  http://127.0.0.1:8765/docsContent?path=/docs/connectors/rpa-conn-qianniu-all&render=html

联调 — 退出:
  http://127.0.0.1:8765/logout
  → 文档站 /auth/logout?redirect=http://127.0.0.1:8765/
"""

from __future__ import annotations

import hashlib
import json
import os
import posixpath
import sys
import time
from pathlib import Path
from typing import Any, Optional
from urllib.parse import quote, urlencode

import httpx
import uvicorn
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad
from fastapi import FastAPI, Query
from fastapi.responses import HTMLResponse, PlainTextResponse, RedirectResponse, Response

ROOT = Path(__file__).resolve().parents[1]


def _env(key: str, default: Optional[str] = None) -> Optional[str]:
    raw = os.environ.get(key)
    if raw is None:
        return default
    raw = raw.strip()
    return raw or default


def _load_app_secret() -> str:
    explicit = _env("MOCK_CUBE_APP_SECRET")
    if explicit:
        return explicit

    secrets_file = Path(_env("MOCK_CUBE_SECRETS_FILE", str(ROOT / ".secrets/dev-secrets.json")))
    if not secrets_file.is_file():
        raise RuntimeError(
            f"未找到密钥文件 {secrets_file}，请设置 MOCK_CUBE_APP_SECRET 或创建 dev secrets"
        )
    data: dict[str, Any] = json.loads(secrets_file.read_text(encoding="utf-8"))
    for value in data.values():
        if isinstance(value, str) and value:
            return value
    raise RuntimeError(f"{secrets_file} 中无有效密钥")


def sha256_hex(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def bff_signature(method: str, path: str, timestamp: int, app_secret: str) -> str:
    """
    BFF → 文档站嵌入请求签名算法（与 cube-embed.ts 对齐）：
      SHA256(METHOD + "\\n" + PATH + "\\n" + TIMESTAMP + "\\n" + APP_SECRET)  hex
    """
    payload = f"{method}\n{path}\n{timestamp}\n{app_secret}"
    return sha256_hex(payload)


def build_signed_docs_embed_url(docs_path: str, render: str) -> str:
    """构建带 Query 签名的文档站嵌入 URL（供浏览器 iframe src 直连文档站）。"""
    docs_base = DOCS_BASE_URL.rstrip("/")
    sh = sha256_hex(APP_SECRET)
    timestamp = int(time.time() * 1000)
    sg = bff_signature("GET", docs_path, timestamp, APP_SECRET)
    cube_origin = CUBE_BASE_HOST.rstrip("/")
    query = urlencode(
        {
            "render": render,
            "sh": sh,
            "tm": str(timestamp),
            "sg": sg,
            "user": MOCK_USER,
            "cubeOrigin": cube_origin,
        },
        quote_via=quote,
    )
    return f"{docs_base}{docs_path}?{query}"


def build_iframe_src(path: str, render: str, auth: str) -> str:
    """
    嵌入 iframe src（html | markdown 均支持）：
    - auth=query：浏览器跨域直连文档站（Query 凭证）
    - auth=header：同源加载 Mock /docsContent（BFF 服务端带头请求文档站）
    """
    if render not in ("html", "markdown"):
        return ""
    if auth == "query":
        return build_signed_docs_embed_url(path, render)
    proxy_query = urlencode({"path": path, "render": render, "auth": auth}, quote_via=quote)
    return f"/docsContent?{proxy_query}"


def fetch_embed_content(docs_path: str, render: str, *, auth_via_query: bool = False) -> Response:
    """
    方案 A 嵌入分支 & 方案 B 共用：魔方 BFF 服务端向文档站发起请求，返回文档正文。

    auth_via_query=False（默认）：凭证走 HTTP Header（X-Cube-*）
    auth_via_query=True：凭证走 URL Query（sh/tm/sg/render/user），与 SSO callback 字段对齐，便于魔方复用现有封装
    """
    docs_base = DOCS_BASE_URL.rstrip("/")
    parsed_path = docs_path

    sh = sha256_hex(APP_SECRET)
    timestamp = int(time.time() * 1000)
    sg = bff_signature("GET", parsed_path, timestamp, APP_SECRET)

    cube_origin = CUBE_BASE_HOST.rstrip("/")
    if auth_via_query:
        query = urlencode(
            {
                "render": render,
                "sh": sh,
                "tm": str(timestamp),
                "sg": sg,
                "user": MOCK_USER,
                "cubeOrigin": cube_origin,
            },
            quote_via=quote,
        )
        full_url = f"{docs_base}{docs_path}?{query}"
        headers: dict[str, str] = {}
    else:
        full_url = f"{docs_base}{docs_path}"
        headers = {
            "X-Render-Mode": render,
            "X-Cube-Secret-Hash": sh,
            "X-Cube-Timestamp": str(timestamp),
            "X-Cube-Signature": sg,
            "X-Cube-User": MOCK_USER,
            "X-Cube-Origin": cube_origin,
        }

    try:
        resp = httpx.get(full_url, headers=headers, follow_redirects=False, timeout=15.0)
    except Exception as exc:
        return Response(
            content=f"请求文档站失败：{exc}",
            status_code=502,
            media_type="text/plain; charset=utf-8",
        )

    content_type = resp.headers.get("content-type", "text/plain")
    return Response(content=resp.content, status_code=resp.status_code, media_type=content_type)


def aes_ecb_encrypt(plaintext: str, key_ascii: str) -> str:
    key = key_ascii.encode("ascii")
    if len(key) not in (16, 24, 32):
        raise ValueError("AES key length must be 16/24/32 bytes")
    cipher = AES.new(key, AES.MODE_ECB)
    encrypted = cipher.encrypt(pad(plaintext.encode("utf-8"), AES.block_size))
    import base64

    return base64.b64encode(encrypted).decode("ascii")


def secure_wrap_data(payload_json: str, app_secret: str) -> dict[str, Any]:
    """对齐 RemoteSecretService.secureWrapData + docs /auth/callback 验签。"""
    secret_hash = sha256_hex(app_secret)
    encrypt_data = aes_ecb_encrypt(payload_json, app_secret)
    timestamp = int(time.time() * 1000)
    signature = sha256_hex(f"{encrypt_data}{timestamp}{app_secret}")
    return {
        "encryptData": encrypt_data,
        "secretHash": secret_hash,
        "signature": signature,
        "timestamp": timestamp,
    }


def build_payload_json(user_name: str, target_url: str, cube_origin: str) -> str:
    dto = {
        "userName": user_name,
        "targetUrl": target_url,
        "cubeOrigin": cube_origin.rstrip("/"),
    }
    return json.dumps(dto, ensure_ascii=False, separators=(",", ":"))


def build_callback_url(docs_base_url: str, wrap: dict[str, Any]) -> str:
    query = urlencode(
        {
            "ed": wrap["encryptData"],
            "sh": wrap["secretHash"],
            "sg": wrap["signature"],
            "tm": wrap["timestamp"],
        },
        quote_via=quote,
    )
    return f"{docs_base_url.rstrip('/')}/auth/callback?{query}"


def build_docs_logout_url(cube_return: Optional[str] = None) -> str:
    """对齐魔方 logout：跳转文档站 /auth/logout 并清 Cookie，再回跳魔方。"""
    ret = (cube_return or f"{CUBE_BASE_HOST.rstrip('/')}/").strip()
    query = urlencode({"redirect": ret})
    return f"{DOCS_BASE_URL.rstrip('/')}/auth/logout?{query}"


APP_SECRET = _load_app_secret()
DOCS_BASE_URL = _env("MOCK_CUBE_DOCS_BASE_URL", "http://127.0.0.1:3000")
CUBE_BASE_HOST = _env("MOCK_CUBE_BASE_HOST", "http://127.0.0.1:8765")
MOCK_USER = _env("MOCK_CUBE_USER", "dev-user")
HOST = _env("MOCK_CUBE_HOST", "0.0.0.0")
PORT = int(_env("MOCK_CUBE_PORT", "8765") or "8765")

app = FastAPI(title="Mock Cube Docs Auth", docs_url="/swagger", redoc_url=None)


def _docs_auth_redirect(redirect: str) -> RedirectResponse:
    if not redirect.startswith("/"):
        error = quote("非法跳转地址\n只允许站内相对路径", safe="")
        return RedirectResponse(
            url=f"{CUBE_BASE_HOST.rstrip('/')}/#/403/no-permission?errorMsg={error}",
            status_code=302,
        )

    if not APP_SECRET:
        error = quote("密钥错误\n请联系工作人员获取并配置正确的密钥", safe="")
        return RedirectResponse(
            url=f"{CUBE_BASE_HOST.rstrip('/')}/#/403/no-permission?errorMsg={error}",
            status_code=302,
        )

    payload_json = build_payload_json(MOCK_USER, redirect, CUBE_BASE_HOST)
    wrap = secure_wrap_data(payload_json, APP_SECRET)
    target = build_callback_url(DOCS_BASE_URL, wrap)
    return RedirectResponse(url=target, status_code=302)


def _cube_logout_redirect(cube_return: Optional[str] = None) -> RedirectResponse:
    return RedirectResponse(url=build_docs_logout_url(cube_return), status_code=302)


@app.get("/", response_class=HTMLResponse)
def index() -> str:
    sample_auth = f"{CUBE_BASE_HOST.rstrip('/')}/docsAuth?redirect=/docs"
    sample_logout = f"{CUBE_BASE_HOST.rstrip('/')}/logout"
    docs_logout = build_docs_logout_url()
    sample_doc = "/docs/connectors/rpa-conn-qianniu-all/rpa-conn-qianniu-item-quality-score-list"
    return f"""<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Mock Cube · SSO + 嵌入</title>
  <style>
    body {{ font-family: system-ui, sans-serif; max-width: 52rem; margin: 3rem auto; padding: 0 1rem; line-height: 1.6; }}
    code {{ background: #f4f4f5; padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.9em; word-break: break-all; }}
    a {{ color: #2563eb; }}
    section {{ margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e4e4e7; }}
    .badge {{ display: inline-block; font-size: 0.75em; padding: 0.1rem 0.4rem; border-radius: 4px; background: #dbeafe; color: #1e40af; font-weight: 600; margin-left: 0.4rem; }}
  </style>
</head>
<body>
  <h1>Mock Cube SSO + 嵌入</h1>
  <p>模拟用户 <code>{MOCK_USER}</code>（假定已在魔方登录）· 文档站 <code>{DOCS_BASE_URL}</code></p>

  <section>
    <h2>🖼 iframe 嵌入测试 <span class="badge" style="background:#f0fdf4;color:#166534">可视化</span></h2>
    <p>在浏览器中直接预览文档嵌入效果（<code>&lt;iframe src&gt;</code>：Query 直连文档站 / Header 走 BFF 代理）。</p>
    <ul>
      <li><a href="/iframe-test">打开 iframe 测试页</a></li>
      <li><a href="/iframe-test?path={sample_doc}&render=html">HTML 模式预览（商品质量分）</a></li>
      <li><a href="/iframe-test?path={sample_doc}&render=markdown">Markdown 模式预览</a></li>
    </ul>
  </section>

  <section>
    <h2>通道 B：SSO 全页 <span class="badge">docsAuth</span></h2>
    <ul>
      <li><a href="/docsAuth?redirect=/docs">/docsAuth?redirect=/docs</a></li>
      <li><a href="/api/docsAuth?redirect=/docs">/api/docsAuth?redirect=/docs</a></li>
    </ul>
  </section>

  <section>
    <h2>通道 A 方案 A：docsAuth + render <span class="badge">新增分支</span></h2>
    <ul>
      <li><a href="/docsAuth?redirect={sample_doc}&render=markdown">render=markdown</a></li>
      <li><a href="/docsAuth?redirect={sample_doc}&render=html">render=html</a></li>
    </ul>
  </section>

  <section>
    <h2>通道 A 方案 B：独立 docsContent <span class="badge">新接口</span></h2>
    <ul>
      <li><a href="/docsContent?path={sample_doc}&render=markdown">render=markdown</a></li>
      <li><a href="/docsContent?path={sample_doc}&render=html">render=html</a></li>
    </ul>
  </section>

  <section>
    <h2>logout → 文档站清 Cookie</h2>
    <p>模拟魔方退出：302 到文档站 <code>/auth/logout</code>，清除 <code>DOCSESSION</code> 等 Cookie 后回跳本页。</p>
    <ul>
      <li><a href="/logout">/logout</a></li>
      <li><a href="/api/logout">/api/logout</a></li>
    </ul>
    <p>文档站请求：<br><code>{docs_logout}</code></p>
  </section>

  <section>
    <h2>curl 示例</h2>
    <p><code>curl -sI '{sample_auth}'</code></p>
    <p><code>curl -s '{CUBE_BASE_HOST}/docsContent?path={sample_doc}&render=markdown'</code></p>
    <p><code>curl -s '{CUBE_BASE_HOST}/docsContent?path={sample_doc}&render=html' | head -30</code></p>
  </section>
</body>
</html>"""


@app.get("/iframe-test", response_class=HTMLResponse)
def iframe_test(
    path: str = Query(
        "/docs/connectors/rpa-conn-qianniu-all/rpa-conn-qianniu-item-quality-score-list",
        description="文档站内相对路径",
    ),
    render: str = Query("html", description="html | markdown"),
    auth: str = Query("header", description="header | query — 文档站鉴权传参方式"),
) -> str:
    """
    iframe 嵌入测试页：html / markdown 均通过 <iframe src="..."> 加载。
    - Query 鉴权：iframe 直连文档站 signed URL
    - Header 鉴权：iframe 加载同源 /docsContent BFF 代理
    markdown 在 iframe 内为浏览器原生展示的纯文本（非渲染后的 HTML）。
    """
    content_resp = fetch_embed_content(path, render, auth_via_query=(auth == "query"))
    raw_body = content_resp.body.decode("utf-8", errors="replace") if isinstance(content_resp.body, bytes) else ""
    status = content_resp.status_code

    iframe_src = build_iframe_src(path, render, auth) if status == 200 else ""

    if status != 200:
        preview_html = f"""<div style="padding:1rem;background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;color:#991b1b">
  <strong>错误 {status}</strong>
  <pre style="margin:.5rem 0 0;font-size:.85em;white-space:pre-wrap">{raw_body}</pre>
</div>"""
    else:
        preview_html = f"""<iframe
  src="{iframe_src.replace('"', "&quot;")}"
  style="width:100%;min-height:600px;border:1px solid #e5e7eb;border-radius:8px;background:#fff"
  title="文档嵌入预览"
  referrerpolicy="no-referrer"
></iframe>"""

    all_docs = [
        "/docs/connectors/rpa-conn-qianniu-all/rpa-conn-qianniu-item-quality-score-list",
        "/docs/connectors/rpa-conn-qianniu-all/rpa-conn-qianniu-item-price-discount-list",
        "/docs/connectors/rpa-conn-pinduoduo-all/rpa-conn-pinduoduo-jinbao-order-detail",
        "/docs/connectors/rpa-conn-sycm-all/rpa-conn-sycm-flow-shop-source",
        "/docs/connectors/rpa-conn-doudian-all/rpa-conn-doudian-im-aftersale-retention",
        "/docs/connectors/rpa-conn-alimm-all/rpa-conn-alimm-tblm-home-overview",
        "/docs/connectors/rpa-conn-qianniu-all",
        "/docs",
    ]

    option_rows = "\n".join(
        f'<option value="{p}"{" selected" if p == path else ""}>{p}</option>'
        for p in all_docs
    )
    render_md = "selected" if render == "markdown" else ""
    render_html = "selected" if render == "html" else ""
    auth_header = "selected" if auth != "query" else ""
    auth_query = "selected" if auth == "query" else ""
    iframe_src_meta = (
        f'<span>·</span><span>iframe src：<code>{iframe_src}</code></span>'
        if iframe_src
        else ""
    )

    return f"""<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>iframe 嵌入测试 · Mock Cube</title>
  <style>
    * {{ box-sizing: border-box; }}
    body {{ font-family: system-ui, sans-serif; margin: 0; padding: 0; background: #f9fafb; }}
    .toolbar {{
      display: flex; align-items: center; gap: .75rem; flex-wrap: wrap;
      padding: .75rem 1.25rem; background: #1e293b; color: #e2e8f0;
      font-size: .875rem; position: sticky; top: 0; z-index: 10;
      box-shadow: 0 2px 8px rgba(0,0,0,.25);
    }}
    .toolbar h1 {{ margin: 0; font-size: 1rem; font-weight: 700; color: #f1f5f9; white-space: nowrap; }}
    .toolbar label {{ color: #94a3b8; font-size: .8rem; white-space: nowrap; }}
    .toolbar select, .toolbar button {{
      padding: .3rem .6rem; border-radius: 6px; border: 1px solid #475569;
      background: #334155; color: #e2e8f0; font-size: .85rem; cursor: pointer;
    }}
    .toolbar select {{ min-width: 16rem; max-width: 32rem; flex: 1; }}
    .toolbar button {{
      background: #2563eb; border-color: #2563eb; color: #fff;
      font-weight: 600; white-space: nowrap; padding: .3rem 1rem;
    }}
    .toolbar button:hover {{ background: #1d4ed8; }}
    .badge-ok  {{ background: #166534; color: #dcfce7; padding: .15rem .5rem; border-radius: 4px; font-size: .75em; font-weight: 600; }}
    .badge-err {{ background: #991b1b; color: #fee2e2; padding: .15rem .5rem; border-radius: 4px; font-size: .75em; font-weight: 600; }}
    .meta {{
      display: flex; align-items: center; gap: .75rem; padding: .5rem 1.25rem;
      background: #f1f5f9; border-bottom: 1px solid #e2e8f0;
      font-size: .8rem; color: #64748b; flex-wrap: wrap;
    }}
    .meta code {{ background: #e2e8f0; padding: .1rem .35rem; border-radius: 4px; font-size: .85em; color: #1e293b; }}
    .preview {{ padding: 1.25rem; }}
    iframe {{ display: block; }}
  </style>
</head>
<body>
  <form method="get" action="/iframe-test">
    <div class="toolbar">
      <h1>📄 iframe 嵌入测试</h1>
      <label>文档路径</label>
      <select name="path">{option_rows}</select>
      <label>格式</label>
      <select name="render" style="min-width:7rem;flex:none">
        <option value="html" {render_html}>HTML</option>
        <option value="markdown" {render_md}>Markdown</option>
      </select>
      <label>鉴权</label>
      <select name="auth" style="min-width:7rem;flex:none">
        <option value="header" {auth_header}>Header</option>
        <option value="query" {auth_query}>Query</option>
      </select>
      <button type="submit">加载</button>
      <a href="/" style="color:#94a3b8;text-decoration:none;font-size:.8rem;white-space:nowrap">← 返回首页</a>
    </div>
    <div class="meta">
      <span>通道 A（BFF 嵌入）</span>
      <span>·</span>
      <span>路径：<code>{path}</code></span>
      <span>·</span>
      <span>格式：<code>{render}</code></span>
      <span>·</span>
      <span>鉴权：<code>{auth}</code></span>
      <span>·</span>
      <span class="{'badge-ok' if status == 200 else 'badge-err'}">HTTP {status}</span>
      {iframe_src_meta}
    </div>
  </form>
  <div class="preview">
    {preview_html}
  </div>
</body>
</html>"""


ALLOWED_IMAGE_EXTS = frozenset({"png", "jpg", "jpeg", "gif", "webp", "svg"})


@app.get("/docsResources")
def docs_resources(
    path: str = Query(..., description="相对 content/docs/ 的图片路径"),
) -> Response:
    """
    模拟魔方图片代理：浏览器带 Mock 会话（本 Mock 不校验 Cookie，仅作联调）。
    回源文档站 /resources/images/{path}，PATH 参与 BFF HMAC。
    """
    normalized = posixpath.normpath(path.strip())
    if normalized.startswith("..") or path.strip().startswith("/"):
        return Response(content="forbidden", status_code=403, media_type="text/plain")
    ext = normalized.rsplit(".", 1)[-1].lower() if "." in normalized else ""
    if ext not in ALLOWED_IMAGE_EXTS:
        return Response(content="forbidden", status_code=403, media_type="text/plain")

    resource_path = f"/resources/images/{normalized}"
    timestamp = int(time.time() * 1000)
    sh = sha256_hex(APP_SECRET)
    sg = bff_signature("GET", resource_path, timestamp, APP_SECRET)
    docs_url = f"{DOCS_BASE_URL.rstrip('/')}{resource_path}"
    headers = {
        "X-Cube-Secret-Hash": sh,
        "X-Cube-Timestamp": str(timestamp),
        "X-Cube-Signature": sg,
        "X-Cube-Origin": CUBE_BASE_HOST.rstrip("/"),
    }
    try:
        resp = httpx.get(docs_url, headers=headers, follow_redirects=False, timeout=15.0)
    except Exception as exc:
        return Response(
            content=f"回源文档站失败：{exc}",
            status_code=502,
            media_type="text/plain; charset=utf-8",
        )
    content_type = resp.headers.get("content-type", "application/octet-stream")
    return Response(
        content=resp.content,
        status_code=resp.status_code,
        media_type=content_type,
        headers={"Cache-Control": "private, no-store"},
    )


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "user": MOCK_USER,
        "docsBaseUrl": DOCS_BASE_URL,
        "cubeBaseHost": CUBE_BASE_HOST,
    }


@app.get("/logout")
@app.get("/api/logout")
def cube_logout(
    redirect: Optional[str] = Query(
        None,
        description="文档站清 Cookie 后的回跳地址，默认 Mock 首页",
    ),
) -> RedirectResponse:
    cube_return = redirect if redirect else None
    if cube_return and not (
        cube_return.startswith("/")
        or cube_return.startswith("http://")
        or cube_return.startswith("https://")
    ):
        cube_return = f"{CUBE_BASE_HOST.rstrip('/')}/"
    if cube_return and cube_return.startswith("/"):
        cube_return = f"{CUBE_BASE_HOST.rstrip('/')}{cube_return}"
    return _cube_logout_redirect(cube_return)


@app.get("/docsAuth")
@app.get("/api/docsAuth")
def docs_auth(
    redirect: str = Query("/", description="文档站内相对路径"),
    render: Optional[str] = Query(None, description="html | markdown → 嵌入分支；空 / redirect → SSO 分支"),
) -> Any:
    """
    方案 A：扩展现有 docsAuth，通过 render 参数区分 SSO 全页和 BFF 嵌入。

    - render 未传 / render=redirect → 通道 B：SSO 302 callback（原有流程）
    - render=html / render=markdown → 通道 A：BFF 服务端拉取文档正文
    """
    if render in ("html", "markdown"):
        # 嵌入分支：魔方服务端拉取文档站内容
        if not redirect.startswith("/"):
            return Response(
                content=json.dumps({"error": "非法 redirect 路径"}),
                status_code=400,
                media_type="application/json",
            )
        return fetch_embed_content(redirect, render)
    # SSO 分支（原有流程）
    return _docs_auth_redirect(redirect)


@app.get("/docsContent")
@app.get("/api/docsContent")
def docs_content(
    path: str = Query(..., description="文档站内相对路径，如 /docs/connectors/foo"),
    render: str = Query("html", description="html | markdown"),
    auth: str = Query("header", description="header | query — 文档站鉴权传参方式"),
) -> Any:
    """
    方案 B：独立 docsContent 接口，仅负责嵌入拉取（通道 A）。
    职责单一：docsAuth = SSO 全页；docsContent = 读文档正文。
    """
    if not path.startswith("/"):
        return Response(
            content=json.dumps({"error": "非法 path 路径"}),
            status_code=400,
            media_type="application/json",
        )
    if render not in ("html", "markdown"):
        return Response(
            content=json.dumps({"error": "render 参数须为 html 或 markdown"}),
            status_code=400,
            media_type="application/json",
        )
    return fetch_embed_content(path, render, auth_via_query=(auth == "query"))


def main() -> None:
    print("Mock Cube SSO (docsAuth + logout)")
    print(f"  listen       http://{HOST}:{PORT}")
    print(f"  cube origin  {CUBE_BASE_HOST}")
    print(f"  docs base    {DOCS_BASE_URL}")
    print(f"  mock user    {MOCK_USER}")
    print(f"  secret hash  {sha256_hex(APP_SECRET)}")
    print(f"  logout chain {build_docs_logout_url()}")
    uvicorn.run(app, host=HOST, port=PORT, log_level="info")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)
