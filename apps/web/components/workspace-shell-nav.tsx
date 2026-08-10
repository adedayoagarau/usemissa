'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

type Organization = { id: string; name: string };

function linkFor(path: string, organizationId: string): string {
  return `${path}?organizationId=${encodeURIComponent(organizationId)}`;
}

export function WorkspaceShellNav({ organizations }: { organizations: Organization[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = organizations.some((organization) => organization.id === searchParams.get('organizationId'))
    ? searchParams.get('organizationId')!
    : organizations[0]?.id;
  if (!selectedId) return null;

  const primary = [
    { label: 'Organization', href: linkFor('/workspace', selectedId), path: '/workspace' },
    { label: 'Submissions', href: linkFor('/submissions', selectedId), path: '/submissions' },
    { label: 'Reviews', href: linkFor('/workspace/reviews', selectedId), path: '/workspace/reviews' },
    { label: 'Decisions', href: linkFor('/workspace/decisions', selectedId), path: '/workspace/decisions' },
  ];
  const manage = [
    { label: 'Messages', href: linkFor('/workspace/messages', selectedId), path: '/workspace/messages' },
    { label: 'Delivery', href: linkFor('/workspace/delivery', selectedId), path: '/workspace/delivery' },
    { label: 'Insights', href: linkFor('/workspace/insights', selectedId), path: '/workspace/insights' },
    { label: 'People', href: `${linkFor('/workspace', selectedId)}#organization-seats-heading`, path: '/workspace' },
    { label: 'Settings & billing', href: linkFor('/workspace/settings', selectedId), path: '/workspace/settings' },
  ];
  const active = (item: { path: string; query?: string }) => pathname === item.path || (pathname.startsWith(`${item.path}/`) && item.path !== '/submissions') || (item.query ? searchParams.get('status') === item.query : false);
  const organizationName = organizations.find((organization) => organization.id === selectedId)?.name ?? selectedId;

  return <aside className="border-b border-border bg-white lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0" aria-label="Organization navigation"><div className="px-4 py-4 lg:sticky lg:top-0 lg:min-h-[calc(100vh-58px)]"><div className="border-b border-border pb-4"><p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Organization scope</p><p className="mt-1 truncate text-sm font-medium text-foreground">{organizationName}</p><p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{selectedId}</p></div><nav className="mt-4 grid gap-1 sm:grid-cols-2 lg:grid-cols-1"><p className="col-span-full px-3 pb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Run</p>{primary.map((item) => <Link key={item.label} href={item.href} aria-current={active(item) ? 'page' : undefined} className={`flex min-h-10 items-center border-l-2 px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary ${active(item) ? 'border-primary bg-accent-tint font-medium text-primary' : 'border-transparent text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground'}`}>{item.label}</Link>)}<p className="col-span-full mt-3 px-3 pb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Manage</p>{manage.map((item) => <Link key={item.label} href={item.href} aria-current={active(item) ? 'page' : undefined} className={`flex min-h-10 items-center border-l-2 px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary ${active(item) ? 'border-primary bg-accent-tint font-medium text-primary' : 'border-transparent text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground'}`}>{item.label}</Link>)}</nav></div></aside>;
}
