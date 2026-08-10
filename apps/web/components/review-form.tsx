'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/** Story 7.3: fixed small rubric (score 1-10 + notes), not a builder. */
export function ReviewForm({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();
  const [score, setScore] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mt-2 flex flex-wrap items-end gap-2">
      <label htmlFor={`review-score-${assignmentId}`} className="sr-only">
        Recommendation score from 1 to 10
      </label>
      <Input id={`review-score-${assignmentId}`} type="number" min={1} max={10} placeholder="Score (1-10)" value={score} onChange={(e) => setScore(e.target.value)} className="w-32" />
      <label htmlFor={`review-notes-${assignmentId}`} className="sr-only">
        Review notes
      </label>
      <Input id={`review-notes-${assignmentId}`} placeholder="Review notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-64" />
      <Button
        size="sm"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(undefined);
            const response = await fetch(`/api/reviewer/assignments/${assignmentId}/review`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                score: score ? Number(score) : undefined,
                notes: notes || undefined,
              }),
            });
            if (!response.ok) {
              const body = await response.json().catch(() => ({}));
              setError(body.error ?? 'We could not save this recommendation. Check the details and try again.');
              return;
            }
            router.refresh();
          })
        }
      >
        {isPending ? 'Submitting…' : 'Submit recommendation'}
      </Button>
      {error && (
        <p role="alert" className="basis-full text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
