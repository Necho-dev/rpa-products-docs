/**
 * Minimal OAuth metadata + stub endpoints so MCP clients (e.g. Cursor) can finish
 * RFC 9728 discovery instead of retrying /.well-known/oauth-authorization-server forever.
 * Tokens are not validated on /mcp — this is for local/public doc access only.
 */

const STUB_AUTH_CODE = 'mcp-local-stub-code';

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

export function oauthAuthorizationServerMetadata(origin: string) {
  const base = origin.replace(/\/$/, '');
  return {
    issuer: base,
    authorization_endpoint: `${base}/api/mcp-oauth/authorize`,
    token_endpoint: `${base}/api/mcp-oauth/token`,
    registration_endpoint: `${base}/api/mcp-oauth/register`,
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
