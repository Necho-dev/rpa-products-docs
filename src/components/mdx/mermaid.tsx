'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from 'next-themes';
import { Check, Copy, GitBranch, Maximize2, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { safeWriteClipboard } from '@/lib/code-block-utils';

let mermaidIdCounter = 0;

type MermaidModule = typeof import('mermaid')['default'];
let mermaidCache: MermaidModule | null = null;
let mermaidInitializedTheme: string | null = null;

async function getMermaid(theme: string): Promise<MermaidModule> {
  if (!mermaidCache) {
    const mod = await import('mermaid');
    mermaidCache = mod.default;
  }
  if (mermaidInitializedTheme !== theme) {
    mermaidCache.initialize({
      startOnLoad: false,
      securityLevel: 'loose',
      fontFamily: 'inherit',
      themeCSS: 'margin: 1.5rem auto 0;',
      theme: theme as 'dark' | 'default',
    });
    mermaidInitializedTheme = theme;
  }
  return mermaidCache;
}

/**
 * Normalize mermaid source coming from AI / markdown:
 * - Replace literal `\n` escape sequences with real newlines.
 * - Escape bare colons inside node labels so mermaid can parse them.
 *   e.g.  A[开始: 调用]  →  A["开始: 调用"]
 */
function normalizeChart(raw: string): string {
  const withNewlines = raw.replaceAll('\\n', '\n').trim();
  return withNewlines.replace(/\[([^\]"]*:[^\]"]*)\]/g, (_, inner) => `["${inner}"]`);
}

const btnCls =
  'flex size-6 items-center justify-center rounded text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground';

// ─── 全屏 Modal ───────────────────────────────────────────────────────────────

interface FullscreenModalProps {
  svg: string;
  onClose: () => void;
}

