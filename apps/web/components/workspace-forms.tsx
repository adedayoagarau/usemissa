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
        setError(body.error ?? 'Failed');
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
      <input name="name" placeholder="Team name" required className="rounded-md border border-input px-2 py-1 text-sm" />
      <Button size="sm" type="submit" disabled={isPending}>
        Create Team
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </form>
  );
}

export function CreateProgramForm({ organizationId, entityId }: { organizationId: string; entityId: string }) {
  const { onSubmit, isPending, error } = useSubmit(`/api/orgs/${organizationId}/teams/${entityId}/programs`, (fd) => ({ name: fd.get('name') }));
  return (
    <form onSubmit={onSubmit} className="flex items-end gap-2">
      <input name="name" placeholder="Program name" required className="rounded-md border border-input px-2 py-1 text-sm" />
      <Button size="sm" variant="outline" type="submit" disabled={isPending}>
        Add Program
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </form>
  );
}

export function CreateOpenCallForm({ organizationId, programId }: { organizationId: string; programId: string }) {
  const { onSubmit, isPending, error } = useSubmit(`/api/orgs/${organizationId}/open-calls`, (fd) => ({ programId, title: fd.get('title') }));
  return (
    <form onSubmit={onSubmit} className="flex items-end gap-2">
      <input name="title" placeholder="Open call title" required className="rounded-md border border-input px-2 py-1 text-sm" />
      <Button size="sm" variant="outline" type="submit" disabled={isPending}>
        Create Open Call
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
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
