'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CircleAlert, MailCheck, RotateCw } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import styles from './email-review-queue.module.css';

type Candidate = {
  id: string;
  classification: string;
  state: string;
  sourceMode?: 'forwarding' | 'gmail-sync' | 'autopilot';
  senderDomain?: string;
  subject: string;
  bodyExcerpt: string;
  matchedOpportunityId?: string;
  candidates: Array<{ opportunityId: string; title: string; organizationName?: string }>;
  proposedStatus?: string;
  warnings: string[];
  attachmentMetadata: Array<{ filename: string; unsafe: boolean }>;
  revision?: number;
};

type QueueMode = 'summary' | 'desk';
type SourceFilter = 'all' | 'gmail' | 'forwarding';

const statuses = [
  ['saved', 'Saved'],
  ['preparing', 'Preparing'],
  ['submitted', 'Submitted'],
  ['received', 'Received'],
  ['in-review', 'In review'],
  ['shortlisted', 'Shortlisted'],
  ['finalist', 'Finalist'],
  ['accepted', 'Accepted'],
  ['declined', 'Declined'],
  ['waitlisted', 'Waitlisted'],
  ['revision-requested', 'Revision requested'],
  ['withdrawn', 'Withdrawn'],
] as const;

function sourceLabel(candidate: Candidate): string {
  return candidate.sourceMode === 'gmail-sync' || candidate.sourceMode === 'autopilot' ? 'Gmail' : 'Forwarded email';
}

function reviewPrompt(candidate: Candidate): string {
  if (candidate.candidates.length > 1) return 'Choose the related Tracker record.';
  if (candidate.candidates.length === 1) return 'Confirm the related Tracker record and status.';
  return 'Choose whether to keep this as a private manual record.';
}

