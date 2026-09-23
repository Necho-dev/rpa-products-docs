#!/usr/bin/env python3
"""
本地 Mock：对齐文档站契约（docsAuth 全页 SSO / docsContent 嵌入 / logout）。

真实魔方在 docsAuth 服务端用 LoginContext 识别已登录用户，不向文档站透传 Session Cookie；
本 Mock 同样假定调用 docsAuth 时用户已在魔方侧登录，仅用 MOCK_CUBE_USER 写入加密载荷。

全页 SSO：
  /docsAuth?redirect=/docs  → 302 {docs}/auth/callback?ed&sh&sg&tm&redirect=

嵌入：
  /docsContent?path=/docs/xxx&mode=page|llms → 200 {"url": "{docs}{path}?mode=&ed=&sh=&tm=&sg="}
  前端 iframe src 直连该 URL（Query 登录包）。
llms 配图已是文档站 `?sign=` 直链，本 Mock 不提供 docsResources。

本进程同时提供最小用户中心：
  GET /api/open/oidc/userInfoByAuth
  GET /open/oidc/userInfoByAuth

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
  DOCS_SECRETS_FILE_PATH=.secrets/dev-secrets.json
  DOCS_USER_CENTRE_BASE_URL=http://127.0.0.1:8765

联调:
  http://127.0.0.1:8765/docsAuth?redirect=/docs
  http://127.0.0.1:8765/docsContent?path=/docs/rpa/RPA_QIANNIU/rpa-conn-qianniu-item-quality-score-list&mode=page
  http://127.0.0.1:8765/logout
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Optional
from urllib.parse import quote, urlencode

import httpx
import uvicorn
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad
from fastapi import FastAPI, Query
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, Response

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


def aes_ecb_encrypt(plaintext: str, key_ascii: str) -> str:
    key = key_ascii.encode("ascii")
    if len(key) not in (16, 24, 32):
        raise ValueError("AES key length must be 16/24/32 bytes")
    cipher = AES.new(key, AES.MODE_ECB)
    encrypted = cipher.encrypt(pad(plaintext.encode("utf-8"), AES.block_size))
    import base64

    return base64.b64encode(encrypted).decode("ascii")


def aes_ecb_decrypt(cipher_b64: str, key_ascii: str) -> str:
    import base64

    key = key_ascii.encode("ascii")
    cipher = AES.new(key, AES.MODE_ECB)
    raw = cipher.decrypt(base64.b64decode(cipher_b64))
    return unpad(raw, AES.block_size).decode("utf-8")


def secure_wrap_data(payload_json: str, app_secret: str) -> dict[str, Any]:
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


def wrap_for_path(docs_path: str) -> dict[str, Any]:
    payload_json = build_payload_json(MOCK_USER, docs_path, CUBE_BASE_HOST)
    return secure_wrap_data(payload_json, APP_SECRET)


def login_pack_query(docs_path: str, mode: str) -> dict[str, str]:
    wrap = wrap_for_path(docs_path)
    return {
        "mode": mode,
        "ed": wrap["encryptData"],
        "sh": wrap["secretHash"],
        "tm": str(wrap["timestamp"]),
        "sg": wrap["signature"],
    }


def build_signed_docs_embed_url(docs_path: str, mode: str) -> str:
    """构建带登录包的文档站嵌入 URL（供浏览器 iframe src 直连文档站）。"""
    docs_base = DOCS_BASE_URL.rstrip("/")
    query = urlencode(login_pack_query(docs_path, mode), quote_via=quote)
    return f"{docs_base}{docs_path}?{query}"


def fetch_embed_content(docs_path: str, mode: str) -> Response:
    """探测文档站嵌入 URL（Query 登录包）。正式 iframe 应直连该 URL。"""
    full_url = build_signed_docs_embed_url(docs_path, mode)
    try:
        resp = httpx.get(full_url, follow_redirects=False, timeout=15.0)
    except Exception as exc:
        return Response(
            content=f"请求文档站失败：{exc}",
            status_code=502,
            media_type="text/plain; charset=utf-8",
        )

    content_type = resp.headers.get("content-type", "text/plain")
    return Response(content=resp.content, status_code=resp.status_code, media_type=content_type)


def build_callback_url(docs_base_url: str, wrap: dict[str, Any], redirect: str) -> str:
    query = urlencode(
        {
            "ed": wrap["encryptData"],
            "sh": wrap["secretHash"],
            "sg": wrap["signature"],
            "tm": wrap["timestamp"],
            "redirect": redirect,
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
    target = build_callback_url(DOCS_BASE_URL, wrap, redirect)
    return RedirectResponse(url=target, status_code=302)


def _cube_logout_redirect(cube_return: Optional[str] = None) -> RedirectResponse:
    return RedirectResponse(url=build_docs_logout_url(cube_return), status_code=302)


@app.get("/", response_class=HTMLResponse)
def index() -> str:
    sample_auth = f"{CUBE_BASE_HOST.rstrip('/')}/docsAuth?redirect=/docs"
    sample_logout = f"{CUBE_BASE_HOST.rstrip('/')}/logout"
    docs_logout = build_docs_logout_url()
    sample_doc = "/docs/rpa/RPA_QIANNIU/rpa-conn-qianniu-item-quality-score-list"
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
    <p>在浏览器中直接预览文档嵌入效果：<code>iframe src</code> 直连文档站 Query URL。</p>
    <ul>
      <li><a href="/iframe-test">打开 iframe 测试页</a></li>
      <li><a href="/iframe-test?path={sample_doc}&mode=page">page 模式预览（商品质量分）</a></li>
      <li><a href="/iframe-test?path={sample_doc}&mode=llms">llms 模式预览</a></li>
    </ul>
  </section>

  <section>
    <h2>全页 SSO <span class="badge">docsAuth</span></h2>
    <ul>
      <li><a href="/docsAuth?redirect=/docs">/docsAuth?redirect=/docs</a></li>
      <li><a href="/api/docsAuth?redirect=/docs">/api/docsAuth?redirect=/docs</a></li>
    </ul>
  </section>

  <section>
    <h2>嵌入 <span class="badge">docsContent</span></h2>
    <p><code>mode=page|llms</code> 均返回文档站 iframe URL（Query 登录包），前端直连文档站。</p>
    <ul>
      <li><a href="/docsContent?path={sample_doc}&mode=llms">mode=llms</a></li>
      <li><a href="/docsContent?path={sample_doc}&mode=page">mode=page</a></li>
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
    <p><code>curl -s '{CUBE_BASE_HOST}/docsContent?path={sample_doc}&mode=llms'</code></p>
    <p><code>curl -s '{CUBE_BASE_HOST}/docsContent?path={sample_doc}&mode=page' | head -30</code></p>
  </section>
</body>
</html>"""


