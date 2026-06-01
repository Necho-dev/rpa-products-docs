import { isMcpPublicOAuthStubEnabled, stubRegisterResponse } from '@/lib/auth/mcp-public-oauth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isMcpPublicOAuthStubEnabled()) {
    return new Response(
      'OAuth registration stub is disabled when Cube SSO is enabled. Configure Bearer via /mcp/deeplink.',
      { status: 404 },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  return Response.json(stubRegisterResponse(body), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
