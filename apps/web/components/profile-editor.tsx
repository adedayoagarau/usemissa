'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Check,
  CheckCircle2,
  FileText,
  Lock,
  Palette,
  Plus,
  Settings2,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react';
import type { ProfileDetails, ProfileMaterial, ProfileReadiness, ProfileSectionKey, ProfileSuggestion } from '@missa/radar-engine';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ProfileUpload } from '@/components/profile-upload';

type SectionIcon = typeof UserRound;

const sections: Array<{ key: ProfileSectionKey; label: string; description: string; icon: SectionIcon }> = [
  { key: 'about', label: 'About you', description: 'The basics people should know', icon: UserRound },
  { key: 'practice', label: 'Your practice', description: 'What you make and where it sits', icon: Palette },
  { key: 'materials', label: 'Your work', description: 'Reusable bios, statements, and links', icon: FileText },
  { key: 'preferences', label: 'Preferences', description: 'Tune the opportunities you see', icon: Settings2 },
  { key: 'privacy', label: 'Privacy', description: 'Choose what is shared and when', icon: ShieldCheck },
];

function splitList(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function listValue(value: string[]): string {
  return value.join(', ');
}

function readinessLabel(readiness: ProfileReadiness): string {
  if (readiness.applyReady) return 'Ready to apply';
  if (readiness.discoverReady) return 'Ready for recommendations';
  return 'Getting started';
}

function SectionStatus({ status }: { status: string }) {
  if (status === 'complete') return <span className="flex items-center gap-1 text-xs text-[var(--green)]"><CheckCircle2 className="size-3.5" /> Complete</span>;
  if (status === 'in-progress') return <span className="text-xs text-muted-foreground">In progress</span>;
  return <span className="text-xs text-muted-foreground">Not started</span>;
}

export function ProfileEditor({
  userId,
  email,
  displayName: initialDisplayName,
  genres: initialGenres,
  profile: initialProfile,
  readiness: initialReadiness,
  initialSection = 'about',
}: {
  userId: string;
  email: string;
  displayName: string;
  genres: string[];
  profile: ProfileDetails;
  readiness: ProfileReadiness;
  initialSection?: ProfileSectionKey;
}) {
  const [activeSection, setActiveSection] = useState<ProfileSectionKey>(initialSection);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [genres, setGenres] = useState(initialGenres);
  const [profile, setProfile] = useState<ProfileDetails>(initialProfile);
  const [readiness, setReadiness] = useState(initialReadiness);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [materialDraft, setMaterialDraft] = useState({ kind: 'bio', title: '', content: '', url: '', status: 'ready', visibility: 'submission-only' });
  const [suggestions, setSuggestions] = useState<ProfileSuggestion[]>([]);

  useEffect(() => {
    fetch(`/api/users/${userId}/profile/suggestions`).then((response) => response.ok ? response.json() : null).then((data) => { if (data?.suggestions) setSuggestions(data.suggestions); }).catch(() => undefined);
  }, [userId]);

  const active = useMemo(() => sections.find((section) => section.key === activeSection) ?? sections[0], [activeSection]);

  async function saveProfile() {
    setPending(true); setMessage(''); setError('');
    try {
      const response = await fetch(`/api/users/${userId}/profile`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ displayName, genres, profile: { ...profile, materials: undefined } }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not save your profile');
      setProfile((current) => ({ ...current, ...data.profile, materials: current.materials }));
      setReadiness(data.readiness);
      setMessage('Saved');
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Could not save your profile'); }
    finally { setPending(false); }
  }

  async function addMaterial(event: FormEvent) {
    event.preventDefault();
    if (!materialDraft.title.trim()) return;
    setPending(true); setError(''); setMessage('');
    try {
      const response = await fetch(`/api/users/${userId}/profile/materials`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(materialDraft),
      });
      const material = await response.json();
      if (!response.ok) throw new Error(material.error ?? 'Could not add material');
      setProfile((current) => ({ ...current, materials: [material, ...current.materials] }));
      setMaterialDraft({ kind: 'bio', title: '', content: '', url: '', status: 'ready', visibility: 'submission-only' });
      setMessage('Material added');
      const readinessResponse = await fetch(`/api/users/${userId}/profile`);
      if (readinessResponse.ok) setReadiness((await readinessResponse.json()).readiness);
    } catch (addError) { setError(addError instanceof Error ? addError.message : 'Could not add material'); }
    finally { setPending(false); }
  }

  async function deleteMaterial(material: ProfileMaterial) {
    setPending(true); setError('');
    try {
      const response = await fetch(`/api/users/${userId}/profile/materials/${material.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not remove material');
      setProfile((current) => ({ ...current, materials: current.materials.filter((item) => item.id !== material.id) }));
      setMessage('Material removed');
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : 'Could not remove material'); }
    finally { setPending(false); }
  }

  const section = readiness.sections.find((item) => item.key === activeSection);

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-white">
      <div className="border-b border-border bg-white px-5 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground">Profile</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-foreground">Make your work easier to find.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Tell Missa what you make, keep your best materials in one place, and decide what is shared when you apply.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="h-7 gap-1.5 rounded-full px-3"><span className="size-1.5 rounded-full bg-[var(--green)]" />{readinessLabel(readiness)}</Badge>
            <Button nativeButton={false} variant="outline" render={<Link href="/opportunities" />}>See opportunities</Button>
            <Button onClick={saveProfile} disabled={pending}>{pending ? 'Saving…' : 'Save changes'}</Button>
          </div>
        </div>
        {(message || error) && <div className={`mx-auto mt-4 max-w-6xl text-sm ${error ? 'text-destructive' : 'text-[var(--green)]'}`} role="status">{error || message}</div>}
        {suggestions.length > 0 && <div className="mx-auto mt-5 max-w-6xl rounded-lg border border-border bg-[var(--accent-tint)]/40 p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-deep)]">Missa suggestions</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{suggestions.slice(0, 2).map((suggestion) => <button key={suggestion.id} type="button" onClick={() => setActiveSection(suggestion.section)} className="rounded-md border border-border bg-white p-3 text-left hover:border-primary"><span className="block text-sm font-medium">{suggestion.title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{suggestion.detail}</span><span className="mt-2 block text-[0.68rem] text-muted-foreground">Review required · deterministic signal</span></button>)}</div></div>}
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-12">
        <aside>
          <div className="mb-5 rounded-lg border border-border bg-white p-4">
            <div className="flex items-center justify-between"><span className="text-sm font-medium">Profile readiness</span><span className="font-mono text-xs text-muted-foreground">{readiness.sections.filter((item) => item.status === 'complete').length}/{readiness.sections.length}</span></div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-[var(--green)] transition-all" style={{ width: `${(readiness.sections.filter((item) => item.status === 'complete').length / readiness.sections.length) * 100}%` }} /></div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">{readiness.applyReady ? 'Your essentials are ready for a submission.' : readiness.discoverReady ? 'You can browse tailored opportunities now.' : 'Start with your name and practice to unlock recommendations.'}</p>
          </div>
          <nav aria-label="Profile sections" className="space-y-1">
            {sections.map((item) => {
              const Icon = item.icon;
              const status = readiness.sections.find((entry) => entry.key === item.key)?.status ?? 'not-started';
              return <button key={item.key} type="button" onClick={() => setActiveSection(item.key)} className={`flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${activeSection === item.key ? 'bg-[var(--accent-tint)] text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><Icon className="size-4 shrink-0" /><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{item.label}</span><span className="block truncate text-xs text-muted-foreground">{item.description}</span></span>{status === 'complete' && <Check className="size-4 text-[var(--green)]" />}</button>;
            })}
          </nav>
          <div className="mt-6 rounded-lg border border-dashed border-border p-4 text-xs leading-5 text-muted-foreground"><Lock className="mb-2 size-4" />Your profile is private by default. Missa only shares materials with a submission after you review them.</div>
        </aside>

        <section className="min-w-0 rounded-lg border border-border bg-white">
          <div className="border-b border-border px-5 py-5 sm:px-7"><p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">{active.label}</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.02em]">{active.description}</h2><div className="mt-2"><SectionStatus status={section?.status ?? 'not-started'} /></div></div>
          <div className="px-5 py-6 sm:px-7">
            {activeSection === 'materials' && <ProfileUpload userId={userId} onUploaded={(material) => setProfile((current) => ({ ...current, materials: [material, ...current.materials] }))} />}
            {activeSection === 'about' && <div className="space-y-5"><div className="grid gap-5 sm:grid-cols-2"><label className="space-y-2 text-sm font-medium">Display name<Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" className="mt-1 min-h-11" /></label><label className="space-y-2 text-sm font-medium">Email<span className="mt-1 flex min-h-11 items-center rounded-lg border border-border bg-muted/40 px-3 text-sm font-normal text-muted-foreground">{email}</span></label></div><div className="grid gap-5 sm:grid-cols-2"><label className="space-y-2 text-sm font-medium">Pronouns<Input value={profile.pronouns ?? ''} onChange={(event) => setProfile({ ...profile, pronouns: event.target.value })} placeholder="Optional" className="mt-1 min-h-11" /></label><label className="space-y-2 text-sm font-medium">Location<Input value={profile.location ?? ''} onChange={(event) => setProfile({ ...profile, location: event.target.value })} placeholder="City, country" className="mt-1 min-h-11" /></label></div><label className="block space-y-2 text-sm font-medium">Short bio<Textarea value={profile.bio ?? ''} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} placeholder="A few lines about your work…" rows={5} className="mt-1" /></label><p className="text-xs text-muted-foreground">This is your private working profile. You choose what is included in each submission.</p></div>}

            {activeSection === 'practice' && <div className="space-y-5"><label className="block space-y-2 text-sm font-medium">Disciplines<Input value={listValue(profile.disciplines)} onChange={(event) => setProfile({ ...profile, disciplines: splitList(event.target.value) })} placeholder="Poetry, fiction, visual art" className="mt-1 min-h-11" /></label><label className="block space-y-2 text-sm font-medium">Genres and forms<Input value={listValue(genres)} onChange={(event) => setGenres(splitList(event.target.value))} placeholder="Essays, experimental, documentary" className="mt-1 min-h-11" /></label><div className="grid gap-5 sm:grid-cols-2"><label className="space-y-2 text-sm font-medium">Career stage<select value={profile.careerStage ?? ''} onChange={(event) => setProfile({ ...profile, careerStage: event.target.value || undefined })} className="mt-1 flex min-h-11 w-full rounded-lg border border-input bg-white px-3 text-sm"><option value="">Choose a stage</option><option value="emerging">Emerging</option><option value="mid-career">Mid-career</option><option value="established">Established</option><option value="student">Student</option></select></label><label className="space-y-2 text-sm font-medium">Languages<Input value={listValue(profile.languages)} onChange={(event) => setProfile({ ...profile, languages: splitList(event.target.value) })} placeholder="English, Yoruba" className="mt-1 min-h-11" /></label></div><p className="text-xs text-muted-foreground">Use plain language. Missa uses these signals to explain why an opportunity may fit; they never make a decision for you.</p></div>}

            {activeSection === 'materials' && <div className="space-y-7"><div className="space-y-3">{profile.materials.length === 0 && <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">No materials yet. Add a reusable bio, statement, CV, or work link below.</div>}{profile.materials.map((material) => <div key={material.id} className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex min-w-0 gap-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[var(--accent-tint)] text-[var(--accent-deep)]"><BookOpen className="size-4" /></div><div className="min-w-0"><p className="truncate text-sm font-medium">{material.title}</p><p className="mt-1 text-xs text-muted-foreground">{material.kind} · {material.status} · {material.visibility}</p>{material.content && <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">{material.content}</p>}{material.url && <a href={material.url} target="_blank" rel="noreferrer" className="mt-2 block truncate text-xs text-primary underline-offset-4 hover:underline">{material.url}</a>}</div></div><Button type="button" variant="ghost" size="icon-sm" onClick={() => deleteMaterial(material)} disabled={pending} aria-label={`Remove ${material.title}`}><Trash2 className="size-4" /></Button></div>)}</div><form onSubmit={addMaterial} className="rounded-lg border border-border bg-muted/20 p-4 sm:p-5"><div className="flex items-center gap-2"><Plus className="size-4 text-primary" /><h3 className="text-sm font-semibold">Add material</h3></div><div className="mt-4 grid gap-4 sm:grid-cols-[150px_1fr]"><label className="space-y-2 text-sm font-medium">Type<select value={materialDraft.kind} onChange={(event) => setMaterialDraft({ ...materialDraft, kind: event.target.value })} className="mt-1 flex min-h-11 w-full rounded-lg border border-input bg-white px-3 text-sm"><option value="bio">Bio</option><option value="statement">Statement</option><option value="cv">CV</option><option value="work">Work</option><option value="link">Link</option><option value="saved-answer">Saved answer</option></select></label><label className="space-y-2 text-sm font-medium">Title<Input value={materialDraft.title} onChange={(event) => setMaterialDraft({ ...materialDraft, title: event.target.value })} placeholder="Night River — poetry manuscript" className="mt-1 min-h-11" /></label></div><label className="mt-4 block space-y-2 text-sm font-medium">Content or notes<Textarea value={materialDraft.content} onChange={(event) => setMaterialDraft({ ...materialDraft, content: event.target.value })} placeholder="Paste a bio, statement, or short context…" rows={4} className="mt-1" /></label><label className="mt-4 block space-y-2 text-sm font-medium">Link <span className="font-normal text-muted-foreground">(optional)</span><Input value={materialDraft.url} onChange={(event) => setMaterialDraft({ ...materialDraft, url: event.target.value })} placeholder="https://…" className="mt-1 min-h-11" /></label><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={materialDraft.visibility === 'submission-only'} onChange={(event) => setMaterialDraft({ ...materialDraft, visibility: event.target.checked ? 'submission-only' : 'private' })} className="size-4 accent-[var(--brand-accent)]" />Use for submissions</label><Button type="submit" disabled={pending || !materialDraft.title.trim()}>Add material</Button></div></form></div>}

            {activeSection === 'preferences' && <div className="space-y-5"><label className="block space-y-2 text-sm font-medium">Preferred locations<Input value={listValue(profile.preferences.locations)} onChange={(event) => setProfile({ ...profile, preferences: { ...profile.preferences, locations: splitList(event.target.value) } })} placeholder="Remote, Lagos, United States" className="mt-1 min-h-11" /></label><div className="grid gap-5 sm:grid-cols-2"><label className="space-y-2 text-sm font-medium">Maximum fee (cents)<Input type="number" min="0" value={profile.preferences.maxFeeCents ?? ''} onChange={(event) => setProfile({ ...profile, preferences: { ...profile.preferences, maxFeeCents: event.target.value ? Number(event.target.value) : undefined } })} placeholder="Optional" className="mt-1 min-h-11" /></label><label className="space-y-2 text-sm font-medium">Deadline window<select value={profile.preferences.deadlineWithinDays ?? ''} onChange={(event) => setProfile({ ...profile, preferences: { ...profile.preferences, deadlineWithinDays: event.target.value ? Number(event.target.value) : undefined } })} className="mt-1 flex min-h-11 w-full rounded-lg border border-input bg-white px-3 text-sm"><option value="">Any deadline</option><option value="7">Next 7 days</option><option value="30">Next 30 days</option><option value="90">Next 90 days</option></select></label></div><div className="space-y-3 rounded-lg border border-border p-4"><label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={profile.preferences.noFeeOnly === true} onChange={(event) => setProfile({ ...profile, preferences: { ...profile.preferences, noFeeOnly: event.target.checked } })} className="size-4 accent-[var(--brand-accent)]" />Only show opportunities with no fee</label><label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={profile.preferences.simultaneousRequired === true} onChange={(event) => setProfile({ ...profile, preferences: { ...profile.preferences, simultaneousRequired: event.target.checked } })} className="size-4 accent-[var(--brand-accent)]" />Only show opportunities that allow simultaneous submissions</label></div><p className="text-xs text-muted-foreground">These settings shape recommendations and saved searches. You can always browse outside them.</p></div>}

            {activeSection === 'privacy' && <div className="space-y-5"><div className="rounded-lg border border-border bg-muted/20 p-4"><div className="flex gap-3"><ShieldCheck className="mt-0.5 size-5 text-[var(--green)]" /><div><p className="text-sm font-medium">You are in control</p><p className="mt-1 text-sm leading-5 text-muted-foreground">Your profile and materials are private by default. Missa will show you the exact materials attached to a submission before anything is sent.</p></div></div></div><div className="divide-y divide-border rounded-lg border border-border"><label className="flex min-h-14 items-center justify-between gap-4 px-4"><span><span className="block text-sm font-medium">Public profile</span><span className="block text-xs text-muted-foreground">Let organizations discover your profile</span></span><input type="checkbox" checked={profile.privacy.publicProfile} onChange={(event) => setProfile({ ...profile, privacy: { ...profile.privacy, publicProfile: event.target.checked } })} className="size-4 accent-[var(--brand-accent)]" /></label><label className="flex min-h-14 items-center justify-between gap-4 px-4"><span><span className="block text-sm font-medium">Show location</span><span className="block text-xs text-muted-foreground">Include your location when public</span></span><input type="checkbox" checked={profile.privacy.showLocation} onChange={(event) => setProfile({ ...profile, privacy: { ...profile.privacy, showLocation: event.target.checked } })} className="size-4 accent-[var(--brand-accent)]" /></label><label className="flex min-h-14 items-center justify-between gap-4 px-4"><span><span className="block text-sm font-medium">Share contact details</span><span className="block text-xs text-muted-foreground">Allow a submission to include your contact details</span></span><input type="checkbox" checked={profile.privacy.shareContact} onChange={(event) => setProfile({ ...profile, privacy: { ...profile.privacy, shareContact: event.target.checked } })} className="size-4 accent-[var(--brand-accent)]" /></label><label className="flex min-h-14 items-center justify-between gap-4 px-4"><span><span className="block text-sm font-medium">Share materials by default</span><span className="block text-xs text-muted-foreground">Start submissions with your reusable materials selected</span></span><input type="checkbox" checked={profile.privacy.shareMaterialsByDefault} onChange={(event) => setProfile({ ...profile, privacy: { ...profile.privacy, shareMaterialsByDefault: event.target.checked } })} className="size-4 accent-[var(--brand-accent)]" /></label></div>{profile.privacy.publicProfile && <Link href={`/u/${userId}`} target="_blank" className="inline-flex min-h-11 items-center text-sm text-primary underline-offset-4 hover:underline">Preview public profile</Link>}</div>}
          </div>
          <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7"><p className="text-xs text-muted-foreground">Changes stay private until you save and review them.</p><Button onClick={saveProfile} disabled={pending}>{pending ? 'Saving…' : 'Save changes'}</Button></div>
        </section>
      </div>
    </div>
  );
}
