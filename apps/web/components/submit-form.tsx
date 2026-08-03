'use client';

import { useEffect, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SubmissionField } from '@missa/workspace-engine';

/**
 * Story 6.5: the submitter-facing submit form, rendering the fields Story
 * 6.3's Form Builder actually saved (no hardcoded field set).
 *
 * Files upload to the configured private Vercel Blob store before the
 * submission record is created. The Work stores only the opaque blob URL, not
 * the file bytes or a data URI.
 */
export function SubmitForm({ pathId, categories, fields, feeCents }: { pathId: string; categories: string[]; fields: SubmissionField[]; feeCents?: number }) {
  const [category, setCategory] = useState(categories[0] ?? '');
  const [values, setValues] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string; submissionId?: string } | null>(null);
  const [workTitles, setWorkTitles] = useState(['']);
  const searchParams = useSearchParams();

  useEffect(() => {
    const raw = sessionStorage.getItem(`missa_submission_draft:${pathId}`);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as { category?: string; values?: Record<string, string>; workTitles?: string[] };
      queueMicrotask(() => {
        if (draft.category) setCategory(draft.category);
        if (draft.values) setValues(draft.values);
        if (draft.workTitles?.length) setWorkTitles(draft.workTitles);
      });
    } catch { /* ignore malformed local draft */ }
  }, [pathId]);

  const setField = (fieldId: string, value: string) => setValues((v) => ({ ...v, [fieldId]: value }));

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResult(null);
    const formElement = e.currentTarget;

    const fileFields = fields.filter((f) => f.type === 'file-upload');
    startTransition(async () => {
      const paymentSessionId = searchParams.get('checkout_session') ?? undefined;
      if (feeCents && feeCents > 0 && !paymentSessionId) {
        sessionStorage.setItem(`missa_submission_draft:${pathId}`, JSON.stringify({ category, values, workTitles }));
        const checkout = await fetch(`/api/submission-paths/${pathId}/checkout`, { method: 'POST' });
        const checkoutBody = await checkout.json().catch(() => ({}));
        if (!checkout.ok || !checkoutBody.url) { setResult({ ok: false, message: checkoutBody.error ?? 'Payment could not be started' }); return; }
        window.location.assign(checkoutBody.url);
        return;
      }
      const fileUrls: Record<string, string> = {};
      for (const f of fileFields) {
        const input = (formElement.elements.namedItem(f.id) as HTMLInputElement) ?? undefined;
        const file = input?.files?.[0];
        if (!file) continue;
        const form = new FormData();
        form.set('file', file);
        const upload = await fetch(`/api/submission-paths/${pathId}/upload`, { method: 'POST', body: form });
        const uploadBody = await upload.json().catch(() => ({}));
        if (!upload.ok) { setResult({ ok: false, message: uploadBody.error ?? 'File upload failed' }); return; }
        fileUrls[f.id] = uploadBody.url;
      }
      const answers: Record<string, string> = { ...values };
      for (const [fieldId, url] of Object.entries(fileUrls)) answers[fieldId] = url;
      const res = await fetch(`/api/submission-paths/${pathId}/submit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ category, answers, works: workTitles.filter((value) => value.trim()).map((value, index) => ({ title: value.trim(), fileUrl: index === 0 ? Object.values(fileUrls)[0] : undefined })), paymentSessionId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setResult({ ok: false, message: data.error ?? 'Submission failed' });
        return;
      }
      sessionStorage.removeItem(`missa_submission_draft:${pathId}`);
      const body = await res.json().catch(() => ({}));
      setResult({ ok: true, message: 'Submitted — your receipt is ready.', submissionId: body.submission?.id });
    });
  };

  if (result?.ok) {
    return <div className="mt-4 space-y-3 text-sm"><p className="text-[var(--green)]">{result.message}</p>{result.submissionId && <a className="inline-flex min-h-11 items-center rounded-md border border-border px-3 py-2 font-medium hover:bg-muted" href={`/my-submissions/${result.submissionId}`}>View submission receipt</a>}</div>;
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
          ) : f.type === 'category-select' ? (
            <select id={f.id} name={f.id} required={f.required} value={values[f.id] ?? category} onChange={(e) => { setField(f.id, e.target.value); setCategory(e.target.value); }} className="mt-1 min-h-11 w-full rounded-md border border-input bg-white px-2 py-1.5 text-sm">
              <option value="">Choose a category</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          ) : f.type === 'fee-toggle' ? (
            <p className="mt-1 text-sm text-muted-foreground">Fee applies — payment will be confirmed before the submission is finalized.</p>
          ) : (
            <Input id={f.id} name={f.id} required={f.required} onChange={(e) => setField(f.id, e.target.value)} />
          )}
        </div>
      ))}
      <div className="space-y-2 rounded-md border border-border p-3"><div className="flex items-center justify-between"><Label>Works in this submission</Label><Button type="button" variant="outline" size="sm" onClick={() => setWorkTitles((current) => [...current, ''])}>Add another work</Button></div>{workTitles.map((workTitle, index) => <div key={index} className="flex gap-2"><Input aria-label={`Work ${index + 1} title`} placeholder={`Work ${index + 1} title`} value={workTitle} required={index === 0} onChange={(e) => setWorkTitles((current) => current.map((value, i) => i === index ? e.target.value : value))} />{index > 0 && <Button type="button" variant="ghost" size="sm" onClick={() => setWorkTitles((current) => current.filter((_, i) => i !== index))}>Remove</Button>}</div>)}</div>
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Submitting…' : 'Submit'}
      </Button>
      {result && !result.ok && <p className="text-xs text-destructive">{result.message}</p>}
    </form>
  );
}
