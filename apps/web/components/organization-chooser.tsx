'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, Search } from 'lucide-react';
import styles from './organization-chooser.module.css';

export type OrganizationChoice = { id: string; name: string; roleLabel: string };

export function OrganizationChooser({ organizations }: { organizations: OrganizationChoice[] }) {
  const [query, setQuery] = useState('');
  const visible = useMemo(() => organizations.filter((item) => `${item.name} ${item.roleLabel}`.toLocaleLowerCase('en').includes(query.trim().toLocaleLowerCase('en'))), [organizations, query]);
  return <section className={styles.chooser} aria-labelledby="available-organizations">
    <header><div><p>Available Organizations</p><h2 id="available-organizations">Choose where to work</h2></div><span>{organizations.length} {organizations.length === 1 ? 'membership' : 'memberships'}</span></header>
    {organizations.length > 3 ? <label className={styles.search}><Search aria-hidden="true" /><span className="sr-only">Search Organizations</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Organizations" /></label> : null}
    <div className={styles.list}>{visible.map((item) => <article key={item.id}><span className={styles.mark} aria-hidden="true"><Building2 /></span><div><h3>{item.name}</h3><p>{item.roleLabel} · Access available</p></div><span className={styles.role}>{item.roleLabel}</span><Link href={`/organization/${encodeURIComponent(item.id)}/overview`}>Enter <ArrowRight aria-hidden="true" /></Link></article>)}{visible.length === 0 ? <div className={styles.empty}><Search aria-hidden="true" /><h3>No Organizations match “{query}”</h3><p>Clear the search or ask an owner for an invitation.</p><button type="button" onClick={() => setQuery('')}>Clear search</button></div> : null}</div>
  </section>;
}
