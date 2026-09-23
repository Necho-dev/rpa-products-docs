'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { extractHttpStatusCode, httpStatusTone } from '@/components/docs/api-page-status';
import styles from './api-page.module.css';

function enhanceResponses(root: HTMLElement) {
  const operation = root.parentElement;
  const triggers = root.querySelectorAll<HTMLButtonElement>('button.font-mono');
  for (const trigger of triggers) {
    const code = extractHttpStatusCode(trigger.dataset.hkCode || trigger.textContent || '');
    if (!code) continue;
    trigger.dataset.hkCode = code;

    const header = trigger.parentElement;
    const item = header?.parentElement;
    if (!header || !item) continue;

    item.setAttribute('data-hk-status', httpStatusTone(code));
    if (trigger.querySelector('[data-hk-status-row]')) continue;

    for (const node of [...trigger.childNodes]) {
      if (node.nodeType === Node.TEXT_NODE) node.textContent = '';
    }

    const description = operation
      ?.querySelector(`[data-hk-response-caption="${CSS.escape(code)}"]`)
      ?.textContent?.trim();

    const row = document.createElement('span');
    row.dataset.hkStatusRow = '';

    const dot = document.createElement('span');
    dot.dataset.hkStatusDot = '';
    dot.setAttribute('aria-hidden', 'true');

    const badge = document.createElement('span');
    badge.dataset.hkStatusBadge = '';
    badge.textContent = code;

    row.append(dot, badge);
    if (description) {
      const caption = document.createElement('span');
      caption.dataset.hkStatusDesc = '';
      caption.textContent = description;
      row.append(caption);
    }
    trigger.append(row);
  }
}

/** 用手风琴行对齐 JSON Schema / 代码块: 状态圆点、10px 徽章、说明走 muted */
export function ApiResponsesChrome({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const scope = root.parentElement ?? root;
    enhanceResponses(root);
    const observer = new MutationObserver(() => enhanceResponses(root));
    observer.observe(scope, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={styles.responses}>
      {children}
    </div>
  );
}
