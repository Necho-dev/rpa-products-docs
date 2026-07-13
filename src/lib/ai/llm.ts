import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

type LlmProviderOptions = {
  /** 强制 API 使用 `response_format: json_object`（适用于 generateText + 手动 JSON 解析） */
  jsonObject?: boolean;
};

/** 与 `/api/chat`、AI 搜索共用的 OpenAI 兼容 LLM 客户端 */
export function createLlmProvider(options: LlmProviderOptions = {}) {
  return createOpenAICompatible({
    name: 'inkeep',
    apiKey: process.env.LLM_API_KEY,
    baseURL: process.env.LLM_BASE_URL ?? '',
    ...(options.jsonObject && {
      transformRequestBody: (body) => ({
        ...body,
        response_format: { type: 'json_object' },
      }),
    }),
  });
}

export function getLlmModel() {
  return createLlmProvider()(process.env.LLM_MODEL ?? '');
}

/** AI 搜索语义理解：json_object 模式 + 客户端 Zod 校验，避免 generateObject 的 schema warning */
export function getLlmJsonModel() {
  return createLlmProvider({ jsonObject: true })(process.env.LLM_MODEL ?? '');
}
