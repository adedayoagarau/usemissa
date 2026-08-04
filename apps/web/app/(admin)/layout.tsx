import Link from 'next/link';
import { requirePlatformAdminPage } from '@/lib/platformAdmin';
import { AdminShellNav } from '@/components/platform-admin';

export const dynamic = 'force-dynamic';

export default async function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdminPage();
  return <div className="min-h-screen bg-white text-foreground"><header className="border-b border-border bg-white px-4 py-5 sm:px-8"><div className="mx-auto flex max-w-[1440px] flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Platform scope</p><Link href="/admin" className="mt-1 block font-heading text-2xl font-medium tracking-tight text-foreground">Missa Platform Admin</Link><p className="mt-1 text-sm text-muted-foreground">Tenant-independent operational read model</p></div><Link href="/home" className="text-sm text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground">Back to Missa</Link></div></header><AdminShellNav current="" />{children}</div>;
}
