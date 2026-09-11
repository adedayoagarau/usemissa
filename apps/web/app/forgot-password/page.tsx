'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MissaWordmark } from '@/components/missa-wordmark';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) return;

    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: email.trim() }),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          setError(body.error || 'Unable to process your request. Please try again.');
          return;
        }

        setSubmitted(true);
      } catch {
        setError('A network error occurred. Please check your connection.');
      }
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <Link href="/" aria-label="Missa home">
            <MissaWordmark className="h-6 w-auto text-foreground" />
          </Link>
        </div>
        <h1 className="text-center text-2xl font-serif font-medium text-foreground">
          Reset your password
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground max-w-xs mx-auto">
          Enter your account email and we will send you a secure link to reset your password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-card py-8 px-6 sm:px-10 border border-border rounded-xl shadow-sm">
          {submitted ? (
            <div className="space-y-4 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-2">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-medium text-foreground">Check your inbox</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                If an account matches <span className="font-medium text-foreground">{email}</span>, you will receive an email with instructions to reset your password within the next few minutes.
              </p>
              <div className="pt-4">
                <Link
                  href="/login"
                  className="inline-block w-full text-center py-2.5 px-4 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
                >
                  Return to log in
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 text-sm rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                  Email address
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-11"
                />
              </div>

              <Button
                type="submit"
                disabled={isPending}
                className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
              >
                {isPending ? 'Sending link…' : 'Send reset link'}
              </Button>

              <div className="text-center pt-2">
                <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
                  Remember your password? Log in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
