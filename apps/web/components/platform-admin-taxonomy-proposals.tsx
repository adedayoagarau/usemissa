'use client';

import { useState } from 'react';
import type { TaxonomyAdminDashboard } from '@missa/radar-adapters';

type Proposal = TaxonomyAdminDashboard['proposalRows'][number];

export default function PlatformAdminTaxonomyProposals({ proposals }: { proposals: Proposal[] }) {
  const [rows, setRows] = useState(proposals);
  const [busy, setBusy] = useState<string>();
  const [message, setMessage] = useState<string>();

  async function review(proposalId: string, action: 'approve' | 'reject') {
    setBusy(`${proposalId}:${action}`);
    setMessage(undefined);
    try {
      const response = await fetch('/api/admin/taxonomy', { method: 'POST', headers: { 'content-type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ action, proposalId }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? 'Unable to review proposal');
      setRows((current) => current.map((row) => row.id === proposalId ? { ...row, status: action === 'approve' ? 'approved' : 'rejected' } : row));
      setMessage(`Proposal ${action === 'approve' ? 'approved' : 'rejected'}. Applying or publishing it remains a separate governed action.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to review proposal');
    } finally {
      setBusy(undefined);
    }
  }

  return <section className="mt-8 rounded-2xl border border-border bg-white p-6 shadow-sm"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-heading text-xl font-medium">Proposal review</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Approval records editorial intent only. It does not mutate terms, activate a scheme, or publish a source.</p></div><span className="text-xs text-muted-foreground">{rows.length} recent proposals</span></div>{rows.length === 0 ? <p className="mt-6 text-sm text-muted-foreground">No taxonomy proposals are present.</p> : <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm"><caption className="sr-only">Taxonomy proposals awaiting governed review</caption><thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground"><tr><th scope="col" className="px-3 py-3 font-medium">Proposal</th><th scope="col" className="px-3 py-3 font-medium">Kind</th><th scope="col" className="px-3 py-3 font-medium">Status</th><th scope="col" className="px-3 py-3 font-medium">Evidence</th><th scope="col" className="px-3 py-3 font-medium">Created</th><th scope="col" className="px-3 py-3 font-medium">Review</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b border-border align-top last:border-0"><th scope="row" className="max-w-[260px] px-3 py-3 font-mono text-xs font-normal text-foreground"><span className="block truncate">{row.id}</span><span className="mt-1 block truncate text-[11px] text-muted-foreground">{row.termId ?? row.schemeId}</span></th><td className="px-3 py-3 text-xs">{row.kind}</td><td className={`px-3 py-3 text-xs font-medium capitalize ${row.status === 'approved' ? 'text-green-700' : row.status === 'rejected' ? 'text-red-700' : 'text-amber-700'}`}>{row.status}</td><td className="px-3 py-3 text-xs">{row.evidenceCount} URL{row.evidenceCount === 1 ? '' : 's'}</td><td className="whitespace-nowrap px-3 py-3 font-mono text-[11px] text-muted-foreground">{row.createdAt ?? 'Not observed'}</td><td className="px-3 py-3"><div className="flex flex-wrap gap-2">{(row.status === 'open' || row.status === 'researching') && <><button type="button" disabled={Boolean(busy)} onClick={() => void review(row.id, 'approve')} className="min-h-8 border border-green-200 px-2 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50">{busy === `${row.id}:approve` ? '…' : 'Approve'}</button><button type="button" disabled={Boolean(busy)} onClick={() => void review(row.id, 'reject')} className="min-h-8 border border-red-200 px-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">{busy === `${row.id}:reject` ? '…' : 'Reject'}</button></>}</div></td></tr>)}</tbody></table></div>}{message && <p role="status" className="mt-4 text-xs leading-5 text-muted-foreground">{message}</p>}</section>;
}
