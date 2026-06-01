import {
  BookOpenIcon,
  Building2Icon,
  ChevronRightIcon,
  CircleHelpIcon,
  KeyRoundIcon,
  LockIcon,
  ShieldCheckIcon,
  UserCheckIcon,
  UserRoundCheckIcon,
  CircleChevronRightIcon,
} from 'lucide-react';
import Image from 'next/image';
import { siteName } from '@/lib/core/shared';

const accessFlowSteps = [
  {
    icon: Building2Icon,
    title: '登录数据魔方',
    description: '企业账号登录魔方系统',
    iconClass:
      'bg-sky-500/10 text-sky-600 ring-sky-500/20 dark:bg-sky-500/15 dark:text-sky-400 dark:ring-sky-500/25',
  },
  {
    icon: BookOpenIcon,
    title: '查看产品文档',
    description: '找到对应产品文档链接',
    iconClass:
      'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/25',
  },
  {
    icon: UserRoundCheckIcon,
    title: '自动授权',
    description: '首次授权后 30 天内免登',
    iconClass:
      'bg-violet-500/10 text-violet-600 ring-violet-500/20 dark:bg-violet-500/15 dark:text-violet-400 dark:ring-violet-500/25',
  },
] as const;

function FlowStepNode({
  step,
  icon: Icon,
  title,
  description,
  iconClass,
}: {
  step: number;
  icon: (typeof accessFlowSteps)[number]['icon'];
  title: string;
  description: string;
  iconClass: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative">
        <span
          className={`flex size-12 items-center justify-center rounded-2xl ring-1 ring-inset ${iconClass}`}
        >
          <Icon className="size-5" strokeWidth={1.5} aria-hidden />
        </span>
        <span className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-sky-500 text-[10px] font-semibold text-white shadow-sm dark:bg-sky-600">
          {step}
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold tracking-tight text-fd-foreground">{title}</p>
      <p className="mt-1 max-w-38 text-pretty text-[11px] leading-relaxed text-fd-muted-foreground sm:text-xs">
        {description}
      </p>
    </div>
  );
}

function FlowConnector({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`flex items-center justify-center text-sky-300/90 dark:text-sky-700/80 ${className ?? ''}`}
    >
      <CircleChevronRightIcon className="size-3.5 shrink-0 sm:size-4" strokeWidth={2} />
    </div>
  );
}

export type AuthLoginGuideProps = {
  /** 配置 DOCS_CUBE_DEFAULT_ORIGIN 时，SSO 主按钮跳转 docsAuth */
  ssoHref?: string | null;
};

function FloatingRingBadge({
  className,
  icon: Icon,
  iconClassName,
}: {
  className: string;
  icon: typeof ShieldCheckIcon;
  iconClassName?: string;
}) {
  return (
    <div
      className={`absolute hidden rounded-2xl border border-white/50 bg-white/45 p-3 shadow-sm shadow-sky-200/30 backdrop-blur-md dark:border-sky-900/45 dark:bg-sky-950/35 dark:shadow-black/20 lg:block ${className}`}
    >
      <Icon className={iconClassName ?? 'size-8 text-sky-400/75 dark:text-sky-500/55'} strokeWidth={1.25} />
    </div>
  );
}

