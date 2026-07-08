'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STATUSES, STATUS_LABELS } from '@/lib/statusLabels';
import type { MyStatus } from '@missa/radar-engine';

export function StatusSelect({ userId, opportunityId, value }: { userId: string; opportunityId: string; value: MyStatus }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      disabled={isPending}
      value={value}
      onValueChange={(next) => {
        startTransition(async () => {
          await fetch(`/api/users/${userId}/status`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ opportunityId, status: next }),
          });
          toast.success('Status updated');
          router.refresh();
        });
      }}
    >
      <SelectTrigger className="w-[160px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {STATUS_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
