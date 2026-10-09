'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { LibraryWork } from '@missa/radar-engine';
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

export function TrackerWorkLink({ userId, opportunityId, workId, workTitle, works }: {
  userId: string;
  opportunityId: string;
  workId?: string;
  workTitle?: string;
  works: LibraryWork[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState(workId ?? '');
  const save = (next: string) => startTransition(async () => {
    const response = next
      ? await fetch(`/api/users/${userId}/tracker/${opportunityId}/work`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ workId: next }) })
      : await fetch(`/api/users/${userId}/tracker/${opportunityId}/work`, { method: 'DELETE' });
    if (!response.ok) { const body = await response.json().catch(() => ({})); toast.error(body.error ?? 'Could not update Work.'); return; }
    toast.success(next ? 'Work linked' : 'Work unlinked');
    router.refresh();
  });
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <label htmlFor={`work-${opportunityId}`} className="sr-only">Work for this submission</label>
      <NativeSelect id={`work-${opportunityId}`} disabled={pending || works.length === 0} value={selected} onChange={(event) => { setSelected(event.target.value); save(event.target.value); }} className="max-w-[18rem]">
        <NativeSelectOption value="">{works.length ? (workTitle ? `Work: ${workTitle}` : 'Link a piece…') : 'Add a piece to Library first'}</NativeSelectOption>
        {works.map((work) => <NativeSelectOption key={work.id} value={work.id}>{work.title}</NativeSelectOption>)}
      </NativeSelect>
      {workId && <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => { setSelected(''); save(''); }}>Clear</Button>}
    </div>
  );
}