function AuthLoginBackground() {
  const ringMask =
    'radial-gradient(ellipse 88% 78% at 50% 48%, transparent 0%, transparent 32%, black 48%, black 72%, transparent 100%)';
  const outerRingMask =
    'radial-gradient(ellipse 100% 92% at 50% 48%, transparent 0%, transparent 22%, black 44%, black 98%, transparent 100%)';

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-0 h-dvh w-screen overflow-hidden bg-[#e8edf5] dark:bg-[#0a0f18]"
    >
      {/* 底色渐变 */}
      <div
        className="absolute inset-0 opacity-100 dark:opacity-60"
        style={{
          background:
            'radial-gradient(ellipse 100% 80% at 50% -20%, rgba(59,130,246,0.22) 0%, transparent 58%), radial-gradient(circle at 12% 88%, rgba(56,189,248,0.12) 0%, transparent 42%), radial-gradient(circle at 88% 72%, rgba(129,140,248,0.14) 0%, transparent 38%)',
        }}
      />

      {/* 点阵 + 网格 SVG */}
      <svg
        className="absolute inset-0 size-full text-sky-600/30 dark:text-sky-400/20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="auth-login-dots" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="currentColor" opacity="0.55" />
          </pattern>
          <pattern id="auth-login-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path
              d="M 48 0 L 0 0 0 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.6"
              opacity="0.35"
            />
          </pattern>
          <radialGradient id="auth-login-fade-dark" cx="50%" cy="48%" r="85%">
            <stop offset="40%" stopColor="#0a0f18" stopOpacity="0" />
            <stop offset="100%" stopColor="#0a0f18" stopOpacity="0.45" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#auth-login-dots)" />
        <rect width="100%" height="100%" fill="url(#auth-login-grid)" />
        <rect
          width="100%"
          height="100%"
          fill="url(#auth-login-fade-dark)"
          className="hidden dark:block"
        />
      </svg>

      {/* 内圈同心圆环 — 中心区域透明遮罩，两侧保留弧线 */}
      <div
        className="absolute inset-0"
        style={{
          maskImage: ringMask,
          WebkitMaskImage: ringMask,
        }}
      >
        <div className="absolute left-1/2 top-[48%] size-[min(150vmax,980px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-300/45 dark:border-sky-700/40" />
        <div className="absolute left-1/2 top-[48%] size-[min(118vmax,760px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-200/55 dark:border-sky-800/45" />
        <div className="absolute left-1/2 top-[48%] size-[min(88vmax,580px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-sky-200/50 dark:border-sky-900/35" />
        <div className="absolute left-1/2 top-[48%] size-[min(62vmax,400px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-100/70 dark:border-sky-900/25" />
      </div>

      {/* 卡片后方虚化：柔化圆环与内容区交界 */}
      <div className="absolute left-1/2 top-[48%] h-[min(72vh,560px)] w-[min(92%,42rem)] -translate-x-1/2 -translate-y-1/2 rounded-4xl bg-[#e8edf5]/55 blur-2xl dark:bg-[#0a0f18]/55" />
      <div className="absolute left-1/2 top-[48%] h-[min(64vh,500px)] w-[min(88%,40rem)] -translate-x-1/2 -translate-y-1/2 rounded-[1.75rem] bg-[#eef2f8]/75 backdrop-blur-[3px] dark:bg-[#0c121c]/75" />

      {/* 最外圈 — 浅色弧线，直径不超过容器宽度 */}
      <div
        className="absolute inset-0"
        style={{
          maskImage: outerRingMask,
          WebkitMaskImage: outerRingMask,
        }}
      >
        <div className="absolute left-1/2 top-[48%] size-[min(1180px,calc(100%-1rem))] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sky-200/70 shadow-[0_0_28px_rgba(125,211,252,0.22)] dark:border-sky-400/35 dark:shadow-sky-500/10" />
      </div>

      {/* 柔光斑 — 完全置于视口内，避免 blur 绘制溢出 */}
      <div className="absolute left-8 top-[12%] size-48 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-600/10" />
      <div className="absolute right-8 bottom-[18%] size-48 rounded-full bg-indigo-300/15 blur-3xl dark:bg-indigo-600/10" />

      {/* 圆环附近浮动图标 — 置于虚化层之上 */}
      <FloatingRingBadge
        className="left-[5%] top-[24%] rotate-[-8deg]"
        icon={ShieldCheckIcon}
        iconClassName="size-9 text-sky-400/70 dark:text-sky-500/50"
      />
      <FloatingRingBadge
        className="right-[6%] top-[27%] rotate-6"
        icon={UserCheckIcon}
        iconClassName="size-8 text-indigo-400/70 dark:text-indigo-500/50"
      />
      <FloatingRingBadge
        className="left-[10%] top-[58%] rotate-10"
        icon={KeyRoundIcon}
        iconClassName="size-7 text-sky-500/65 dark:text-sky-400/45"
      />
      <FloatingRingBadge
        className="right-[9%] top-[54%] rotate-[-5deg]"
        icon={BookOpenIcon}
        iconClassName="size-7 text-violet-400/65 dark:text-violet-400/45"
      />
      <FloatingRingBadge
        className="right-[20%] top-[13%] rotate-[4deg]"
        icon={LockIcon}
        iconClassName="size-6 text-sky-400/60 dark:text-sky-500/40"
      />
    </div>
  );
}

