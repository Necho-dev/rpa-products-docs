import { createTokenizer } from '@orama/tokenizers/mandarin';
import { createFromSource } from 'fumadocs-core/search/server';
import { source } from '@/lib/source';

/** 与 `/api/search` 同配置，供 MCP / 服务端工具复用 Orama 索引 */
let searchApi: ReturnType<typeof createFromSource> | null = null;

export function getDocsSearchApi() {
  if (!searchApi) {
    searchApi = createFromSource(source, {
      components: { tokenizer: createTokenizer() },
      search: { threshold: 0, tolerance: 0 },
    });
  }
  return searchApi;
}
