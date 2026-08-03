'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Member {
  accountId: string;
  email: string;
  role: string;
}

interface Work {
  id: string;
  title: string;
  fileUrl?: string;
  fileUrls?: string[];
}
interface Decision { id: string; workId: string; outcome: 'accepted' | 'declined' | 'waitlisted'; decidedAt: string }
interface DeliveryTask { id: string; workId: string; status: 'pending' | 'complete'; dueDate?: string; completedAt?: string }

interface ReviewAssignment {
  id: string;
  reviewerAccountId: string;
  completedAt?: string;
  recommendation?: { score?: number; notes?: string };
}

/**
 * Story 7.1/7.2: an expandable row for the admin Submissions inbox. Clicking
 * loads Works + existing review assignments (Story 7.1's AC); the assign
 * form covers Story 7.2. This is a simpler per-item action set than the UX
 * spec's "bulk-action toolbar per column" -- that's a real simplification,
 * not a hidden gap (documented in the story file).
 */
export function SubmissionCard({
  organizationId,
  submission,
  members,
}: {
  organizationId: string;
  submission: { id: string; status: string; submittedAt: string; openCallId: string; openCallTitle: string };
  members: Member[];
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [works, setWorks] = useState<Work[] | null>(null);
  const [assignments, setAssignments] = useState<ReviewAssignment[] | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [deliveryTasks, setDeliveryTasks] = useState<DeliveryTask[]>([]);
  const [reviewerId, setReviewerId] = useState(members[0]?.accountId ?? '');
  const [roundName, setRoundName] = useState('Round 1');
  const [isPending, startTransition] = useTransition();

  const load = () => {
    startTransition(async () => {
      const res = await fetch(`/api/orgs/${organizationId}/submissions/${submission.id}`);
      const data = await res.json();
      setWorks(data.works);
      setAssignments(data.reviewAssignments);
      setDecisions(data.decisions ?? []);
      setDeliveryTasks(data.deliveryTasks ?? []);
    });
  };

  const decide = (workId: string, outcome: string) => {
    if (!outcome) return;
    startTransition(async () => {
      const res = await fetch(`/api/orgs/${organizationId}/works/${workId}/decision`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ outcome }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      setDecisions((current) => [...current.filter((decision) => decision.workId !== workId), data]);
      router.refresh();
    });
  };

  const createDelivery = (workId: string) => startTransition(async () => { const res = await fetch(`/api/orgs/${organizationId}/works/${workId}/delivery-tasks`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) }); const task = await res.json().catch(() => null); if (!res.ok) return; setDeliveryTasks((current) => current.some((item) => item.id === task.id) ? current : [...current, task]); });
  const toggleDelivery = (task: DeliveryTask) => startTransition(async () => { const res = await fetch(`/api/orgs/${organizationId}/delivery-tasks/${task.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: task.status === 'complete' ? 'pending' : 'complete' }) }); const updated = await res.json().catch(() => null); if (!res.ok) return; setDeliveryTasks((current) => current.map((item) => item.id === task.id ? updated : item)); });

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !works) load();
  };

  const assign = () => {
    if (!reviewerId) return;
    startTransition(async () => {
      // Reuse an existing round with this name (so "an admin can ... add
      // additional reviewers to the same round" per the AC) rather than
      // creating a new round on every assignment.
      const existingRounds = await (await fetch(`/api/orgs/${organizationId}/open-calls/${submission.openCallId}/review-rounds`)).json();
      const round =
        existingRounds.find((r: { name: string }) => r.name === roundName) ??
        (await (
          await fetch(`/api/orgs/${organizationId}/open-calls/${submission.openCallId}/review-rounds`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: roundName }),
          })
        ).json());
      await fetch(`/api/orgs/${organizationId}/review-rounds/${round.id}/assign`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ submissionId: submission.id, reviewerAccountId: reviewerId }),
      });
      load();
      router.refresh();
    });
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <button type="button" onClick={toggle} className="flex w-full items-center justify-between text-left">
        <div>
          <p className="font-heading text-base font-medium text-foreground">{submission.openCallTitle}</p>
          <p className="text-sm text-muted-foreground">
            submitted <span className="font-mono">{submission.submittedAt.slice(0, 10)}</span>
          </p>
        </div>
        <span className="text-xs text-muted-foreground">{expanded ? 'hide' : 'view'}</span>
      </button>

      {expanded && (
        <div className="mt-3 border-t border-border pt-3">
          {isPending && !works ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Works</p>
              <ul className="mt-1 space-y-1 text-sm">
                {works?.map((w) => (
                  <li key={w.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span>{w.title}{(w.fileUrls?.length ?? (w.fileUrl ? 1 : 0)) > 0 && <span className="ml-2 inline-flex gap-2 text-xs text-primary">{(w.fileUrls ?? (w.fileUrl ? [w.fileUrl] : [])).map((_, index) => <a key={index} className="underline" href={`/api/orgs/${organizationId}/works/${w.id}/file?index=${index}`} target="_blank" rel="noreferrer">file {index + 1}</a>)}</span>}</span>
                    <select aria-label={`Decision for ${w.title}`} value={decisions.find((decision) => decision.workId === w.id)?.outcome ?? ''} onChange={(event) => decide(w.id, event.target.value)} disabled={isPending} className="min-h-11 rounded-md border border-input bg-white px-2 text-xs">
                      <option value="">Record decision</option><option value="accepted">Accepted</option><option value="declined">Declined</option><option value="waitlisted">Waitlisted</option>
                    </select>
                    {decisions.find((decision) => decision.workId === w.id)?.outcome === 'accepted' && (() => { const task = deliveryTasks.find((item) => item.workId === w.id); return task ? <button type="button" onClick={() => toggleDelivery(task)} className="min-h-11 rounded-md border border-border px-2 text-xs">{task.status === 'complete' ? 'Delivery complete' : 'Mark delivery complete'}</button> : <button type="button" onClick={() => createDelivery(w.id)} className="min-h-11 rounded-md border border-border px-2 text-xs">Create delivery task</button>; })()}
                  </li>
                ))}
              </ul>

              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reviewers</p>
              <ul className="mt-1 space-y-1 text-sm">
                {assignments?.map((a) => (
                  <li key={a.id}>
                    {members.find((m) => m.accountId === a.reviewerAccountId)?.email ?? a.reviewerAccountId}
                    {a.recommendation ? (
                      <span className="ml-2 text-xs text-[var(--green)]">
                        reviewed — score {a.recommendation.score ?? '—'}
                      </span>
                    ) : (
                      <span className="ml-2 text-xs text-muted-foreground">pending</span>
                    )}
                  </li>
                ))}
                {assignments?.length === 0 && <li className="text-muted-foreground">No reviewers assigned yet.</li>}
              </ul>

              {members.length > 0 ? (
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <Select value={reviewerId} onValueChange={(v) => v && setReviewerId(v)}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.accountId} value={m.accountId}>
                          {m.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input
                    className="w-32 rounded-md border border-input bg-transparent px-2 py-1.5 text-sm"
                    value={roundName}
                    onChange={(e) => setRoundName(e.target.value)}
                    placeholder="Round name"
                  />
                  <Button size="sm" disabled={isPending} onClick={assign}>
                    Assign reviewer
                  </Button>
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">Invite another team member to assign reviewers.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
