'use client';

import { ArrowRight, Check } from 'lucide-react';
import { useState } from 'react';
import styles from './waitlist.module.css';

export function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('pending');
    setMessage('');

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, website: '', source: '/waitlist' }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus('error');
        setMessage(body.error ?? 'We could not save your place. Please try again.');
        return;
      }
      setStatus('success');
      setMessage('You’re on the list. We’ll let you know when Missa is ready for you.');
    } catch {
      setStatus('error');
      setMessage('We could not save your place. Please try again.');
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
      />
      <input className={styles.honeypot} name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <button type="submit" disabled={status === 'pending'}>
        <span>{status === 'pending' ? 'Joining…' : 'Join the waitlist'}</span>
        <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
      </button>
      {status === 'error' && <p className={styles.error} id="waitlist-message" role="alert">{message}</p>}
    </form>
  );
}
