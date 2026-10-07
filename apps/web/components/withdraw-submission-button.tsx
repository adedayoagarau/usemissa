'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

/** Withdraws a whole submission after a confirmation that says what it does. */
export function WithdrawSubmissionButton({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const withdraw = async () => {
    setBusy(true);
    setError('');
    const response = await fetch(`/api/me/submissions/${submissionId}/withdraw`, { method: 'POST' });
    setBusy(false);
    setOpen(false);
    if (response.ok) {
      router.refresh();
      return;
    }
    const payload = await response.json().catch(() => ({})) as { error?: string };
    setError(payload.error ?? 'This submission could not be withdrawn. Nothing changed.');
  };
  return (
    <>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger render={<Button type="button" variant="destructive" size="sm" disabled={busy} />}>{busy ? 'Withdrawing…' : 'Withdraw submission'}</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw this submission?</AlertDialogTitle>
            <AlertDialogDescription>The organization won’t read or decide on any piece in it. This can’t be undone; to be considered again you would submit again.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <Button type="button" variant="destructive" onClick={() => void withdraw()} disabled={busy}>{busy ? 'Withdrawing…' : 'Withdraw submission'}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </>
  );
}
