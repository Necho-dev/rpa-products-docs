'use client';
import { createContext, use } from 'react';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { InkeepUIMessage } from '@/lib/ai/chat-types';
import type { SessionListItem } from '@/lib/ai/chat-idb';

export type AISearchPanelView = 'chat' | 'history';

/** 关窗后台生成完成时，用于右下角锚点短暂提示；3s 后自动复位为 idle */
export type AISearchBackgroundNotify = 'idle' | 'completed';

export type AISearchContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  panelView: AISearchPanelView;
  setPanelView: (view: AISearchPanelView) => void;
  chat: UseChatHelpers<InkeepUIMessage>;
  /** 等价于 chat.status，便于不直接依赖 chat 对象的组件（如浮动锚点）订阅 */
  chatStatus: UseChatHelpers<InkeepUIMessage>['status'];
  /** 关窗期间生成完成的提示状态 */
  backgroundNotify: AISearchBackgroundNotify;
  modelDisplayName?: string;
  /** IndexedDB 已就绪，可发送消息 */
  chatBooted: boolean;
  /** IndexedDB 初始化失败的错误信息 */
  bootError: string | null;
  /** useChat 的网络/API 错误（本次运行时） */
  chatError: Error | undefined;
  /** 上次关闭/刷新前持久化的错误消息 */
  persistedError: string | null;
  sessions: SessionListItem[];
  activeSessionId: string;
  newChatSession: () => Promise<void>;
  selectChatSession: (id: string) => Promise<void>;
  deleteChatSession: (id: string) => Promise<void>;
  /** 文档选区上下文，随首条消息发送 */
  selectionContext: { text: string; pageUrl: string; pageTitle?: string } | null;
  clearSelectionContext: () => void;
  openWithSelection: (ctx: { text: string; pageUrl: string; pageTitle?: string }) => void;
  /** 将推荐 prompt 填入输入框（不直接发送） */
  fillInputDraft: (draft: string) => void;
  inputSeed: string | null;
  inputSeedVersion: number;
};

export const AISearchContext = createContext<AISearchContextValue | null>(null);

export function useAISearchContext(): AISearchContextValue {
  return use(AISearchContext)!;
}
