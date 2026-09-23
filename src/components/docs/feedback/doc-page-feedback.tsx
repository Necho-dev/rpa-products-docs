'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Loader2Icon, ThumbsDown, ThumbsUp } from 'lucide-react';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { cn } from '@/lib/core/cn';
import { useDocFeedbackOptional } from '@/components/docs/feedback/doc-feedback-context';
import { isDocPageFeedbackOpinion, type DocPageFeedbackOpinion } from '@/lib/docs/feedback/reasons';

const OPINIONS: { value: DocPageFeedbackOpinion; label: string; icon: typeof ThumbsUp }[] = [
  { value: '有帮助', label: '有帮助', icon: ThumbsUp },
  { value: '没帮助', label: '没帮助', icon: ThumbsDown },
];

const FEEDBACK_CHANGE = 'docs-page-feedback-change';

function feedbackStorageKey(pagePath: string): string {
  return `docs-page-feedback:${pagePath}`;
}

function subscribeFeedback(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange);
  window.addEventListener(FEEDBACK_CHANGE, onStoreChange);
  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener(FEEDBACK_CHANGE, onStoreChange);
  };
}

function readStoredOpinion(pagePath: string): DocPageFeedbackOpinion | null {
  try {
    const raw = localStorage.getItem(feedbackStorageKey(pagePath));
    return raw && isDocPageFeedbackOpinion(raw) ? raw : null;
  } catch {
    return null;
  }
}

function writeStoredOpinion(pagePath: string, opinion: DocPageFeedbackOpinion | null) {
  try {
    const key = feedbackStorageKey(pagePath);
    if (opinion) localStorage.setItem(key, opinion);
    else localStorage.removeItem(key);
    window.dispatchEvent(new Event(FEEDBACK_CHANGE));
  } catch {
    // 隐私模式或配额满时仍完成本次提交，只是刷新后需要重选。
  }
}

export function DocPageFeedback({
  title,
  pageUrl,
  pagePath,
}: {
  title: string;
  pageUrl: string;
  pagePath: string;
}) {
  const feedback = useDocFeedbackOptional();
  const [opinion, setOpinion] = useState<DocPageFeedbackOpinion | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [thanksPath, setThanksPath] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const storedOpinion = useSyncExternalStore(
    subscribeFeedback,
    () => readStoredOpinion(pagePath),
    () => null,
  );
  const thanks = thanksPath === pagePath;

  useEffect(() => {
    if (!thanks) return;
    const timer = window.setTimeout(() => setThanksPath(null), 2000);
    return () => window.clearTimeout(timer);
  }, [thanks]);

  if (!feedback?.enabled) return null;

  const locked = storedOpinion !== null;
  const selected = storedOpinion ?? opinion;

  const handleSubmit = () => {
    if (!opinion || submitting) return;
    setSubmitError(null);
    setSubmitting(true);

    void (async () => {
      try {
        const res = await fetch('/api/docs/feedback', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            errorContent: title.trim() || '当前文档',
            docUrl: pageUrl,
            reason: opinion,
            description: message.trim() || undefined,
            source: 'page',
            pagePath,
          }),
        });

        if (res.status === 401) {
          const redirect = `${window.location.pathname}${window.location.search}`;
          window.location.href = `/auth/login?redirect=${encodeURIComponent(redirect)}`;
          return;
        }

        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          setSubmitError(
            data?.error === 'feedback_disabled'
              ? '文档反馈功能暂未开放'
              : '提交失败，请稍后重试',
          );
          return;
        }

        writeStoredOpinion(pagePath, opinion);
        setMessage('');
        setThanksPath(pagePath);
      } catch {
        setSubmitError('提交失败，请稍后重试');
      } finally {
        setSubmitting(false);
      }
    })();
  };

  const expanded = thanks || (!locked && opinion !== null);

  return (
    <div data-no-select className="not-prose mt-8">
      <div className="flex flex-wrap items-center gap-2">
        <p className="pe-1 text-sm font-medium text-fd-foreground">这篇文档对您有帮助吗？</p>
        {OPINIONS.map((item) => {
          const Icon = item.icon;
          const active = selected === item.value;
          return (
            <button
              key={item.value}
              type="button"
              aria-pressed={active}
              disabled={locked || submitting}
              onClick={() => setOpinion(item.value)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-default disabled:opacity-100',
                active
                  ? 'border-fd-foreground bg-fd-foreground text-fd-background [&_svg]:fill-current'
                  : 'border-fd-border bg-fd-background text-fd-muted-foreground hover:bg-fd-muted disabled:hover:bg-fd-background',
              )}
            >
              <Icon className="size-4" aria-hidden />
              {item.label}
            </button>
          );
        })}
      </div>
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden" inert={expanded ? undefined : true}>
          {thanks ? (
            <p className="pt-3 text-sm text-fd-muted-foreground">感谢您的反馈！</p>
          ) : locked ? null : (
            <div className="flex flex-col gap-3 pt-3">
              <textarea
                value={message}
                disabled={submitting}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="请留下您的反馈..."
                rows={3}
                maxLength={2000}
                className="w-full resize-y rounded-lg border border-fd-border bg-fd-muted/40 px-3 py-2.5 text-sm text-fd-foreground placeholder:text-fd-muted-foreground/70 outline-none transition-colors focus-visible:border-fd-foreground/35"
              />
              {submitError ? <p className="text-xs text-destructive">{submitError}</p> : null}
              <div>
                <button
                  type="button"
                  disabled={!opinion || submitting}
                  onClick={handleSubmit}
                  className={cn(buttonVariants({ color: 'outline', size: 'sm' }), 'min-w-16 gap-1.5')}
                >
                  {submitting ? (
                    <>
                      <Loader2Icon className="size-3.5 animate-spin" />
                      提交中…
                    </>
                  ) : (
                    '提交'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
