'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

function useSubmit(url: string, buildBody: (fd: FormData) => unknown) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(buildBody(fd)),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'We could not save this item. Check the details and try again.');
        return;
      }
      (e.target as HTMLFormElement).reset();
      router.refresh();
    });
  };

  return { onSubmit, isPending, error };
}

export function CreateTeamForm({ organizationId }: { organizationId: string }) {
  const { onSubmit, isPending, error } = useSubmit(`/api/orgs/${organizationId}/teams`, (fd) => ({ name: fd.get('name') }));
  return (
    <form onSubmit={onSubmit} className="flex items-end gap-2">
      <label htmlFor="new-team-name" className="sr-only">
        Team name
      </label>
      <input id="new-team-name" name="name" placeholder="Team name" required className="rounded-md border border-input px-2 py-1 text-sm" />
      <Button size="sm" type="submit" disabled={isPending}>
        {isPending ? 'Creating…' : 'Create team'}
      </Button>
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </form>
  );
}

export function CreateProgramForm({ organizationId, entityId }: { organizationId: string; entityId: string }) {
  const { onSubmit, isPending, error } = useSubmit(`/api/orgs/${organizationId}/teams/${entityId}/programs`, (fd) => ({ name: fd.get('name') }));
  return (
    <form onSubmit={onSubmit} className="flex items-end gap-2">
      <label htmlFor={`new-program-name-${entityId}`} className="sr-only">
        Program name
      </label>
      <input id={`new-program-name-${entityId}`} name="name" placeholder="Program name" required className="rounded-md border border-input px-2 py-1 text-sm" />
      <Button size="sm" variant="outline" type="submit" disabled={isPending}>
        {isPending ? 'Adding…' : 'Add program'}
      </Button>
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </form>
  );
}

export function CreateOpenCallForm({ organizationId, programId, radarOpportunities = [] }: { organizationId: string; programId: string; radarOpportunities?: Array<{ id: string; title: string }> }) {
  const { onSubmit, isPending, error } = useSubmit(`/api/orgs/${organizationId}/open-calls`, (fd) => ({
    programId,
    title: fd.get('title'),
    radarOpportunityId: fd.get('radarOpportunityId') || undefined,
  }));
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
      <label htmlFor={`new-opportunity-title-${programId}`} className="sr-only">
        Opportunity title
      </label>
      <input id={`new-opportunity-title-${programId}`} name="title" placeholder="Opportunity title" required className="rounded-md border border-input px-2 py-1 text-sm" />
      {radarOpportunities.length > 0 && (
        <select name="radarOpportunityId" defaultValue="" className="min-h-9 rounded-md border border-input bg-white px-2 py-1 text-xs">
          <option value="">Link a claimed opportunity (optional)</option>
          {radarOpportunities.map((opportunity) => (
            <option key={opportunity.id} value={opportunity.id}>
              {opportunity.title}
            </option>
          ))}
        </select>
      )}
      <Button size="sm" variant="outline" type="submit" disabled={isPending}>
        {isPending ? 'Creating…' : 'Create opportunity'}
      </Button>
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </form>
  );
}

export function PublishButton({ organizationId, openCallId }: { organizationId: string; openCallId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await fetch(`/api/orgs/${organizationId}/open-calls/${openCallId}/publish`, { method: 'POST' });
          router.refresh();
        })
      }
    >
      {isPending ? 'Publishing…' : 'Publish'}
    </Button>
  );
}
