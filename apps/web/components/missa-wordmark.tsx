import Link from 'next/link';

type MissaWordmarkProps = {
  href?: string | null;
  size?: 'compact' | 'app' | 'marketing';
  inverse?: boolean;
  className?: string;
};

/** Canonical Missa wordmark shared across every product surface. */
export function MissaWordmark({
  href = '/',
  size = 'app',
  inverse = false,
  className,
}: MissaWordmarkProps) {
  const classes = [
    'missa-wordmark',
    `missa-wordmark--${size}`,
    inverse ? 'missa-wordmark--inverse' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  if (href === null) return <span className={classes}>MISSA</span>;

  return (
    <Link href={href} className={classes} aria-label="Missa home">
      MISSA
    </Link>
  );
}
