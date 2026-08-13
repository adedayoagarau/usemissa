'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, ChevronDown, Menu, Search, UserRound, X } from 'lucide-react';
import type { OrganizationDestination } from '@/lib/organizationProduct';
import { MissaWordmark } from '@/components/missa-wordmark';
import styles from './organization-product-shell.module.css';

type OrganizationOption = { id: string; name: string; roleLabel: string };
type NavigationItem = { id: OrganizationDestination; label: string; href: string };

export function OrganizationProductShell({ children, organization, organizations, roleLabel, navigation }: { children: React.ReactNode; organization: OrganizationOption; organizations: OrganizationOption[]; roleLabel: string; navigation: NavigationItem[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [query, setQuery] = useState('');
  const commandButtonRef = useRef<HTMLButtonElement>(null);
  const commandRef = useRef<HTMLElement>(null);
  const commands = useMemo(() => navigation.filter((item) => item.label.toLocaleLowerCase('en').includes(query.trim().toLocaleLowerCase('en'))), [navigation, query]);
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

  return <div className={styles.product}>
    <a href="#organization-main" className={styles.skip}>Skip to Organization content</a>
    <header className={styles.topbar}>
      <MissaWordmark size="app" className={styles.wordmark} />
      <div className={styles.productSwitch}><Link href="/profile"><UserRound aria-hidden="true" />Profile</Link><span aria-current="page"><Building2 aria-hidden="true" />Organization</span></div>
      <button ref={commandButtonRef} type="button" className={styles.commandButton} onClick={() => setCommandOpen(true)}><Search aria-hidden="true" />Search Organization</button>
      <Link href="/profile" className={styles.avatar} aria-label="Open Profile">P</Link>
      <button type="button" className={styles.mobileButton} aria-expanded={mobileOpen} aria-label={mobileOpen ? 'Close Organization navigation' : 'Open Organization navigation'} onClick={() => setMobileOpen((value) => !value)}>{mobileOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</button>
    </header>
    <div className={styles.shell}>
      <aside className={styles.rail} data-open={mobileOpen} aria-label="Organization navigation">
        <label className={styles.organizationPicker}><span>Current Organization</span><select value={organization.id} aria-label="Switch Organization" onChange={(event) => router.push(`/organization/${encodeURIComponent(event.target.value)}/overview`)}>{organizations.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.roleLabel}</option>)}</select><ChevronDown aria-hidden="true" /></label>
        <div className={styles.role}><strong>{organization.name}</strong><span>{roleLabel}</span></div>
        <nav aria-label="Organization destinations">{navigation.map((item) => <Link key={item.id} href={item.href} aria-current={active(item) ? 'page' : undefined} onClick={() => setMobileOpen(false)}>{item.label}</Link>)}</nav>
        <Link href="/organization" className={styles.switchLink}>Choose another Organization</Link>
      </aside>
      <div className={styles.content}>{children}</div>
    </div>
    {commandOpen ? <div className={styles.commandBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCommandOpen(false); }}><section ref={commandRef} className={styles.command} role="dialog" aria-modal="true" aria-labelledby="organization-command-title"><header><div><p>Organization search</p><h2 id="organization-command-title">Open a destination</h2></div><button type="button" aria-label="Close Organization search" onClick={() => setCommandOpen(false)}><X aria-hidden="true" /></button></header><label><Search aria-hidden="true" /><span className="sr-only">Search Organization destinations</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search destinations" /></label><div>{commands.map((item) => <Link key={item.id} href={item.href} onClick={() => setCommandOpen(false)}>{item.label}<span>Open</span></Link>)}{commands.length === 0 ? <p>No destinations match “{query}”.</p> : null}</div></section></div> : null}
  </div>;
}
