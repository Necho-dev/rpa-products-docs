'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/core/cn';
import { MAX_CHAT_IMAGES, type ArticleFigure, type ChatImageSource } from '@/lib/ai/chat-vision';

export type ComposerAttachedImage = {
  id: string;
  src: string;
  alt: string;
  source: ChatImageSource;
  blob?: Blob;
};

export function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/70 p-6"
      style={{ zIndex: 200 }}
      role="dialog"
      aria-modal="true"
      aria-label={alt || '查看图片'}
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full bg-white/90 text-fd-foreground shadow"
        aria-label="关闭预览"
        onClick={onClose}
      >
        <X className="size-4" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt || ''}
        className="max-h-[90vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      />
    </div>,
    document.body,
  );
}

const THUMB_PX = 52;
const THUMB_GAP_PX = 8;
const PICKER_PAD_PX = 12;
const PICKER_BORDER_PX = 2;
const MAX_PER_ROW = 5;
const SELECTED_PER_ROW = 8;
const thumbSizeClass = 'size-[52px] shrink-0';
const imageFrameClass =
  'overflow-hidden rounded-xl border border-neutral-300 bg-fd-background dark:border-white/25';
/** 已选图片一行最多 8 个。多留 2px，避免亚像素把最后一张挤到下一行。 */
const rowMaxWidth = SELECTED_PER_ROW * THUMB_PX + (SELECTED_PER_ROW - 1) * THUMB_GAP_PX + 2;

function pickerColumns(space: number): number {
  for (let count = MAX_PER_ROW; count >= 1; count -= 1) {
    const outer =
      count * THUMB_PX + (count - 1) * THUMB_GAP_PX + PICKER_PAD_PX + PICKER_BORDER_PX;
    if (outer <= space) return count;
  }
  return 1;
}

function ComposerThumb({
  image,
  onRemove,
  onPreview,
}: {
  image: ComposerAttachedImage;
  onRemove: () => void;
  onPreview: () => void;
}) {
  return (
    <div className={cn('group relative', thumbSizeClass)}>
      <button
        type="button"
        className={cn('size-full', imageFrameClass)}
        aria-label={image.alt ? `查看图片：${image.alt}` : '查看图片'}
        onClick={onPreview}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.src} alt="" className="size-full object-cover" />
      </button>
      <button
        type="button"
        className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-fd-background text-fd-muted-foreground opacity-0 shadow ring-1 ring-fd-border transition-opacity hover:text-fd-foreground group-hover:opacity-100 group-focus-within:opacity-100"
        aria-label="移除图片"
        onClick={onRemove}
      >
        <X className="size-3" />
      </button>
    </div>
  );
}

