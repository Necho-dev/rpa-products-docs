import type { UIMessage } from 'ai';
import type { DocsViewClientContext } from '@/lib/docs/docs-view-context';

/** assistant 消息 metadata，由服务端 stream finish 时注入 */
export type InkeepMessageMetadata = {
  /** 消息完成时的 Unix 毫秒时间戳（由服务端在 finish 阶段注入） */
  createdAt?: number;
};

/** 文档站 AI 对话 UI 消息（与 `/api/chat` 使用的结构一致） */
export type InkeepUIMessage = UIMessage<
  InkeepMessageMetadata,
  {
    client: DocsViewClientContext & {
      selection?: {
        text: string;
        pageTitle?: string;
        pageUrl?: string;
      };
    };
  }
>;
