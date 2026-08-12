import { ImageResponse } from 'next/og';
import { absoluteUrl } from '@/lib/seo';

export const runtime = 'edge';
export const alt = 'Missa, creative opportunities with their source and limits kept visible.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          color: '#17131d',
          padding: '72px 80px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src={absoluteUrl('/brand/missa-wordmark-240.svg')} alt="Missa" width={265} height={57} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: '128px' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              maxWidth: '980px',
              fontFamily: 'Georgia, serif',
              fontSize: '68px',
              fontWeight: 600,
              letterSpacing: '-3px',
              lineHeight: 1.02,
            }}
          >
            <div>There is a god in every door.</div>
            <div>And a door, and a door, and a door.</div>
          </div>
          <div style={{ marginTop: '28px', color: '#695371', fontFamily: 'Arial, sans-serif', fontSize: '25px' }}>
            A clearer way to find and follow creative opportunities.
          </div>
        </div>
        <div style={{ display: 'flex', marginTop: 'auto', color: '#695371', fontFamily: 'Arial, sans-serif', fontSize: '22px' }}>
          usemissa.com/waitlist
        </div>
      </div>
    ),
    size,
  );
}
