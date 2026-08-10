'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function WithdrawSubmissionButton({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const withdraw = async () => {
    if (!window.confirm('Withdraw this complete submission? The Organization will no longer review any Work in it.')) return;
    setBusy(true);
    setError('');
    const response = await fetch(`/api/me/submissions/${submissionId}/withdraw`, { method: 'POST' });
    setBusy(false);
    if (response.ok) {
      router.refresh();
      return;
    }
    const payload = await response.json().catch(() => ({})) as { error?: string };
    setError(payload.error ?? 'This submission could not be withdrawn. Nothing changed.');
  };
  return <><Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => void withdraw()}>{busy ? 'Withdrawing…' : 'Withdraw complete submission'}</Button>{error ? <p role="alert" className="mt-2 text-sm text-destructive">{error}</p> : null}</>;
}