function FullscreenModal({ svg, onClose }: FullscreenModalProps) {
  const scaleRef = useRef(1);
  const dragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, scrollX: 0, scrollY: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgWrapRef = useRef<HTMLDivElement>(null);
  const pctLabelRef = useRef<HTMLSpanElement>(null);

  // 从原始 svg 字符串提取 viewBox 尺寸（只算一次，不触发重渲染）
  const baseSize = useMemo(() => {
    const vb = svg.match(/viewBox="([^"]+)"/)?.[1]?.split(/\s+/).map(Number);
    if (vb && vb.length === 4) return { w: vb[2], h: vb[3] };
    const w = parseFloat(svg.match(/\bwidth="([^"]+)"/)?.[1] ?? '800');
    const h = parseFloat(svg.match(/\bheight="([^"]+)"/)?.[1] ?? '600');
    return { w, h };
  }, [svg]);

  /**
   * 核心缩放：直接改 SVG DOM 属性 + 更新标签文字，完全绕开 React re-render，
   * 避免 dangerouslySetInnerHTML 重注入导致闪动。
   */
  const applyScale = useCallback((next: number) => {
    const s = Math.min(8, Math.max(0.1, next));
    scaleRef.current = s;

    const svgEl = svgWrapRef.current?.querySelector('svg');
    if (svgEl) {
      svgEl.setAttribute('width', String(Math.round(baseSize.w * s)));
      svgEl.setAttribute('height', String(Math.round(baseSize.h * s)));
    }
    if (pctLabelRef.current) {
      pctLabelRef.current.textContent = `${Math.round(s * 100)}%`;
    }
  }, [baseSize]);

  // 初始化：按画布宽高双向 fit，取较小比例，确保整图可见
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pad = 64; // 内边距 p-8 = 32*2
    const fitW = (canvas.clientWidth - pad) / baseSize.w;
    const fitH = (canvas.clientHeight - pad) / baseSize.h;
    applyScale(Math.min(fitW, fitH, 1));
  }, [baseSize, applyScale]);

  // Esc 关闭
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // 滚轮缩放：原生事件 + { passive: false } 才能阻止页面滚动
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      applyScale(scaleRef.current * (e.deltaY > 0 ? 0.9 : 1.1));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [applyScale]);

  // 拖拽平移（scrollLeft/scrollTop，无需 transform）
  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    dragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, scrollX: canvas.scrollLeft, scrollY: canvas.scrollTop };
    canvas.style.cursor = 'grabbing';
  };
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.scrollLeft = dragStart.current.scrollX - (e.clientX - dragStart.current.mx);
    canvas.scrollTop  = dragStart.current.scrollY - (e.clientY - dragStart.current.my);
  };
  const stopDrag = () => {
    dragging.current = false;
    if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
  };

  const zoomIn  = () => applyScale(scaleRef.current * 1.25);
  const zoomOut = () => applyScale(scaleRef.current / 1.25);
  const reset   = () => {
    const canvas = canvasRef.current;
    const pad = 64;
    if (canvas) {
      const fitW = (canvas.clientWidth  - pad) / baseSize.w;
      const fitH = (canvas.clientHeight - pad) / baseSize.h;
      applyScale(Math.min(fitW, fitH, 1));
    } else {
      applyScale(1);
    }
  };

  return createPortal(
    /* 遮罩层，点击遮罩关闭 */
    <div
      role="dialog"
      aria-modal="true"
      aria-label="图表查看"
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 backdrop-blur-sm p-[5vw]"
      onClick={onClose}
    >
      {/* 弹窗主体，阻止冒泡防止点内容关闭 */}
      <div
        className="relative flex flex-col w-full h-full rounded-2xl border border-fd-border/60 bg-fd-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶栏 */}
        <div className="flex shrink-0 items-center gap-2 border-b border-fd-border/50 bg-fd-card/95 px-3 py-2">
          <GitBranch className="size-3.5 shrink-0 text-fd-muted-foreground" aria-hidden />
          <span className="rounded border border-fd-border/80 bg-fd-muted/60 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-fd-muted-foreground">
            MERMAID
          </span>

          {/* 缩放工具组 */}
          <div className="ml-auto flex items-center gap-0.5 rounded-lg border border-fd-border/60 bg-fd-muted/40 p-0.5">
            <button
              type="button"
              title="缩小"
              onClick={zoomOut}
              className="flex size-7 items-center justify-center rounded-md text-fd-muted-foreground transition-colors hover:bg-fd-background hover:text-fd-foreground hover:shadow-sm"
            >
              <ZoomOut className="size-3.5" />
            </button>
            <button
              type="button"
              title="重置视图"
              onClick={reset}
              className="flex h-7 min-w-12 items-center justify-center rounded-md px-2 font-mono text-[10px] font-semibold text-fd-muted-foreground transition-colors hover:bg-fd-background hover:text-fd-foreground hover:shadow-sm"
            >
              <span ref={pctLabelRef}>100%</span>
            </button>
            <button
              type="button"
              title="放大"
              onClick={zoomIn}
              className="flex size-7 items-center justify-center rounded-md text-fd-muted-foreground transition-colors hover:bg-fd-background hover:text-fd-foreground hover:shadow-sm"
            >
              <ZoomIn className="size-3.5" />
            </button>
          </div>

          {/* 分隔线 + 关闭按钮 */}
          <div className="mx-1 h-4 w-px bg-fd-border/60" />
          <button
            type="button"
            title="关闭"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg border border-transparent text-fd-muted-foreground transition-colors hover:border-fd-border/60 hover:bg-fd-muted hover:text-fd-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* 画布区域：overflow-auto 支持拖拽平移后内容滚动 */}
        <div
          ref={canvasRef}
          className="flex-1 overflow-auto bg-fd-background/40 select-none"
          style={{ cursor: 'grab' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={stopDrag}
          onMouseLeave={stopDrag}
        >
          {/* 内边距让图表居中，放大后可超出滚动 */}
          <div className="min-h-full min-w-full flex items-center justify-center p-8">
            <div
              ref={svgWrapRef}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
        </div>

        {/* 底部提示 */}
        <div className="shrink-0 border-t border-fd-border/40 bg-fd-card/80 px-4 py-1.5 text-center text-[11px] text-fd-muted-foreground/60">
          滚轮缩放 · 拖拽平移 · 点击外部或按 Esc 关闭
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────

export function Mermaid({ chart }: { chart: string }) {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);
  const [renderedSvg, setRenderedSvg] = useState<string>('');
  const [tab, setTab] = useState<'diagram' | 'source'>('diagram');
  const [copied, setCopied] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const normalized = normalizeChart(chart);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setError(null);
      setRendered(false);
      // 提升到 try 外，catch 中可精确清理同一个临时节点
      const id = `mermaid-${++mermaidIdCounter}`;
      try {
        const mermaid = await getMermaid(resolvedTheme === 'dark' ? 'dark' : 'default');
        const { svg, bindFunctions } = await mermaid.render(id, normalized);

        // 成功后清理 mermaid 可能留在 <body> 的 scratch 节点
        document.getElementById(id)?.remove();

        if (cancelled) return;

        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          bindFunctions?.(containerRef.current);
        }
        setRenderedSvg(svg);
        setRendered(true);
      } catch (err) {
        // 仅清理本实例对应的临时节点，不影响页面上其他 Mermaid 实例
        document.getElementById(id)?.remove();
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [normalized, resolvedTheme]);

  const handleCopy = () => {
    void safeWriteClipboard(normalized).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const showSource = error || tab === 'source';

  return (
    <>
      <figure className="my-4 overflow-hidden rounded-xl border border-fd-border/70 bg-fd-card text-sm shadow-sm not-prose focus:outline-none">
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-fd-border/60 px-4 h-9">
          <GitBranch className="size-3.5 shrink-0 text-fd-muted-foreground" aria-hidden />
          <figcaption className="flex-1 min-w-0 truncate text-fd-muted-foreground">
            <span className="rounded border border-fd-border/80 bg-fd-muted/60 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide">
              MERMAID
            </span>
          </figcaption>

          <div className="flex items-center gap-1 -me-1">
            {!error && (
              <>
                <button
                  type="button"
                  onClick={() => setTab('diagram')}
                  title="查看图表"
                  className={`flex h-6 items-center rounded px-2 font-mono text-[10px] font-semibold tracking-wide transition-colors ${
                    tab === 'diagram'
                      ? 'bg-fd-accent text-fd-accent-foreground'
                      : 'text-fd-muted-foreground hover:text-fd-foreground'
                  }`}
                >
                  图表
                </button>
                <button
                  type="button"
                  onClick={() => setTab('source')}
                  title="查看源码"
                  className={`flex h-6 items-center rounded px-2 font-mono text-[10px] font-semibold tracking-wide transition-colors ${
                    tab === 'source'
                      ? 'bg-fd-accent text-fd-accent-foreground'
                      : 'text-fd-muted-foreground hover:text-fd-foreground'
                  }`}
                >
                  源码
                </button>
                <div className="mx-1 h-3.5 w-px bg-fd-border/70" />
                {/* 全屏按钮：仅渲染成功后显示 */}
                {rendered && (
                  <button
                    type="button"
                    title="全屏查看"
                    aria-label="全屏查看图表"
                    onClick={() => setFullscreen(true)}
                    className={btnCls}
                  >
                    <Maximize2 className="size-3.5" />
                  </button>
                )}
                <div className="mx-1 h-3.5 w-px bg-fd-border/70" />
              </>
            )}
            <button
              type="button"
              aria-label={copied ? '已复制' : '复制源码'}
              title={copied ? '已复制' : '复制源码'}
              onClick={handleCopy}
              className={btnCls}
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </button>
          </div>
        </div>

        {/* Diagram view — kept in DOM so SVG isn't re-rendered on tab switch */}
        <div
          ref={containerRef}
          className="overflow-x-auto px-4 py-3"
          style={{
            display: showSource ? 'none' : 'block',
            visibility: rendered ? 'visible' : 'hidden',
            minHeight: rendered ? undefined : '3rem',
          }}
        />

        {/* Source view */}
        {showSource && (
          <>
            {error && (
              <div className="border-b border-amber-500/20 bg-amber-500/8 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-300">
                <details>
                  <summary className="cursor-pointer select-none list-none flex items-center gap-1.5">
                    <svg className="size-3.5 shrink-0 fill-current opacity-70" viewBox="0 0 16 16" aria-hidden>
                      <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 3.5a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5ZM7.25 7h1.5v4.5h-1.5V7Z" />
                    </svg>
                    <span className="font-semibold">图表解析失败，已显示源码</span>
                    <span className="ml-auto shrink-0 text-[10px] opacity-60">点击查看错误详情</span>
                  </summary>
                  <p className="mt-2 break-all rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 font-mono leading-relaxed opacity-80 whitespace-pre-wrap">
                    {error}
                  </p>
                </details>
              </div>
            )}
            <pre className="overflow-x-auto px-4 py-3 font-mono text-[12px] leading-relaxed text-fd-foreground/85 whitespace-pre bg-fd-secondary/30">
              {normalized}
            </pre>
          </>
        )}
      </figure>

      {/* 全屏 Modal */}
      {fullscreen && renderedSvg && (
        <FullscreenModal svg={renderedSvg} onClose={() => setFullscreen(false)} />
      )}
    </>
  );
}
