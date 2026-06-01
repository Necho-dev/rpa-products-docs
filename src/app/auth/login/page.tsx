import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AuthLoginGuide } from '@/components/auth/auth-login-guide';
import { cubeDefaultOrigin, DOCS_CUBE_ORIGIN_COOKIE } from '@/lib/auth/auth-config';
import { isValidCubeOrigin } from '@/lib/auth/cube';
import { safeRedirectPath } from '@/lib/auth/session';

export const metadata = {
  title: '需要登录',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

function readCubeOriginCookie(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function buildDocsAuthUrl(cubeOrigin: string, redirectPath: string): string {
  return `${cubeOrigin.replace(/\/$/, '')}/api/docsAuth?redirect=${encodeURIComponent(redirectPath)}`;
}

export default async function AuthLoginPage({
  searchParams,
}: PageProps<'/auth/login'>) {
  const params = await searchParams;
  const redirectPath = safeRedirectPath(
    typeof params.redirect === 'string' ? params.redirect : undefined,
  );

  const cookieStore = await cookies();
  const cubeOrigin = readCubeOriginCookie(cookieStore.get(DOCS_CUBE_ORIGIN_COOKIE)?.value);
  if (cubeOrigin && isValidCubeOrigin(cubeOrigin)) {
    redirect(buildDocsAuthUrl(cubeOrigin, redirectPath));
  }

  const defaultOrigin = cubeDefaultOrigin();
  const ssoHref =
    defaultOrigin && isValidCubeOrigin(defaultOrigin)
      ? buildDocsAuthUrl(defaultOrigin, redirectPath)
      : null;

  return <AuthLoginGuide ssoHref={ssoHref} />;
}