@app.get("/iframe-test", response_class=HTMLResponse)
def iframe_test(
    path: str = Query(
        "/docs/rpa/RPA_QIANNIU/rpa-conn-qianniu-item-quality-score-list",
        description="文档站内相对路径",
    ),
    mode: str = Query("page", description="page | llms"),
) -> str:
    """iframe 嵌入测试：page / llms 均 iframe src 直连文档站 Query URL。"""
    iframe_src = build_signed_docs_embed_url(path, mode) if mode in ("page", "llms") else ""
    content_resp = fetch_embed_content(path, mode) if iframe_src else Response(content=b"invalid mode", status_code=400)
    raw_body = content_resp.body.decode("utf-8", errors="replace") if isinstance(content_resp.body, bytes) else ""
    status = content_resp.status_code

    if status != 200:
        preview_html = f"""<div style="padding:1rem;background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;color:#991b1b">
  <strong>错误 {status}</strong>
  <pre style="margin:.5rem 0 0;font-size:.85em;white-space:pre-wrap">{raw_body}</pre>
</div>"""
        iframe_src = ""
    else:
        preview_html = f"""<iframe
  src="{iframe_src.replace('"', "&quot;")}"
  style="width:100%;min-height:600px;border:1px solid #e5e7eb;border-radius:8px;background:#fff"
  title="文档嵌入预览"
></iframe>"""

    all_docs = [
        "/docs/rpa/RPA_QIANNIU/rpa-conn-qianniu-item-quality-score-list",
        "/docs/rpa/RPA_QIANNIU/rpa-conn-qianniu-item-price-discount-list",
        "/docs/rpa/RPA_PINDUODUO/rpa-conn-pinduoduo-jinbao-order-detail",
        "/docs/rpa/RPA_SYCM/rpa-conn-sycm-flow-shop-source",
        "/docs/rpa/RPA_DOUDIAN/rpa-conn-doudian-im-aftersale-retention",
        "/docs/rpa/RPA_QIANNIU",
        "/docs/rpa",
    ]

    option_rows = "\n".join(
        f'<option value="{p}"{" selected" if p == path else ""}>{p}</option>'
        for p in all_docs
    )
    mode_llms = "selected" if mode == "llms" else ""
    mode_page = "selected" if mode == "page" else ""
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
      <label>模式</label>
      <select name="mode" style="min-width:7rem;flex:none">
        <option value="page" {mode_page}>page</option>
        <option value="llms" {mode_llms}>llms</option>
      </select>
      <button type="submit">加载</button>
      <a href="/" style="color:#94a3b8;text-decoration:none;font-size:.8rem;white-space:nowrap">← 返回首页</a>
    </div>
    <div class="meta">
      <span>嵌入（iframe 直连）</span>
      <span>·</span>
      <span>路径：<code>{path}</code></span>
      <span>·</span>
      <span>模式：<code>{mode}</code></span>
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


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "user": MOCK_USER,
        "docsBaseUrl": DOCS_BASE_URL,
        "cubeBaseHost": CUBE_BASE_HOST,
    }


