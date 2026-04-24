'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { Check, Copy, GitBranch } from 'lucide-react';

let mermaidIdCounter = 0;

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

export function Mermaid({ chart }: { chart: string }) {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);
  const [tab, setTab] = useState<'diagram' | 'source'>('diagram');
  const [copied, setCopied] = useState(false);

  const normalized = normalizeChart(chart);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setRendered(false);

    void (async () => {
      try {
        const { default: mermaid } = await import('mermaid');
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'loose',
          fontFamily: 'inherit',
          themeCSS: 'margin: 1.5rem auto 0;',
          theme: resolvedTheme === 'dark' ? 'dark' : 'default',
        });

        const id = `mermaid-${++mermaidIdCounter}`;
        const { svg, bindFunctions } = await mermaid.render(id, normalized);
        if (cancelled) return;

        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          bindFunctions?.(containerRef.current);
        }
        setRendered(true);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [normalized, resolvedTheme]);

  const handleCopy = () => {
    void navigator.clipboard.writeText(normalized).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const showSource = error || tab === 'source';

  return (
    <figure className="my-4 overflow-hidden rounded-xl border border-fd-border/70 bg-fd-card text-sm shadow-sm not-prose focus:outline-none">
      {/* Title bar — mirrors CodeBlock's header */}
      <div className="flex items-center gap-2 border-b border-fd-border/60 px-4 h-9">
        {/* Left: icon + label badge */}
        <GitBranch className="size-3.5 shrink-0 text-fd-muted-foreground" aria-hidden />
        <figcaption className="flex-1 min-w-0 truncate text-fd-muted-foreground">
          <span className="rounded border border-fd-border/80 bg-fd-muted/60 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide">
            MERMAID
          </span>
        </figcaption>

        {/* Right: tab toggle + copy */}
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
            </>
          )}
          <button
            type="button"
            aria-label={copied ? '已复制' : '复制源码'}
            title={copied ? '已复制' : '复制源码'}
            onClick={handleCopy}
            className="flex size-6 items-center justify-center rounded text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
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
        <pre className="overflow-x-auto px-4 py-3 font-mono text-[12px] leading-relaxed text-fd-foreground/85 whitespace-pre bg-fd-secondary/30">
          {normalized}
        </pre>
      )}
    </figure>
  );
}
