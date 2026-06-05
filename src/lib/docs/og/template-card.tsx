import type { OgShareBaseProps } from '@/lib/docs/og/types';
import { truncateMiddle, truncateText } from '@/lib/docs/og/truncate';

const FONT = 'Noto Sans SC, Inter, sans-serif';
const MONO = 'Inter, monospace';
const BRAND_ACCENT = '#2563EB';

export function OgShareCard(props: OgShareBaseProps) {
  const {
    siteName,
    title,
    description,
    badge,
    entry,
    tags,
    hostname,
  } = props;

  const footerTags = tags?.slice(0, 2) ?? [];
  const showEntry = footerTags.length === 0 && entry;

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundImage: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
        padding: 48,
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
          border: '1px solid #E2E8F0',
          boxShadow: '0 8px 32px rgba(15, 23, 42, 0.06)',
          padding: '40px 48px',
          borderLeft: `4px solid ${BRAND_ACCENT}`,
        }}
      >
        {/* 顶栏 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 32,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 999,
                backgroundColor: '#2563EB',
              }}
            />
            <span style={{ fontSize: 22, color: '#334155' }}>{siteName}</span>
          </div>
          {badge ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '6px 16px',
                borderRadius: 999,
                backgroundColor: badge.color ?? '#16A34A',
                color: '#FFFFFF',
                fontSize: 18,
              }}
            >
              {badge.label}
            </div>
          ) : null}
        </div>

        {/* 主内容 */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 16 }}>
          <div style={{ fontSize: 56, color: '#0F172A', lineHeight: 1.15 }}>{title}</div>

          {description ? (
            <div
              style={{
                fontSize: 28,
                color: '#64748B',
                lineHeight: 1.45,
                maxHeight: 84,
                overflow: 'hidden',
              }}
            >
              {truncateText(description, 72)}
            </div>
          ) : null}
        </div>

        {/* 底栏 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 24,
            fontSize: 20,
            color: '#94A3B8',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            {footerTags.map((tag) => (
              <div
                key={tag}
                style={{
                  display: 'flex',
                  padding: '4px 12px',
                  borderRadius: 8,
                  backgroundColor: '#F1F5F9',
                  color: '#475569',
                  fontSize: 18,
                }}
              >
                <span style={{ color: '#2563EB', marginRight: 2 }}>#</span>
                {tag}
              </div>
            ))}
            {showEntry ? (
              <span style={{ fontFamily: MONO, fontSize: 20 }}>
                {truncateMiddle(entry, 48)}
              </span>
            ) : null}
          </div>
          {hostname ? <span style={{ fontSize: 20 }}>{hostname}</span> : null}
        </div>
      </div>
    </div>
  );
}
