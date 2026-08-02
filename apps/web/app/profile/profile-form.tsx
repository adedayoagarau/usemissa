'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type ProfileData = {
  id: string;
  displayName: string;
  bio?: string;
  completeness: { complete: boolean; missing: Array<'displayName' | 'bio'> };
  publicUrl: string;
};

export function ProfileForm({ initialProfile }: { initialProfile: ProfileData }) {
  const [displayName, setDisplayName] = useState(initialProfile.displayName);
  const [bio, setBio] = useState(initialProfile.bio ?? '');
  const [profile, setProfile] = useState(initialProfile);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = displayName.trim();
    if (!trimmedName || trimmedName.length > 120) {
      setError('Display name must be between 1 and 120 characters.');
      setMessage(undefined);
      return;
    }
    if (bio.trim().length > 1000) {
      setError('Bio must be 1,000 characters or fewer.');
      setMessage(undefined);
      return;
    }
    setSaving(true);
    setMessage(undefined);
    setError(undefined);
    try {
      const response = await fetch('/api/me/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ displayName, bio }),
      });
      const body = (await response.json().catch(() => ({}))) as Partial<ProfileData> & { error?: string };
      if (!response.ok) {
        setError(body.error ?? 'We could not save your profile. Check your connection and try again.');
        return;
      }
      if (!body.id || !body.completeness || typeof body.displayName !== 'string') {
        setError('We could not read the saved profile. Please try again.');
        return;
      }
      const saved = body as ProfileData;
      setDisplayName(saved.displayName);
      setBio(saved.bio ?? '');
      setProfile(saved);
      setMessage('Profile saved');
    } catch {
      setError('We could not save your profile. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <Card>
        <CardHeader>
          <CardTitle>Profile details</CardTitle>
          <p className="text-sm text-muted-foreground">Share the context organizations need to understand your work.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-6" noValidate>
            <div className="space-y-2">
              <Label htmlFor="display-name">Display name</Label>
              <Input id="display-name" name="displayName" value={displayName} onChange={(event) => setDisplayName(event.target.value)} aria-invalid={Boolean(error && (!displayName.trim() || displayName.length > 120))} aria-describedby="display-name-help" className="h-11" />
              <p id="display-name-help" className="text-xs text-muted-foreground">This is the name visitors will see. Up to 120 characters.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Short bio</Label>
              <Textarea id="bio" name="bio" value={bio} onChange={(event) => setBio(event.target.value)} rows={6} aria-describedby="bio-help" className="min-h-36 resize-y" />
              <p id="bio-help" className="text-xs text-muted-foreground">A few sentences about your practice, interests, or where you are headed. {bio.length}/1,000</p>
            </div>
            {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
            {message && <p role="status" className="flex items-center gap-2 text-sm text-green"><CheckCircle2 className="size-4" aria-hidden="true" />{message}</p>}
            <Button type="submit" disabled={saving} className="min-h-11 px-5">{saving ? 'Saving…' : 'Save changes'}</Button>
          </form>
        </CardContent>
      </Card>

      <aside className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Profile completeness</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {profile.completeness.complete ? <p className="text-sm text-green">Your profile is ready to share.</p> : <><p className="text-sm text-muted-foreground">One small detail helps organizations place your work.</p><p className="text-sm font-medium text-foreground">Add a short bio</p></>}
            <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={2} aria-valuenow={profile.completeness.complete ? 2 : displayName.trim() ? 1 : 0} aria-label="Profile completeness"><div className="h-full bg-primary transition-[width]" style={{ width: `${profile.completeness.complete ? 100 : displayName.trim() ? 50 : 0}%` }} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Link className="inline-flex min-h-11 w-full items-center justify-between rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={profile.publicUrl}>View public profile <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
