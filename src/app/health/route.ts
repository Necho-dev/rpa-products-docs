export const runtime = 'nodejs';

/** 容器 / 负载均衡探活：无外部依赖、固定 200 */
export function GET() {
  return new Response('ok\n', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
