import { stubAuthorizationCode } from '@/lib/mcp-public-oauth';

export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  const url = new URL(request.url);
  const redirectUri = url.searchParams.get('redirect_uri');
  if (!redirectUri) {
    return new Response('redirect_uri required', { status: 400 });
  }
  let target: URL;
  try {
    target = new URL(redirectUri);
  } catch {
    return new Response('invalid redirect_uri', { status: 400 });
  }
  target.searchParams.set('code', stubAuthorizationCode());
  const state = url.searchParams.get('state');
  if (state) target.searchParams.set('state', state);
  return Response.redirect(target.toString(), 302);
}
