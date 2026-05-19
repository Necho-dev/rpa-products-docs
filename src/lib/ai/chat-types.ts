import type { UIMessage } from 'ai';

/** 文档站 AI 对话 UI 消息（与 `/api/chat` 使用的结构一致） */
export type InkeepUIMessage = UIMessage<
  never,
  {
    client: {
      location: string;
    };
  }
>;
