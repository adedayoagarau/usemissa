import { requirePlatformAdminPage } from '@/lib/platformAdmin';
import { AdminShellNav } from '@/components/platform-admin-nav';

export const dynamic = 'force-dynamic';

export default async function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePlatformAdminPage();
  return <div className="min-h-screen bg-white text-foreground"><div className="flex min-h-screen"><AdminShellNav email={session.account.email} /><div className="min-w-0 flex-1 pt-14 lg:pt-0">{children}</div></div></div>;
}
