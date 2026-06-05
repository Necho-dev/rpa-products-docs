import type { OgSharePosterProps } from '@/lib/docs/og/types';
import { splitUrlForTwoLines, truncateText } from '@/lib/docs/og/truncate';

const FONT = 'Noto Sans SC, Inter, sans-serif';
const MONO = 'JetBrains Mono, monospace';
const BRAND_ACCENT = '#2563EB';

export function OgSharePoster(props: OgSharePosterProps) {
  const {
    siteName,
    title,
    description,
    badge,
    entry,
    tags,
    qrDataUrl,
    pageUrl,
    heroImageDataUrl,
    heroImageHeight,
  } = props;

  const badgeColor = badge?.color ?? '#16A34A';
  const footerTags = tags?.slice(0, 4) ?? [];
  const urlLines = splitUrlForTwoLines(pageUrl);

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: '#FFFFFF',
        fontFamily: FONT,
        flexDirection: 'column',
        padding: '44px 52px 0',
        gap: 0,
        borderLeft: `5px solid ${BRAND_ACCENT}`,
      }}
    >
      {/* ── 顶栏：品牌 + 分区标签 ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 32,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 999,
              backgroundColor: '#2563EB',
            }}
          />
          <span style={{ fontSize: 24, color: '#64748B' }}>{siteName}</span>
        </div>
        {badge ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '6px 18px',
              borderRadius: 999,
              backgroundColor: badgeColor,
              color: '#FFFFFF',
              fontSize: 20,
              fontWeight: 500,
            }}
          >
            {badge.label}
          </div>
        ) : null}
      </div>

      {/* ── 标题：与 DocsTitle 一致 font-semibold (600) ── */}
      <div
        style={{
          fontSize: 48,
          fontWeight: 600,
          color: '#0F172A',
          lineHeight: 1.28,
          marginBottom: 16,
        }}
      >
        {truncateText(title, 36)}
      </div>

      {/* ── entry（紧跟标题）── */}
      {entry ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            padding: '14px 20px',
            backgroundColor: '#F0F9FF',
            border: '1px solid #BAE6FD',
            borderRadius: 10,
            marginBottom: 18,
          }}
        >
          <span
            style={{
              fontFamily: MONO,
              fontSize: 22,
              color: '#0369A1',
              fontWeight: 400,
              letterSpacing: 0.2,
            }}
          >
            {entry}
          </span>
        </div>
      ) : null}

      {/* ── description ── */}
      {description ? (
        <div
          style={{
            fontSize: 28,
            color: '#64748B',
            lineHeight: 1.55,
            marginBottom: 28,
          }}
        >
          {truncateText(description, 100)}
        </div>
      ) : null}

      {/* ── 首图（完整展示，不裁剪）── */}
      {heroImageDataUrl ? (
        <div
          style={{
            display: 'flex',
            borderRadius: 12,
            overflow: 'hidden',
            marginBottom: 24,
            boxShadow: '0 1px 8px rgba(15,23,42,0.08)',
            backgroundColor: '#F8FAFC',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImageDataUrl}
            alt=""
            style={{
              width: '100%',
              height: heroImageHeight ?? undefined,
              objectFit: 'contain',
            }}
          />
        </div>
      ) : null}

      {/* ── tags ── */}
      {footerTags.length > 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 10,
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          {footerTags.map((tag) => (
            <div
              key={tag}
              style={{
                display: 'flex',
                padding: '5px 14px',
                borderRadius: 8,
                backgroundColor: '#F1F5F9',
                color: '#475569',
                fontSize: 22,
              }}
            >
              <span style={{ color: '#2563EB', marginRight: 3 }}>#</span>
              {tag}
            </div>
          ))}
        </div>
      ) : null}

      {/* ── 底栏：灰色背景区分层次 ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 20,
          marginTop: 'auto',
          marginLeft: -52,
          marginRight: -52,
          padding: '28px 52px 36px',
          backgroundColor: '#F8FAFC',
          borderTop: '1px solid #E2E8F0',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt="" width={96} height={96} style={{ borderRadius: 8, flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          <div style={{ fontSize: 24, color: '#0F172A', fontWeight: 600 }}>扫码查看完整内容</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontSize: 17, color: '#94A3B8', fontFamily: MONO, lineHeight: 1.45 }}>
              {urlLines.line1}
            </div>
            {urlLines.line2 ? (
              <div style={{ fontSize: 17, color: '#94A3B8', fontFamily: MONO, lineHeight: 1.45 }}>
                {urlLines.line2}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
