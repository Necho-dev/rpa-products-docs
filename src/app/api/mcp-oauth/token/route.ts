import { stubAuthorizationCode, stubTokenResponse } from '@/lib/mcp-public-oauth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const raw = await request.text();
  const params = new URLSearchParams(raw);
  const grant = params.get('grant_type');

  if (grant === 'client_credentials') {
    return Response.json(stubTokenResponse(), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  if (grant === 'authorization_code') {
    const code = params.get('code');
    if (code !== stubAuthorizationCode()) {
      return Response.json(
        { error: 'invalid_grant', error_description: 'Unknown authorization code' },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
      );
    }
    return Response.json(stubTokenResponse(), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  return Response.json(
    { error: 'unsupported_grant_type', error_description: `grant_type=${grant}` },
    { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
  );
}
