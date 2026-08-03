'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ExportButtons } from './export-buttons';

type PrivacySettings = { displayName: 'public' | 'private'; bio: 'public' | 'private'; trackedOpportunityCount: 'public' | 'private' };

type ProfileData = {
  id: string;
  displayName: string;
  bio?: string;
  completeness: { complete: boolean; missing: Array<'displayName' | 'bio'> };
  publicUrl: string;
  privacy: PrivacySettings;
};

export function ProfileForm({ initialProfile }: { initialProfile: ProfileData }) {
  const [displayName, setDisplayName] = useState(initialProfile.displayName);
  const [bio, setBio] = useState(initialProfile.bio ?? '');
  const [profile, setProfile] = useState(initialProfile);
  const [privacy, setPrivacy] = useState<PrivacySettings>(initialProfile.privacy);
  const [savedPrivacy, setSavedPrivacy] = useState<PrivacySettings>(initialProfile.privacy);
  const [saving, setSaving] = useState(false);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [privacyMessage, setPrivacyMessage] = useState<string>();
  const [privacyError, setPrivacyError] = useState<string>();

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

  async function savePrivacy() {
    setPrivacySaving(true);
    setPrivacyMessage(undefined);
    setPrivacyError(undefined);
    try {
      const response = await fetch('/api/me/profile/privacy', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(privacy) });
      const body = (await response.json().catch(() => ({}))) as { settings?: PrivacySettings; error?: string };
      if (!response.ok || !body.settings) {
        setPrivacyError(body.error ?? 'We could not save your privacy settings. Check your connection and try again.');
        return;
      }
      setPrivacy(body.settings);
      setSavedPrivacy(body.settings);
      setPrivacyMessage('Privacy settings saved');
    } catch {
      setPrivacyError('We could not save your privacy settings. Check your connection and try again.');
    } finally {
      setPrivacySaving(false);
    }
  }

  function setVisibility(field: keyof PrivacySettings, isPublic: boolean) {
    setPrivacy((current) => ({ ...current, [field]: isPublic ? 'public' : 'private' }));
    setPrivacyMessage(undefined);
    setPrivacyError(undefined);
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
        <Card>
          <CardHeader><CardTitle>Privacy</CardTitle><p className="text-sm text-muted-foreground">Choose what visitors can see on your public profile.</p></CardHeader>
          <CardContent className="space-y-1">
            <PrivacyRow label="Display name" description="Your name helps visitors recognize your profile." value={privacy.displayName} onChange={(checked) => setVisibility('displayName', checked)} />
            <PrivacyRow label="Short bio" description="Share context about your practice with visitors." value={privacy.bio} onChange={(checked) => setVisibility('bio', checked)} />
            <PrivacyRow label="Tracked opportunity count" description="Shows only how many opportunities you track—not which ones." value={privacy.trackedOpportunityCount} onChange={(checked) => setVisibility('trackedOpportunityCount', checked)} />
            {privacy.displayName === 'private' && <p className="mt-4 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">Visitors will not see your name on your public profile.</p>}
            {privacyError && <p role="alert" className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{privacyError}</p>}
            {privacyMessage && <p role="status" className="mt-4 flex items-center gap-2 text-sm text-green"><CheckCircle2 className="size-4" aria-hidden="true" />{privacyMessage}</p>}
            <div className="mt-5 flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={privacySaving} onClick={savePrivacy} className="min-h-11">{privacySaving ? 'Saving…' : 'Save privacy settings'}</Button>{JSON.stringify(privacy) !== JSON.stringify(savedPrivacy) && <Button type="button" variant="ghost" disabled={privacySaving} onClick={() => { setPrivacy(savedPrivacy); setPrivacyError(undefined); setPrivacyMessage(undefined); }} className="min-h-11">Restore saved settings</Button>}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Your data</CardTitle></CardHeader>
          <CardContent><ExportButtons /><Link href="/import" className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">Import tracker</Link></CardContent>
        </Card>
      </aside>
    </div>
  );
}

function PrivacyRow({ label, description, value, onChange }: { label: string; description: string; value: 'public' | 'private'; onChange: (checked: boolean) => void }) {
  const controlLabel = `Make ${label.toLowerCase()} ${value === 'public' ? 'private' : 'public'}`;
  return <div className="flex items-start justify-between gap-4 border-b border-border py-4 last:border-b-0"><div className="min-w-0"><p className="text-sm font-medium text-foreground">{label}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p><p className="mt-1 text-xs font-medium text-foreground">{value === 'public' ? 'Public' : 'Private'}</p></div><button type="button" role="switch" aria-checked={value === 'public'} onClick={() => onChange(value !== 'public')} className={`relative mt-1 inline-flex min-h-11 min-w-11 shrink-0 items-center rounded-full border p-1 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${value === 'public' ? 'border-primary bg-primary' : 'border-border bg-muted'}`}><span className={`size-4 rounded-full bg-white shadow-sm transition-transform ${value === 'public' ? 'translate-x-5' : 'translate-x-0'}`} /><span className="sr-only">{controlLabel}</span></button> </div>;
}
