import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { JSDOM } from 'jsdom';
import { isLlmVisionEnabled } from '../src/lib/ai/llm';
import {
  buildUserChatParts,
  collectArticleFiguresFromRoot,
  convertChatDataPart,
  isDocsArticlePagePath,
  isDocFigureSrc,
  chatImageLightboxSrc,
  chatImagePreviewSrc,
  isStableChatImageSrc,
  rawImageBase64,
  toRelativeImageSrc,
  resolveImgSrc,
  uniqueClipboardImageFiles,
} from '../src/lib/ai/chat-vision';

describe('isLlmVisionEnabled', () => {
  it('treats unset, false, and empty as off', () => {
    assert.equal(isLlmVisionEnabled(undefined), false);
    assert.equal(isLlmVisionEnabled(''), false);
    assert.equal(isLlmVisionEnabled('false'), false);
    assert.equal(isLlmVisionEnabled('  False  '), false);
    assert.equal(isLlmVisionEnabled('1'), false);
  });

  it('treats true as on', () => {
    assert.equal(isLlmVisionEnabled('true'), true);
    assert.equal(isLlmVisionEnabled(' TRUE '), true);
  });
});

describe('isDocsArticlePagePath', () => {
  it('treats index.md / index.mdx as hub pages', () => {
    assert.equal(isDocsArticlePagePath('rpa/index.mdx'), false);
    assert.equal(isDocsArticlePagePath('rpa/RPA_SYCM/index.md'), false);
    assert.equal(isDocsArticlePagePath('index.md'), false);
  });

  it('treats connector and auth pages as articles', () => {
    assert.equal(
      isDocsArticlePagePath('rpa/RPA_SYCM/rpa-conn-sycm-item-macro-monitor.md'),
      true,
    );
    assert.equal(isDocsArticlePagePath('auth/YUCE_RPA/RPA_SYCM.md'), true);
  });
});

describe('isDocFigureSrc', () => {
  it('skips svg and ico', () => {
    assert.equal(isDocFigureSrc('/resources/images/foo.svg?sign=1'), false);
    assert.equal(isDocFigureSrc('/resources/images/foo.ico'), false);
    assert.equal(isDocFigureSrc('/resources/images/foo.png?sign=1'), true);
  });
});

describe('collectArticleFiguresFromRoot', () => {
  it('only reads article figures', () => {
    const dom = new JSDOM(`
      <div data-doc-kind="hub">
        <span data-doc-figure="/hub.png" data-doc-figure-alt="hub"></span>
      </div>
      <div data-doc-kind="article">
        <span data-doc-figure="/a.png" data-doc-figure-alt="首图"></span>
        <span data-doc-figure="/a.png" data-doc-figure-alt="重复"></span>
        <span data-doc-figure="/b.svg" data-doc-figure-alt="图标"></span>
        <span data-doc-figure>
          <img src="/next-image.jpg" alt="编译图" />
        </span>
      </div>
    `);
    assert.deepEqual(collectArticleFiguresFromRoot(dom.window.document), [
      { src: '/a.png', alt: '首图' },
      { src: '/next-image.jpg', alt: '编译图' },
    ]);
  });

  it('reads StaticImageData.src', () => {
    assert.equal(resolveImgSrc({ src: '/_next/static/media/foo.png' }), '/_next/static/media/foo.png');
    assert.equal(resolveImgSrc('/plain.png'), '/plain.png');
  });
});

