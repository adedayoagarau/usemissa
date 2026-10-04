'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

/**
 * The pause switch for every outgoing text. Turning it on stops reminders,
 * verification codes and admin tests until it is turned off again.
 */
export function SmsPauseSwitch({ initialPaused, disabled }: { initialPaused: boolean; disabled?: boolean }) {
  const router = useRouter();
  const [paused, setPaused] = useState(initialPaused);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function change(next: boolean) {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/sms/pause', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ paused: next }),
      });
      const payload = (await response.json().catch(() => ({}))) as { paused?: boolean; error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'The switch could not be saved.');
      setPaused(payload.paused === true);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The switch could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Field orientation="horizontal" data-disabled={disabled || busy ? true : undefined}>
      <Switch id="sms-pause" checked={paused} disabled={disabled || busy} onCheckedChange={(checked) => void change(checked === true)} />
      <FieldContent>
        <FieldLabel htmlFor="sms-pause">Pause all texts</FieldLabel>
        <FieldDescription>
          {paused ? 'Texts are paused. Nothing is sent, including verification codes.' : 'Texts are sending normally.'}
        </FieldDescription>
        {error ? <FieldError>{error}</FieldError> : null}
      </FieldContent>
    </Field>
  );
}

/** Sends one test text through the normal SMS path (pause and daily limit still apply). */
export function SmsTestForm({ disabled }: { disabled?: boolean }) {
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function send() {
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch('/api/admin/sms/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const payload = (await response.json().catch(() => ({}))) as { status?: string; reason?: string; to?: string; error?: string };
      if (payload.status === 'sent') setResult({ ok: true, message: `Test text sent to ${payload.to}. Delivery shows below once Telnyx reports it.` });
      else setResult({ ok: false, message: payload.error ?? payload.reason ?? 'The test text was not sent.' });
    } catch {
      setResult({ ok: false, message: 'The test text was not sent.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void send();
      }}
    >
      <Field data-invalid={result && !result.ok ? true : undefined}>
        <FieldLabel htmlFor="sms-test-phone">Send a test text</FieldLabel>
        <div className="flex flex-wrap gap-3">
          <Input
            id="sms-test-phone"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            placeholder="+44 7700 900123"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            disabled={disabled || busy}
            aria-describedby="sms-test-help"
            className="min-w-0 flex-1"
          />
          <Button type="submit" variant="outline" disabled={disabled || busy || !phone.trim()} aria-busy={busy || undefined}>
            {busy ? 'Sending…' : 'Send test text'}
          </Button>
        </div>
        <FieldDescription id="sms-test-help">Use the full number with its country code. Plus is not required; the pause switch and daily limit still apply.</FieldDescription>
        {result && !result.ok ? <FieldError>{result.message}</FieldError> : null}
      </Field>
      {result?.ok ? <p role="status" className="text-sm text-muted-foreground">{result.message}</p> : null}
    </form>
  );
}
