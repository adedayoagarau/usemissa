'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/** Story 2.1: the real sign-up/log-in form, replacing the Story 1.2
 * placeholder. Calls the same /api/auth/login and /api/auth/signup
 * endpoints that were built ahead of schedule in Epic 3/6 as test
 * infrastructure -- those routes don't change for this story. */
export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const body =
      mode === 'login'
        ? { email: fd.get('email'), password: fd.get('password') }
        : { email: fd.get('email'), password: fd.get('password'), displayName: fd.get('displayName') };

    startTransition(async () => {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `${mode === 'login' ? 'Log in' : 'Sign up'} failed`);
        return;
      }
      router.push('/opportunities');
      router.refresh();
    });
  };

  return (
    <Card className="mx-auto mt-16 max-w-sm">
      <CardHeader>
        <CardTitle className="text-center">
          <span className="text-[var(--brand-accent)]">Missa</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          {mode === 'signup' && (
            <div>
              <Label htmlFor="displayName">Name</Label>
              <Input id="displayName" name="displayName" autoComplete="name" required />
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="username" required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={mode === 'signup' ? 8 : undefined}
              required
            />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? '…' : mode === 'login' ? 'Log in' : 'Sign up'}
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </form>
        <div className="mt-3 text-center text-sm text-muted-foreground">
          {mode === 'login' ? (
            <button type="button" className="text-primary" onClick={() => setMode('signup')}>
              Need an account? Sign up
            </button>
          ) : (
            <button type="button" className="text-primary" onClick={() => setMode('login')}>
              Already have an account? Log in
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
