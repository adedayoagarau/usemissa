'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, ChevronDown, Menu, Search, UserRound, X } from 'lucide-react';
import type { OrganizationDestination } from '@/lib/organizationProduct';
import { MissaWordmark } from '@/components/missa-wordmark';
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
  const commandRef = useRef<HTMLElement>(null);
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

  useEffect(() => {
    if (!commandOpen) return;
    const commandButton = commandButtonRef.current;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') { setCommandOpen(false); return; }
      if (event.key !== 'Tab' || !commandRef.current) return;
      const controls = [...commandRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href]')];
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => { document.removeEventListener('keydown', handleKeyDown); commandButton?.focus({ preventScroll: true }); };
  }, [commandOpen]);

  return <div className={styles.product} data-org-accent={appearance?.accent && appearance.accent !== 'forest' ? appearance.accent : undefined} data-density={appearance?.density}>
    <a href="#organization-main" className={styles.skip}><Sp>Skip to Organization content</Sp></a>
    <header className={styles.topbar}>
      <MissaWordmark size="app" className={styles.wordmark} />
      <div className={styles.productSwitch}><Link href="/profile"><UserRound aria-hidden="true" /><span className={styles.productSwitchLabel}>Profile</span></Link><span aria-current="page"><Building2 aria-hidden="true" /><span className={styles.productSwitchLabel}><Sp>Organization</Sp></span></span></div>
      <button ref={commandButtonRef} type="button" className={styles.commandButton} onClick={() => setCommandOpen(true)}><Search aria-hidden="true" /><Sp>Search Organization</Sp></button>
      <Link href="/profile" className={styles.avatar} aria-label="Open Profile">P</Link>
      <button type="button" className={styles.mobileButton} aria-expanded={mobileOpen} aria-label={mobileOpen ? 'Close Organization navigation' : 'Open Organization navigation'} onClick={() => setMobileOpen((value) => !value)}>{mobileOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</button>
    </header>
    <div className={styles.shell}>
      <aside className={styles.rail} data-open={mobileOpen} aria-label="Organization navigation">
        <label className={styles.organizationPicker}><span><Sp>Current Organization</Sp></span><select value={organization.id} aria-label="Switch Organization" onChange={(event) => router.push(`/organization/${encodeURIComponent(event.target.value)}/overview`)}>{organizations.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.roleLabel}</option>)}</select><ChevronDown aria-hidden="true" /></label>
        <div className={styles.role}>{appearance?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- organization-supplied https logo from an unknown host
          <img src={appearance.logoUrl} alt="" className={styles.orgLogo} />
        ) : null}<strong>{appearance?.displayName ?? organization.name}</strong><span>{roleLabel}</span></div>
        <nav aria-label="Organization destinations">{navigation.map((item) => <Link key={item.id} href={item.href} aria-current={active(item) ? 'page' : undefined} onClick={() => setMobileOpen(false)}>{item.label}</Link>)}</nav>
        <Link href="/organization" className={styles.switchLink}><Sp>Choose another Organization</Sp></Link>
      </aside>
      <div className={styles.content}>{children}</div>
    </div>
    {commandOpen ? <div className={styles.commandBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCommandOpen(false); }}><section ref={commandRef} className={styles.command} role="dialog" aria-modal="true" aria-labelledby="organization-command-title"><header><div><p><Sp>Organization search</Sp></p><h2 id="organization-command-title">Find a page or record</h2></div><button type="button" aria-label="Close Organization search" onClick={() => setCommandOpen(false)}><X aria-hidden="true" /></button></header><label><Search aria-hidden="true" /><span className="sr-only"><Sp>Search Organization destinations</Sp></span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pages, submitters, Works" /></label><div>{commands.map((item) => <Link key={item.id} href={item.href} onClick={() => setCommandOpen(false)}>{item.label}<span>Open</span></Link>)}{recordResults.map((item) => <Link key={item.href} href={item.href} onClick={() => setCommandOpen(false)}><span className={styles.recordResult}><strong>{item.title}</strong><small>{item.detail}</small></span><span>{item.kind === 'opportunity' ? 'Opportunity' : 'Submission'}</span></Link>)}{commands.length === 0 && recordResults.length === 0 ? <p>{query.trim().length >= 2 ? `Nothing matches “${query}”.` : `No destinations match “${query}”.`}</p> : null}</div></section></div> : null}
  </div>;
}
