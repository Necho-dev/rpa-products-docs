import { stubRegisterResponse } from '@/lib/mcp-public-oauth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
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
