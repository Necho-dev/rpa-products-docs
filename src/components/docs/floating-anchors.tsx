'use client';

import {
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/core/cn';
import { useDocPeek } from '@/components/docs/doc-peek-context';
import { AskAIIcon } from '@/components/ai/ask-ai-icon';
import { BackToTopRocketIcon } from '@/components/docs/back-to-top-rocket-icon';
import { DocFeedbackIcon } from '@/components/docs/feedback/doc-feedback-icon';
import { useDocFeedbackOptional } from '@/components/docs/feedback/doc-feedback-context';
import { ExcerptCollectionIcon } from '@/components/docs/excerpt-collection-icon';
import { useExcerptCollectionOptional } from '@/components/docs/selection/excerpt-collection-context';
import { AISearchTrigger, useAISearchContext } from '@/components/ai/search';
import { getDocPageTitle } from '@/lib/docs/feedback/page-title';

/** 任意时段均可轮播的通用文案 */
const STATIC_TOOLTIP_MESSAGES = [
  '有问题随时找我～',
  '读不懂？问我就好',
  '卡住了？我来帮你',
  '文档太长？我可以帮你梳理',
  '内容太多？我来帮你总结',
  '需要总结或对比？交给我',
  '悄悄告诉你，我很擅长查文档',
  '想快速定位？描述一下你的问题',
  '术语看不懂？我可以帮你解释',
  '多个页面来回切？问我更高效',
] as const;

function formatTimeHms(date: Date): string {
  return date.toLocaleTimeString('zh-CN', { hour12: false });
}

/** 按当前时刻追加情境文案（与通用文案合并后轮播） */
function getContextualTooltipMessages(date: Date): string[] {
  const hour = date.getHours();
  const minute = date.getMinutes();
  const time = formatTimeHms(date);
  const weekday = date.getDay();
  const messages: string[] = [];

  if (weekday === 0 || weekday === 6) {
    messages.push('周末也在充电？有问题找我');
    messages.push('周末愉快，文档疑问交给我');
  }

  if (hour >= 23 || hour < 5) {
    messages.push(`现在是 ${time}，明天再看吧～`);
    messages.push('夜深了，早点休息哦');
    messages.push('这么晚还在查文档？辛苦了');
    messages.push('夜猫子模式？有问题我陪你');
  } else if (hour < 9) {
    messages.push('早上好，又是活力满满的一天！');
    messages.push('新的一天，从搞懂一个问题开始');
    messages.push('晨读文档？有疑问随时问我');
  } else if (hour < 12) {
    messages.push('上午好，需要查什么尽管说');
    messages.push('专注力在线的时段，卡住就问我');
  } else if (hour < 14 && (hour > 11 || (hour === 11 && minute >= 30))) {
    messages.push('午休片刻，有问题先问我～');
    messages.push('吃完饭歇一歇，文档疑问我来答');
  } else if (hour < 18) {
    messages.push('下午好，卡住的话我来帮你');
    messages.push('午后容易犯困？让我帮你划重点');
  } else if (hour < 22) {
    messages.push('晚上好，还在查文档吗？');
    messages.push('收工前想把问题搞清楚？问我');
  } else {
    messages.push(`已经 ${time} 了，别熬太晚哦`);
    messages.push('夜深将至，看完这段就休息吧');
  }

  return messages;
}

function buildTooltipPool(date: Date): string[] {
  return [...STATIC_TOOLTIP_MESSAGES, ...getContextualTooltipMessages(date)];
}

const INITIAL_TOOLTIP_DELAY_MS = 8_000;
const AUTO_TOOLTIP_MIN_INTERVAL_MS = 45_000;
const AUTO_TOOLTIP_MAX_INTERVAL_MS = 60_000;
const AUTO_TOOLTIP_VISIBLE_MS = 4_000;

const ANCHOR_SIZE_CLASS = 'size-11';
const ANCHOR_ICON_CLASS = 'size-9';
/** 与单栏 `DocsFloatingAnchors` 的 inset 一致 */
const FAB_INSET_END_CLASS =
  'inset-e-[max(2.75rem,calc(2.75rem+var(--removed-body-scroll-bar-size,0px)),env(safe-area-inset-end,0px))]';
const FAB_INSET_BOTTOM_CLASS = 'bottom-[max(5rem,env(safe-area-inset-bottom,0px))]';

/** SSR 与 hydration 首帧返回 false，客户端返回 true，避免 effect 内 setState。 */
function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function shouldShowFloatingAnchors(pathname: string): boolean {
  if (pathname === '/docs/access') return false;
  if (pathname.startsWith('/auth/')) return false;
  return pathname === '/' || pathname.startsWith('/docs');
}

function randomIntervalMs(): number {
  return (
    AUTO_TOOLTIP_MIN_INTERVAL_MS +
    Math.floor(Math.random() * (AUTO_TOOLTIP_MAX_INTERVAL_MS - AUTO_TOOLTIP_MIN_INTERVAL_MS))
  );
}

function randomAiMotionStyle(): CSSProperties {
  return {
    '--ai-breathe-duration': `${2.6 + Math.random() * 1.4}s`,
    '--ai-float-duration': `${3.2 + Math.random() * 1.8}s`,
    '--ai-glow-duration': `${2.4 + Math.random() * 1.6}s`,
    '--ai-orbit-duration': `${5 + Math.random() * 4}s`,
    '--ai-glow-delay': `${Math.random() * 2}s`,
    '--ai-float-delay': `${Math.random() * 1.5}s`,
  } as CSSProperties;
}

function FloatingAnchorButton({
  className,
  children,
  ...props
}: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cn(
        'relative flex items-center justify-center rounded-full',
        ANCHOR_SIZE_CLASS,
        'border border-fd-border/80 bg-fd-card/90 text-fd-primary shadow-lg backdrop-blur-sm',
        'dark:border-fd-border dark:bg-fd-muted dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] dark:ring-1 dark:ring-fd-primary/30',
        'transition-[transform,box-shadow,opacity] duration-300 ease-out',
        'hover:scale-105 hover:shadow-xl hover:shadow-fd-primary/15 hover:ring-2 hover:ring-fd-primary/25',
        'dark:hover:ring-fd-primary/45 dark:hover:shadow-[0_4px_24px_color-mix(in_srgb,var(--color-fd-primary)_18%,transparent)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring focus-visible:ring-offset-2 focus-visible:ring-offset-fd-background',
        'active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function RotatingTooltip({
  message,
  visible,
  children,
}: {
  message: string;
  visible: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <div
        role="tooltip"
        aria-hidden={!visible}
        className={cn(
          'pointer-events-none absolute top-1/2 right-full z-50 me-4 -translate-y-1/2',
          'whitespace-nowrap rounded-lg border border-fd-border/80 bg-fd-popover px-3 py-1.5',
          'text-xs font-medium text-fd-popover-foreground shadow-md',
          'transition-[opacity,transform] duration-300 motion-reduce:transition-none',
          visible ? 'translate-x-0 opacity-100' : 'translate-x-1 opacity-0',
        )}
      >
        {message}
        <span
          className="absolute top-1/2 -right-1 size-2 -translate-y-1/2 rotate-45 border-r border-t border-fd-border/80 bg-fd-popover"
          aria-hidden
        />
      </div>
      {children}
    </div>
  );
}

function useRotatingTooltip(enabled: boolean) {
  const [message, setMessage] = useState(() => buildTooltipPool(new Date())[0]!);
  const [messageIndex, setMessageIndex] = useState(0);
  const [autoVisible, setAutoVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const pausedRef = useRef(false);

  const advanceMessage = useCallback(() => {
    const pool = buildTooltipPool(new Date());
    setMessageIndex((i) => {
      const next = (i + 1) % pool.length;
      setMessage(pool[next]!);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let showTimer: ReturnType<typeof setTimeout>;
    let hideTimer: ReturnType<typeof setTimeout>;

    const scheduleAutoShow = (delayMs: number) => {
      showTimer = setTimeout(() => {
        if (pausedRef.current) {
          scheduleAutoShow(randomIntervalMs());
          return;
        }
        setAutoVisible(true);
        advanceMessage();
        hideTimer = setTimeout(() => {
          setAutoVisible(false);
          scheduleAutoShow(randomIntervalMs());
        }, AUTO_TOOLTIP_VISIBLE_MS);
      }, delayMs);
    };

    scheduleAutoShow(INITIAL_TOOLTIP_DELAY_MS);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [advanceMessage, enabled]);

  const visible = hovered || focused || autoVisible;

  return {
    message,
    visible,
    onPointerEnter: () => {
      pausedRef.current = true;
      setHovered(true);
    },
    onPointerLeave: () => {
      pausedRef.current = false;
      setHovered(false);
    },
    onFocus: () => {
      pausedRef.current = true;
      setFocused(true);
    },
    onBlur: () => {
      pausedRef.current = false;
      setFocused(false);
    },
  };
}

function useAiAttentionWiggle(enabled: boolean) {
  const [wiggling, setWiggling] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let wiggleTimer: ReturnType<typeof setTimeout>;
    let resetTimer: ReturnType<typeof setTimeout>;

    const scheduleWiggle = () => {
      const delay = 18_000 + Math.floor(Math.random() * 22_000);
      wiggleTimer = setTimeout(() => {
        setWiggling(true);
        resetTimer = setTimeout(() => {
          setWiggling(false);
          scheduleWiggle();
        }, 700);
      }, delay);
    };

    scheduleWiggle();

    return () => {
      clearTimeout(wiggleTimer);
      clearTimeout(resetTimer);
    };
  }, [enabled]);

  return wiggling;
}

/** 面板关闭时，根据后台对话状态覆盖 idle 提示文案 */
function getBackgroundStatusTooltip(
  working: boolean,
  completed: boolean,
): string | null {
  if (working) return '正在努力解答中…';
  if (completed) return '问题已解答，请查看';
  return null;
}

function AskAIAnchor({ enabled }: { enabled: boolean }) {
  const { open: panelOpen, chatStatus, backgroundNotify } = useAISearchContext();
  const tooltip = useRotatingTooltip(enabled);
  const wiggling = useAiAttentionWiggle(enabled);
  const [motionStyle] = useState(randomAiMotionStyle);

  const working = enabled && !panelOpen && (chatStatus === 'submitted' || chatStatus === 'streaming');
  const completed = enabled && !panelOpen && !working && backgroundNotify === 'completed';
  const backgroundMessage = getBackgroundStatusTooltip(working, completed);
  const tooltipVisible = backgroundMessage !== null || tooltip.visible;
  const tooltipMessage = backgroundMessage ?? tooltip.message;

  if (!enabled) return null;

  return (
    <RotatingTooltip message={tooltipMessage} visible={tooltipVisible}>
      <div className="relative" style={motionStyle}>
        <span
          className={cn(
            'ai-anchor-glow-ring pointer-events-none absolute -inset-1 rounded-full bg-linear-to-br from-fd-primary/30 via-violet-500/20 to-sky-400/25 motion-reduce:opacity-50 dark:from-fd-primary/45 dark:via-violet-500/35 dark:to-sky-400/30',
            working && 'from-sky-400/45 via-fd-primary/40 to-violet-500/35 dark:from-sky-400/55 dark:via-fd-primary/50 dark:to-violet-500/45',
          )}
          style={{
            animation: working
              ? 'ai-anchor-working-glow 1s ease-in-out infinite'
              : `ai-anchor-glow var(--ai-glow-duration) ease-in-out infinite`,
            animationDelay: working ? '0s' : 'var(--ai-glow-delay)',
          }}
          aria-hidden
        />
        <span
          className="ai-anchor-orbit-dot pointer-events-none absolute -top-0.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-fd-primary/80 shadow-[0_0_6px_rgba(59,130,246,0.6)] motion-reduce:opacity-50 dark:bg-fd-primary dark:shadow-[0_0_10px_rgba(96,165,250,0.75)]"
          style={{
            transformOrigin: '50% 24px',
            animation: working
              ? 'ai-anchor-working-orbit 1.1s linear infinite'
              : `ai-anchor-orbit var(--ai-orbit-duration) linear infinite`,
          }}
          aria-hidden
        />
        {working ? (
          <span
            className="ai-anchor-orbit-dot pointer-events-none absolute -top-0.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-violet-500/80 shadow-[0_0_6px_rgba(139,92,246,0.6)] dark:bg-violet-400 dark:shadow-[0_0_10px_rgba(167,139,250,0.75)]"
            style={{
              transformOrigin: '50% 24px',
              animation: 'ai-anchor-working-orbit 1.1s linear infinite reverse',
              animationDelay: '0.5s',
            }}
            aria-hidden
          />
        ) : null}
        <AISearchTrigger
          position="anchor"
          variant="circle"
          aria-keyshortcuts="Meta+KeyI Control+KeyI"
          className={cn(
            'motion-reduce:animate-none',
            working && 'ai-anchor-working animate-[ai-anchor-working-pulse_1s_ease-in-out_infinite]',
            completed && 'ai-anchor-completed animate-[ai-anchor-completed-flash_0.9s_ease-in-out]',
            !working &&
              !completed && [
                'ai-anchor-animated',
                wiggling && 'animate-[ai-anchor-wiggle_0.7s_ease-in-out]',
                !wiggling &&
                  'animate-[ai-anchor-breathe_var(--ai-breathe-duration)_ease-in-out_infinite,ai-anchor-float_var(--ai-float-duration)_ease-in-out_infinite]',
              ],
            'data-[state=open]:pointer-events-none data-[state=open]:scale-0 data-[state=open]:opacity-0',
          )}
          style={
            !wiggling && !working && !completed
              ? ({
                  animationDelay: '0s, var(--ai-float-delay)',
                } as CSSProperties)
              : undefined
          }
          onPointerEnter={tooltip.onPointerEnter}
          onPointerLeave={tooltip.onPointerLeave}
          onFocus={tooltip.onFocus}
          onBlur={tooltip.onBlur}
        >
          <AskAIIcon className={ANCHOR_ICON_CLASS} />
        </AISearchTrigger>
      </div>
    </RotatingTooltip>
  );
}

function DocFeedbackAnchor({
  enabled,
  hidden,
  pageUrl,
  titleSurface = 'main',
}: {
  enabled: boolean;
  hidden: boolean;
  pageUrl?: string;
  titleSurface?: 'main' | 'peek';
}) {
  const feedback = useDocFeedbackOptional();
  const pathname = usePathname();

  if (!enabled || !feedback?.enabled) return null;

  const isDocPage =
    pathname.startsWith('/docs/') && pathname !== '/docs/access';

  if (!isDocPage && !pageUrl) return null;

  return (
    <FloatingAnchorButton
      aria-label="文档反馈"
      title="文档反馈"
      onClick={() => {
        const docUrl = pageUrl ?? window.location.href.split('#')[0];
        feedback.openFeedback({
          errorContent: getDocPageTitle(titleSurface) ?? '当前文档',
          docUrl,
          source: 'document',
          pagePath: pageUrl ? new URL(pageUrl, window.location.origin).pathname : pathname,
        });
      }}
      className={cn(
        'text-fd-primary transition-[opacity,color] duration-300',
        hidden && 'pointer-events-none scale-95 opacity-0',
      )}
    >
      <DocFeedbackIcon className="size-6" />
    </FloatingAnchorButton>
  );
}

function ExcerptCollectionAnchor({
  enabled,
  hidden,
}: {
  enabled: boolean;
  hidden: boolean;
}) {
  const excerpt = useExcerptCollectionOptional();

  if (!enabled || !excerpt) return null;

  const count = excerpt.highlights.length;

  return (
    <FloatingAnchorButton
      aria-label="摘录集"
      title="摘录集"
      onClick={() => excerpt.setOpen(true)}
      className={cn(
        'relative text-fd-primary transition-opacity duration-300',
        hidden && 'pointer-events-none scale-95 opacity-0',
      )}
    >
      <ExcerptCollectionIcon className="size-6" />
      {count > 0 ? (
        <span
          className={cn(
            'absolute -top-0.5 -inset-e-0.5 z-10 flex min-w-4 items-center justify-center rounded-full',
            'bg-fd-primary px-1 text-[10px] font-semibold leading-4 tabular-nums',
            /* primary-foreground 在 Purple/Dusk 等预设下偏深，叠在 primary 底上对比不足 */
            'text-white dark:text-fd-background',
            'ring-1 ring-fd-background/40 dark:ring-fd-foreground/15',
          )}
          aria-hidden
        >
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </FloatingAnchorButton>
  );
}

/** 滚动容器可以直接传节点，也可以传惰性解析函数，避免在 effect 里同步 setState 存节点。 */
type ScrollRootSource = HTMLElement | null | (() => HTMLElement | null);

function resolveScrollRoot(source?: ScrollRootSource): HTMLElement | null {
  return typeof source === 'function' ? source() : (source ?? null);
}

function BackToTopAnchor({
  enabled,
  scrollRoot,
}: {
  enabled: boolean;
  scrollRoot?: ScrollRootSource;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const root = resolveScrollRoot(scrollRoot);
    const readTop = () => (root ? root.scrollTop : window.scrollY);
    const onScroll = () => setVisible(readTop() > 300);
    onScroll();

    if (root) {
      root.addEventListener('scroll', onScroll, { passive: true });
      return () => root.removeEventListener('scroll', onScroll);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [enabled, scrollRoot]);

  if (!enabled) return null;

  return (
    <FloatingAnchorButton
      aria-label="回到页面顶部"
      onClick={() => {
        const root = resolveScrollRoot(scrollRoot);
        if (root) {
          root.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      className={cn(
        'group/back-to-top text-fd-muted-foreground transition-opacity duration-300',
        'dark:text-fd-foreground/75',
        'hover:ring-0 hover:shadow-lg hover:shadow-fd-primary/10 dark:hover:shadow-[0_4px_20px_rgba(59,130,246,0.15)]',
        visible ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      <BackToTopRocketIcon
        className={cn(
          'size-6 text-fd-muted-foreground transition-colors duration-200',
          'dark:text-fd-foreground/80 dark:group-hover/back-to-top:text-fd-primary',
          'group-hover/back-to-top:text-fd-primary motion-reduce:transition-none',
          'back-to-top-rocket-launch group-hover/back-to-top:animate-[back-to-top-rocket-launch_0.75s_ease-in-out_infinite]',
        )}
      />
    </FloatingAnchorButton>
  );
}

function FloatingAnchorStack({
  show,
  hideForOverlay,
  className,
  style,
  scrollRoot,
  feedbackPageUrl,
  showAskAi = true,
  showExcerpt = true,
  feedbackTitleSurface = 'main',
}: {
  show: boolean;
  hideForOverlay: boolean;
  className?: string;
  style?: CSSProperties;
  scrollRoot?: ScrollRootSource;
  feedbackPageUrl?: string;
  showAskAi?: boolean;
  showExcerpt?: boolean;
  feedbackTitleSurface?: 'main' | 'peek';
}) {
  if (!show) return null;

  return (
    <div
      className={cn(
        'z-40 flex flex-col items-center gap-3.5',
        className,
        hideForOverlay && 'pointer-events-none translate-y-2 scale-95 opacity-0',
      )}
      style={style}
      aria-label="页面快捷操作"
      aria-hidden={hideForOverlay}
      /*
       * 按钮组是浮在正文上的独立层，双栏时它没有可滚动的祖先，
       * 不转发的话滚轮划到图标上就完全没反应。
       */
      onWheel={(e) => {
        const root = resolveScrollRoot(scrollRoot);
        if (root) root.scrollTop += e.deltaY;
      }}
    >
      {showAskAi ? <AskAIAnchor enabled={show && !hideForOverlay} /> : null}
      {showExcerpt ? (
        <ExcerptCollectionAnchor enabled={show} hidden={hideForOverlay} />
      ) : null}
      <DocFeedbackAnchor
        enabled={show}
        hidden={hideForOverlay}
        pageUrl={feedbackPageUrl}
        titleSurface={feedbackTitleSurface}
      />
      <BackToTopAnchor enabled={show && !hideForOverlay} scrollRoot={scrollRoot} />
    </div>
  );
}

function useLeftPaneBox(enabled: boolean, dragging: boolean) {
  type PaneBox = { top: number; left: number; width: number; height: number };
  const [box, setBox] = useState<PaneBox | null>(null);

  useLayoutEffect(() => {
    if (!enabled) return;
    const page = document.getElementById('nd-page');
    const layout = document.getElementById('nd-notebook-layout');
    if (!page) return;

    const update = () => {
      const r = page.getBoundingClientRect();
      if (r.width < 96 || r.height < 96) return;
      setBox({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      });
    };
    update();
    const later = window.setTimeout(update, 420);
    const ro = new ResizeObserver(update);
    ro.observe(page);
    if (layout) ro.observe(layout);
    window.addEventListener('resize', update);
    layout?.addEventListener('transitionend', update);

    if (!dragging) {
      return () => {
        window.clearTimeout(later);
        ro.disconnect();
        window.removeEventListener('resize', update);
        layout?.removeEventListener('transitionend', update);
      };
    }
    let raf = 0;
    const loop = () => {
      update();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(later);
      ro.disconnect();
      window.removeEventListener('resize', update);
      layout?.removeEventListener('transitionend', update);
    };
  }, [enabled, dragging]);

  // 关闭双栏后保留旧值也无妨，消费方按 enabled 取用，避免在 effect 里同步置空触发级联渲染。
  return enabled ? box : null;
}

export function DocsFloatingAnchors() {
  const pathname = usePathname();
  const isClient = useIsClient();
  const { open: aiPanelOpen } = useAISearchContext();
  const excerpt = useExcerptCollectionOptional();
  const feedback = useDocFeedbackOptional();
  const peek = useDocPeek();

  const show = isClient && shouldShowFloatingAnchors(pathname);
  const hideForOverlay = aiPanelOpen || Boolean(excerpt?.open) || Boolean(feedback?.open);
  const peekOpen = Boolean(peek?.open);
  const peekTarget = Boolean(peek?.target);
  const paneBox = useLeftPaneBox(peekOpen, Boolean(peek?.splitDragging));
  const leftScrollRoot = useCallback(
    () => (peekOpen ? document.getElementById('nd-page') : null),
    [peekOpen],
  );

  const stack = (
    <FloatingAnchorStack
      show={show && (!peekOpen || paneBox != null)}
      hideForOverlay={hideForOverlay || (peekTarget && !peek?.desktop)}
      showAskAi={!peekTarget}
      showExcerpt={!peekTarget}
      scrollRoot={leftScrollRoot}
      className={cn(
        'z-40 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none',
        FAB_INSET_BOTTOM_CLASS,
        FAB_INSET_END_CLASS,
        peekOpen ? 'pointer-events-auto absolute' : 'fixed',
      )}
    />
  );

  if (peekOpen && paneBox) {
    return (
      <div
        className="pointer-events-none fixed z-40"
        style={{
          top: paneBox.top,
          left: paneBox.left,
          width: paneBox.width,
          height: paneBox.height,
        }}
      >
        {stack}
      </div>
    );
  }

  return stack;
}

/** 右栏栏内右下角快捷操作，对齐钉钉双栏各栏一套 */
export function PeekFloatingAnchors({
  scrollRoot,
  pageUrl,
}: {
  scrollRoot: HTMLElement | null;
  pageUrl: string;
}) {
  const pathname = usePathname();
  const isClient = useIsClient();
  const { open: aiPanelOpen } = useAISearchContext();
  const excerpt = useExcerptCollectionOptional();
  const feedback = useDocFeedbackOptional();

  const show = isClient && shouldShowFloatingAnchors(pathname);
  const hideForOverlay = aiPanelOpen || Boolean(excerpt?.open) || Boolean(feedback?.open);

  return (
    <FloatingAnchorStack
      show={show}
      hideForOverlay={hideForOverlay}
      scrollRoot={scrollRoot}
      feedbackPageUrl={pageUrl}
      showAskAi
      showExcerpt
      feedbackTitleSurface="peek"
      className={cn('absolute z-40', FAB_INSET_BOTTOM_CLASS, FAB_INSET_END_CLASS)}
    />
  );
}
