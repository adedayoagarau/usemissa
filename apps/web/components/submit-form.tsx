'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SubmissionField } from '@missa/workspace-engine';

/**
 * Story 6.5: the submitter-facing submit form, rendering the fields Story
 * 6.3's Form Builder actually saved (no hardcoded field set).
 *
 * KNOWN LIMITATION: no file storage backend (S3/Vercel Blob/etc.) is
 * provisioned. File-upload fields are read client-side via FileReader and
 * sent as a data: URI in the `fileUrl` JSON field -- this genuinely proves
 * the Submission/Work creation flow end to end for small files, but is not
 * how real file storage should work at scale (data URIs bloat the JSON
 * store and have practical size limits). Flagged here rather than silently
 * treated as production-ready.
 */
export function SubmitForm({ pathId, categories, fields }: { pathId: string; categories: string[]; fields: SubmissionField[] }) {
  const [category, setCategory] = useState(categories[0] ?? '');
  const [values, setValues] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const setField = (fieldId: string, value: string) => setValues((v) => ({ ...v, [fieldId]: value }));

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResult(null);

    const fileFields = fields.filter((f) => f.type === 'file-upload');
    const fileUrls: Record<string, string> = {};
    for (const f of fileFields) {
      const input = (e.currentTarget.elements.namedItem(f.id) as HTMLInputElement) ?? undefined;
      const file = input?.files?.[0];
      if (file) fileUrls[f.id] = await readFileAsDataUrl(file);
    }

    const title = values[fields.find((f) => f.type === 'text')?.id ?? ''] || category || 'Untitled submission';

    startTransition(async () => {
      const res = await fetch(`/api/submission-paths/${pathId}/submit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ works: [{ title, fileUrl: Object.values(fileUrls)[0] }] }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setResult({ ok: false, message: data.error ?? 'Submission failed' });
        return;
      }
      setResult({ ok: true, message: 'Submitted — you can track this in your Tracker.' });
    });
  };

  if (result?.ok) {
    return <p className="mt-4 text-sm text-[var(--green)]">{result.message}</p>;
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
      {categories.length > 0 && (
        <div>
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            className="mt-1 w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}
      {fields.map((f) => (
        <div key={f.id}>
          <Label htmlFor={f.id}>
            {f.label}
            {f.required && ' *'}
          </Label>
          {f.type === 'file-upload' ? (
            <input id={f.id} name={f.id} type="file" required={f.required} className="mt-1 block w-full text-sm" />
          ) : f.type === 'fee-toggle' ? (
            <p className="mt-1 text-sm text-muted-foreground">Fee applies — payment collection isn't wired up yet.</p>
          ) : (
            <Input id={f.id} name={f.id} required={f.required} onChange={(e) => setField(f.id, e.target.value)} />
          )}
        </div>
      ))}
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Submitting…' : 'Submit'}
      </Button>
      {result && !result.ok && <p className="text-xs text-destructive">{result.message}</p>}
    </form>
  );
}
