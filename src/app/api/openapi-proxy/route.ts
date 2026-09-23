import { openapi } from '@/lib/docs/openapi/server';
import { getOpenApiProxyAllowedOrigins } from '@/lib/docs/openapi/config';

function handle(request: Request) {
  const proxy = openapi.createProxy({
    allowedOrigins: getOpenApiProxyAllowedOrigins(),
  });
  return proxy.handle(request);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const HEAD = handle;
