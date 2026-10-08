'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, ChartColumn, ClipboardCheck, Gavel, Globe, Inbox, LayoutDashboard, Megaphone, Menu, MessageSquare, Search, Settings, Truck, UserRound, Users, X, type LucideIcon } from 'lucide-react';
import type { OrganizationDestination } from '@/lib/organizationProduct';
import { MissaWordmark } from '@/components/missa-wordmark';
import { HueTile } from '@/components/missa/hue-tile';
import type { PersonHue } from '@/components/missa/person-avatar';
import { Button, buttonVariants } from '@/components/ui/button';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import styles from './organization-product-shell.module.css';
import { Sp } from "@/components/missa/spelling";

type OrganizationOption = { id: string; name: string; roleLabel: string };
type NavigationItem = { id: OrganizationDestination; label: string; href: string };

type Appearance = { accent: string; density: 'compact' | 'comfortable'; displayName: string; logoUrl?: string };

/** Each destination keeps one hue and icon, as the account rail does. */
const destinationMark: Record<OrganizationDestination, { icon: LucideIcon; hue: PersonHue }> = {
  overview: { icon: LayoutDashboard, hue: 'teal' },
  portal: { icon: Globe, hue: 'blue' },
  opportunities: { icon: Megaphone, hue: 'orange' },
  submissions: { icon: Inbox, hue: 'indigo' },
  reviews: { icon: ClipboardCheck, hue: 'purple' },
  decisions: { icon: Gavel, hue: 'red' },
  messages: { icon: MessageSquare, hue: 'pink' },
  delivery: { icon: Truck, hue: 'lime' },
  insights: { icon: ChartColumn, hue: 'amber' },
  people: { icon: Users, hue: 'magenta' },
  settings: { icon: Settings, hue: 'green' },
};

export function OrganizationProductShell({ children, organization, organizations, roleLabel, navigation, appearance }: { children: React.ReactNode; organization: OrganizationOption; organizations: OrganizationOption[]; roleLabel: string; navigation: NavigationItem[]; appearance?: Appearance }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [query, setQuery] = useState('');
  const term = query.trim();
  const commands = navigation.filter((item) => item.label.toLocaleLowerCase('en').includes(term.toLocaleLowerCase('en')));
  const [records, setRecords] = useState<{ query: string; results: Array<{ kind: string; title: string; detail: string; href: string }> }>({ query: '', results: [] });
  useEffect(() => {
    if (!commandOpen || term.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch(`/api/orgs/${encodeURIComponent(organization.id)}/search?q=${encodeURIComponent(term)}`, { signal: controller.signal, cache: 'no-store' })
        .then(async (response) => (response.ok ? (await response.json()).results : []))
        .then((results) => setRecords({ query: term, results }))
        .catch(() => undefined);
    }, 200);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [commandOpen, term, organization.id]);
  const recordResults = records.query === term ? records.results : [];
  const active = (item: NavigationItem) => item.id === 'overview' ? pathname.endsWith('/overview') : pathname.includes(`/${item.id}`);

  function go(href: string) { setCommandOpen(false); setQuery(''); router.push(href); }

  return <div className={styles.product} data-org-accent={appearance?.accent && appearance.accent !== 'forest' ? appearance.accent : undefined} data-density={appearance?.density}>
    <a href="#organization-main" className={styles.skip}><Sp>Skip to Organization content</Sp></a>
    <header className={styles.topbar}>
      <MissaWordmark size="app" className={styles.wordmark} />
      <div className={styles.productSwitch}><Link href="/profile"><UserRound aria-hidden="true" /><span className={styles.productSwitchLabel}>Profile</span></Link><span aria-current="page"><Building2 aria-hidden="true" /><span className={styles.productSwitchLabel}><Sp>Organization</Sp></span></span></div>
      <Button type="button" variant="outline" className={styles.commandButton} onClick={() => setCommandOpen(true)}><Search aria-hidden="true" /><Sp>Search Organization</Sp></Button>
      <Link href="/profile" className={styles.avatar} aria-label="Open Profile">P</Link>
      <Button type="button" variant="ghost" size="icon" className={styles.mobileButton} aria-expanded={mobileOpen} aria-label={mobileOpen ? 'Close Organization navigation' : 'Open Organization navigation'} onClick={() => setMobileOpen((value) => !value)}>{mobileOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</Button>
    </header>
    <div className={styles.shell}>
      <aside className={styles.rail} data-open={mobileOpen} aria-label="Organization navigation">
        <div className={styles.organizationPicker}>
          <span><Sp>Current Organization</Sp></span>
          <Select value={organization.id} onValueChange={(value) => { if (value && value !== organization.id) router.push(`/organization/${encodeURIComponent(String(value))}/overview`); }}>
            <SelectTrigger aria-label="Switch Organization" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{organizations.map((item) => <SelectItem key={item.id} value={item.id}>{item.name} · {item.roleLabel}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className={styles.role}>{appearance?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- organization-supplied https logo from an unknown host
          <img src={appearance.logoUrl} alt="" className={styles.orgLogo} />
        ) : null}<strong>{appearance?.displayName ?? organization.name}</strong><span>{roleLabel}</span></div>
        <nav aria-label="Organization destinations"><ul>{navigation.map((item) => {
          const { icon: Icon, hue } = destinationMark[item.id];
          const current = active(item);
          return <li key={item.id}><Link href={item.href} aria-current={current ? 'page' : undefined} onClick={() => setMobileOpen(false)} className={cn(buttonVariants({ variant: 'nav' }), styles.destination)}>
            <HueTile hue={hue} tone={current ? 'solid' : 'soft'} size="sm"><Icon className="size-3.5 text-current" strokeWidth={2} aria-hidden="true" /></HueTile>
            <span className="truncate">{item.label}</span>
          </Link></li>;
        })}</ul></nav>
        <Link href="/organization" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), styles.switchLink)}><Building2 aria-hidden="true" /><Sp>Choose another Organization</Sp></Link>
      </aside>
      <div className={styles.content}>{children}</div>
    </div>
    <CommandDialog open={commandOpen} onOpenChange={setCommandOpen} title="Find a page or record" description="Search pages, people and work in your organization.">
      <CommandInput value={query} onValueChange={setQuery} placeholder="Search pages, submitters, Works" />
      <CommandList>
        <CommandEmpty>{term.length >= 2 ? `Nothing matches “${query}”.` : `No destinations match “${query}”.`}</CommandEmpty>
        {commands.length ? <CommandGroup heading="Pages">{commands.map((item) => {
          const { icon: Icon, hue } = destinationMark[item.id];
          return <CommandItem key={item.id} value={item.label} onSelect={() => go(item.href)}><HueTile hue={hue} tone="soft" size="sm"><Icon className="size-3.5 text-current" aria-hidden="true" /></HueTile>{item.label}</CommandItem>;
        })}</CommandGroup> : null}
        {recordResults.length ? <CommandGroup heading="Records">{recordResults.map((item) => <CommandItem key={item.href} value={`${item.title} ${item.detail} ${item.href}`} onSelect={() => go(item.href)}>
          <span className="grid min-w-0 flex-1"><span className="truncate font-medium">{item.title}</span><span className="truncate text-xs text-muted-foreground">{item.detail}</span></span>
          <span className="text-xs text-muted-foreground">{item.kind === 'opportunity' ? 'Opportunity' : 'Submission'}</span>
        </CommandItem>)}</CommandGroup> : null}
      </CommandList>
    </CommandDialog>
  </div>;
}
