import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  extractIconCandidatesFromCss,
  extractIconLinksFromHtml,
  extractStylesheetHrefs,
  normalizeSiteUrl,
  pickIconHref,
  resolvePlatformIcon,
  sniffImageExt,
  type IconLink,
} from '../src/lib/docs/platform-favicon/resolve';

describe('platform-favicon resolve', () => {
  it('normalizeSiteUrl 补全 https', () => {
    assert.equal(normalizeSiteUrl('example.com'), 'https://example.com');
    assert.equal(normalizeSiteUrl('https://foo.com/path'), 'https://foo.com/path');
  });

  it('extractIconLinksFromHtml 解析 rel=icon', () => {
    const html =
      '<html><head>' +
      '<link rel="icon" href="https://g.alicdn.com/qn/qn-login-page/0.0.12/favicon.png">' +
      '</head></html>';
    const [htmlIcon, candidates] = extractIconLinksFromHtml(html, 'https://login.taobao.com/');
    assert.equal(htmlIcon, 'https://g.alicdn.com/qn/qn-login-page/0.0.12/favicon.png');
    assert.equal(candidates[0], htmlIcon);
    assert.equal(candidates.at(-1), 'https://login.taobao.com/favicon.ico');
  });

  it('extractIconLinksFromHtml 解析 shortcut icon + type', () => {
    const html =
      '<link rel="shortcut icon" ' +
      'href="https://x.alicdn.com/vip/havana-login/0.4.9/images/favicon.ico?v=20141022" ' +
      'type="image/x-icon">';
    const [htmlIcon] = extractIconLinksFromHtml(html, 'https://login.taobao.com/');
    assert.equal(
      htmlIcon,
      'https://x.alicdn.com/vip/havana-login/0.4.9/images/favicon.ico?v=20141022',
    );
  });

  it('extractIconLinksFromHtml 支持 href 在 rel 前', () => {
    const html =
      '<link href="https://x.alicdn.com/icon.ico?v=1" rel="shortcut icon" type="image/x-icon">';
    const [htmlIcon] = extractIconLinksFromHtml(html, 'https://login.taobao.com/');
    assert.equal(htmlIcon, 'https://x.alicdn.com/icon.ico?v=1');
  });

  it('pickIconHref 优先 shortcut icon', () => {
    const links: IconLink[] = [
      ['icon shortcut', '/a.ico'],
      ['icon', '/b.ico'],
    ];
    assert.equal(pickIconHref(links, 'https://example.com'), 'https://example.com/a.ico');
  });

  it('resolvePlatformIcon 优先页面 link 且探测成功', async () => {
    const html = '<link rel="shortcut icon" href="/assets/icon.png" type="image/x-icon">';
    const pngBytes = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('/assets/icon.png')) {
        return new Response(pngBytes, {
          status: 200,
          headers: { 'content-type': 'image/png' },
        });
      }
      return new Response(html, {
        status: 200,
        headers: { 'content-type': 'text/html' },
      });
    };

    const result = await resolvePlatformIcon('https://shop.example.com', { fetchImpl });
    assert.equal(result.icon, 'https://shop.example.com/assets/icon.png');
  });

  it('resolvePlatformIcon CDN 探测失败时不再盲信 htmlIcon', async () => {
    const html =
      '<link rel="shortcut icon" ' +
      'href="https://x.alicdn.com/vip/havana-login/0.4.9/images/favicon.ico?v=20141022" ' +
      'type="image/x-icon">';
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('login.example.com') && !url.includes('favicon')) {
        return new Response(html, {
          status: 200,
          headers: { 'content-type': 'text/html' },
        });
      }
      return new Response('<!DOCTYPE html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      });
    };

    const result = await resolvePlatformIcon('https://login.example.com', { fetchImpl });
    assert.equal(result.icon, null);
  });

  it('sniffImageExt 识别 PNG / 拒绝 HTML', () => {
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    assert.equal(sniffImageExt(png), 'png');
    const html = new TextEncoder().encode('<!DOCTYPE html><html></html>');
    assert.equal(sniffImageExt(html), null);
  });

  it('extractIconCandidatesFromCss 优先方形大图', () => {
    const css = `
      .a { background: url(https://cdn.example.com/logo-10-10.png); }
      .b { background: url(https://cdn.example.com/brand-124-124.png); }
      .c { background: url(https://cdn.example.com/banner-427-159.png); }
    `;
    const urls = extractIconCandidatesFromCss(css, 'https://cdn.example.com/app.css');
    assert.equal(urls[0], 'https://cdn.example.com/brand-124-124.png');
    assert.ok(!urls.includes('https://cdn.example.com/banner-427-159.png'));
  });

  it('extractStylesheetHrefs 支持无引号 href', () => {
    const html =
      '<link rel="stylesheet" href=//g.alicdn.com/dt/op-eportal/2.0.79/login.css />';
    const hrefs = extractStylesheetHrefs(html, 'https://sycm.taobao.com');
    assert.deepEqual(hrefs, ['https://g.alicdn.com/dt/op-eportal/2.0.79/login.css']);
  });
});