describe('buildUserChatParts', () => {
  const client = {
    location: 'https://example.com/docs/rpa/foo',
    layout: 'single' as const,
    left: { path: '/docs/rpa/foo', url: 'https://example.com/docs/rpa/foo' },
  };

  it('defaults to the first selected image plus the question', () => {
    const parts = buildUserChatParts({
      client,
      text: '这张图是什么',
      images: [
        {
          alt: '登录页',
          mediaType: 'image/jpeg',
          data: 'abc',
          source: 'article',
          preview: 'data:image/jpeg;base64,abc',
          originSrc: 'http://127.0.0.1:3000/_next/static/media/foo.png',
        },
      ],
    });
    assert.equal(parts[0]?.type, 'data-client');
    assert.deepEqual(parts[1], { type: 'text', text: '图1 登录页' });
    assert.deepEqual(parts[2], {
      type: 'data-image',
      data: {
        mediaType: 'image/jpeg',
        data: 'abc',
        alt: '登录页',
        source: 'article',
        preview: 'data:image/jpeg;base64,abc',
        originSrc: '/_next/static/media/foo.png',
      },
    });
    assert.deepEqual(parts[3], { type: 'text', text: '这张图是什么' });
  });

  it('omits images when none are selected', () => {
    const parts = buildUserChatParts({
      client,
      text: '只问文字',
      images: [],
    });
    assert.equal(parts.length, 2);
    assert.equal(parts[1]?.type, 'text');
    assert.equal(parts[1] && 'text' in parts[1] ? parts[1].text : '', '只问文字');
  });

  it('appends paste images after article images', () => {
    const parts = buildUserChatParts({
      client,
      text: '',
      images: [
        { alt: '首图', mediaType: 'image/jpeg', data: 'aaa', source: 'article' },
        { alt: '剪贴板', mediaType: 'image/jpeg', data: 'bbb', source: 'paste' },
      ],
    });
    assert.deepEqual(parts[1], { type: 'text', text: '图1 首图' });
    assert.deepEqual(parts[3], { type: 'text', text: '图2 剪贴板' });
    assert.equal(parts[2]?.type, 'data-image');
    assert.equal(parts[4]?.type, 'data-image');
    assert.equal(parts.at(-1)?.type, 'text');
    assert.equal(parts.at(-1) && 'text' in parts.at(-1)! ? parts.at(-1).text : '', '请结合附图回答。');
  });
});

describe('convertChatDataPart', () => {
  it('converts image parts to raw base64 file parts', () => {
    const out = convertChatDataPart(
      {
        type: 'data-image',
        data: {
          mediaType: 'image/jpeg',
          data: 'data:image/jpeg;base64,QUJD',
          alt: '图',
          source: 'article',
        },
      },
      { visionEnabled: true },
    );
    assert.deepEqual(out, { type: 'file', mediaType: 'image/jpeg', data: 'QUJD' });
    assert.equal(rawImageBase64('data:image/png;base64,xyz'), 'xyz');
  });

  it('drops image parts when vision is off', () => {
    assert.equal(
      convertChatDataPart(
        { type: 'data-image', data: { mediaType: 'image/jpeg', data: 'QUJD' } },
        { visionEnabled: false },
      ),
      undefined,
    );
  });
});

describe('chatImagePreviewSrc', () => {
  it('prefers a small data-url preview over optimizer URLs', () => {
    assert.equal(
      chatImagePreviewSrc({
        mediaType: 'image/jpeg',
        data: 'QUJD',
        preview: 'data:image/jpeg;base64,QUFB',
        originSrc: '/_next/static/media/foo.png',
      }),
      'data:image/jpeg;base64,QUFB',
    );
    assert.equal(
      chatImagePreviewSrc({
        mediaType: 'image/jpeg',
        data: 'QUJD',
        preview: '/_next/image?url=%2Ffoo.png&w=1080',
        originSrc: '/_next/static/media/foo.png',
      }),
      '/_next/static/media/foo.png',
    );
    assert.equal(
      chatImagePreviewSrc({ mediaType: 'image/jpeg', data: 'QUJD', preview: 'blob:http://x' }),
      'data:image/jpeg;base64,QUJD',
    );
  });

  it('uses originSrc for lightbox and strips the site origin', () => {
    assert.equal(
      toRelativeImageSrc('http://127.0.0.1:3000/_next/static/media/foo.png'),
      '/_next/static/media/foo.png',
    );
    assert.equal(isStableChatImageSrc('/_next/image?url=foo'), false);
    assert.equal(
      chatImageLightboxSrc({
        mediaType: 'image/jpeg',
        data: 'QUJD',
        preview: 'data:image/jpeg;base64,QUFB',
        originSrc: 'http://127.0.0.1:3000/_next/static/media/foo.png',
      }),
      '/_next/static/media/foo.png',
    );
    assert.equal(
      chatImageLightboxSrc({
        mediaType: 'image/jpeg',
        data: 'QUJD',
        preview: '/_next/image?url=%2Ffoo.png&w=1080',
      }),
      '/_next/image?url=%2Ffoo.png&w=1080',
    );
  });
});

describe('uniqueClipboardImageFiles', () => {
  it('uses files only so items do not duplicate the same paste', () => {
    const file = { name: 'a.png', size: 12, type: 'image/png', lastModified: 1 } as File;
    const files = uniqueClipboardImageFiles({
      files: [file],
      items: [{ kind: 'file', type: 'image/png', getAsFile: () => file }],
    });
    assert.equal(files.length, 1);
    assert.equal(files[0], file);
  });
});
