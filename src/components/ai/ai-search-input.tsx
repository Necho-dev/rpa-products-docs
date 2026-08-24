'use client';
import { type ComponentProps, type SyntheticEvent, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { cn } from '@/lib/core/cn';
import { idbClearDraftInput, idbGetDraftInput, idbSetDraftInput } from '@/lib/ai/chat-idb';
import { useAISearchContext } from '@/components/ai/ai-search-context';
import { useDocsViewClientContext } from '@/components/docs/use-docs-view-context';

const DRAFT_SAVE_DEBOUNCE_MS = 300;
const MAX_INPUT_HEIGHT = 300;

function Input(props: ComponentProps<'textarea'>) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  const adjust = () => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const next = Math.min(ta.scrollHeight, MAX_INPUT_HEIGHT);
    ta.style.height = `${next}px`;
    ta.style.overflowY = ta.scrollHeight > MAX_INPUT_HEIGHT ? 'auto' : 'hidden';
  };

  useEffect(() => {
    adjust();
  }, [props.value]);

  return (
    <div className="flex-1 min-w-0">
      <textarea
        ref={taRef}
        id="nd-ai-input"
        rows={3}
        {...props}
        style={{ overflowY: 'hidden', ...props.style }}
        className={cn(
          'w-full resize-none bg-transparent text-sm leading-relaxed text-fd-foreground placeholder:text-fd-muted-foreground/70 focus-visible:outline-none',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          props.className,
        )}
        onInput={(e) => {
          adjust();
          props.onInput?.(e);
        }}
      />
    </div>
  );
}

function AISearchInputInner({
  initialInput,
  ...props
}: ComponentProps<'form'> & { initialInput: string }) {
  const { chat, chatBooted, selectionContext, clearSelectionContext } = useAISearchContext();
  const { status, sendMessage, stop } = chat;
  const getDocsViewContext = useDocsViewClientContext();
  const [input, setInput] = useState(initialInput);
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoading = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    return () => {
      if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    };
  }, []);

  const persistDraft = useCallback((value: string) => {
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = setTimeout(() => {
      void idbSetDraftInput(value);
    }, DRAFT_SAVE_DEBOUNCE_MS);
  }, []);

  const onStart = (e?: SyntheticEvent) => {
    e?.preventDefault();
    const message = input.trim();
    if (message.length === 0) return;

    void sendMessage({
      role: 'user',
      parts: [
        {
          type: 'data-client',
          data: {
            ...getDocsViewContext(),
            ...(selectionContext
              ? {
                  selection: {
                    text: selectionContext.text,
                    pageTitle: selectionContext.pageTitle,
                    pageUrl: selectionContext.pageUrl,
                  },
                }
              : {}),
          },
        },
        {
          type: 'text',
          text: message,
        },
      ],
    });
    setInput('');
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    void idbClearDraftInput();
    clearSelectionContext();
  };

  useEffect(() => {
    if (isLoading) document.getElementById('nd-ai-input')?.focus();
  }, [isLoading]);

  return (
    <form {...props} className={cn('flex items-end gap-2 px-3 pb-2.5 pt-1', props.className)} onSubmit={onStart}>
      <Input
        value={input}
        placeholder={isLoading ? '正在回答...' : '描述你的问题，或者跟我聊聊...'}
        autoFocus
        className="py-2"
        disabled={!chatBooted || status === 'streaming' || status === 'submitted'}
        onChange={(e) => {
          const value = e.target.value;
          setInput(value);
          persistDraft(value);
        }}
        onKeyDown={(event) => {
          if (!event.shiftKey && event.key === 'Enter') {
            onStart(event);
          }
        }}
      />
      {isLoading ? (
        <button
          key="bn"
          type="button"
          title="停止回答"
          aria-label="停止回答"
          className={cn(
            'mb-0.5 flex size-8 shrink-0 items-center justify-center rounded-full transition-colors',
            'bg-fd-foreground text-fd-background hover:bg-fd-foreground/85',
          )}
          onClick={stop}
        >
          <Square className="size-3 fill-current" aria-hidden />
        </button>
      ) : (
        <button
          key="bn"
          type="submit"
          aria-label="发送"
          className={cn(
            'mb-0.5 flex size-8 shrink-0 items-center justify-center rounded-full transition-all',
            'bg-fd-primary text-fd-primary-foreground shadow-sm hover:bg-fd-primary/90',
            'disabled:bg-fd-muted disabled:text-fd-muted-foreground disabled:shadow-none disabled:opacity-60',
          )}
          disabled={!chatBooted || input.length === 0}
        >
          <ArrowUp className="size-4" strokeWidth={2.25} aria-hidden />
        </button>
      )}
    </form>
  );
}

export function AISearchInput(props: ComponentProps<'form'>) {
  const { inputSeed, inputSeedVersion, chatBooted } = useAISearchContext();

  if (inputSeed !== null) {
    return <AISearchInputInner key={inputSeedVersion} initialInput={inputSeed} {...props} />;
  }

  return <AISearchInputFromIdb key={inputSeedVersion} chatBooted={chatBooted} {...props} />;
}

function AISearchInputFromIdb({
  chatBooted,
  ...props
}: ComponentProps<'form'> & { chatBooted: boolean }) {
  const [savedDraft, setSavedDraft] = useState<string | null>(null);

  useEffect(() => {
    if (!chatBooted) return;

    let cancelled = false;
    void idbGetDraftInput().then((draft) => {
      if (!cancelled) setSavedDraft(draft);
    });
    return () => {
      cancelled = true;
    };
  }, [chatBooted]);

  if (!chatBooted || savedDraft === null) {
    return (
      <form {...props} className={cn('flex items-end gap-2 px-3 pb-2.5 pt-1', props.className)}>
        <Input value="" placeholder="描述你的问题，或者跟我聊聊..." disabled className="py-2" />
      </form>
    );
  }

  return <AISearchInputInner initialInput={savedDraft} {...props} />;
}

export function AISearchPanelFooter({ className, ...props }: ComponentProps<'div'>) {
  const { modelDisplayName, chatBooted } = useAISearchContext();

  if (!chatBooted || !modelDisplayName) return null;

  return (
    <div className={cn('mt-2 px-1 text-[11px] leading-relaxed text-fd-muted-foreground', className)} {...props}>
      <p className="text-xs text-fd-muted-foreground truncate" title={modelDisplayName}>
        回复内容由 <strong>{modelDisplayName}</strong> 提供, 请注意甄别!
      </p>
    </div>
  );
}
