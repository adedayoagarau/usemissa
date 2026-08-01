'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Check, CircleAlert, ExternalLink, FileText, Lock } from 'lucide-react';
import type { OpportunityDetailProjection, ProfileMaterial, SubmissionDraft } from '@missa/radar-engine';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function SubmissionPrep({ userId, opportunity }: { userId: string; opportunity: OpportunityDetailProjection }) {
  const [materials, setMaterials] = useState<ProfileMaterial[]>([]);
  const [draft, setDraft] = useState<SubmissionDraft | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [profileResponse, draftResponse] = await Promise.all([
          fetch(`/api/users/${userId}/profile`),
          fetch(`/api/users/${userId}/submission-drafts`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ opportunityId: opportunity.id }) }),
        ]);
        const profileData = await profileResponse.json();
        const draftData = await draftResponse.json();
        if (!profileResponse.ok || !draftResponse.ok) throw new Error(draftData.error ?? profileData.error ?? 'Could not load submission preparation');
        if (cancelled) return;
        setMaterials(profileData.profile.materials ?? []);
        setDraft(draftData);
        setSelected(draftData.materials.map((material: { materialId: string }) => material.materialId));
        setNote(draftData.note ?? '');
      } catch (loadError) { if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Could not load submission preparation'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [opportunity.id, userId]);

  const readyMaterials = useMemo(() => materials.filter((material) => material.status === 'ready'), [materials]);
  const requiredLabels = opportunity.requiredMaterials.map((material) => material.label);

  function toggle(materialId: string) { setSelected((current) => current.includes(materialId) ? current.filter((id) => id !== materialId) : [...current, materialId]); }

  async function saveSelection() {
    if (!draft) return;
    setPending(true); setError(''); setMessage('');
    try {
      const response = await fetch(`/api/users/${userId}/submission-drafts/${draft.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ materialIds: selected, note }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not save selection');
      setDraft(data); setMessage('Submission packet saved');
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Could not save selection'); }
    finally { setPending(false); }
  }

  async function markSubmitted() {
    if (!draft) return;
    setPending(true); setError('');
    try {
      const saveResponse = await fetch(`/api/users/${userId}/submission-drafts/${draft.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ materialIds: selected, note }) });
      const saved = await saveResponse.json();
      if (!saveResponse.ok) throw new Error(saved.error ?? 'Select at least one ready material');
      const response = await fetch(`/api/users/${userId}/submission-drafts/${draft.id}`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not update tracker');
      setDraft(data); setMessage('Tracker updated to Submitted');
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'Could not update tracker'); }
    finally { setPending(false); }
  }

  if (loading) return <div className="mx-auto max-w-4xl py-16 text-sm text-muted-foreground">Preparing your submission…</div>;
  if (error && !draft) return <div className="mx-auto max-w-4xl py-16"><p className="text-sm text-destructive">{error}</p><Button nativeButton={false} className="mt-4" variant="outline" render={<Link href={`/opportunities/${opportunity.id}`} />}>Back to opportunity</Button></div>;

  return <div className="mx-auto max-w-4xl space-y-8 pb-16">
    <Link href={`/opportunities/${opportunity.id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Back to opportunity</Link>
    <header className="space-y-3"><div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">Submission preparation</Badge>{draft?.status === 'submitted' && <Badge className="bg-[var(--green)] text-white">Submitted</Badge>}</div><h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{opportunity.title}</h1><p className="text-sm text-muted-foreground">Review what Missa will carry into the official submission page. Nothing is sent by Missa without your action.</p></header>

    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <main className="space-y-6">
        <section className="rounded-lg border border-border bg-white p-5 sm:p-6"><div className="flex items-start gap-3"><FileText className="mt-0.5 size-5 text-primary" /><div><h2 className="font-semibold">Choose your materials</h2><p className="mt-1 text-sm text-muted-foreground">Only materials marked ready can be included. You can change this packet until you submit.</p></div></div><div className="mt-5 space-y-3">{readyMaterials.length === 0 && <div className="rounded-md border border-dashed border-border p-5 text-sm text-muted-foreground">You need at least one ready material before continuing. <Link className="text-primary underline-offset-4 hover:underline" href="/profile?section=materials">Add one in Profile</Link>.</div>}{readyMaterials.map((material) => <label key={material.id} className={`flex cursor-pointer items-start gap-3 rounded-md border p-4 transition-colors ${selected.includes(material.id) ? 'border-primary bg-[var(--accent-tint)]' : 'border-border hover:bg-muted/30'}`}><input type="checkbox" checked={selected.includes(material.id)} onChange={() => toggle(material.id)} className="mt-1 size-4 accent-[var(--brand-accent)]" /><span className="min-w-0 flex-1"><span className="flex items-center gap-2 text-sm font-medium">{material.title}{selected.includes(material.id) && <Check className="size-4 text-[var(--green)]" />}</span><span className="mt-1 block text-xs text-muted-foreground">{material.kind} · {material.visibility === 'private' ? 'private' : 'available for submissions'}</span>{material.content && <span className="mt-2 block line-clamp-2 text-sm leading-5 text-muted-foreground">{material.content}</span>}</span></label>)}</div></section>
        <section className="rounded-lg border border-border bg-white p-5 sm:p-6"><h2 className="font-semibold">Private note</h2><p className="mt-1 text-sm text-muted-foreground">Optional context for your own tracker. It is not sent to the organization.</p><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} placeholder="What do you want to remember about this submission?" className="mt-4 flex min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" /></section>
        {requiredLabels.length > 0 && <section className="rounded-lg border border-border bg-white p-5 sm:p-6"><h2 className="font-semibold">Official requirements</h2><ul className="mt-3 space-y-2 text-sm text-muted-foreground">{requiredLabels.map((label) => <li key={label} className="flex items-start gap-2"><CircleAlert className="mt-0.5 size-4 shrink-0 text-muted-foreground" />{label}</li>)}</ul><p className="mt-4 text-xs text-muted-foreground">Missa can prepare your reusable materials, but verify the official form and requirements before sending.</p></section>}
      </main>
      <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start"><section className="rounded-lg border border-border bg-white p-5"><div className="flex items-center gap-2 text-sm font-medium"><Lock className="size-4 text-[var(--green)]" />Private until you choose</div><p className="mt-3 text-sm leading-5 text-muted-foreground">Your packet stays in Missa. The official organization receives anything only through its own submission page.</p><div className="mt-5 space-y-2"><Button className="h-11 w-full justify-between" onClick={saveSelection} disabled={pending || selected.length === 0 || draft?.status === 'submitted'}>{pending ? 'Saving…' : 'Save packet'}<Check className="size-4" /></Button>{opportunity.submissionUrl && <a href={opportunity.submissionUrl} target="_blank" rel="noreferrer" className={`flex h-11 items-center justify-between rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted ${selected.length === 0 || draft?.status === 'submitted' ? 'pointer-events-none opacity-50' : ''}`}>Continue to official form <ExternalLink className="size-4" /></a>}{draft?.status !== 'submitted' && <Button variant="outline" className="h-11 w-full justify-between" onClick={markSubmitted} disabled={pending || selected.length === 0}>I submitted this <ArrowUpRight className="size-4" /></Button>}</div>{(message || error) && <p className={`mt-3 text-xs ${error ? 'text-destructive' : 'text-[var(--green)]'}`} role="status">{error || message}</p>}</section><p className="text-xs leading-5 text-muted-foreground">Missa does not impersonate you or auto-submit to third-party forms. This review step protects your work and your consent.</p></aside>
    </div>
  </div>;
}
