/**
 * Minimal OAuth metadata + stub endpoints so MCP clients (e.g. Cursor) can finish
 * RFC 9728 discovery instead of retrying /.well-known/oauth-authorization-server forever.
 * Disabled when Cube SSO is enabled — use /mcp/deeplink for manual Bearer instead.
 */

import { isCubeSsoEnabled } from '@/lib/auth/auth-config';

const STUB_AUTH_CODE = 'mcp-local-stub-code';

export function isMcpPublicOAuthStubEnabled(): boolean {
  return !isCubeSsoEnabled();
}

export function stubAuthorizationCode() {
  return STUB_AUTH_CODE;
}

export function oauthProtectedResourceMetadata(origin: string) {
  const base = origin.replace(/\/$/, '');
  return {
    resource: `${base}/mcp`,
    authorization_servers: [base],
  };
}

/** SSO 模式下返回手动 Bearer 配置说明，避免 Cursor 走无效 stub OAuth */
export function ssoMcpBearerResourceMetadata(origin: string) {
  const base = origin.replace(/\/$/, '');
  return {
    resource: `${base}/mcp`,
    authorization_servers: [],
    bearer_methods_supported: ['header'],
    resource_documentation: `${base}/mcp/deeplink`,
    resource_access_note:
      'Cube SSO 已启用：请先在浏览器登录文档站，再访问 /mcp/deeplink 复制 Bearer Token 到 MCP 客户端。',
  };
}

export function oauthAuthorizationServerMetadata(origin: string) {
  const base = origin.replace(/\/$/, '');
  return {
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    registration_endpoint: `${base}/oauth/register`,
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code', 'client_credentials'],
    token_endpoint_auth_methods_supported: ['none'],
    code_challenge_methods_supported: ['S256'],
  };
}

export function stubTokenResponse() {
  return {
    access_token: 'mcp-public-anonymous-token',
    token_type: 'Bearer',
    expires_in: 86400,
  };
}

export function stubRegisterResponse(body: Record<string, unknown>) {
  return {
    client_id: 'mcp-public-anonymous',
    client_id_issued_at: Math.floor(Date.now() / 1000),
    redirect_uris: Array.isArray(body.redirect_uris) ? body.redirect_uris : [],
    grant_types: body.grant_types,
    response_types: body.response_types,
    token_endpoint_auth_method: 'none',
  };
}
