#!/usr/bin/env python3
"""
本地 Mock：对齐 Java RemoteDocsController（docsAuth / logout）。

真实魔方在 docsAuth 服务端用 LoginContext 识别已登录用户，不向文档站透传 Session Cookie；
本 Mock 同样假定调用 docsAuth 时用户已在魔方侧登录，仅用 MOCK_CUBE_USER 写入加密载荷。

依赖:
  python3 -m pip install fastapi uvicorn pycryptodome

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

联调 — 登录:
  http://127.0.0.1:8765/docsAuth?redirect=/docs

联调 — 退出:
  http://127.0.0.1:8765/logout
  → 文档站 /auth/logout?redirect=http://127.0.0.1:8765/
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

import uvicorn
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad
from fastapi import FastAPI, Query
from fastapi.responses import HTMLResponse, RedirectResponse

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
    return f"""<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Mock Cube · SSO</title>
  <style>
    body {{ font-family: system-ui, sans-serif; max-width: 42rem; margin: 3rem auto; padding: 0 1rem; line-height: 1.6; }}
    code {{ background: #f4f4f5; padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.9em; word-break: break-all; }}
    a {{ color: #2563eb; }}
    section {{ margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e4e4e7; }}
  </style>
</head>
<body>
  <h1>Mock Cube SSO</h1>
  <p>模拟用户 <code>{MOCK_USER}</code>（假定已在魔方登录）· 文档站 <code>{DOCS_BASE_URL}</code></p>

  <section>
    <h2>docsAuth → 文档站</h2>
    <ul>
      <li><a href="/docsAuth?redirect=/docs">/docsAuth?redirect=/docs</a></li>
      <li><a href="/api/docsAuth?redirect=/docs">/api/docsAuth</a></li>
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
    <h2>curl</h2>
    <p><code>curl -sI '{sample_auth}'</code></p>
    <p><code>curl -sI '{sample_logout}'</code></p>
  </section>
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
) -> RedirectResponse:
    return _docs_auth_redirect(redirect)


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
