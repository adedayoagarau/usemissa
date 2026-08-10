'use client';

import Link from 'next/link';
import { ArrowUpRight, Check, ExternalLink, FileText, Search, ShieldAlert, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { AdminArea } from '@/lib/platformAdmin';
import type { PlatformAdminContentData } from '@/lib/platformAdminViews';
import { MaturityBadge, WarningList } from './platform-admin';

function humanize(value: string): string {
  return value.replaceAll('-', ' ').replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatObserved(value?: string): string {
  if (!value) return 'Not observed';
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(time));
}

export default function PlatformAdminContent({ area }: { area: AdminArea<PlatformAdminContentData> }) {
  const { data } = area;
  const searchParams = useSearchParams();
  const organizationId = searchParams.get('organizationId');
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'all' | PlatformAdminContentData['rows'][number]['type']>('all');
  const [status, setStatus] = useState('all');
  const [queueRows, setQueueRows] = useState(data.reviewQueue.rows);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [busyReview, setBusyReview] = useState<string>();
  const [reviewMessage, setReviewMessage] = useState<string>();
  const [reviewError, setReviewError] = useState<string>();
  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return data.rows.filter((row) => {
      if (organizationId && row.organizationId !== organizationId) return false;
      if (type !== 'all' && row.type !== type) return false;
      if (status !== 'all' && row.status !== status) return false;
      if (!normalized) return true;
      return [row.id, row.type, row.title, row.organization, row.status, row.source].filter(Boolean).join(' ').toLowerCase().includes(normalized);
    });
  }, [data.rows, organizationId, query, status, type]);
  const statuses = [...new Set(data.rows.map((row) => row.status))].sort();

  async function resolveReview(jobId: string, decision: 'approved' | 'blocked') {
    setBusyReview(`${jobId}:${decision}`);
    setReviewMessage(undefined);
    setReviewError(undefined);
    try {
      const response = await fetch('/api/admin/content/review', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jobId, decision, note: reviewNotes[jobId]?.trim() || undefined }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setReviewError(body.error ?? 'We could not resolve this content review.');
        return;
      }
      setQueueRows((current) => current.filter((row) => row.jobId !== jobId));
      setReviewNotes((current) => {
        const next = { ...current };
        delete next[jobId];
        return next;
      });
      setReviewMessage(decision === 'approved' ? 'Content approved and handed to the publisher lane.' : 'Content blocked and kept out of public reads.');
    } catch {
      setReviewError('We could not reach the content review service. Try again.');
    } finally {
      setBusyReview(undefined);
    }
  }

  return <div className="space-y-8">
    <div><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Platform Admin · Product</p><h1 className="mt-2 font-heading text-4xl font-medium tracking-tight text-foreground">Content</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">One registry for the content Missa observes and the content organizations run. These are different systems of record, kept distinct on purpose.</p><div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground"><MaturityBadge maturity={area.provenance.maturity} /><span>Data source: {area.provenance.source}</span><span>Freshness: {area.provenance.freshness}</span></div></div>
    <WarningList warnings={area.warnings} />

    <section className="border border-border bg-white" aria-labelledby="content-review-queue-title" aria-busy={Boolean(busyReview)}>
      <div className="border-b border-border px-4 py-4 sm:px-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Agent loop · human terminal</p><h2 id="content-review-queue-title" className="mt-1 text-lg font-semibold tracking-tight text-foreground">Opportunity content review</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">Review the exact source-linked brief produced by the content worker. Approval changes only the generated projection; canonical opportunity facts remain untouched.</p></div><span className={`inline-flex items-center gap-2 border px-2 py-1 text-xs font-medium ${data.reviewQueue.available ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}><span className="size-1.5 rounded-full bg-current" aria-hidden="true" />{data.reviewQueue.available ? 'Durable queue' : 'Queue unavailable'}</span></div></div>
      <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-2 lg:grid-cols-5">{[
        ['Needs human', data.reviewQueue.summary.needsHuman],
        ['Pending', data.reviewQueue.summary.pending],
        ['Approved', data.reviewQueue.summary.approved],
        ['Blocked', data.reviewQueue.summary.blocked],
        ['Failed', data.reviewQueue.summary.failed],
      ].map(([label, value]) => <div key={label} className="border border-border bg-muted/20 p-3"><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1 font-mono text-xl tabular-nums text-foreground">{value}</p></div>)}</div>
      {reviewMessage && <p role="status" className="border-b border-green-200 bg-green-50 px-4 py-3 text-xs leading-5 text-green-700">{reviewMessage}</p>}
      {reviewError && <p role="alert" className="border-b border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">{reviewError}</p>}
      {!data.reviewQueue.available ? <div className="px-4 py-10 text-center"><p className="text-sm font-medium text-foreground">Durable review is not available</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Deploy the content review schema before enabling this action surface.</p></div> : queueRows.length === 0 ? <div className="px-4 py-10 text-center"><p className="text-sm font-medium text-foreground">No content is waiting for human review</p><p className="mt-1 text-xs leading-5 text-muted-foreground">The automated reviewer has no ambiguous briefs in the current queue.</p></div> : <div className="divide-y divide-border">{queueRows.map((row) => <article key={row.jobId} className="p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{row.organizationName ?? 'Organization not confirmed'}</p><h3 className="mt-1 text-base font-semibold text-foreground">{row.title}</h3><p className="mt-1 font-mono text-[11px] text-muted-foreground">job {row.jobId} · opportunity {row.opportunityId}</p></div><span className="inline-flex items-center gap-1.5 border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700"><ShieldAlert className="size-3.5" aria-hidden="true" />Needs human</span></div><div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]"><div className="space-y-4"><p className="text-sm leading-6 text-foreground">{row.content.summary}</p><div className="grid gap-2 sm:grid-cols-2">{row.content.highlights.map((fact) => <div key={`${fact.label}:${fact.value}`} className="border border-border bg-muted/20 p-3"><p className="text-[11px] font-medium text-muted-foreground">{fact.label}</p><p className="mt-1 text-xs leading-5 text-foreground">{fact.value}</p><p className={`mt-1 text-[11px] ${fact.certainty === 'confirmed' ? 'text-green-700' : 'text-amber-700'}`}>{fact.certainty}</p></div>)}</div><div className="grid gap-4 sm:grid-cols-2"><div><h4 className="text-xs font-semibold text-foreground">Automated review reasons</h4><ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-muted-foreground">{row.reviewReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></div><div><h4 className="text-xs font-semibold text-foreground">Known unknowns</h4>{row.content.unknowns.length ? <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-muted-foreground">{row.content.unknowns.map((unknown) => <li key={unknown}>{unknown}</li>)}</ul> : <p className="mt-2 text-xs text-muted-foreground">None recorded.</p>}</div></div><a href={row.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-accent-deep underline decoration-accent-tint underline-offset-4 hover:text-primary">Open canonical source <ExternalLink className="size-3.5" aria-hidden="true" /></a></div><aside className="border border-border bg-muted/20 p-4"><dl className="grid grid-cols-2 gap-3 text-xs"><div><dt className="text-muted-foreground">Review score</dt><dd className="mt-1 font-mono text-base text-foreground">{row.reviewScore}/100</dd></div><div><dt className="text-muted-foreground">Attempts</dt><dd className="mt-1 font-mono text-base text-foreground">{row.attempts}</dd></div><div className="col-span-2"><dt className="text-muted-foreground">Source processed</dt><dd className="mt-1 font-mono text-[11px] text-foreground">{formatObserved(row.sourceProcessedAt)}</dd></div></dl><label className="mt-4 block"><span className="text-xs font-medium text-foreground">Decision note <span className="font-normal text-muted-foreground">(optional)</span></span><textarea maxLength={500} rows={3} value={reviewNotes[row.jobId] ?? ''} onChange={(event) => setReviewNotes((current) => ({ ...current, [row.jobId]: event.target.value }))} placeholder="Why is this safe to approve or block?" className="mt-1 w-full resize-y border border-border bg-white px-3 py-2 text-xs leading-5 outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20" /></label><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1"><button type="button" disabled={Boolean(busyReview)} onClick={() => void resolveReview(row.jobId, 'approved')} className="inline-flex min-h-9 items-center justify-center gap-1.5 border border-green-200 bg-green-50 px-3 text-xs font-medium text-green-700 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50">{busyReview === `${row.jobId}:approved` ? 'Approving…' : <><Check className="size-3.5" aria-hidden="true" />Approve brief</>}</button><button type="button" disabled={Boolean(busyReview)} onClick={() => void resolveReview(row.jobId, 'blocked')} className="inline-flex min-h-9 items-center justify-center gap-1.5 border border-red-200 bg-red-50 px-3 text-xs font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50">{busyReview === `${row.jobId}:blocked` ? 'Blocking…' : <><X className="size-3.5" aria-hidden="true" />Block brief</>}</button></div></aside></div></article>)}</div>}
    </section>

    <section aria-labelledby="content-summary"><h2 id="content-summary" className="sr-only">Content summary</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[{ label: 'Canonical opportunities', value: data.summary.canonicalRadar, detail: 'Non-duplicate opportunity rows' }, { label: 'Duplicate opportunities', value: data.summary.duplicateRadar, detail: 'Kept visible, not merged' }, { label: 'Organization open calls', value: data.summary.workspaceOpenCalls, detail: 'Customer-owned content' }, { label: 'Published', value: data.summary.publishedOpenCalls, detail: 'Organization open calls' }, { label: 'Drafts', value: data.summary.drafts, detail: 'Not publicly live' }].map((item) => <div key={item.label} className="border border-border bg-white p-4"><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-1 font-mono text-2xl tabular-nums text-foreground">{item.value}</p><p className="mt-1 text-[11px] leading-4 text-muted-foreground">{item.detail}</p></div>)}</div></section>

    <section className="border border-border bg-white" aria-labelledby="content-registry-title">
      <div className="border-b border-border px-4 py-4 sm:px-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="content-registry-title" className="text-lg font-semibold tracking-tight text-foreground">Content registry</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Search and filter current backend records. Actions remain on the owning surface.</p></div><span className="font-mono text-xs text-muted-foreground">{rows.length} / {data.rows.length}</span></div><div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px_180px]"><label className="relative block"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search content registry" placeholder="Search title, ID, organization…" className="h-10 w-full border border-border bg-white pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20" /></label><label className="sr-only" htmlFor="content-type">Content type</label><select id="content-type" value={type} onChange={(event) => setType(event.target.value as typeof type)} className="h-10 border border-border bg-white px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"><option value="all">All content types</option><option value="Canonical opportunity">Canonical opportunity</option><option value="Organization open call">Organization open call</option></select><label className="sr-only" htmlFor="content-status">Content status</label><select id="content-status" value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 border border-border bg-white px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"><option value="all">All statuses</option>{statuses.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm"><caption className="sr-only">Missa content registry</caption><thead className="border-b border-border bg-muted/30 text-[11px] text-muted-foreground"><tr><th scope="col" className="px-4 py-3 font-medium">Content</th><th scope="col" className="px-4 py-3 font-medium">Organization</th><th scope="col" className="px-4 py-3 font-medium">Status</th><th scope="col" className="px-4 py-3 font-medium">Source</th><th scope="col" className="px-4 py-3 font-medium">Observed</th><th scope="col" className="px-4 py-3 font-medium">Open</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20"><th scope="row" className="max-w-[330px] px-4 py-3 font-medium text-foreground"><span className="flex items-start gap-2"><FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="min-w-0"><span className="block truncate">{row.title}</span><span className="mt-0.5 block truncate font-mono text-[11px] font-normal text-muted-foreground">{row.type} · {row.id}</span></span></span></th><td className="px-4 py-3 text-sm text-muted-foreground">{row.organization ?? 'Unassigned / not observed'}</td><td className="px-4 py-3"><span className="inline-flex items-center gap-2 text-xs text-foreground"><span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />{humanize(row.status)}</span></td><td className="max-w-[220px] truncate px-4 py-3 text-xs text-muted-foreground">{row.source}</td><td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-muted-foreground">{formatObserved(row.lastObservedAt)}</td><td className="px-4 py-3"><Link href={row.href} className="inline-flex min-h-9 items-center gap-1 text-xs font-medium text-accent-deep underline decoration-accent-tint underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Open <ArrowUpRight className="size-3.5" aria-hidden="true" /></Link></td></tr>)}</tbody></table></div>
      {rows.length === 0 && <div className="px-4 py-12 text-center"><p className="text-sm font-medium text-foreground">No matching content</p><p className="mt-1 text-xs text-muted-foreground">Adjust the search or filters. The registry is backed by current Missa records.</p></div>}
    </section>

    <section className="border border-dashed border-border bg-white p-4" aria-labelledby="planned-cms-title"><h2 id="planned-cms-title" className="text-sm font-semibold text-foreground">CMS capabilities not persisted yet</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">The registry deliberately does not render fake organization-owned editorial controls. These capabilities need durable models, permissions, revisions, and audit contracts.</p><ul className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">{data.planned.map((item) => <li key={item} className="border-l-2 border-border pl-3">{item}</li>)}</ul></section>
  </div>;
}
