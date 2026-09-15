import { requirePlatformAdminPage } from '@/lib/platformAdmin';
import { AdminShellNav } from '@/components/platform-admin-nav';

/** Private platform administration: never index. */
export const metadata = {
  title: 'Missa platform administration',
  description: 'Internal Missa operations, review, and governance surfaces.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePlatformAdminPage();
  return <div className="min-h-screen bg-card text-foreground"><div className="flex min-h-screen"><AdminShellNav email={session.account.email} /><div className="min-w-0 flex-1 pt-14 lg:pt-0">{children}</div></div></div>;
}
