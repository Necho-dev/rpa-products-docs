'use client';

import {
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/core/cn';
import { AskAIIcon } from '@/components/ai/ask-ai-icon';
import { BackToTopRocketIcon } from '@/components/docs/back-to-top-rocket-icon';
import { AISearchTrigger, useAISearchContext } from '@/components/ai/search';

const TOOLTIP_MESSAGES = [
  '有问题随时找我～',
  '读不懂？问我就好',
  '⌘I / Ctrl+I 快捷打开',
  '卡住了？我来帮你',
  '文档太长？我可以帮你梳理',
  '需要总结或对比？交给我',
  '悄悄告诉你，我很擅长查文档',
] as const;

const INITIAL_TOOLTIP_DELAY_MS = 8_000;
const AUTO_TOOLTIP_MIN_INTERVAL_MS = 45_000;
const AUTO_TOOLTIP_MAX_INTERVAL_MS = 60_000;
const AUTO_TOOLTIP_VISIBLE_MS = 4_000;

const ANCHOR_SIZE_CLASS = 'size-11';
const ANCHOR_ICON_CLASS = 'size-9';

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
        'dark:hover:ring-fd-primary/45 dark:hover:shadow-[0_4px_24px_rgba(59,130,246,0.18)]',
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
  const [messageIndex, setMessageIndex] = useState(0);
  const [autoVisible, setAutoVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const pausedRef = useRef(false);

  const advanceMessage = useCallback(() => {
    setMessageIndex((i) => (i + 1) % TOOLTIP_MESSAGES.length);
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
  const message = TOOLTIP_MESSAGES[messageIndex]!;

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

function AskAIAnchor({ enabled }: { enabled: boolean }) {
  const tooltip = useRotatingTooltip(enabled);
  const wiggling = useAiAttentionWiggle(enabled);
  const [motionStyle] = useState(randomAiMotionStyle);

  if (!enabled) return null;

  return (
    <RotatingTooltip message={tooltip.message} visible={tooltip.visible}>
      <div className="relative" style={motionStyle}>
        <span
          className="ai-anchor-glow-ring pointer-events-none absolute -inset-1 rounded-full bg-linear-to-br from-fd-primary/30 via-violet-500/20 to-sky-400/25 motion-reduce:opacity-50 dark:from-fd-primary/45 dark:via-violet-500/35 dark:to-sky-400/30"
          style={{
            animation: `ai-anchor-glow var(--ai-glow-duration) ease-in-out infinite`,
            animationDelay: 'var(--ai-glow-delay)',
          }}
          aria-hidden
        />
        <span
          className="ai-anchor-orbit-dot pointer-events-none absolute -top-0.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-fd-primary/80 shadow-[0_0_6px_rgba(59,130,246,0.6)] motion-reduce:opacity-50 dark:bg-fd-primary dark:shadow-[0_0_10px_rgba(96,165,250,0.75)]"
          style={{
            transformOrigin: '50% 24px',
            animation: `ai-anchor-orbit var(--ai-orbit-duration) linear infinite`,
          }}
          aria-hidden
        />
        <AISearchTrigger
          position="anchor"
          variant="circle"
          aria-keyshortcuts="Meta+KeyI Control+KeyI"
          className={cn(
            'ai-anchor-animated motion-reduce:animate-none',
            wiggling && 'animate-[ai-anchor-wiggle_0.7s_ease-in-out]',
            !wiggling &&
              'animate-[ai-anchor-breathe_var(--ai-breathe-duration)_ease-in-out_infinite,ai-anchor-float_var(--ai-float-duration)_ease-in-out_infinite]',
            'data-[state=open]:pointer-events-none data-[state=open]:scale-0 data-[state=open]:opacity-0',
          )}
          style={
            !wiggling
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

function BackToTopAnchor({ enabled }: { enabled: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const onScroll = () => setVisible(window.scrollY > 300);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <FloatingAnchorButton
      aria-label="回到页面顶部"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
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

export function DocsFloatingAnchors() {
  const pathname = usePathname();
  const isClient = useIsClient();
  const { open: aiPanelOpen } = useAISearchContext();

  const show = isClient && shouldShowFloatingAnchors(pathname);

  if (!show) return null;

  return (
    <div
      className={cn(
        /* z-30：低于 AI 面板（z-50），避免打开对话后遮挡输入区 */
        'fixed z-30 flex flex-col items-center gap-3.5',
        'bottom-[max(5rem,env(safe-area-inset-bottom,0px))]',
        'inset-e-[max(2.75rem,calc(2.75rem+var(--removed-body-scroll-bar-size,0px)),env(safe-area-inset-end,0px))]',
        'transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none',
        aiPanelOpen && 'pointer-events-none translate-y-2 scale-95 opacity-0',
      )}
      aria-label="页面快捷操作"
      aria-hidden={aiPanelOpen}
    >
      <AskAIAnchor enabled={show && !aiPanelOpen} />
      <BackToTopAnchor enabled={show && !aiPanelOpen} />
    </div>
  );
}
