/**
 * Fumadocs transformerIcon 内置图标仅覆盖 JS/Python/Bash 等少数语言；
 * 未列出的语言（如 json、yaml）会回退为通用「文档」轮廓图标。
 * 在此通过 rehypeCodeOptions.icon.extend 补充文档站常用语言。
 *
 * @see https://fumadocs.dev/docs/ui/components/codeblock#图标
 */
type CodeBlockIconDef = {
  viewBox: string;
  fill: string;
  d: string;
};

type CodeBlockIconEntry = CodeBlockIconDef | string;

export const codeBlockIconShortcuts: Record<string, string> = {
  yml: 'yaml',
  jsonc: 'json',
  'json-schema': 'json',
  jsonschema: 'json',
  ps1: 'powershell',
  pwsh: 'powershell',
  docker: 'dockerfile',
  env: 'dotenv',
  dotenv: 'dotenv',
  plaintext: 'text',
  txt: 'text',
};

/** 单色 SVG；复杂图形可用完整 HTML 字符串（如 json 花括号） */
export const codeBlockIconExtensions: Record<string, CodeBlockIconEntry> = {
  // `{}` 花括号，比 JSON.org 柱状 logo 更易识别
  json:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3c-2.5 2-3.5 4.5-3.5 9s1 7 3.5 9"/><path d="M16 3c2.5 2 3.5 4.5 3.5 9s-1 7-3.5 9"/></svg>',
  // 三横线 + 缩进，示意层级配置
  yaml:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h10M4 18h14"/></svg>',
  toml: {
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    d: 'M6 2h9l5 5v15a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 1.5V8h4.5L14 3.5zM8 12h8v2H8v-2zm0 4h8v2H8v-2z',
  },
  dockerfile: {
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    d: 'M13.983 11.078h2.119a.186.186 0 0 0 .186-.186V9.006a.186.186 0 0 0-.186-.186h-2.119a.186.186 0 0 0-.186.186v1.886c0 .103.084.186.186.186zm-2.954-5.43h2.118a.186.186 0 0 0 .186-.185V2.574a.186.186 0 0 0-.186-.186h-2.118a.186.186 0 0 0-.185.186v1.888c0 .103.083.186.185.186zm0 2.716h2.118a.187.187 0 0 0 .186-.186V5.29a.186.186 0 0 0-.186-.185h-2.118a.186.186 0 0 0-.185.185v1.887c0 .103.083.186.185.186zm-2.93 0h2.12a.186.186 0 0 0 .184-.186V5.29a.185.185 0 0 0-.185-.185H8.1a.185.185 0 0 0-.185.185v1.887c0 .103.082.186.185.186zm-2.964-2.716h2.119a.186.186 0 0 0 .185-.186V2.574a.186.186 0 0 0-.185-.186H5.136a.186.186 0 0 0-.186.186v1.888c0 .103.084.186.186.186zm0 2.716h2.119a.186.186 0 0 0 .185-.185V5.29a.186.186 0 0 0-.185-.185H5.136a.186.186 0 0 0-.186.185v1.887c0 .103.084.186.186.186zm-2.93 0h2.12a.185.185 0 0 0 .184-.185V5.29a.185.185 0 0 0-.184-.185H2.206a.185.185 0 0 0-.184.185v1.887c0 .103.083.186.185.186zm12.38 6.905h-1.655a.186.186 0 0 0-.186.186v1.652a.186.186 0 0 0 .186.186h1.656a.186.186 0 0 0 .186-.186v-1.652a.186.186 0 0 0-.186-.186zm-2.964 0h-1.66a.186.186 0 0 0-.185.186v1.652a.186.186 0 0 0 .185.186h1.66a.186.186 0 0 0 .186-.186v-1.652a.186.186 0 0 0-.186-.186z',
  },
  powershell: {
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    d: 'M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-1.105 4.5h2.21v15h-2.21v-15zm-4.5 3h2.21v9H6.395v-9zm9 0h2.21v9h-2.21v-9z',
  },
  dotenv: {
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    d: 'M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm2 6v2h8V8H8zm0 4v2h5v-2H8z',
  },
  text: {
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm1 7V3.5L18.5 9H15zM8 12h8v2H8v-2zm0 4h5v2H8v-2z',
  },
};
