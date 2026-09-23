'use client';
import {
  type ClipboardEvent,
  type ComponentProps,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/core/cn';
import { idbClearDraftInput, idbGetDraftInput, idbSetDraftInput } from '@/lib/ai/chat-idb';
import { useAISearchContext } from '@/components/ai/ai-search-context';
import { useDocsViewClientContext } from '@/components/docs/use-docs-view-context';
import {
  MAX_CHAT_IMAGES,
  buildUserChatParts,
  isStableChatImageSrc,
  uniqueClipboardImageFiles,
  type ArticleFigure,
  type ChatImageDraft,
} from '@/lib/ai/chat-vision';
import { useArticleFigures } from '@/components/ai/use-article-figures';
import { compressChatImage } from '@/components/ai/compress-chat-image';
import {
  ComposerImageStrip,
  ImageLightbox,
  type ComposerAttachedImage,
} from '@/components/ai/ai-composer-images';

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

function articleImageId(src: string): string {
  return `article:${src}`;
}

function AISearchInputInner({
  initialInput,
  ...props
}: ComponentProps<'form'> & { initialInput: string }) {
  const {
    chat,
    chatBooted,
    selectionContext,
    clearSelectionContext,
    visionEnabled,
    activeSessionId,
  } = useAISearchContext();
  const { status, sendMessage, stop, messages } = chat;
  const getDocsViewContext = useDocsViewClientContext();
  const pathname = usePathname() ?? '';
  const figures = useArticleFigures(visionEnabled);
  const isNewChat = !messages.some((message) => message.role === 'user');
  const [input, setInput] = useState(initialInput);
  const [images, setImages] = useState<ComposerAttachedImage[]>([]);
  const [preview, setPreview] = useState<ComposerAttachedImage | null>(null);
  const [limitHint, setLimitHint] = useState(false);
  const [sending, setSending] = useState(false);
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seededPageRef = useRef<string | null>(null);
  const blobUrlsRef = useRef<string[]>([]);
  const limitHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoading = status === 'streaming' || status === 'submitted' || sending;

  useEffect(() => {
    return () => {
      if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
      for (const url of blobUrlsRef.current) URL.revokeObjectURL(url);
      if (limitHintTimerRef.current) clearTimeout(limitHintTimerRef.current);
    };
  }, []);

  useEffect(() => {
    seededPageRef.current = null;
    setImages([]);
  }, [activeSessionId]);

  useEffect(() => {
    seededPageRef.current = null;
    setImages((prev) => prev.filter((image) => image.source === 'paste'));
  }, [pathname]);

  useEffect(() => {
    if (!visionEnabled || !isNewChat) return;
    if (seededPageRef.current === pathname) return;
    const first = figures[0];
    if (!first) return;
    seededPageRef.current = pathname;
    setImages((prev) => {
      const pastes = prev.filter((image) => image.source === 'paste');
      return [
        { id: articleImageId(first.src), src: first.src, alt: first.alt, source: 'article' as const },
        ...pastes,
      ].slice(0, MAX_CHAT_IMAGES);
    });
  }, [figures, pathname, visionEnabled, isNewChat]);

  const persistDraft = useCallback((value: string) => {
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = setTimeout(() => {
      void idbSetDraftInput(value);
    }, DRAFT_SAVE_DEBOUNCE_MS);
  }, []);

  const remainingFigures = figures.filter(
    (figure) => !images.some((image) => image.id === articleImageId(figure.src)),
  );

  const showLimitHint = useCallback(() => {
    setLimitHint(true);
    if (limitHintTimerRef.current) clearTimeout(limitHintTimerRef.current);
    limitHintTimerRef.current = setTimeout(() => setLimitHint(false), 2500);
  }, []);

  const addFigure = (figure: ArticleFigure) => {
    if (images.length >= MAX_CHAT_IMAGES) {
      showLimitHint();
      return;
    }
    setImages((prev) => {
      if (prev.length >= MAX_CHAT_IMAGES) return prev;
      const id = articleImageId(figure.src);
      if (prev.some((image) => image.id === id)) return prev;
      return [...prev, { id, src: figure.src, alt: figure.alt, source: 'article' }];
    });
  };

  const addPasteFiles = (files: File[]) => {
    const imagesOnly = files.filter((file) => file.type.startsWith('image/'));
    if (imagesOnly.length === 0) return;
    if (images.length >= MAX_CHAT_IMAGES || imagesOnly.length > MAX_CHAT_IMAGES - images.length) {
      showLimitHint();
    }
    setImages((prev) => {
      const room = MAX_CHAT_IMAGES - prev.length;
      if (room <= 0) return prev;
      const next = imagesOnly.slice(0, room).map((file) => {
        const src = URL.createObjectURL(file);
        blobUrlsRef.current.push(src);
        return {
          id: `paste:${src}`,
          src,
          alt: file.name || '剪贴板图片',
          source: 'paste' as const,
          blob: file,
        };
      });
      return [...prev, ...next];
    });
  };

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (!visionEnabled) return;
    const files = uniqueClipboardImageFiles(event.clipboardData);
    if (files.length === 0) return;
    event.preventDefault();
    addPasteFiles(files);
  };

  const onStart = async (e?: SyntheticEvent) => {
    e?.preventDefault();
    const message = input.trim();
    if (message.length === 0 && images.length === 0) return;
    if (isLoading || !chatBooted) return;

    setSending(true);
    try {
      const drafts: ChatImageDraft[] = [];
      if (visionEnabled) {
        for (const image of images.slice(0, MAX_CHAT_IMAGES)) {
          try {
            const compressed = await compressChatImage(image.blob ?? image.src);
            drafts.push({
              alt: image.alt,
              mediaType: compressed.mediaType,
              data: compressed.data,
              source: image.source,
              preview: compressed.preview,
              originSrc:
                image.source === 'article' && isStableChatImageSrc(image.src)
                  ? image.src
                  : undefined,
            });
          } catch (err) {
            console.error('[AI Chat] 压缩配图失败：', err);
          }
        }
      }

      void sendMessage({
        role: 'user',
        parts: buildUserChatParts({
          client: {
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
          text: message,
          images: drafts,
        }),
      });
      setInput('');
      setImages((prev) => {
        for (const image of prev) {
          if (image.source === 'paste') URL.revokeObjectURL(image.src);
        }
        return [];
      });
      blobUrlsRef.current = [];
      seededPageRef.current = pathname;
      if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
      void idbClearDraftInput();
      clearSelectionContext();
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (isLoading) document.getElementById('nd-ai-input')?.focus();
  }, [isLoading]);

  const canSend = chatBooted && (input.trim().length > 0 || images.length > 0);

  return (
    <form
      {...props}
      className={cn('relative flex flex-col', props.className)}
      onSubmit={(event) => void onStart(event)}
    >
      {visionEnabled ? (
        <ComposerImageStrip
          images={images}
          remainingFigures={remainingFigures}
          atLimit={images.length >= MAX_CHAT_IMAGES}
          limitHint={limitHint}
          onRemove={(id) => setImages((prev) => prev.filter((image) => image.id !== id))}
          onAddFigure={addFigure}
          onPreview={setPreview}
          onLimitReached={showLimitHint}
        />
      ) : null}
      <div className="flex items-end gap-2 rounded-xl border border-fd-border/80 bg-fd-secondary px-3 pb-2.5 pt-2 text-fd-secondary-foreground shadow-sm transition-shadow has-focus-visible:border-fd-primary/30 has-focus-visible:shadow-md">
        <Input
          value={input}
          placeholder={isLoading ? '正在回答...' : '描述你的问题，或者跟我聊聊...'}
          autoFocus
          className="py-2"
          disabled={!chatBooted || status === 'streaming' || status === 'submitted' || sending}
          onChange={(e) => {
            const value = e.target.value;
            setInput(value);
            persistDraft(value);
          }}
          onPaste={onPaste}
          onKeyDown={(event) => {
            if (!event.shiftKey && event.key === 'Enter') {
              void onStart(event);
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
            disabled={!canSend}
          >
            <ArrowUp className="size-4" strokeWidth={2.25} aria-hidden />
          </button>
        )}
      </div>
      {preview ? (
        <ImageLightbox src={preview.src} alt={preview.alt} onClose={() => setPreview(null)} />
      ) : null}
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
      <form
        {...props}
        className={cn(
          'flex items-end gap-2 rounded-xl border border-fd-border/80 bg-fd-secondary px-3 pb-2.5 pt-2 text-fd-secondary-foreground',
          props.className,
        )}
      >
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
