'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { FileText, Link2, Plus, Search, Trash2 } from 'lucide-react';
import type { ProfileMaterial } from '@missa/radar-engine';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function LibraryView({ userId, materials: initialMaterials }: { userId: string; materials: ProfileMaterial[] }) {
  const [materials, setMaterials] = useState(initialMaterials);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const visible = useMemo(() => materials.filter((material) => (filter === 'all' || material.kind === filter) && `${material.title} ${material.content ?? ''}`.toLowerCase().includes(query.toLowerCase())), [filter, materials, query]);
  const kinds = ['all', ...new Set(materials.map((material) => material.kind))];

  async function remove(material: ProfileMaterial) {
    const response = await fetch(`/api/users/${userId}/profile/materials/${material.id}`, { method: 'DELETE' });
    if (response.ok) setMaterials((current) => current.filter((item) => item.id !== material.id));
  }

  return <div className="min-h-[calc(100vh-5rem)] bg-white"><div className="border-b border-border px-5 py-8 sm:px-8 lg:px-12"><div className="mx-auto flex max-w-6xl flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground">Library</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">Your work, ready when you are.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Keep reusable materials in one calm place. Choose exactly what to include when you prepare a submission.</p></div><Button nativeButton={false} render={<Link href="/profile?section=materials" />}><Plus className="size-4" />Add material</Button></div></div><main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-12"><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div className="flex min-w-0 flex-1 items-center rounded-lg border border-input px-3"><Search className="mr-2 size-4 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your materials" className="h-10 border-0 px-0 shadow-none focus-visible:ring-0" /></div><div className="flex gap-2 overflow-x-auto pb-1">{kinds.map((kind) => <button key={kind} type="button" onClick={() => setFilter(kind)} className={`min-h-9 shrink-0 rounded-full border px-3 text-xs capitalize ${filter === kind ? 'border-primary bg-[var(--accent-tint)] text-[var(--accent-deep)]' : 'border-border text-muted-foreground hover:text-foreground'}`}>{kind === 'all' ? 'All materials' : kind}</button>)}</div></div>{visible.length === 0 ? <div className="mt-8 rounded-lg border border-dashed border-border px-6 py-16 text-center"><FileText className="mx-auto size-6 text-muted-foreground" /><p className="mt-3 text-sm font-medium">No materials found.</p><p className="mt-1 text-sm text-muted-foreground">Add a bio, statement, CV, work, or saved answer from your Profile.</p></div> : <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{visible.map((material) => <article key={material.id} className="flex min-h-48 flex-col rounded-lg border border-border bg-white p-5"><div className="flex items-start justify-between gap-3"><div className="flex size-9 items-center justify-center rounded-md bg-[var(--accent-tint)] text-[var(--accent-deep)]">{material.kind === 'link' ? <Link2 className="size-4" /> : <FileText className="size-4" />}</div><button type="button" onClick={() => remove(material)} aria-label={`Remove ${material.title}`} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-destructive"><Trash2 className="size-4" /></button></div><h2 className="mt-5 text-sm font-semibold">{material.title}</h2><div className="mt-2 flex flex-wrap gap-1.5"><Badge variant="outline" className="capitalize">{material.kind}</Badge><Badge variant={material.status === 'ready' ? 'secondary' : 'outline'}>{material.status}</Badge></div>{material.content && <p className="mt-4 line-clamp-3 text-sm leading-5 text-muted-foreground">{material.content}</p>}{material.url && <a href={material.url} target="_blank" rel="noreferrer" className="mt-auto pt-4 text-xs text-primary underline-offset-4 hover:underline">Open link</a>}</article>)}</div>}</main></div>;
}
