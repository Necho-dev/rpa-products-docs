'use client';
import { useEffect, useEffectEvent } from 'react';
import { useAISearchContext } from '@/components/ai/ai-search-context';

export function useHotKey() {
  const { open, setOpen } = useAISearchContext();

  const onKeyPress = useEffectEvent((e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    const isEditableTarget =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target?.isContentEditable;

    if (e.key === 'Escape' && open) {
      setOpen(false);
      e.preventDefault();
      return;
    }

    const isToggleShortcut =
      (e.metaKey || e.ctrlKey) && (e.key === '/' || e.key === 'i' || e.key === 'I');

    // 在可编辑元素内不触发 toggle（除非是 AI 输入框本身，允许 Escape 关闭）
    if (isToggleShortcut && !isEditableTarget) {
      setOpen(!open);
      e.preventDefault();
    }
  });

  useEffect(() => {
    window.addEventListener('keydown', onKeyPress);
    return () => window.removeEventListener('keydown', onKeyPress);
  }, []);
}
