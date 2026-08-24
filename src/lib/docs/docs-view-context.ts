export type DocsViewLayout = 'single' | 'split' | 'sheet';

export type DocsPaneRef = {
  path: string;
  url: string;
  title?: string;
};

/** 随用户消息发给 `/api/chat` 的文档视口上下文 */
export type DocsViewClientContext = {
  location: string;
  layout: DocsViewLayout;
  left: DocsPaneRef;
  right?: DocsPaneRef;
};

function paneUrl(origin: string, path: string, hash = ''): string {
  const h = !hash || hash.startsWith('#') ? hash : `#${hash}`;
  return `${origin}${path}${h}`;
}

function pane(origin: string, path: string, hash: string | undefined, title: string | undefined): DocsPaneRef {
  const ref: DocsPaneRef = {
    path,
    url: paneUrl(origin, path, hash),
  };
  if (title) ref.title = title;
  return ref;
}

export function buildDocsViewContext(input: {
  href: string;
  origin: string;
  leftPath: string;
  leftTitle?: string;
  peekOpen: boolean;
  peekDesktop: boolean;
  rightPath: string | null;
  rightHash?: string;
  rightTitle?: string;
}): DocsViewClientContext {
  const left = pane(input.origin, input.leftPath, undefined, input.leftTitle);

  if (!input.peekOpen || !input.rightPath) {
    return { location: input.href, layout: 'single', left };
  }

  const right = pane(input.origin, input.rightPath, input.rightHash, input.rightTitle);
  return {
    location: input.href,
    layout: input.peekDesktop ? 'split' : 'sheet',
    left,
    right,
  };
}
