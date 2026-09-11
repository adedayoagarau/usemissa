'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MissaWordmark } from '@/components/missa-wordmark';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-lg font-medium text-foreground">Missing reset token</h2>
        <p className="text-sm text-muted-foreground">
          This password reset link is invalid or incomplete. Please request a new link.
        </p>
        <Link
          href="/forgot-password"
          className="inline-block py-2.5 px-4 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          Request new reset link
        </Link>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token, password }),
        });

        const body = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!response.ok || !body.ok) {
          setError(body.error || 'Failed to reset password. Link may be expired.');
          return;
        }

        setSuccess(true);
      } catch {
        setError('A network error occurred. Please try again.');
      }
    });
  };

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-2">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-medium text-foreground">Password updated</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your password has been successfully reset. You can now log in with your new credentials.
        </p>
        <div className="pt-4">
          <Link
            href="/login"
            className="inline-block w-full text-center py-2.5 px-4 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            Log in to Missa
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 text-sm rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
          New password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          className="h-11"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1.5">
          Confirm new password
        </label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repeat your new password"
          className="h-11"
        />
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
      >
        {isPending ? 'Updating password…' : 'Set new password'}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <Link href="/" aria-label="Missa home">
            <MissaWordmark className="h-6 w-auto text-foreground" />
          </Link>
        </div>
        <h1 className="text-center text-2xl font-serif font-medium text-foreground">
          Choose a new password
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground max-w-xs mx-auto">
          Ensure your password is at least 8 characters long and not easily guessed.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-card py-8 px-6 sm:px-10 border border-border rounded-xl shadow-sm">
          <Suspense fallback={<div className="text-center text-sm text-muted-foreground">Loading…</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