function AuthAccessFlow() {
  return (
    <section className="mt-9 overflow-hidden rounded-2xl border border-sky-100/70 bg-linear-to-br from-sky-50/50 via-white/80 to-indigo-50/40 px-4 py-5 dark:border-sky-900/35 dark:from-sky-950/25 dark:via-fd-card/40 dark:to-indigo-950/20 sm:px-6 sm:py-6">
      {/* 桌面：横向流程 */}
      <ol
        aria-label="访问流程"
        className="mt-5 hidden list-none p-0 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-start"
      >
        {accessFlowSteps.map((step, index) => (
          <li key={step.title} className="contents">
            <div className="px-1">
              <FlowStepNode step={index + 1} {...step} />
            </div>
            {index < accessFlowSteps.length - 1 ? (
              <FlowConnector className="px-0.5 pt-6" />
            ) : null}
          </li>
        ))}
      </ol>

      {/* 移动：纵向时间轴 */}
      <ol className="mt-4 list-none space-y-0 p-0 sm:hidden">
        {accessFlowSteps.map((step, index) => {
          const Icon = step.icon;
          return (
          <li key={step.title}>
            <div className="flex items-start gap-3.5">
              <div className="flex flex-col items-center">
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${step.iconClass}`}
                >
                  <Icon className="size-4.5" strokeWidth={1.5} aria-hidden />
                </span>
                {index < accessFlowSteps.length - 1 ? (
                  <span className="my-1.5 block min-h-8 w-px bg-linear-to-b from-sky-300/70 to-sky-200/20 dark:from-sky-700/70 dark:to-transparent" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1 pb-5 pt-0.5">
                <p className="text-sm font-semibold text-fd-foreground">
                  <span className="mr-1.5 text-sky-500 dark:text-sky-400">{index + 1}.</span>
                  {step.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-fd-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          </li>
          );
        })}
      </ol>
    </section>
  );
}

function SsoLoginAction({ ssoHref }: { ssoHref?: string | null }) {
  const inner = (
    <>
      <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400">
        <ShieldCheckIcon className="size-[22px]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-semibold text-fd-foreground sm:text-[15px]">
          通过魔方账号登录（SSO）
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-fd-muted-foreground sm:text-sm">
          {ssoHref
            ? '将跳转至魔方身份认证页面完成登录'
            : '首先在魔方系统中完成登录，再通过「查看产品文档」访问本站'}
        </span>
      </span>
      <ChevronRightIcon
        className="size-5 shrink-0 text-sky-500 opacity-80 transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </>
  );

  const className =
    'group flex min-h-21 w-full items-center gap-4 rounded-2xl border border-sky-200/90 bg-linear-to-r from-sky-50 to-sky-50/50 px-5 py-4 shadow-sm transition hover:border-sky-300 hover:shadow-md sm:min-h-22 sm:px-6 sm:py-5 dark:border-sky-900/50 dark:from-sky-950/35 dark:to-sky-950/15 dark:hover:border-sky-800';

  if (ssoHref) {
    return (
      <a href={ssoHref} className={className}>
        {inner}
      </a>
    );
  }

  return (
    <div className={className} role="note">
      {inner}
    </div>
  );
}

export function AuthLoginGuide({ ssoHref }: AuthLoginGuideProps) {
  return (
    <main
      data-auth-canvas
      className="relative z-10 flex min-h-dvh w-full flex-col items-center justify-center px-4 py-12 sm:px-6 sm:py-16"
    >
      <AuthLoginBackground />

      <div className="relative z-10 w-full max-w-2xl">
        <div className="rounded-3xl border border-white/60 bg-fd-card/96 p-7 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.12)] backdrop-blur-md dark:border-fd-border/50 dark:shadow-black/40 sm:p-9 md:p-10">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2.5 sm:gap-3">
              <Image
                src="/icon.svg"
                alt=""
                width={28}
                height={28}
                className="size-6 shrink-0 sm:size-7"
                priority
              />
              <h1 className="text-balance text-2xl font-semibold leading-none tracking-tight text-fd-foreground sm:text-[1.75rem]">
                {siteName}
              </h1>
            </div>
            <p className="mx-auto mt-4 max-w-md text-pretty text-sm leading-[1.65] text-fd-muted-foreground sm:text-[15px]">
              本站通过魔方身份认证（SSO）进行访问控制（有效期 30 天）<br/>请在魔方系统登录后继续访问本站
            </p>
          </div>

          <div className="mt-9 cursor-pointer">
            <SsoLoginAction ssoHref={ssoHref} />
          </div>

          <AuthAccessFlow />

          <div className="mt-7 flex items-start gap-3.5 rounded-2xl border border-amber-200/70 bg-linear-to-br from-amber-50 to-amber-50/60 px-5 py-4 text-sm leading-[1.65] text-amber-950 sm:py-4.5 dark:border-amber-900/35 dark:from-amber-950/30 dark:to-amber-950/15 dark:text-amber-100/90">
            <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100/90 text-amber-700 dark:bg-amber-900/45 dark:text-amber-300">
              <ShieldCheckIcon className="size-[18px]" aria-hidden />
            </span>
            <p className="pt-0.5 text-justify">
              首次访问本站时，请您提前在魔方系统完成账号登录，再次访问时将自动授权；授权有效期（有效期 30 天）内可直接访问，到期后将重新验证魔方登录状态。
            </p>
          </div>

          <p className="mt-7 flex items-center justify-center gap-2 text-center text-xs leading-[1.55] text-fd-muted-foreground sm:text-sm">
            <CircleHelpIcon className="size-4 shrink-0 opacity-70" aria-hidden />
            如需访问权限或遇到问题，请联系系统管理员或 IT 支持。
          </p>
        </div>

        <footer className="mt-6 text-center text-[11px] leading-relaxed text-fd-muted-foreground/75 sm:text-xs">
          <p>
            © {new Date().getFullYear()}-{new Date().getFullYear() + 1} {siteName} All Rights Reserved.
          </p>
        </footer>
      </div>
    </main>
  );
}
