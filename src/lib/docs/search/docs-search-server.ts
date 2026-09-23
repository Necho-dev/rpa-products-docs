import { createTokenizer } from '@orama/tokenizers/mandarin';
import { createFromSource } from 'fumadocs-core/search/server';
import { isRuntimePartition } from '@/lib/docs/source/compile-mode';
import { readDocsPage, source } from '@/lib/docs/source/source';

/** 与 `/api/search` 同配置，供 MCP / 服务端工具复用 Orama 索引 */
let searchApi: ReturnType<typeof createFromSource> | null = null;

export function getDocsSearchApi() {
  if (!searchApi) {
    searchApi = createFromSource(source, {
      components: { tokenizer: createTokenizer() },
      search: { threshold: 0, tolerance: 0 },
      async buildIndex(page) {
        // 运行时按需编译: 搜索只收标题和描述, 避免首次搜索时编译上万篇正文
        const empty = { headings: [], contents: [] };
        const structuredData = isRuntimePartition(page.slugs[0])
          ? empty
          : ((await readDocsPage(page)).structuredData ?? empty);
        return {
          title: page.data.title,
          description: page.data.description,
          url: page.url,
          id: page.url,
          structuredData,
          // slug[0]: 即分区标识(如 'rpa'、'auth'), Orama enum[] 要求数组格式
          tag: page.slugs[0] ? [page.slugs[0]] : [],
        };
      },
    });
  }
  return searchApi;
}
