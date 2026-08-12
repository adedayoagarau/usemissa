import Link from 'next/link';
import type { CSSProperties } from 'react';

type MissaWordmarkProps = {
  href?: string | null;
  size?: 'compact' | 'app' | 'marketing';
  inverse?: boolean;
  className?: string;
};

const WORDMARK_SPECS = {
  compact: { asset: '/brand/missa-wordmark-80.svg', width: '5rem', aspectRatio: '89 / 18' },
  app: { asset: '/brand/missa-wordmark-120.svg', width: '7.5rem', aspectRatio: '131 / 29' },
  marketing: { asset: '/brand/missa-wordmark-240.svg', width: '10rem', aspectRatio: '265 / 57' },
} as const;

/** Canonical Missa wordmark shared across every product surface. */
export function MissaWordmark({
  href = '/',
  size = 'app',
  inverse = false,
  className,
}: MissaWordmarkProps) {
  const spec = WORDMARK_SPECS[size];
  const classes = [
    'missa-wordmark',
    `missa-wordmark--${size}`,
    inverse ? 'missa-wordmark--inverse' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const rootStyle: CSSProperties = {
    display: 'inline-flex',
    width: spec.width,
    flexShrink: 0,
    alignItems: 'center',
    color: inverse ? '#ffffff' : 'currentColor',
    textDecoration: 'none',
    verticalAlign: 'middle',
  };
  const artStyle: CSSProperties = {
    display: 'block',
    width: '100%',
    aspectRatio: spec.aspectRatio,
    background: 'currentColor',
    maskImage: `url('${spec.asset}')`,
    maskPosition: 'center',
    maskRepeat: 'no-repeat',
    maskSize: 'contain',
    WebkitMaskImage: `url('${spec.asset}')`,
    WebkitMaskPosition: 'center',
    WebkitMaskRepeat: 'no-repeat',
    WebkitMaskSize: 'contain',
  };
  const artwork = <span className="missa-wordmark__art" style={artStyle} aria-hidden="true" />;

  if (href === null) {
    return (
      <span className={classes} style={rootStyle} role="img" aria-label="Missa">
        {artwork}
      </span>
    );
  }

  return (
    <Link href={href} className={classes} style={rootStyle} aria-label="Missa home">
      {artwork}
    </Link>
  );
}
