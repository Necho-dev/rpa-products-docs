import {
  appendClearAuthSessionCookies,
  safeLogoutRedirect,
} from '@/lib/auth/auth-core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  const url = new URL(request.url);
  const redirect = safeLogoutRedirect(url.searchParams.get('redirect'));

  const headers = new Headers({ Location: redirect });
  appendClearAuthSessionCookies(headers, request);

  return new Response(null, { status: 302, headers });
}
