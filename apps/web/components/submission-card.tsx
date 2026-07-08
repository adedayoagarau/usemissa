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
}

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
  const [reviewerId, setReviewerId] = useState(members[0]?.accountId ?? '');
  const [roundName, setRoundName] = useState('Round 1');
  const [isPending, startTransition] = useTransition();

  const load = () => {
    startTransition(async () => {
      const res = await fetch(`/api/orgs/${organizationId}/submissions/${submission.id}`);
      const data = await res.json();
      setWorks(data.works);
      setAssignments(data.reviewAssignments);
    });
  };

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
                  <li key={w.id}>
                    {w.title}
                    {w.fileUrl && <span className="ml-2 text-xs text-primary">file attached</span>}
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
