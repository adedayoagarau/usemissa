'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Candidate = { id: string; classification: string; state: string; sourceMode?: 'forwarding' | 'gmail-sync' | 'autopilot'; senderDomain?: string; subject: string; bodyExcerpt: string; matchedOpportunityId?: string; candidates: Array<{ opportunityId: string; title: string; organizationName?: string }>; proposedStatus?: string; confidence: string; warnings: string[]; evidenceReasons: string[]; attachmentMetadata: Array<{ filename: string; unsafe: boolean }> };
const statuses = ['saved', 'preparing', 'submitted', 'received', 'in-review', 'shortlisted', 'finalist', 'accepted', 'declined', 'waitlisted', 'revision-requested', 'withdrawn'];
const filters = [['all', 'All'], ['gmail', 'Gmail Sync'], ['forwarding', 'Forwarding'], ['needs-review', 'Needs review'], ['matched', 'Matched'], ['unmatched', 'Unmatched']] as const;

export function EmailReviewQueue() {
  const [filter, setFilter] = useState<string>('all');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [busy, setBusy] = useState<string>();
  const [message, setMessage] = useState<string>();
  useEffect(() => {
    const controller = new AbortController();
    const query = ['needs-review', 'matched', 'unmatched'].includes(filter) ? `&classification=${encodeURIComponent(filter)}` : filter === 'gmail' ? '&source=gmail' : filter === 'forwarding' ? '&source=forwarding' : '';
    fetch(`/api/me/email-candidates?state=pending${query}`, { cache: 'no-store', signal: controller.signal }).then((response) => response.ok ? response.json() as Promise<{ candidates: Candidate[]; pendingCount: number }> : undefined).then((body) => { if (body) { setCandidates(body.candidates); setPendingCount(body.pendingCount); } }).catch(() => undefined);
    return () => controller.abort();
  }, [filter]);
  async function review(candidate: Candidate, decision: Record<string, unknown>) {
    setBusy(candidate.id); setMessage(undefined);
    try {
      const response = await fetch(`/api/me/email-candidates/${candidate.id}/review`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...decision, idempotencyKey: `${candidate.id}:${Date.now()}` }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) setMessage(body.error ?? 'We could not apply that decision.'); else { setCandidates((rows) => rows.filter((row) => row.id !== candidate.id)); setPendingCount((count) => Math.max(0, count - 1)); setMessage('Review updated'); }
    } finally { setBusy(undefined); }
  }
  return <section aria-labelledby="email-review-heading" className="mt-8"><div className="flex flex-wrap items-baseline justify-between gap-3"><div><h2 id="email-review-heading" className="text-xl font-semibold text-foreground">Email updates to review{pendingCount ? ` (${pendingCount})` : ''}</h2><p className="mt-1 text-sm text-muted-foreground">Nothing changes in your Tracker until you confirm it.</p></div><div className="flex flex-wrap gap-2" role="group" aria-label="Email review filters">{filters.map(([value, label]) => <Button key={value} variant={filter === value ? 'secondary' : 'ghost'} className="min-h-11" onClick={() => setFilter(value)}>{label}</Button>)}</div></div>{message && <p role="status" aria-live="polite" className="mt-3 text-sm text-muted-foreground">{message}</p>}{candidates.length === 0 ? <p className="mt-4 rounded-lg border border-border p-5 text-sm text-muted-foreground">No email updates need review.</p> : <div className="mt-4 grid gap-4">{candidates.map((candidate) => <CandidateCard key={candidate.id} candidate={candidate} busy={busy === candidate.id} onReview={review} />)}</div>}</section>;
}

function CandidateCard({ candidate, busy, onReview }: { candidate: Candidate; busy: boolean; onReview: (candidate: Candidate, decision: Record<string, unknown>) => Promise<void> }) {
  const [status, setStatus] = useState(candidate.proposedStatus ?? 'received');
  const [opportunityId, setOpportunityId] = useState(candidate.matchedOpportunityId ?? candidate.candidates[0]?.opportunityId ?? '');
  const [title, setTitle] = useState(''); const [organizationName, setOrganizationName] = useState('');
  const manual = candidate.classification === 'unmatched' || (candidate.classification === 'ambiguous' && candidate.candidates.length === 0);
  const source = candidate.sourceMode === 'gmail-sync' || candidate.sourceMode === 'autopilot' ? 'Gmail Sync' : 'Forwarding address';
  return <Card><CardContent className="space-y-4 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-foreground">{candidate.sourceMode === 'autopilot' ? 'Updated automatically' : candidate.classification === 'matched' ? 'Possible submission update' : 'We found a possible submission'}</p><p className="mt-1 text-xs text-muted-foreground">{source} · {candidate.senderDomain ? `From ${candidate.senderDomain}` : 'Sender unavailable'} · {candidate.confidence} confidence</p></div><span className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">{candidate.classification}</span></div><div><p className="font-medium text-foreground">{candidate.subject || 'No subject'}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{candidate.bodyExcerpt || 'We are not sure what this email means.'}</p></div>{candidate.evidenceReasons.length > 0 && <p className="text-sm text-muted-foreground">Why it needs review: {candidate.evidenceReasons.join(' ')}</p>}{candidate.warnings.length > 0 && <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">Review warning: {candidate.warnings.join(', ')}.</p>}{candidate.attachmentMetadata.length > 0 && <p className="text-sm text-muted-foreground">Attachments were not imported.</p>}{candidate.candidates.length > 0 && <div className="space-y-2"><Label htmlFor={`${candidate.id}-opportunity`}>Opportunity</Label><select id={`${candidate.id}-opportunity`} className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm" value={opportunityId} onChange={(event) => setOpportunityId(event.target.value)}><option value="">Choose an opportunity</option>{candidate.candidates.map((item) => <option key={item.opportunityId} value={item.opportunityId}>{item.title}{item.organizationName ? ` · ${item.organizationName}` : ''}</option>)}</select></div>}<div className="space-y-2"><Label htmlFor={`${candidate.id}-status`}>Proposed status</Label><select id={`${candidate.id}-status`} className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>{manual && <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor={`${candidate.id}-title`}>Opportunity title</Label><Input id={`${candidate.id}-title`} value={title} onChange={(event) => setTitle(event.target.value)} className="h-11" /></div><div className="space-y-2"><Label htmlFor={`${candidate.id}-org`}>Organization</Label><Input id={`${candidate.id}-org`} value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} className="h-11" /></div></div>}<div className="flex flex-wrap gap-2"><Button className="min-h-11" disabled={busy || (!manual && !opportunityId) || (manual && (!title.trim() || !organizationName.trim()))} onClick={() => void onReview(candidate, manual ? { kind: 'create-manual', title, organizationName, status } : { kind: 'confirm', opportunityId, status })}>{busy ? 'Saving…' : manual ? 'Create private manual entry' : 'Confirm update'}</Button><Button variant="outline" className="min-h-11" disabled={busy} onClick={() => void onReview(candidate, { kind: 'ignore' })}>Ignore</Button><Button variant="ghost" className="min-h-11" disabled={busy} onClick={() => void onReview(candidate, { kind: 'delete' })}>Delete email</Button></div></CardContent></Card>;
}
