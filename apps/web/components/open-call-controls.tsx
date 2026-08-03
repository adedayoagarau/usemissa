'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function OpenCallControls({ organizationId, openCall }: { organizationId: string; openCall: { id: string; title: string; status: string; guidelineUrl?: string; guidelineText?: string } }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(openCall.title);
  const [guidelineUrl, setGuidelineUrl] = useState(openCall.guidelineUrl ?? '');
  const [guidelineText, setGuidelineText] = useState(openCall.guidelineText ?? '');
  const [pending, startTransition] = useTransition();
  const save = () => startTransition(async () => { const response = await fetch(`/api/orgs/${organizationId}/open-calls/${openCall.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title, guidelineUrl, guidelineText }) }); if (!response.ok) return; setEditing(false); router.refresh(); });
  const close = () => { if (!window.confirm('Close this call to new submissions?')) return; startTransition(async () => { const response = await fetch(`/api/orgs/${organizationId}/open-calls/${openCall.id}`, { method: 'DELETE' }); if (response.ok) router.refresh(); }); };
  if (editing) return <div className="mt-3 space-y-2 rounded-md border border-border bg-white p-3"><input aria-label="Open call title" className="min-h-10 w-full rounded-md border border-input px-2 text-sm" value={title} onChange={(event) => setTitle(event.target.value)} /><input aria-label="Guidelines URL" className="min-h-10 w-full rounded-md border border-input px-2 text-sm" placeholder="Guidelines URL" value={guidelineUrl} onChange={(event) => setGuidelineUrl(event.target.value)} /><textarea aria-label="Guidelines text" className="min-h-20 w-full rounded-md border border-input px-2 py-2 text-sm" placeholder="Guidelines summary" value={guidelineText} onChange={(event) => setGuidelineText(event.target.value)} /><div className="flex gap-2"><Button size="sm" disabled={pending || !title.trim()} onClick={save}>Save changes</Button><Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button></div></div>;
  return <div className="mt-2 flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>Edit call</Button>{openCall.status === 'published' && <Button type="button" size="sm" variant="outline" disabled={pending} onClick={close}>Close call</Button>}</div>;
}
