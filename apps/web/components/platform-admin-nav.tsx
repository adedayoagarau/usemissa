'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Activity,
  Bot,
  BarChart3,
  Building2,
  CreditCard,
  FileText,
  FileClock,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  Mail,
  Menu,
  Radar,
  Settings2,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  activePath?: string;
  activeQuery?: { key: string; value: string };
};

const primaryLinks: NavItem[] = [
  { href: '/admin', label: 'Control Room', icon: LayoutDashboard, exact: true },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/crm', label: 'CRM', icon: Users },
  { href: '/admin/organizations', label: 'Organizations', icon: Building2 },
  { href: '/admin/billing', label: 'Billing', icon: CreditCard },
  { href: '/admin/content', label: 'Content', icon: FileText },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
];

const operationsLinks: NavItem[] = [
  { href: '/admin/operations', label: 'Operations', icon: ListChecks },
  { href: '/admin/support', label: 'Support', icon: LifeBuoy },
  { href: '/admin/messaging', label: 'Messaging & delivery', icon: Mail },
  { href: '/admin/radar', label: 'Radar', icon: Radar },
  { href: '/admin/agents', label: 'Agent controls', icon: Bot },
];

const systemLinks: NavItem[] = [
  { href: '/admin/governance', label: 'Governance', icon: ShieldCheck },
  { href: '/admin/system', label: 'System', icon: Settings2 },
  { href: '/admin/audit', label: 'Audit', icon: FileClock },
  { href: '/admin/taxonomy', label: 'Policy → Taxonomy', icon: ShieldCheck },
];

function isActive(pathname: string, search: string, item: NavItem): boolean {
  const activePath = item.activePath ?? item.href;
  const query = new URLSearchParams(search);
  if (item.activeQuery) return pathname === activePath && query.get(item.activeQuery.key) === item.activeQuery.value;
  if (item.exact) return pathname === activePath;
  if (activePath === '/admin/operations' && query.get('queue') === 'agents') return false;
  return pathname === activePath || pathname.startsWith(`${activePath}/`);
}

function NavLink({ item, pathname, search }: { item: NavItem; pathname: string; search: string }) {
  const Icon = item.icon;
  const active = isActive(pathname, search, item);
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={`group flex min-h-10 items-center gap-3 border-l-2 px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary ${active ? 'border-primary bg-accent-tint font-medium text-primary' : 'border-transparent text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground'}`}
    >
      <Icon className="size-4 shrink-0" strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function Navigation({ pathname, search, email }: { pathname: string; search: string; email: string }) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-border px-5 py-5">
        <Link href="/admin" className="block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
          <span className="block font-heading text-xl font-semibold tracking-tight text-foreground">Missa</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">Platform Admin</span>
        </Link>
      </div>
      <nav aria-label="Platform admin navigation" className="flex-1 space-y-6 px-3 py-5">
        <div className="space-y-1">
          {primaryLinks.map((item) => <NavLink key={item.href} item={item} pathname={pathname} search={search} />)}
        </div>
        <div className="space-y-1">
          <p className="px-3 pb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Operate</p>
          {operationsLinks.map((item) => <NavLink key={item.href} item={item} pathname={pathname} search={search} />)}
        </div>
        <div className="space-y-1">
          <p className="px-3 pb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">System</p>
          {systemLinks.map((item) => <NavLink key={item.href} item={item} pathname={pathname} search={search} />)}
        </div>
      </nav>
      <div className="border-t border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-medium text-muted-foreground" aria-hidden="true">PA</span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-foreground">Platform operator</p>
            <p className="truncate text-[11px] text-muted-foreground">{email}</p>
          </div>
        </div>
        <div className="mt-3">
          <button type="button" onClick={() => { void fetch('/api/auth/logout', { method: 'POST' }).then(() => { window.location.assign('/login'); }); }} className="flex min-h-9 w-full items-center gap-2 text-left text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <Activity className="size-3.5" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminShellNav({ email }: { email: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  return (
    <>
      <aside className="hidden min-h-screen w-56 shrink-0 border-r border-border bg-white lg:block">
        <Navigation pathname={pathname} search={search} email={email} />
      </aside>
      <div className="fixed inset-x-0 top-0 z-30 flex min-h-14 items-center justify-between border-b border-border bg-white px-4 lg:hidden">
        <Link href="/admin" className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
          <span className="font-heading text-lg font-semibold tracking-tight text-foreground">Missa</span>
          <span className="ml-2 text-xs text-muted-foreground">Platform Admin</span>
        </Link>
        <Sheet>
          <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Open platform admin navigation" />}>
            <Menu aria-hidden="true" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 max-w-[calc(100vw-2rem)] bg-white p-0">
            <SheetHeader className="border-b border-border px-5 py-5 pr-12 text-left">
              <SheetTitle className="font-heading text-xl">Missa Platform Admin</SheetTitle>
              <SheetDescription>Tenant-independent operational read model</SheetDescription>
            </SheetHeader>
            <Navigation pathname={pathname} search={search} email={email} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
