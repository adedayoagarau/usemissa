'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ChartNoteMark } from './admin-time-series';

/** Pin a note to a date ("Launched on Product Hunt") so chart spikes carry their reason. */
export default function AdminChartNotes({ notes }: { notes: Array<ChartNoteMark & { id: string }> }) {
  const router = useRouter();
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (!label.trim()) return;
    setSaving(true);
    const response = await fetch('/api/admin/chart-notes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ day, label }) }).catch(() => undefined);
    setSaving(false);
    if (!response?.ok) {
      const payload = (await response?.json().catch(() => ({}))) as { error?: string } | undefined;
      toast.error(payload?.error ?? 'The note could not be saved.');
      return;
    }
    setLabel('');
    toast.success('Note added to the charts.');
    router.refresh();
  }

  async function remove(id: string) {
    const response = await fetch(`/api/admin/chart-notes?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => undefined);
    if (!response?.ok) {
      toast.error('The note could not be removed.');
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <form onSubmit={add} className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          Date
          <Input type="date" value={day} onChange={(event) => setDay(event.target.value)} required className="w-40" />
        </label>
        <label className="grid min-w-0 flex-1 basis-full gap-1 text-xs font-medium text-muted-foreground sm:basis-0">
          What happened
          <Input value={label} onChange={(event) => setLabel(event.target.value)} maxLength={120} placeholder="Launched on Product Hunt" required />
        </label>
        <Button type="submit" size="sm" variant="outline" disabled={saving || !label.trim()}>
          <Plus aria-hidden="true" />
          Add note
        </Button>
      </form>
      {notes.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {notes.map((note) => (
            <li key={note.id} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 py-0.5 pr-1 pl-2.5 text-xs text-foreground">
              <span className="font-mono text-muted-foreground">{note.day}</span>
              {note.label}
              <button type="button" onClick={() => remove(note.id)} aria-label={`Remove note: ${note.label}`} className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary">
                <X className="size-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