export function ComposerImageStrip({
  images,
  remainingFigures,
  atLimit = false,
  limitHint = false,
  onRemove,
  onAddFigure,
  onPreview,
  onLimitReached,
}: {
  images: ComposerAttachedImage[];
  remainingFigures: ArticleFigure[];
  atLimit?: boolean;
  limitHint?: boolean;
  onRemove: (id: string) => void;
  onAddFigure: (figure: ArticleFigure) => void;
  onPreview: (image: ComposerAttachedImage) => void;
  onLimitReached?: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [exhaustedHint, setExhaustedHint] = useState(false);
  const [pickerCols, setPickerCols] = useState(MAX_PER_ROW);
  const [pickerAlign, setPickerAlign] = useState<'start' | 'end'>('start');
  const addRef = useRef<HTMLDivElement>(null);
  const pickerId = useId();
  const showAdd = images.length > 0 || remainingFigures.length > 0 || atLimit;

  const measurePicker = () => {
    const anchor = addRef.current;
    if (!anchor) return;
    const button = anchor.getBoundingClientRect();
    const bounds = anchor.closest('form')?.getBoundingClientRect() ?? {
      left: 0,
      right: window.innerWidth,
    };
    const spaceRight = bounds.right - button.left;
    const spaceLeft = button.right - bounds.left;
    const rightCols = pickerColumns(spaceRight);
    const leftCols = pickerColumns(spaceLeft);
    if (rightCols >= leftCols) {
      setPickerAlign('start');
      setPickerCols(rightCols);
    } else {
      setPickerAlign('end');
      setPickerCols(leftCols);
    }
  };

  useLayoutEffect(() => {
    if (!pickerOpen) return;
    measurePicker();
    window.addEventListener('resize', measurePicker);
    return () => window.removeEventListener('resize', measurePicker);
  }, [pickerOpen, remainingFigures.length]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (!addRef.current?.contains(event.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [pickerOpen]);

  useEffect(() => {
    if (atLimit || remainingFigures.length === 0) setPickerOpen(false);
  }, [atLimit, remainingFigures.length]);

  useEffect(() => {
    if (remainingFigures.length > 0) setExhaustedHint(false);
  }, [remainingFigures.length]);

  if (images.length === 0 && !showAdd) return null;

  const visibleCols = Math.max(1, Math.min(pickerCols, remainingFigures.length || 1));

  return (
    <div className="px-1 pt-1.5 pb-1.5">
    <div
      className="flex flex-wrap items-center gap-2"
      style={{ maxWidth: `min(100%, ${rowMaxWidth}px)` }}
    >
      {limitHint || exhaustedHint ? (
        <p role="status" className="basis-full text-xs text-fd-muted-foreground">
          {limitHint
            ? `图片数量已达到上限（${MAX_CHAT_IMAGES} 张）`
            : '本文图片已全部添加'}
        </p>
      ) : null}
      {images.map((image) => (
        <ComposerThumb
          key={image.id}
          image={image}
          onRemove={() => onRemove(image.id)}
          onPreview={() => onPreview(image)}
        />
      ))}
      {showAdd ? (
        <div ref={addRef} className="relative">
          {pickerOpen && !atLimit ? (
            <div
              id={pickerId}
              className={cn(
                'absolute bottom-full z-20 mb-1 grid gap-2 rounded-lg border border-fd-border bg-fd-popover p-1.5 shadow-lg',
                pickerAlign === 'end' ? 'right-0' : 'left-0',
              )}
              style={{ gridTemplateColumns: `repeat(${visibleCols}, ${THUMB_PX}px)` }}
            >
              {remainingFigures.map((figure) => (
                <button
                  key={figure.src}
                  type="button"
                  className={cn(thumbSizeClass, imageFrameClass, 'hover:opacity-90')}
                  aria-label={figure.alt ? `添加图片：${figure.alt}` : '添加本文图片'}
                  onClick={() => {
                    onAddFigure(figure);
                    setPickerOpen(false);
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={figure.src} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            className={cn(
              thumbSizeClass,
              'flex items-center justify-center rounded-xl border border-neutral-300 bg-neutral-100 text-fd-muted-foreground dark:border-white/25 dark:bg-white/10',
              atLimit
                ? 'cursor-not-allowed opacity-45'
                : 'hover:bg-neutral-200 dark:hover:bg-white/15',
            )}
            aria-label={atLimit ? `图片数量已达到上限，最多 ${MAX_CHAT_IMAGES} 张` : '添加本文图片'}
            aria-disabled={atLimit}
            aria-expanded={pickerOpen}
            aria-controls={pickerId}
            onClick={() => {
              if (atLimit) {
                onLimitReached?.();
                return;
              }
              if (remainingFigures.length === 0) {
                setExhaustedHint(true);
                setPickerOpen(false);
                return;
              }
              setExhaustedHint(false);
              setPickerOpen((open) => !open);
            }}
          >
            <Plus className="size-5" aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
    </div>
  );
}

export function ChatMessageImages({
  images,
}: {
  images: Array<{ src: string; alt?: string; lightboxSrc?: string }>;
}) {
  const [preview, setPreview] = useState<{ src: string; alt?: string } | null>(null);
  if (images.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {images.map((image, index) => (
          <button
            key={`${image.src}-${index}`}
            type="button"
            className={cn(thumbSizeClass, imageFrameClass)}
            aria-label={image.alt ? `查看图片：${image.alt}` : '查看图片'}
            onClick={() => setPreview({ src: image.lightboxSrc || image.src, alt: image.alt })}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.src}
              alt=""
              className="size-full object-cover"
              onError={(event) => {
                if (image.lightboxSrc && event.currentTarget.src !== image.lightboxSrc) {
                  event.currentTarget.src = image.lightboxSrc;
                }
              }}
            />
          </button>
        ))}
      </div>
      {preview ? (
        <ImageLightbox src={preview.src} alt={preview.alt} onClose={() => setPreview(null)} />
      ) : null}
    </>
  );
}
