'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, Menu, Search, UserRound, X } from 'lucide-react';
import type { OrganizationDestination } from '@/lib/organizationProduct';
import { MissaWordmark } from '@/components/missa-wordmark';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import styles from './organization-product-shell.module.css';
import { Sp } from "@/components/missa/spelling";

type OrganizationOption = { id: string; name: string; roleLabel: string };
type NavigationItem = { id: OrganizationDestination; label: string; href: string };

type Appearance = { accent: string; density: 'compact' | 'comfortable'; displayName: string; logoUrl?: string };

export function OrganizationProductShell({ children, organization, organizations, roleLabel, navigation, appearance }: { children: React.ReactNode; organization: OrganizationOption; organizations: OrganizationOption[]; roleLabel: string; navigation: NavigationItem[]; appearance?: Appearance }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [query, setQuery] = useState('');
  const commandButtonRef = useRef<HTMLButtonElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const commands = useMemo(() => navigation.filter((item) => item.label.toLocaleLowerCase('en').includes(query.trim().toLocaleLowerCase('en'))), [navigation, query]);
  const [records, setRecords] = useState<{ query: string; results: Array<{ kind: string; title: string; detail: string; href: string }> }>({ query: '', results: [] });
  useEffect(() => {
    const term = query.trim();
    if (!commandOpen || term.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch(`/api/orgs/${encodeURIComponent(organization.id)}/search?q=${encodeURIComponent(term)}`, { signal: controller.signal, cache: 'no-store' })
        .then(async (response) => (response.ok ? (await response.json()).results : []))
        .then((results) => setRecords({ query: term, results }))
        .catch(() => undefined);
    }, 200);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [commandOpen, query, organization.id]);
  const recordResults = records.query === query.trim() ? records.results : [];
  const active = (item: NavigationItem) => item.id === 'overview' ? pathname.endsWith('/overview') : pathname.includes(`/${item.id}`);

  return <div className={styles.product} data-org-accent={appearance?.accent && appearance.accent !== 'forest' ? appearance.accent : undefined} data-density={appearance?.density}>
    <a href="#organization-main" className={styles.skip}><Sp>Skip to Organization content</Sp></a>
    <header className={styles.topbar}>
      <MissaWordmark size="app" className={styles.wordmark} />
      <div className={styles.productSwitch}><Link href="/profile"><UserRound aria-hidden="true" /><span className={styles.productSwitchLabel}>Profile</span></Link><span aria-current="page"><Building2 aria-hidden="true" /><span className={styles.productSwitchLabel}><Sp>Organization</Sp></span></span></div>
      <Button ref={commandButtonRef} type="button" variant="outline" size="sm" className={styles.commandButton} onClick={() => setCommandOpen(true)}><Search aria-hidden="true" /><Sp>Search Organization</Sp></Button>
      <Link href="/profile" className={styles.avatar} aria-label="Open Profile">P</Link>
      <Button type="button" variant="ghost" size="icon" className={styles.mobileButton} aria-expanded={mobileOpen} aria-label={mobileOpen ? 'Close Organization navigation' : 'Open Organization navigation'} onClick={() => setMobileOpen((value) => !value)}>{mobileOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</Button>
    </header>
    <div className={styles.shell}>
      <aside className={styles.rail} data-open={mobileOpen} aria-label="Organization navigation">
        <label className={styles.organizationPicker}><span><Sp>Current Organization</Sp></span><NativeSelect className="w-full *:data-[slot=native-select]:h-11" value={organization.id} aria-label="Switch Organization" onChange={(event) => router.push(`/organization/${encodeURIComponent(event.target.value)}/overview`)}>{organizations.map((item) => <NativeSelectOption key={item.id} value={item.id}>{item.name} · {item.roleLabel}</NativeSelectOption>)}</NativeSelect></label>
        <div className={styles.role}>{appearance?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- organization-supplied https logo from an unknown host
          <img src={appearance.logoUrl} alt="" className={styles.orgLogo} />
        ) : null}<strong>{appearance?.displayName ?? organization.name}</strong><span>{roleLabel}</span></div>
        <nav aria-label="Organization destinations">{navigation.map((item) => <Link key={item.id} href={item.href} aria-current={active(item) ? 'page' : undefined} onClick={() => setMobileOpen(false)}>{item.label}</Link>)}</nav>
        <Link href="/organization" className={styles.switchLink}><Sp>Choose another Organization</Sp></Link>
      </aside>
      <div className={styles.content}>{children}</div>
    </div>
    <Dialog open={commandOpen} onOpenChange={setCommandOpen}><DialogContent showCloseButton={false} initialFocus={commandInputRef} finalFocus={commandButtonRef} className={`gap-0 p-0 sm:max-w-xl ${styles.command}`}><header><div><p><Sp>Organization search</Sp></p><DialogTitle>Find a page or record</DialogTitle></div><DialogClose render={<Button type="button" variant="ghost" size="icon" aria-label="Close Organization search" />}><X aria-hidden="true" /></DialogClose></header><label><Search aria-hidden="true" /><span className="sr-only"><Sp>Search Organization destinations</Sp></span><Input ref={commandInputRef} className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pages, submitters, Works" /></label><div>{commands.map((item) => <Link key={item.id} href={item.href} onClick={() => setCommandOpen(false)}>{item.label}<span>Open</span></Link>)}{recordResults.map((item) => <Link key={item.href} href={item.href} onClick={() => setCommandOpen(false)}><span className={styles.recordResult}><strong>{item.title}</strong><small>{item.detail}</small></span><span>{item.kind === 'opportunity' ? 'Opportunity' : 'Submission'}</span></Link>)}{commands.length === 0 && recordResults.length === 0 ? <p>{query.trim().length >= 2 ? `Nothing matches “${query}”.` : `No destinations match “${query}”.`}</p> : null}</div></DialogContent></Dialog>
  </div>;
}