export function EmailReviewQueue({ mode = 'desk', onOpenDesk }: { mode?: QueueMode; onOpenDesk?: () => void }) {
  const [filter, setFilter] = useState<SourceFilter>('all');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedId, setSelectedId] = useState<string>();
  const [mobileDetail, setMobileDetail] = useState(false);
  const [busy, setBusy] = useState<string>();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const query = filter === 'gmail' ? '&source=gmail' : filter === 'forwarding' ? '&source=forwarding' : '';
    fetch(`/api/me/email-candidates?state=pending${query}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('load-failed');
        return response.json() as Promise<{ candidates: Candidate[]; pendingCount: number }>;
      })
      .then((body) => {
        setCandidates(body.candidates);
        setPendingCount(body.pendingCount);
        setSelectedId((current) => body.candidates.some((candidate) => candidate.id === current) ? current : body.candidates[0]?.id);
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof DOMException && loadError.name === 'AbortError') return;
        setError('We could not load email updates. Your Tracker is unchanged.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [filter, reloadKey]);

  async function review(candidate: Candidate, decision: Record<string, unknown>) {
    setBusy(candidate.id);
    setMessage('');
    try {
      const idempotencyKey = `${candidate.id}:${crypto.randomUUID()}`;
      const response = await fetch(`/api/me/email-candidates/${candidate.id}/review`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(candidate.revision ? { 'Idempotency-Key': idempotencyKey } : {}) },
        body: JSON.stringify({ ...decision, idempotencyKey, ...(candidate.revision ? { expectedRevision: candidate.revision } : {}) }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) {
        setMessage(body.error ?? 'We could not apply that decision. Your Tracker is unchanged.');
        return;
      }
      const remaining = candidates.filter((row) => row.id !== candidate.id);
      setCandidates(remaining);
      setSelectedId(remaining[0]?.id);
      setMobileDetail(false);
      setPendingCount((count) => Math.max(0, count - 1));
      setMessage(decision.kind === 'ignore' ? 'Email update ignored. Tracker was not changed.' : decision.kind === 'delete' ? 'Saved excerpt deleted.' : 'Tracker update confirmed.');
    } catch {
      setMessage('We could not apply that decision. Your Tracker is unchanged.');
    } finally {
      setBusy(undefined);
    }
  }

  if (mode === 'summary') {
    return (
      <aside className={styles.summary} aria-label="Email updates to review">
        <span className={styles.summaryIcon}><MailCheck aria-hidden="true" /></span>
        <div>
          <p>Email review</p>
          <h3>{loading ? 'Checking for saved email updates…' : error ? 'Email review is unavailable' : pendingCount ? `${pendingCount} ${pendingCount === 1 ? 'update needs' : 'updates need'} review` : 'No email updates need review'}</h3>
          <span>{error ? 'Your Tracker has not changed.' : pendingCount ? 'Nothing changes in Tracker until you decide.' : 'Forwarded and Gmail updates will wait here for you.'}</span>
        </div>
        {pendingCount && !error ? <Button type="button" variant="outline" onClick={onOpenDesk}>Review <ArrowRight aria-hidden="true" /></Button> : null}
      </aside>
    );
  }

  const selected = candidates.find((candidate) => candidate.id === selectedId) ?? candidates[0];

  return (
    <section className={styles.desk} aria-labelledby="email-review-heading" data-mobile-detail={mobileDetail}>
      <header className={styles.heading}>
        <div><p>Private email evidence</p><h2 id="email-review-heading">Email review</h2><span>Review the related Opportunity and status before anything changes in Tracker.</span></div>
        <span>{pendingCount} pending</span>
      </header>
      <div className={styles.filters} role="group" aria-label="Email review source">
        {([['all', 'All'], ['gmail', 'Gmail'], ['forwarding', 'Forwarded']] as const).map(([value, label]) => (
          <button key={value} type="button" aria-pressed={filter === value} onClick={() => { setLoading(true); setError(''); setFilter(value); setMobileDetail(false); }}>{label}</button>
        ))}
      </div>
      {message ? <p className={styles.status} role="status" aria-live="polite">{message}</p> : null}
      {error ? (
        <Alert variant="destructive" className={styles.error}>
          <CircleAlert aria-hidden="true" />
          <AlertTitle>Email review is unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button type="button" variant="outline" onClick={() => { setLoading(true); setError(''); setReloadKey((value) => value + 1); }}><RotateCw aria-hidden="true" />Try again</Button>
        </Alert>
      ) : loading ? (
        <p className={styles.loading} role="status">Loading email updates…</p>
      ) : !candidates.length ? (
        <section className={styles.empty}><MailCheck aria-hidden="true" /><h3>No email updates need review</h3><p>Possible submission updates from Gmail or your forwarding address will wait here until you decide.</p></section>
      ) : (
        <div className={styles.columns}>
          <section className={styles.list} aria-label="Email updates">
            {candidates.map((candidate) => (
              <button key={candidate.id} type="button" data-active={candidate.id === selected?.id} onClick={() => { setSelectedId(candidate.id); setMobileDetail(true); }}>
                <MailCheck aria-hidden="true" />
                <span><small>{sourceLabel(candidate)}{candidate.senderDomain ? ` · ${candidate.senderDomain}` : ''}</small><strong>{candidate.subject || 'Email without a subject'}</strong><span>{reviewPrompt(candidate)}</span></span>
              </button>
            ))}
          </section>
          {selected ? <CandidateReview key={selected.id} candidate={selected} busy={busy === selected.id} onBack={() => setMobileDetail(false)} onReview={review} /> : null}
        </div>
      )}
    </section>
  );
}

function CandidateReview({ candidate, busy, onBack, onReview }: { candidate: Candidate; busy: boolean; onBack: () => void; onReview: (candidate: Candidate, decision: Record<string, unknown>) => Promise<void> }) {
  const initialOpportunityId = useMemo(() => candidate.matchedOpportunityId ?? candidate.candidates[0]?.opportunityId ?? '', [candidate]);
  const [status, setStatus] = useState(candidate.proposedStatus ?? 'received');
  const [opportunityId, setOpportunityId] = useState(initialOpportunityId);
  const [title, setTitle] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const manual = candidate.candidates.length === 0;

  return (
    <section className={styles.review} aria-label={`Review ${candidate.subject || 'email update'}`}>
      <Button type="button" variant="ghost" className={styles.back} onClick={onBack}><ArrowLeft aria-hidden="true" />Back to email updates</Button>
      <p className={styles.eyebrow}>{reviewPrompt(candidate)}</p>
      <h3>{candidate.subject || 'Email without a subject'}</h3>
      <p className={styles.source}>{sourceLabel(candidate)}{candidate.senderDomain ? ` · from ${candidate.senderDomain}` : ''}</p>
      <blockquote>{candidate.bodyExcerpt || 'This email did not contain a readable text excerpt.'}</blockquote>
      {candidate.warnings.length ? <Alert><CircleAlert aria-hidden="true" /><AlertTitle>Review this carefully</AlertTitle><AlertDescription>Missa will not update Tracker until you confirm the correct record and status.</AlertDescription></Alert> : null}
      {candidate.attachmentMetadata.length ? <p className={styles.attachment}>Attachments were not imported. Only this private text excerpt is available for review.</p> : null}
      <div className={styles.fields}>
        {candidate.candidates.length ? (
          <div><Label htmlFor={`${candidate.id}-opportunity`}>Related Tracker record</Label><select id={`${candidate.id}-opportunity`} value={opportunityId} onChange={(event) => setOpportunityId(event.target.value)}><option value="">Choose an opportunity</option>{candidate.candidates.map((item) => <option key={item.opportunityId} value={item.opportunityId}>{item.title}{item.organizationName ? ` · ${item.organizationName}` : ''}</option>)}</select></div>
        ) : (
          <div className={styles.manualFields}><div><Label htmlFor={`${candidate.id}-title`}>Opportunity title</Label><Input id={`${candidate.id}-title`} value={title} onChange={(event) => setTitle(event.target.value)} /></div><div><Label htmlFor={`${candidate.id}-org`}>Organization</Label><Input id={`${candidate.id}-org`} value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} /></div></div>
        )}
        <div><Label htmlFor={`${candidate.id}-status`}>What does the email say?</Label><select id={`${candidate.id}-status`} value={status} onChange={(event) => setStatus(event.target.value)}>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      </div>
      <p className={styles.consequence}><strong>What will happen</strong>{manual ? 'Missa will create a private Tracker record from the details above. The Opportunity catalogue and your Work remain unchanged.' : 'Missa will update only this private Tracker record. The Opportunity catalogue and your Work remain unchanged.'}</p>
      <div className={styles.actions}>
        <Button type="button" disabled={busy || (!manual && !opportunityId) || (manual && (!title.trim() || !organizationName.trim()))} onClick={() => void onReview(candidate, manual ? { kind: 'create-manual', title, organizationName, status } : { kind: 'confirm', opportunityId, status })}>{busy ? 'Saving…' : manual ? 'Create private record' : 'Confirm update'}</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => void onReview(candidate, { kind: 'ignore' })}>Ignore update</Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={() => void onReview(candidate, { kind: 'delete' })}>Delete saved excerpt</Button>
      </div>
    </section>
  );
}
