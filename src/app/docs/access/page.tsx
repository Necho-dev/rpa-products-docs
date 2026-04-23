import { Suspense } from 'react';
import { DocsPrivateAccessForm } from '@/components/docs-private-access-form';
import { docsRoute } from '@/lib/shared';

export const metadata = {
  title: '内容访问验证',
  robots: { index: false, follow: false },
};

function AccessFallback() {
  return (
    <p className="px-4 py-12 text-center text-sm text-fd-muted-foreground">加载中…</p>
  );
}

export default function DocsAccessPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-xl font-semibold tracking-tight text-fd-foreground">
        需要访问令牌
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-fd-muted-foreground">
        当前尝试查看的内容已开启访问验证，仅限获得授权的人员访问。若您已获得团队或管理员分发的访问令牌，请填写以继续访问。
      </p>
      <Suspense fallback={<AccessFallback />}>
        <DocsPrivateAccessForm fallbackNext={docsRoute} />
      </Suspense>
    </div>
  );
}
