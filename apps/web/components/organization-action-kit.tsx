'use client';

import { useState, useTransition } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';

/**
 * Shared state for one Organization action: a pending flag for the button,
 * and a recoverable error that keeps the dialog and its input in place.
 * `action` resolves with an error message, or nothing on success.
 */
export function useOrganizationAction() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  function run(action: () => Promise<string | void>) {
    setError('');
    startTransition(async () => {
      const failure = await action();
      if (failure) setError(failure);
    });
  }
  return { pending, error, setError, run };
}

/** Policy `feedback.local-recoverable`: the request failed and nothing changed. */
export function OrganizationActionError({ message, title = 'Nothing changed' }: { message: string; title?: string }) {
  if (!message) return null;
  return (
    <Alert variant="destructive">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

/** Button label with policy `loading.indeterminate`: a spinner plus status text. */
export function PendingLabel({ pending, idle, busy }: { pending: boolean; idle: React.ReactNode; busy: string }) {
  if (!pending) return <>{idle}</>;
  return (
    <>
      <Spinner aria-hidden="true" />
      {busy}
    </>
  );
}
