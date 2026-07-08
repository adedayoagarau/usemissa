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
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mt-2 flex flex-wrap items-end gap-2">
      <Input
        type="number"
        min={1}
        max={10}
        placeholder="Score (1-10)"
        value={score}
        onChange={(e) => setScore(e.target.value)}
        className="w-32"
      />
      <Input placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-64" />
      <Button
        size="sm"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await fetch(`/api/reviewer/assignments/${assignmentId}/review`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ score: score ? Number(score) : undefined, notes: notes || undefined }),
            });
            router.refresh();
          })
        }
      >
        Submit recommendation
      </Button>
    </div>
  );
}
