import { OgLucideSvg } from '@/lib/docs/og/lucide-svg';
import type { OgCoverProps } from '@/lib/docs/og/types';

const FONT = 'Noto Sans SC, Inter, sans-serif';
export const COVER_WIDTH = 640;
export const COVER_HEIGHT = 360;

export function OgCoverCard(props: OgCoverProps) {
  const { heroImageDataUrl, tags, groupIcon } = props;

  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        width: COVER_WIDTH,
        height: COVER_HEIGHT,
        overflow: 'hidden',
        fontFamily: FONT,
      }}
    >
      {heroImageDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={heroImageDataUrl}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
          }}
        />
      )}

      {!heroImageDataUrl && groupIcon ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <OgLucideSvg
            comp={groupIcon.comp}
            color={groupIcon.color ?? '#64748B'}
            size={48}
          />
        </div>
      ) : null}

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '40%',
          backgroundImage:
            'linear-gradient(to top, rgba(15, 23, 42, 0.45), transparent)',
        }}
      />

      {tags && tags.length > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: 20,
            bottom: 16,
            display: 'flex',
            flexDirection: 'row',
            gap: 8,
            alignItems: 'center',
          }}
        >
          {tags.map((tag) => (
            <div
              key={tag}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '3px 10px',
                borderRadius: 6,
                backgroundColor: 'rgba(255, 255, 255, 0.92)',
                color: '#475569',
                fontSize: 14,
              }}
            >
              <span style={{ color: '#2563EB', marginRight: 2 }}>#</span>
              {tag}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
