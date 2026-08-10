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
  const [workFileInputs, setWorkFileInputs] = useState<Record<number, File[]>>({});
  const [workFileUrls, setWorkFileUrls] = useState<Record<number, string[]>>({});
  const searchParams = useSearchParams();
  const submitLabel = feeCents && feeCents > 0 ? `Pay $${(feeCents / 100).toFixed(2)} USD and submit` : 'Submit application';

  const extractWorkFileUrls = (answers: Record<string, string | string[]>): Record<number, string[]> => Object.fromEntries(Object.entries(answers).flatMap(([key, value]) => {
    const match = key.match(/^__work_files_(\d+)$/);
    if (!match) return [];
    const urls = (Array.isArray(value) ? value : [value]).filter((item): item is string => typeof item === 'string' && item.startsWith('https://'));
    return urls.length ? [[Number(match[1]), urls]] : [];
  }));

  useEffect(() => {
    const raw = sessionStorage.getItem(`missa_submission_draft:${pathId}`);
    if (raw) {
      try {
        const draft = JSON.parse(raw) as { category?: string; values?: Record<string, string | string[]>; workTitles?: string[] };
        queueMicrotask(() => {
          if (draft.category) setCategory(draft.category);
          if (draft.values) { setValues(Object.fromEntries(Object.entries(draft.values).filter(([key]) => !key.startsWith('__work_files_')).map(([key, value]) => [key, Array.isArray(value) ? value[0] ?? '' : value]))); setWorkFileUrls(extractWorkFileUrls(draft.values)); }
          if (draft.workTitles?.length) setWorkTitles(draft.workTitles);
        });
      } catch { /* ignore malformed local draft */ }
    }
    void fetch(`/api/submission-paths/${pathId}/draft`).then((response) => response.ok ? response.json() as Promise<{ draft?: { category?: string; answers?: Record<string, string | string[]>; workTitles?: string[] } | null }> : null).then((body) => {
      const draft = body?.draft;
      if (!draft) return;
      queueMicrotask(() => {
        if (draft.category) setCategory(draft.category);
        if (draft.answers) { setValues(Object.fromEntries(Object.entries(draft.answers).filter(([key]) => !key.startsWith('__work_files_')).map(([key, value]) => [key, Array.isArray(value) ? value[0] ?? '' : value]))); setWorkFileUrls(extractWorkFileUrls(draft.answers)); }
        if (draft.workTitles?.length) setWorkTitles(draft.workTitles);
      });
    }).catch(() => undefined);
  }, [pathId]);

  const setField = (fieldId: string, value: string) => setValues((v) => ({ ...v, [fieldId]: value }));

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResult(null);
    const formElement = e.currentTarget;

    const fileFields = fields.filter((f) => f.type === 'file-upload');
    startTransition(async () => {
      const paymentSessionId = searchParams.get('checkout_session') ?? undefined;
      const draftKey = `missa_submission_draft:${pathId}`;
      let submissionKey = crypto.randomUUID();
      let checkoutKey = crypto.randomUUID();
      try { const current = JSON.parse(sessionStorage.getItem(draftKey) ?? '{}') as { submissionKey?: string; checkoutKey?: string }; if (current.submissionKey) submissionKey = current.submissionKey; if (current.checkoutKey) checkoutKey = current.checkoutKey; } catch { /* generate new keys */ }
      const fileUrls: Record<string, string> = { ...Object.fromEntries(fileFields.flatMap((field) => typeof values[field.id] === 'string' && values[field.id]!.startsWith('http') ? [[field.id, values[field.id]!]] : [])) };
      for (const f of fileFields) {
        if (fileUrls[f.id]) continue;
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
      const answers: Record<string, string | string[]> = { ...values, ...fileUrls };
      const nextWorkFileUrls: Record<number, string[]> = { ...workFileUrls };
      for (const [indexKey, files] of Object.entries(workFileInputs)) {
        const index = Number(indexKey);
        if (!files.length) continue;
        const uploaded: string[] = [];
        for (const file of files) {
          const form = new FormData(); form.set('file', file);
          const upload = await fetch(`/api/submission-paths/${pathId}/upload`, { method: 'POST', body: form });
          const uploadBody = await upload.json().catch(() => ({}));
          if (!upload.ok) { setResult({ ok: false, message: uploadBody.error ?? 'File upload failed' }); return; }
          if (typeof uploadBody.url === 'string') uploaded.push(uploadBody.url);
        }
        nextWorkFileUrls[index] = [...(nextWorkFileUrls[index] ?? []), ...uploaded];
      }
      for (const [index, urls] of Object.entries(nextWorkFileUrls)) answers[`__work_files_${index}`] = urls;
      try {
        const current = JSON.parse(sessionStorage.getItem(draftKey) ?? '{}') as Record<string, unknown>;
        sessionStorage.setItem(draftKey, JSON.stringify({ ...current, category, values: answers, workTitles, submissionKey, checkoutKey }));
      } catch { /* submission still works if storage is unavailable */ }
      if (feeCents && feeCents > 0 && !paymentSessionId) {
        const saveDraft = await fetch(`/api/submission-paths/${pathId}/draft`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ category, answers, workTitles, idempotencyKey: submissionKey }) });
        if (!saveDraft.ok) { setResult({ ok: false, message: 'Could not save your application draft' }); return; }
        const checkout = await fetch(`/api/submission-paths/${pathId}/checkout`, { method: 'POST', headers: { 'Idempotency-Key': checkoutKey } });
        const checkoutBody = await checkout.json().catch(() => ({}));
        if (!checkout.ok || !checkoutBody.url) { setResult({ ok: false, message: checkoutBody.error ?? 'Payment could not be started' }); return; }
        window.location.assign(checkoutBody.url);
        return;
      }
      const res = await fetch(`/api/submission-paths/${pathId}/submit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'Idempotency-Key': submissionKey },
        body: JSON.stringify({ category, answers, works: workTitles.filter((value) => value.trim()).map((value, index) => { const attachments = nextWorkFileUrls[index] ?? (index === 0 && Object.values(fileUrls)[0] ? [Object.values(fileUrls)[0]!] : []); return { title: value.trim(), ...(attachments.length ? { fileUrl: attachments[0], fileUrls: attachments } : {}) }; }), paymentSessionId }),
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
    return <div className="mt-4 space-y-3 text-sm"><p className="text-[var(--green)]">{result.message}</p>{result.submissionId && <a className="inline-flex min-h-11 items-center rounded-md border border-border px-3 py-2 font-medium hover:bg-muted" href={`/tracker/submissions/${result.submissionId}`}>View submission receipt</a>}</div>;
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-6">
      {categories.length > 0 && (
        <div>
          <Label htmlFor="category">Category — Required</Label>
          <select
            id="category"
            className="mt-2 min-h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
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
      <section className="space-y-3 rounded-lg border border-border p-4" aria-labelledby="application-works-title">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 id="application-works-title" className="text-sm font-semibold">Works — At least one required</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Titles and selected files become a submission snapshot. Files stay private until submission.</p></div><Button type="button" variant="outline" size="sm" onClick={() => setWorkTitles((current) => [...current, ''])}>Add another Work</Button></div>
        {workTitles.map((workTitle, index) => <div key={index} className="rounded-md border border-border p-3"><div className="flex flex-wrap gap-2"><Input aria-label={`Work ${index + 1} title`} placeholder={`Work ${index + 1} title`} value={workTitle} required={index === 0} onChange={(e) => setWorkTitles((current) => current.map((value, i) => i === index ? e.target.value : value))} />{index > 0 && <Button type="button" variant="ghost" size="sm" onClick={() => { setWorkTitles((current) => current.filter((_, i) => i !== index)); setWorkFileInputs((current) => Object.fromEntries(Object.entries(current).filter(([key]) => Number(key) !== index).map(([key, value]) => [Number(key) > index ? Number(key) - 1 : Number(key), value]))); setWorkFileUrls((current) => Object.fromEntries(Object.entries(current).filter(([key]) => Number(key) !== index).map(([key, value]) => [Number(key) > index ? Number(key) - 1 : Number(key), value]))); }}>Remove Work</Button>}</div><label className="mt-3 block text-xs leading-5 text-muted-foreground">Files for Work {index + 1} — Optional · 25 MB per file<input type="file" multiple className="mt-2 block min-h-11 w-full text-sm" aria-label={`Files for work ${index + 1}`} onChange={(event) => setWorkFileInputs((current) => ({ ...current, [index]: Array.from(event.target.files ?? []) }))} />{workFileUrls[index]?.length ? <span className="mt-1 block">{workFileUrls[index].length} uploaded file{workFileUrls[index].length === 1 ? '' : 's'} saved</span> : null}</label></div>)}
      </section>
      {fields.length ? <section className="space-y-5" aria-labelledby="application-questions-title"><div><h3 id="application-questions-title" className="text-sm font-semibold">Organization questions</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Required and Optional are stated in text. Answers remain private until submission.</p></div>{fields.map((f) => (
        <div key={f.id}>
          <Label htmlFor={f.id}>{f.label} — {f.required ? 'Required' : 'Optional'}</Label>
          {f.type === 'file-upload' ? <><input id={f.id} name={f.id} type="file" required={f.required && !values[f.id]} className="mt-2 block min-h-11 w-full text-sm" /><p className="mt-1 text-xs text-muted-foreground">Maximum 25 MB. The current form does not yet show upload progress or retry.</p></> : f.type === 'category-select' ? <select id={f.id} name={f.id} required={f.required} value={values[f.id] ?? category} onChange={(e) => { setField(f.id, e.target.value); setCategory(e.target.value); }} className="mt-2 min-h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"><option value="">Choose a category</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select> : f.type === 'fee-toggle' ? <p className="mt-2 text-sm text-muted-foreground">The application fee is reviewed before external checkout. Payment and submission receipt remain separate states.</p> : <Input id={f.id} name={f.id} required={f.required} className="mt-2 min-h-11" onChange={(e) => setField(f.id, e.target.value)} />}
        </div>
      ))}</section> : <section aria-labelledby="application-questions-title"><h3 id="application-questions-title" className="text-sm font-semibold">No Organization questions</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">This published form requires the Work packet only.</p></section>}
      <aside className="rounded-lg border border-border bg-muted/30 p-4 text-xs leading-5 text-muted-foreground"><strong className="block text-foreground">Before submitting</strong>The current form has no separate recipient-visible Review step. Check every Work, file, category, and answer above before continuing.</aside>
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Submitting…' : submitLabel}
      </Button>
      {result && !result.ok && <p className="text-xs text-destructive" role="alert">{result.message}</p>}
    </form>
  );
}
