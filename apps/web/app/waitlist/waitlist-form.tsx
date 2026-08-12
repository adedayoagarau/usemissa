'use client';

import { ArrowRight, Check } from 'lucide-react';
import { useRef, useState } from 'react';
import { browserAttributionProperties, recordPublicAnalyticsEvent } from '@/components/analytics-provider';
import styles from './waitlist.module.css';

export function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const hasStarted = useRef(false);

  function markFormStarted() {
    if (hasStarted.current) return;
    hasStarted.current = true;
    recordPublicAnalyticsEvent('public.waitlist_form_started');
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    markFormStarted();
    recordPublicAnalyticsEvent('public.waitlist_submit_attempted');
    setStatus('pending');
    setMessage('');

    try {
      const campaign = browserAttributionProperties();
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, website: '', source: '/waitlist', campaign }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus('error');
        setMessage(body.error ?? 'We could not save your place. Please try again.');
        recordPublicAnalyticsEvent('public.waitlist_join_failed', { reason: response.status >= 500 ? 'unavailable' : response.status === 429 ? 'rate_limited' : 'rejected' });
        return;
      }
      setStatus('success');
      setMessage('You’re on the list. We’ll let you know when Missa is ready for you.');
    } catch {
      setStatus('error');
      setMessage('We could not save your place. Please try again.');
      recordPublicAnalyticsEvent('public.waitlist_join_failed', { reason: 'network' });
    }
  }

  if (status === 'success') {
    return (
      <div className={styles.confirmation} role="status" aria-live="polite">
        <span className={styles.confirmationIcon}><Check aria-hidden="true" size={18} /></span>
        <p>{message}</p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <label className={styles.srOnly} htmlFor="waitlist-email">Email address</label>
      <input
        id="waitlist-email"
        name="email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        autoComplete="email"
        required
        maxLength={320}
        aria-describedby={status === 'error' ? 'waitlist-message' : undefined}
        aria-invalid={status === 'error' || undefined}
        onFocus={markFormStarted}
      />
      <input className={styles.honeypot} name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <button type="submit" disabled={status === 'pending'} onClick={() => recordPublicAnalyticsEvent('public.waitlist_cta_clicked')}>
        <span>{status === 'pending' ? 'Joining…' : 'Join the waitlist'}</span>
        <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
      </button>
      {status === 'error' && <p className={styles.error} id="waitlist-message" role="alert">{message}</p>}
    </form>
  );
}
