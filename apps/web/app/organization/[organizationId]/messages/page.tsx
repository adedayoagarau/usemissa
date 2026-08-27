import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { readOrganizationMessageHistory } from '@missa/radar-adapters';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { organizationCapabilityProjection } from '@/lib/organizationProduct';
import { organizationMessageState, recipientReferenceLabel } from '@/lib/organizationMessagePresentation';
import styles from '../outcome-desk.module.css';

type Query = { q?: string; state?: string; selected?: string };

function displayDate(value: string): string {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default async function OrganizationMessagesPage({ params, searchParams }: { params: Promise<{ organizationId: string }>; searchParams: Promise<Query> }) {
  const { organizationId } = await params;
  const query = await searchParams;
  const session = await getSessionAccountFromToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect(`/login?next=${encodeURIComponent(`/organization/${organizationId}/messages`)}`);
  const membership = session.memberships.find((item) => item.organizationId === organizationId);
  if (!membership) notFound();
  const projection = organizationCapabilityProjection(membership.role);
  if (!projection.destinations.includes('messages')) notFound();

  if (membership.role !== 'owner' && membership.role !== 'admin') {
    return <main id="organization-main" className={styles.main}><header className={styles.header}><div><p className={styles.eyebrow}>Outcome desk</p><h1>Messages</h1><p>Decision correspondence remains separate from review evidence and delivery obligations.</p></div><span className={styles.role}>{projection.label}</span></header><section className={styles.limited}><h2>{membership.role === 'legal' ? 'Legal correspondence projection unavailable' : 'Scoped message projection unavailable'}</h2><p>{membership.role === 'legal' ? 'Only approved terms, the relevant Work, and the external copy should be visible here. That server-enforced projection does not exist yet, so the full Organization correspondence record is withheld.' : 'Missa does not yet enforce Team or Program scope for correspondence. The full recipient ledger is withheld rather than exposed outside a proven assignment.'}</p></section></main>;
  }

  const history = process.env.DATABASE_URL ? await readOrganizationMessageHistory(process.env.DATABASE_URL, organizationId) : { available: false, effects: [] as const };
  if (!history.available) return <main id="organization-main" className={styles.main}><header className={styles.header}><div><p className={styles.eyebrow}>Outcome desk</p><h1>Messages</h1><p>Durable message history is unavailable.</p></div><span className={styles.role}>{projection.label}</span></header><section className={styles.limited}><h2>Message ledger unavailable</h2><p>Missa cannot read the authoritative delivery ledger, so it does not infer a healthy empty queue from compatibility audit entries.</p></section></main>;
  const batches = history.effects.filter((effect) => effect.kind === 'decision-email').map((effect) => {
    const failed = ['failed', 'bounced', 'suppressed', 'unknown'].includes(effect.status);
    const state = organizationMessageState(effect.status);
    const recipient = { workId: effect.id, workTitle: 'Work reference retained', opportunity: 'Organization decision', recipient: recipientReferenceLabel(effect.recipientAccountId), address: 'Address not exposed', outcome: 'Decision correspondence', state };
    return { id: effect.id, subject: effect.templateKey ?? 'Recorded decision correspondence', purpose: 'Decision update', opportunity: 'Organization decision', at: effect.createdAt ?? effect.updatedAt ?? new Date(0).toISOString(), state, recipients: [recipient], accepted: effect.status === 'accepted' ? 1 : 0, delivered: effect.status === 'delivered' ? 1 : 0, failed: failed ? 1 : 0 };
  });

  const normalizedQuery = query.q?.trim().toLocaleLowerCase('en') ?? '';
  const visible = batches.filter((batch) => {
    if (query.state && batch.state !== query.state) return false;
    return !normalizedQuery || `${batch.subject} ${batch.opportunity} ${batch.recipients.map((recipient) => `${recipient.recipient} ${recipient.workTitle}`).join(' ')}`.toLocaleLowerCase('en').includes(normalizedQuery);
  });
  const selected = visible.find((batch) => batch.id === query.selected) ?? visible[0];
  const base = `/organization/${encodeURIComponent(organizationId)}/messages`;
  function selectedHref(id: string) { const next = new URLSearchParams(); if (query.q) next.set('q', query.q); if (query.state) next.set('state', query.state); next.set('selected', id); return `${base}?${next.toString()}`; }
  const needsAttention = batches.filter((batch) => batch.state === 'Needs attention').length;
  const recordedRecipients = batches.reduce((sum, batch) => sum + batch.recipients.length, 0);

  return <main id="organization-main" className={styles.main}><header className={styles.header}><div><p className={styles.eyebrow}>Outcome desk</p><h1>Messages</h1><p>Inspect recorded decision correspondence recipient by recipient. A Decision, prepared message, send, and delivery receipt remain separate facts.</p></div><span className={styles.role}>{projection.label}</span></header>
    <dl className={styles.summary}><div><dt>Recorded batches</dt><dd>{batches.length}</dd></div><div><dt>Need attention</dt><dd>{needsAttention}</dd></div><div><dt>Recorded recipients</dt><dd>{recordedRecipients}</dd></div><div><dt>Replies recorded</dt><dd>—</dd></div></dl>
    <form className={styles.filters} role="search"><label><span>Search correspondence</span><input name="q" defaultValue={query.q ?? ''} placeholder="Recipient, Work, or Opportunity" /></label><label><span>Recorded state</span><select name="state" defaultValue={query.state ?? ''}><option value="">All states</option><option>Accepted</option><option>Delivered</option><option>In progress</option><option>Needs attention</option></select></label><button type="submit">Apply</button>{query.q || query.state ? <Link className={styles.clear} href={base}>Clear</Link> : null}</form>
    {visible.length && selected ? <div className={styles.desk}><section className={styles.queuePanel} aria-label="Message queue"><header className={styles.queueHeader}><div><p className={styles.eyebrow}>Consequence-first queue</p><h2>Correspondence</h2></div><span>{visible.length} {visible.length === 1 ? 'record' : 'records'}</span></header><ol className={styles.queue}>{visible.map((batch) => <li key={batch.id}><Link aria-current={batch.id === selected.id ? 'true' : undefined} href={selectedHref(batch.id)}><div><h3>{batch.subject}</h3><p>{batch.opportunity} · {displayDate(batch.at)}</p><div className={styles.queueMeta}><span className={styles.state}>{batch.state}</span><span className={styles.attention}>{batch.failed ? `${batch.failed} need attention` : batch.delivered ? `${batch.delivered} delivered` : batch.accepted ? `${batch.accepted} accepted` : 'Delivery in progress'}</span></div></div><span className={styles.open}>{batch.id === selected.id ? 'Selected' : 'Open'}<ArrowRight aria-hidden="true" /></span></Link></li>)}</ol></section>
      <article className={styles.dossier} aria-labelledby="selected-message-title"><header className={styles.dossierHeader}><div><p className={styles.eyebrow}>Selected correspondence</p><h2 id="selected-message-title">{selected.subject}</h2><p>{selected.opportunity} · {displayDate(selected.at)}</p></div><span className={styles.state}>{selected.state}</span></header><dl className={styles.factStrip}><div><dt>Purpose</dt><dd>{selected.purpose}</dd></div><div><dt>Recorded recipients</dt><dd>{selected.recipients.length}</dd></div><div><dt>Replies</dt><dd>Not represented</dd></div></dl><div className={styles.dossierBody}><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Recipient resolution</p><h3>What the current record proves</h3></div><span>{selected.accepted} accepted · {selected.delivered} delivered · {selected.failed} attention</span></div><aside className={styles.boundary}><ShieldCheck aria-hidden="true" /><div><strong>Correspondence boundary</strong><p>Provider acceptance is not a delivery receipt. The current record does not preserve approved copy, exclusions, approvals, corrections, or replies. Send and retry controls stay withheld until those facts are durable.</p></div></aside><ul className={styles.recipientList}>{selected.recipients.map((recipient) => <li key={recipient.workId}><div><strong>{recipient.recipient}</strong><span>{recipient.address} · {recipient.workTitle}</span><span>{recipient.opportunity} · {recipient.outcome}</span></div><span className={styles.state}>{recipient.state}</span></li>)}</ul>{selected.recipients.length ? null : <section className={styles.workSummary}><h3>No recipient-level record</h3><p>This batch exists, but its resolved recipient set was not preserved. Missa does not infer recipients from current account data after the fact.</p></section>}</div></article></div>
      : <section className={styles.empty}><h2>{batches.length ? 'No correspondence matches these filters' : 'No durable correspondence yet'}</h2><p>{batches.length ? 'Clear the filters to return to every recorded batch.' : 'Decision records may exist, but a Decision is not a Message. Correspondence appears only when a durable Organization batch record exists.'}</p>{batches.length ? <Link href={base}>Clear filters</Link> : <Link href={`/organization/${encodeURIComponent(organizationId)}/decisions`}>Review Decisions</Link>}</section>}
  </main>;
}