@app.get("/open/oidc/userInfoByAuth")
@app.get("/api/open/oidc/userInfoByAuth")
def user_info_by_auth(
    ed: str = Query(""),
    sh: str = Query(""),
    sg: str = Query(""),
    tm: str = Query(""),
    isSaas: Optional[str] = Query(None),
) -> JSONResponse:
    """最小用户中心：按 App Secret 校验登录包并返回用户。"""
    if not ed or not sh or not sg or not tm:
        return JSONResponse({"success": False, "code": "400", "msg": "missing login pack", "data": {}})
    try:
        timestamp = int(tm)
    except ValueError:
        return JSONResponse({"success": False, "code": "400", "msg": "bad tm", "data": {}})
    if abs(int(time.time() * 1000) - timestamp) > 180_000:
        return JSONResponse({"success": False, "code": "401", "msg": "timestamp expired", "data": {}})
    expected_sh = sha256_hex(APP_SECRET)
    if sh != expected_sh:
        return JSONResponse({"success": False, "code": "401", "msg": "unknown secret hash", "data": {}})
    expected_sg = sha256_hex(f"{ed}{timestamp}{APP_SECRET}")
    if sg != expected_sg:
        return JSONResponse({"success": False, "code": "401", "msg": "bad signature", "data": {}})
    try:
        payload = json.loads(aes_ecb_decrypt(ed, APP_SECRET))
    except Exception:
        return JSONResponse({"success": False, "code": "401", "msg": "bad payload", "data": {}})
    user_name = str(payload.get("userName") or MOCK_USER)
    cube_origin = str(payload.get("cubeOrigin") or CUBE_BASE_HOST).rstrip("/")
    return JSONResponse(
        {
            "success": True,
            "code": "200",
            "msg": "ok",
            "data": {
                "userId": "mock-user-1",
                "userName": user_name,
                "name": user_name,
                "tenantId": "tenant-mock-1",
                "orgId": "org-mock-1",
                "mobile": "",
                "email": "",
                "cubeOrigin": cube_origin,
            },
            "extraInfo": {"isSaas": isSaas, "cubeOrigin": cube_origin},
        }
    )


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
    mode: Optional[str] = Query(None, description="禁止传入；嵌入请用 docsContent"),
    render: Optional[str] = Query(None, description="已废弃；嵌入请用 docsContent?mode="),
) -> Any:
    if mode or render:
        return JSONResponse(
            {"error": "docsAuth 仅用于全页 SSO，嵌入请使用 docsContent?mode=page|llms"},
            status_code=400,
        )
    return _docs_auth_redirect(redirect)


@app.get("/docsContent")
@app.get("/api/docsContent")
def docs_content(
    path: str = Query(..., description="文档站内相对路径，如 /docs/rpa/RPA_QIANNIU/foo"),
    mode: str = Query("page", description="page | llms"),
) -> Any:
    if not path.startswith("/"):
        return JSONResponse({"error": "非法 path 路径"}, status_code=400)
    if mode not in ("page", "llms"):
        return JSONResponse({"error": "mode 参数须为 page 或 llms"}, status_code=400)
    return JSONResponse({"url": build_signed_docs_embed_url(path, mode)})


def main() -> None:
    print("Mock Cube SSO (docsAuth + docsContent + userInfoByAuth)")
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
