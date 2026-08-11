import { ImageResponse } from 'next/og';

export const alt = 'Missa — submission opportunities tailored for creators';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#f1eee7',
          color: '#1e2b24',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Arial',
          height: '100%',
          justifyContent: 'space-between',
          padding: '72px 84px',
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', fontSize: 30, letterSpacing: '0.22em' }}>MISSA</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 900 }}>
          <div style={{ fontSize: 68, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.04 }}>
            Submission opportunities tailored for creators
          </div>
          <div style={{ color: '#536158', fontSize: 27, lineHeight: 1.35 }}>
            Find the calls that fit. Understand what you are seeing.
          </div>
        </div>
        <div style={{ color: '#6b756f', display: 'flex', fontSize: 22 }}>
          Source-linked grants, magazines, residencies, fellowships, and contests.
        </div>
      </div>
    ),
    { ...size },
  );
}
