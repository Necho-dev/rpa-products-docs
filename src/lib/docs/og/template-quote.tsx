import type { OgShareBaseProps } from '@/lib/docs/og/types';
import { splitUrlForTwoLines, truncateText } from '@/lib/docs/og/truncate';

const FONT = 'Noto Sans SC, Inter, sans-serif';
const MONO = 'JetBrains Mono, monospace';
const BRAND_ACCENT = '#2563EB';
export const QUOTE_WIDTH = 1080;

export type OgQuoteCardProps = OgShareBaseProps & {
  quoteText: string;
  pageUrl: string;
  qrDataUrl: string;
  sectionHeading?: string;
};

function quoteFontSize(text: string): number {
  const len = text.length;
  if (len <= 80) return 36;
  if (len <= 160) return 30;
  if (len <= 280) return 26;
  return 22;
}

export function OgQuoteCard(props: OgQuoteCardProps) {
  const {
    siteName,
    title,
    badge,
    quoteText,
    sectionHeading,
    qrDataUrl,
    pageUrl,
  } = props;

  const badgeColor = badge?.color ?? '#16A34A';
  const urlLines = splitUrlForTwoLines(pageUrl);
  const fontSize = quoteFontSize(quoteText);

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
        borderLeft: `5px solid ${BRAND_ACCENT}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 28,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 999,
              backgroundColor: BRAND_ACCENT,
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

      <div
        style={{
          fontSize: 32,
          fontWeight: 600,
          color: '#0F172A',
          lineHeight: 1.35,
          marginBottom: sectionHeading ? 12 : 24,
        }}
      >
        {truncateText(title, 48)}
      </div>

      {sectionHeading ? (
        <div
          style={{
            fontSize: 22,
            color: '#64748B',
            marginBottom: 20,
          }}
        >
          {truncateText(sectionHeading, 40)}
        </div>
      ) : null}

      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 16,
          flex: 1,
          marginBottom: 32,
        }}
      >
        <span
          style={{
            fontSize: 72,
            lineHeight: 1,
            color: '#BFDBFE',
            fontFamily: 'Georgia, serif',
            marginTop: -8,
          }}
        >
          {'\u201C'}
        </span>
        <div
          style={{
            fontSize,
            color: '#1E293B',
            lineHeight: 1.65,
            fontWeight: 400,
            flex: 1,
            paddingTop: 8,
          }}
        >
          {quoteText}
        </div>
      </div>

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
