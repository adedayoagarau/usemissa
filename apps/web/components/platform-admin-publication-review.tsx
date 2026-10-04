'use client';

import { ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { PublicationHoldQueueData, PublicationHoldRow } from '@missa/radar-adapters';
import { NumberGrid, SectionHeading } from './platform-admin';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type Decision = 'approved' | 'blocked';

const HOLD_REASON_LABELS: Record<PublicationHoldRow['holdReasons'][number], string> = {
  'held-for-editorial-review': 'Passed every automated check. Waiting for editorial approval.',
  'missing-organization': 'The title is a bare label and no organization is known. Re-reviewed automatically when one is linked.',
  'possible-non-opportunity': 'The title looks like a blog post, newsletter, site page, promotional artist interview, or non-creative program. Suppressed automatically.',
};

function formatDate(value?: string): string | undefined {
  if (!value) return undefined;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(time));
}

export default function PlatformAdminPublicationReview({ queue }: { queue: PublicationHoldQueueData }) {
  const [rows, setRows] = useState(queue.rows);
  const [titles, setTitles] = useState<Record<string, string>>(() => Object.fromEntries(queue.rows.map((row) => [row.jobId, row.proposedTitle])));
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<{ jobId: string; decision: Decision }>();
  const pendingRow = pending ? rows.find((row) => row.jobId === pending.jobId) : undefined;

  async function commit(jobId: string, decision: Decision) {
    setBusy(`${jobId}:${decision}`);
    setErrors((current) => {
      const next = { ...current };
      delete next[jobId];
      return next;
    });
    try {
      const response = await fetch('/api/admin/radar/review', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jobId,
          decision,
          title: decision === 'approved' ? titles[jobId]?.trim() || undefined : undefined,
          note: notes[jobId]?.trim() || undefined,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setErrors((current) => ({ ...current, [jobId]: body.error ?? 'We could not record this decision.' }));
        return;
      }
      setRows((current) => current.filter((row) => row.jobId !== jobId));
      toast.success(decision === 'approved' ? `Published “${body.title ?? titles[jobId]}”.` : 'Blocked. The opportunity will not be published.');
    } catch {
      setErrors((current) => ({ ...current, [jobId]: 'We could not reach the review service. Try again.' }));
    } finally {
      setBusy(undefined);
    }
  }

  return (
    <section aria-labelledby="publication-review-title" aria-busy={Boolean(busy)} className="space-y-4">
      <SectionHeading
        eyebrow="Human review"
        title="Publication review"
        description="Opportunities the review agent held back. Approving publishes the opportunity with the title shown; blocking keeps it off Missa."
      />
      <h2 id="publication-review-title" className="sr-only">Publication review</h2>
      <NumberGrid
        items={[
          { label: 'Waiting', value: queue.summary.total, detail: 'Reviewable opportunities held for a person' },
          { label: 'Ready to approve', value: queue.summary.heldForEditorialReview, detail: 'Passed every automated check' },
          { label: 'Organization missing', value: queue.summary.missingOrganization, detail: 'Bare title with no known organization' },
          { label: 'Possible non-opportunity', value: queue.summary.possibleNonOpportunity, detail: 'Blog, newsletter, site page, or non-creative program' },
        ]}
      />
      {!queue.available ? (
        <Empty variant="bordered">
          <EmptyHeader>
            <EmptyTitle>Publication review is not available</EmptyTitle>
            <EmptyDescription>{queue.warnings[0] ?? 'The review tables are not reachable from this environment.'}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : rows.length === 0 ? (
        <Empty variant="bordered">
          <EmptyHeader>
            <EmptyTitle>Nothing is waiting for review</EmptyTitle>
            <EmptyDescription>Held opportunities appear here after the next review agent run.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card" aria-label="Opportunities waiting for publication review">
          {rows.map((row) => {
            const titleId = `publication-title-${row.jobId}`;
            const noteId = `publication-note-${row.jobId}`;
            const titleDifferent = row.proposedTitle !== row.title;
            const deadline = formatDate(row.deadlineDate);
            return (
              <li key={row.jobId} className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-w-0 space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{row.organizationName ?? 'Organization not known'}</p>
                    <h3 className="mt-1 break-words text-base font-semibold text-foreground">{row.title}</h3>
                    {titleDifferent && (
                      <p className="mt-1 break-words text-sm text-muted-foreground">
                        Will publish as <span className="font-medium text-foreground">{row.proposedTitle}</span>
                      </p>
                    )}
                    {row.rawTitle !== row.title && (
                      <p className="mt-1 break-words text-xs text-muted-foreground">Source title: {row.rawTitle}</p>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">Why it is waiting</h4>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-sm leading-6 text-muted-foreground">
                      {row.holdReasons.map((reason) => <li key={reason}>{HOLD_REASON_LABELS[reason]}</li>)}
                      {row.holdReasons.length === 0 && row.reasons.slice(0, 4).map((reason) => <li key={reason}>{reason}</li>)}
                      {row.holdReasons.length === 0 && row.reasons.length === 0 && <li>The automated review asked for a person.</li>}
                    </ul>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                    <div><dt className="text-muted-foreground">Review score</dt><dd className="mt-1 font-mono text-sm text-foreground">{row.score}/100</dd></div>
                    <div><dt className="text-muted-foreground">Automated checks</dt><dd className="mt-1 text-sm text-foreground">{row.gatesPassed ? 'All passed' : 'Some need repair'}</dd></div>
                    <div><dt className="text-muted-foreground">Deadline</dt><dd className="mt-1 text-sm text-foreground">{deadline ?? 'Not listed'}</dd></div>
                    <div><dt className="text-muted-foreground">Status</dt><dd className="mt-1 text-sm capitalize text-foreground">{row.status.replaceAll('-', ' ')}</dd></div>
                  </dl>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {row.sourceUrl && (
                      <a href={row.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-accent-deep underline decoration-accent-tint underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                        Open source{row.sourceName ? `: ${row.sourceName}` : ''} <ExternalLink className="size-3.5" aria-hidden="true" />
                      </a>
                    )}
                    {row.submissionUrl && (
                      <a href={row.submissionUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-accent-deep underline decoration-accent-tint underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                        Open submission page <ExternalLink className="size-3.5" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </div>
                <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
                  <Field>
                    <FieldLabel htmlFor={titleId}>Published title</FieldLabel>
                    <Input
                      id={titleId}
                      value={titles[row.jobId] ?? ''}
                      maxLength={200}
                      onChange={(event) => setTitles((current) => ({ ...current, [row.jobId]: event.target.value }))}
                      aria-describedby={`${titleId}-help`}
                    />
                    <FieldDescription id={`${titleId}-help`}>
                      {row.needsTitle ? 'Add the organization so the title can stand on its own.' : 'Missa applies the same title cleanup on approval.'}
                    </FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={noteId}>Note (optional)</FieldLabel>
                    <Textarea
                      id={noteId}
                      rows={2}
                      maxLength={500}
                      value={notes[row.jobId] ?? ''}
                      onChange={(event) => setNotes((current) => ({ ...current, [row.jobId]: event.target.value }))}
                    />
                  </Field>
                  {errors[row.jobId] && (
                    <Alert variant="destructive">
                      <AlertTitle>Not recorded</AlertTitle>
                      <AlertDescription>{errors[row.jobId]}</AlertDescription>
                    </Alert>
                  )}
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                    <Button type="button" disabled={Boolean(busy)} aria-busy={busy === `${row.jobId}:approved`} onClick={() => setPending({ jobId: row.jobId, decision: 'approved' })}>
                      {busy === `${row.jobId}:approved` ? 'Publishing…' : 'Approve and publish'}
                    </Button>
                    <Button type="button" variant="outline" disabled={Boolean(busy)} aria-busy={busy === `${row.jobId}:blocked`} onClick={() => setPending({ jobId: row.jobId, decision: 'blocked' })}>
                      {busy === `${row.jobId}:blocked` ? 'Blocking…' : 'Block'}
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog open={Boolean(pendingRow)} onOpenChange={(open) => { if (!open) setPending(undefined); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.decision === 'approved' ? 'Publish this opportunity?' : 'Block this opportunity?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.decision === 'approved'
                ? 'It will appear on Missa with the title below. The database publication checks still run and can stop it.'
                : 'It will not be published, and it leaves this queue.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingRow && (
            <dl className="grid gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <div><dt className="text-xs font-medium text-muted-foreground">Title</dt><dd className="mt-0.5 break-words text-foreground">{pending?.decision === 'approved' ? titles[pendingRow.jobId]?.trim() || pendingRow.proposedTitle : pendingRow.title}</dd></div>
              <div><dt className="text-xs font-medium text-muted-foreground">Organization</dt><dd className="mt-0.5 text-foreground">{pendingRow.organizationName ?? 'Not known'}</dd></div>
              <div><dt className="text-xs font-medium text-muted-foreground">Note</dt><dd className="mt-0.5 break-words text-foreground">{notes[pendingRow.jobId]?.trim() || 'None'}</dd></div>
            </dl>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={pending?.decision === 'blocked' ? 'destructive' : 'default'}
              onClick={() => {
                if (!pending) return;
                const next = pending;
                setPending(undefined);
                void commit(next.jobId, next.decision);
              }}
            >
              {pending?.decision === 'approved' ? 'Publish' : 'Block'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
