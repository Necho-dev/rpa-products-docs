import type { ComponentProps, HTMLAttributes, ReactNode } from 'react';
import { cache } from 'react';
import { Heading } from 'fumadocs-ui/components/heading';
import {
  CodeBlockTab,
  CodeBlockTabs,
  CodeBlockTabsList,
  CodeBlockTabsTrigger,
} from 'fumadocs-ui/components/codeblock';
import { createAPIPage } from 'fumadocs-openapi/ui';
import type { APIPlaygroundProps } from 'fumadocs-openapi/ui/base';
import { openapi } from '@/lib/docs/openapi/server';
import { resolveDirectiveProxyUrl } from '@/lib/docs/openapi/config';
import { docsApiClient } from '@/components/docs/api-page-client';
import styles from './api-page.module.css';

type OfficialProps = ComponentProps<ReturnType<typeof createAPIPage>>;

const sharedContent = {
  renderAPIExampleLayout(slots: {
    selector: ReactNode;
    usageTabs: ReactNode;
    responseTabs: ReactNode;
  }) {
    return (
      <div className={styles.example}>
        {slots.selector}
        {slots.usageTabs}
        {slots.responseTabs}
      </div>
    );
  },
  renderResponseTabs(
    tabs: Array<{
      code: string;
      examples?: Array<{ sample: unknown; label: ReactNode; description?: string }>;
    }>,
    ctx: {
      renderMarkdown: (text: string) => ReactNode;
      renderCodeBlock: (lang: string, code: string) => ReactNode;
    },
  ) {
    if (tabs.length === 0) return null;
    return (
      <CodeBlockTabs groupId="fumadocs_openapi_responses" defaultValue={tabs[0].code}>
        <CodeBlockTabsList>
          {tabs.map((tab) => (
            <CodeBlockTabsTrigger key={tab.code} value={tab.code}>
              {tab.code}
            </CodeBlockTabsTrigger>
          ))}
        </CodeBlockTabsList>
        {tabs.map((tab) => {
          const examples = tab.examples ?? [];
          let slot: ReactNode = (
            <p className="px-3 py-2 text-xs text-fd-muted-foreground">空</p>
          );
          if (examples.length === 1) {
            const example = examples[0];
            slot = (
              <>
                {example.description ? ctx.renderMarkdown(example.description) : null}
                {ctx.renderCodeBlock('json', JSON.stringify(example.sample, null, 2))}
              </>
            );
          } else if (examples.length > 1) {
            slot = (
              <CodeBlockTabs defaultValue="0">
                <CodeBlockTabsList>
                  {examples.map((example, index) => (
                    <CodeBlockTabsTrigger key={index} value={String(index)}>
                      {example.label}
                    </CodeBlockTabsTrigger>
                  ))}
                </CodeBlockTabsList>
                {examples.map((example, index) => (
                  <CodeBlockTab key={index} value={String(index)}>
                    {example.description ? ctx.renderMarkdown(example.description) : null}
                    {ctx.renderCodeBlock('json', JSON.stringify(example.sample, null, 2))}
                  </CodeBlockTab>
                ))}
              </CodeBlockTabs>
            );
          }
          return (
            <CodeBlockTab key={tab.code} value={tab.code}>
              {slot}
            </CodeBlockTab>
          );
        })}
      </CodeBlockTabs>
    );
  },
  renderPageLayout(slots: {
    operations?: Array<{ item: { path: string; method: string }; children: ReactNode }>;
    webhooks?: Array<{ item: { name: string; method: string }; children: ReactNode }>;
  }) {
    return (
      <div className={styles.page}>
        {slots.operations?.map((op) => (
          <section key={`${op.item.path}:${op.item.method}`}>{op.children}</section>
        ))}
        {slots.webhooks?.map((hook) => (
          <section key={`${hook.item.name}:${hook.item.method}`}>{hook.children}</section>
        ))}
      </div>
    );
  },
  renderOperationLayout(slots: {
    header: ReactNode;
    description: ReactNode;
    apiExample: ReactNode;
    apiPlayground: ReactNode;
    authSchemes: ReactNode;
    parameters: ReactNode;
    body: ReactNode;
    responses: ReactNode;
    callbacks: ReactNode;
  }) {
    return (
      <div className={styles.operation}>
        <div className={styles.intro}>
          <div className={styles.header}>{slots.header}</div>
          {slots.description ? (
            <div className={styles.description}>{slots.description}</div>
          ) : null}
        </div>
        {slots.apiPlayground}
        <div className={styles.sections}>
          {slots.authSchemes}
          {slots.parameters}
          {slots.body}
          {slots.responses}
          {slots.callbacks}
          {slots.apiExample}
        </div>
      </div>
    );
  },
  renderWebhookLayout(slots: {
    header: ReactNode;
    description: ReactNode;
    authSchemes: ReactNode;
    parameters: ReactNode;
    body: ReactNode;
    requests: ReactNode;
    responses: ReactNode;
    callbacks: ReactNode;
  }) {
    return (
      <div className={styles.operation}>
        <div className={styles.intro}>
          <div className={styles.header}>{slots.header}</div>
          {slots.description ? (
            <div className={styles.description}>{slots.description}</div>
          ) : null}
        </div>
        <div className={styles.sections}>
          {slots.authSchemes}
          {slots.parameters}
          {slots.body}
          {slots.responses}
          {slots.callbacks}
          {slots.requests}
        </div>
      </div>
    );
  },
};

