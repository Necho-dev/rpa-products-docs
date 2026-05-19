import { getDocAccessContext } from '@/lib/docs/access/doc-access';
import { buildSkillMarkdown } from '@/lib/agent/skill-builder';
import { inferSiteOrigin } from '@/lib/core/site-origin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  const origin = inferSiteOrigin(request);
  const access = getDocAccessContext(request);
  return new Response(buildSkillMarkdown(origin, access), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  });
}
