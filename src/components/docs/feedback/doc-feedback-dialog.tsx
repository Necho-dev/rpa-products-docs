'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2Icon, Loader2Icon, XIcon } from 'lucide-react';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { cn } from '@/lib/core/cn';
import { DOC_FEEDBACK_REASONS } from '@/lib/docs/feedback/reasons';
import type { DocFeedbackOpenPayload } from '@/lib/docs/feedback/types';

const emptySubscribe = () => () => {};

function useIsClient() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export type DocFeedbackDialogProps = {
  open: boolean;
  onClose: () => void;
  payload: DocFeedbackOpenPayload | null;
  onSubmitted?: () => void;
};

export function DocFeedbackDialog({
  open,
  onClose,
  payload,
  onSubmitted,
}: DocFeedbackDialogProps) {
  const isClient = useIsClient();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [reasonError, setReasonError] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const resetForm = useCallback(() => {
    setReason('');
    setDescription('');
    setReasonError(false);
    setSubmitError(null);
    setSubmitting(false);
    setSubmitted(false);
  }, []);

  // 关闭时在渲染期清空表单，避免 effect 内同步 setState 造成级联渲染。
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) resetForm();
  }

  useEffect(() => {
    if (!submitted) return;
    const timer = window.setTimeout(() => {
      onSubmitted?.();
      onClose();
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [submitted, onSubmitted, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting && !submitted) onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, submitting, submitted]);

  const handleSubmit = () => {
    if (!payload || submitting) return;
    if (!reason) {
      setReasonError(true);
      return;
    }

    setReasonError(false);
    setSubmitError(null);
    setSubmitting(true);

    void (async () => {
      try {
        const res = await fetch('/api/docs/feedback', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            errorContent: payload.errorContent,
            docUrl: payload.docUrl,
            reason,
            description: description.trim() || undefined,
            source: payload.source,
            pagePath: payload.pagePath,
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

        setSubmitted(true);
      } catch {
        setSubmitError('提交失败，请稍后重试');
      } finally {
        setSubmitting(false);
      }
    })();
  };

  const dialog =
    open && payload && isClient ? (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="文档反馈"
        className="fixed inset-0 z-9999 flex items-end justify-center bg-black/50 backdrop-blur-sm p-0 sm:items-center sm:p-4 md:p-6"
        onClick={submitting || submitted ? undefined : onClose}
      >
        <div
          className="relative flex w-full max-h-[min(92dvh,900px)] flex-col overflow-hidden rounded-t-2xl border border-fd-border/60 bg-fd-card shadow-2xl sm:max-w-lg sm:max-h-[min(88dvh,820px)] sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-fd-border/50 px-4 py-3">
            <span className="text-sm font-medium">文档反馈</span>
            <button
              type="button"
              title="关闭"
              disabled={submitting}
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-lg text-fd-muted-foreground transition-colors hover:bg-fd-muted hover:text-fd-foreground disabled:opacity-50"
            >
              <XIcon className="size-4" />
            </button>
          </div>

          {submitted ? (
            <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <CheckCircle2Icon className="size-14 text-green-600 dark:text-green-400" aria-hidden />
              <p className="text-base font-semibold text-fd-foreground">反馈已提交，感谢！</p>
              <p className="text-sm text-fd-muted-foreground">我们会尽快处理您的问题</p>
            </div>
          ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-fd-muted-foreground">错误内容</label>
              <div className="rounded-lg border border-fd-border bg-fd-muted/30 px-3 py-2.5 text-sm leading-relaxed text-fd-foreground">
                {payload.errorContent}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-fd-muted-foreground">错误文档链接</label>
              <input
                readOnly
                value={payload.docUrl}
                title={payload.docUrl}
                className="w-full rounded-lg border border-fd-border bg-fd-background px-3 py-2 text-xs text-fd-foreground"
              />
            </div>

            <fieldset className="flex flex-col gap-2 border-0 p-0">
              <legend className="text-xs font-medium text-fd-muted-foreground">错误原因</legend>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                {DOC_FEEDBACK_REASONS.map((item) => (
                  <label
                    key={item}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-sm text-fd-foreground',
                      'hover:bg-fd-muted/50',
                    )}
                  >
                    <input
                      type="radio"
                      name="doc-feedback-reason"
                      value={item}
                      checked={reason === item}
                      disabled={submitting}
                      onChange={() => {
                        setReason(item);
                        setReasonError(false);
                      }}
                      className="size-3.5 shrink-0 accent-fd-primary"
                    />
                    <span className="leading-snug">{item}</span>
                  </label>
                ))}
              </div>
              {reasonError ? (
                <p className="text-xs text-destructive">请选择错误原因</p>
              ) : null}
            </fieldset>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="doc-feedback-description"
                className="text-xs font-medium text-fd-muted-foreground"
              >
                其他补充描述
              </label>
              <textarea
                id="doc-feedback-description"
                value={description}
                disabled={submitting}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="其他补充描述"
                rows={3}
                maxLength={2000}
                className="w-full resize-y rounded-lg border border-fd-border bg-fd-background px-3 py-2 text-sm text-fd-foreground placeholder:text-fd-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
              />
            </div>

            {submitError ? (
              <p className="text-xs text-destructive">{submitError}</p>
            ) : null}
          </div>
          )}

          {!submitted ? (
          <div className="flex shrink-0 justify-end gap-2 border-t border-fd-border/50 px-4 py-3">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className={cn(buttonVariants({ color: 'secondary', size: 'sm' }), 'min-w-20')}
            >
              关闭
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className={cn(buttonVariants({ color: 'primary', size: 'sm' }), 'min-w-20 gap-1.5')}
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
          ) : null}
        </div>
      </div>
    ) : null;

  return isClient && dialog ? createPortal(dialog, document.body) : null;
}