function parseSecurities(method: unknown, dereferenced: unknown) {
  const methodObj = method as { security?: Array<Record<string, string[]>> };
  const deref = dereferenced as { security?: Array<Record<string, string[]>> };
  const result: Array<Array<{ id: string; scopes: string[] }>> = [];
  const security = methodObj.security ?? deref.security ?? [];
  for (const map of security) {
    const list: Array<{ id: string; scopes: string[] }> = [];
    for (const [key, scopes] of Object.entries(map)) {
      list.push({ id: key, scopes });
    }
    if (list.length > 0) result.push(list);
  }
  return result;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const getApiPageRenderOptions = cache(() => ({
  headingLevel: 2,
  proxyUrl: undefined as string | undefined,
}));

function DocsApiHeading(
  props: HTMLAttributes<HTMLHeadingElement>,
  depth: number,
) {
  const { headingLevel } = getApiPageRenderOptions();
  const level = Math.min(6, Math.max(1, depth + (headingLevel - 2))) as
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6;
  return <Heading as={`h${level}`} {...props} />;
}

function DocsApiPlayground({ path, method, ctx }: APIPlaygroundProps) {
  const Playground = ctx.clientBoundary.PlaygroundClient;
  const { proxyUrl } = getApiPageRenderOptions();
  return (
    <Playground
      route={path}
      securities={parseSecurities(method, ctx.schema.dereferenced)}
      method={method.method}
      doc={cloneJson(ctx.schema.bundled)}
      proxyUrl={proxyUrl}
      writeOnly
      readOnly={false}
      deprecated={method.deprecated}
    />
  );
}

function createOfficialApiPage(showExample: boolean, playgroundEnabled: boolean) {
  return createAPIPage(openapi, {
    client: docsApiClient,
    schemaUI: { showExample },
    playground: playgroundEnabled
      ? { enabled: true, render: DocsApiPlayground }
      : { enabled: false },
    renderHeading: DocsApiHeading,
    content: sharedContent,
  });
}

const OfficialWithExample = createOfficialApiPage(true, true);
const OfficialWithExampleNoPlayground = createOfficialApiPage(true, false);
const OfficialNoExample = createOfficialApiPage(false, true);
const OfficialNoExampleNoPlayground = createOfficialApiPage(false, false);

export type DocsAPIPageProps = OfficialProps & {
  playground?: boolean;
  showExample?: boolean;
  headingLevel?: number;
  server?: string;
  proxy?: boolean | string;
};

/**
 * 文档站 OpenAPI 页：官方 APIPage 的薄包装。
 * 单列间距、标题层级、Playground 代理等只作用在包装内部。
 */
export async function APIPage({
  playground = true,
  showExample = true,
  headingLevel = 2,
  server,
  proxy,
  document,
  ...props
}: DocsAPIPageProps): Promise<ReactNode> {
  const renderOptions = getApiPageRenderOptions();
  renderOptions.headingLevel = headingLevel;
  renderOptions.proxyUrl = resolveDirectiveProxyUrl(proxy);

  const Official = showExample
    ? playground
      ? OfficialWithExample
      : OfficialWithExampleNoPlayground
    : playground
      ? OfficialNoExample
      : OfficialNoExampleNoPlayground;

  let resolvedDocument: OfficialProps['document'] = document;
  if (server) {
    const processed =
      typeof document === 'string' ? await openapi.getSchema(document) : document;
    resolvedDocument = {
      ...processed,
      dereferenced: {
        ...processed.dereferenced,
        servers: [{ url: server, description: server }],
      },
    };
  }

  return (
    <div className={styles.root} data-hk-api-page="">
      <Official document={resolvedDocument} {...props} />
    </div>
  );
}
