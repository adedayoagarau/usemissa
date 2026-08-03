'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function WithdrawSubmissionButton({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const withdraw = async () => {
    if (!window.confirm('Withdraw this submission? The organization will no longer review it.')) return;
    setBusy(true);
    const response = await fetch(`/api/me/submissions/${submissionId}/withdraw`, { method: 'POST' });
    setBusy(false);
    if (response.ok) router.refresh();
  };
  return <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => void withdraw()}>{busy ? 'Withdrawing…' : 'Withdraw submission'}</Button>;
}
