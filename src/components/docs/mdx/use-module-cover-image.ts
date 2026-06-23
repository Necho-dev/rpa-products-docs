'use client';

import { useEffect, useRef, useState } from 'react';

export type ModuleCoverImageStatus = 'idle' | 'loading' | 'loaded' | 'error';

/** 视口外不分配 src；进入视口（含少量预读）后按浏览顺序自然加载 */
const VIEWPORT_ROOT_MARGIN = '120px';

/**
 * 按浏览顺序懒加载 cover：仅当卡片接近视口时才设置 img src。
 * 不限制全局并发，由浏览器与 IntersectionObserver 决定实际请求顺序。
 */
export function useModuleCoverImage(coverUrl: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState<string | undefined>();
  const [status, setStatus] = useState<ModuleCoverImageStatus>('idle');

  useEffect(() => {
    setSrc(undefined);
    setStatus('idle');

    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || cancelled) return;
        observer.disconnect();
        setStatus('loading');
        setSrc(coverUrl);
      },
      { rootMargin: VIEWPORT_ROOT_MARGIN, threshold: 0.01 },
    );

    observer.observe(el);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [coverUrl]);

  const onLoad = () => setStatus('loaded');
  const onError = () => setStatus('error');

  return { containerRef, src, status, onLoad, onError };
}
