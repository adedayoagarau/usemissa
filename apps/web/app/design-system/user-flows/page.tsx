import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'End-to-End User Flow & Navigation Map · Missa',
  description: 'Where to find the Missa user flow and navigation map.',
  robots: { index: false, follow: false },
};

export default function UserFlowsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/design-system" className="text-sm font-medium text-muted-foreground hover:text-foreground">
        ← Design System Index
      </Link>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">User flow map</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        The interactive flow map is kept in the repository at{' '}
        <code className="font-mono text-foreground">docs/design/flow-map.html</code>. Open it locally in a browser.
        It is no longer served from the public site.
      </p>
    </main>
  );
}
