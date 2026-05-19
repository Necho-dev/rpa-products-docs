/**
 * 从当前 URL 路径中派生导出文件名。
 * 格式：{最后一段路径}_{YYYYMMDDHHmmss}.{ext}
 */
export function getExportFilename(ext: string): string {
  const slug = window.location.pathname
    .replace(/\/$/, '')
    .split('/')
    .filter(Boolean)
    .pop();
  const prefix = slug ?? 'code';
  const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  return `${prefix}_${ts}.${ext}`;
}

/** 将文本内容以文件形式下载到本地 */
export function downloadTextAsFile(content: string, ext: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = getExportFilename(ext);
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 将文本写入剪贴板，兼容非 HTTPS 环境（HTTP 局域网）。
 * 优先使用 Clipboard API，降级到 execCommand('copy')。
 */
export function safeWriteClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).catch(() => {
      fallbackCopy(text);
    });
  }
  fallbackCopy(text);
  return Promise.resolve();
}

function fallbackCopy(text: string): void {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}
