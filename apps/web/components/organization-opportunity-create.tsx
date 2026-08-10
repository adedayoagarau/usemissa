'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function OrganizationOpportunityCreate({ organizationId, programs }: { organizationId: string; programs: Array<{ id: string; name: string; teamName: string }> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError('');
    startTransition(async () => {
      const response = await fetch(`/api/orgs/${encodeURIComponent(organizationId)}/open-calls`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: data.get('title'), programId: data.get('programId') }) });
      const body = await response.json().catch(() => ({})) as { id?: string; error?: string };
      if (!response.ok || !body.id) { setError(body.error ?? 'The Opportunity draft could not be created. Your title is still here.'); return; }
      router.push(`/organization/${encodeURIComponent(organizationId)}/opportunities/${encodeURIComponent(body.id)}`);
      router.refresh();
    });
  }

  return <form onSubmit={submit}>
    <div><Label htmlFor="opportunity-title">Public title</Label><Input id="opportunity-title" name="title" required autoFocus maxLength={180} placeholder="e.g. New Voices Residency" aria-describedby="opportunity-title-help opportunity-create-error" /><p id="opportunity-title-help">Use the title applicants will recognize. You can revise it before publication.</p></div>
    <div><Label htmlFor="opportunity-program">Program</Label><select id="opportunity-program" name="programId" required defaultValue=""><option value="" disabled>Choose a Program</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.name} · {program.teamName}</option>)}</select><p>Program keeps the Opportunity, submissions, reviews, and reporting in the right scope.</p></div>
    {error ? <p id="opportunity-create-error" role="alert">{error}</p> : <span id="opportunity-create-error" />}
    <Button type="submit" disabled={pending}>{pending ? 'Creating draft…' : <>Create draft<ArrowRight aria-hidden="true" /></>}</Button>
  </form>;
}
