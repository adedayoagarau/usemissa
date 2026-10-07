'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PencilLine, Upload, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface EditableWork { id: string; title: string; fileUrls: string[] }
interface EditableField { id: string; label: string; type: 'text' | 'file-upload'; required: boolean; value: string | string[] | null }
interface EditState { pathId: string; works: EditableWork[]; fields: EditableField[] }

function fileLabel(url: string): string {
  try { return decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).at(-1) ?? 'file').replace(/^[0-9a-f-]{36}-/, ''); } catch { return 'file'; }
}

function asList(value: string | string[] | null): string[] {
  return value === null ? [] : Array.isArray(value) ? value : [value];
}

/**
 * Lets a submitter fix Work titles, replace files and change answers while the
 * call is open and before reading starts. Only changed values are sent, and
 * the organization sees each change in the submission's history.
 */
export function EditSubmissionDialog({ submissionId, organizationName }: { submissionId: string; organizationName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [original, setOriginal] = useState<EditState | null>(null);
  const [draft, setDraft] = useState<EditState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const begin = () => startTransition(async () => {
    setError(null);
    const response = await fetch(`/api/me/submissions/${encodeURIComponent(submissionId)}/edit`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) { toast.error(payload.error ?? 'This submission cannot be changed right now.'); return; }
    if (!payload.editable) { toast.error(payload.reason ?? 'This submission is locked.'); router.refresh(); return; }
    const state: EditState = { pathId: payload.pathId, works: payload.works, fields: payload.fields };
    setOriginal(state);
    setDraft(structuredClone(state));
    setOpen(true);
  });

  const upload = async (files: FileList, target: string, apply: (urls: string[]) => void) => {
    if (!draft || !files.length) return;
    setUploading(target);
    setError(null);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.set('file', file);
      const response = await fetch(`/api/submission-paths/${encodeURIComponent(draft.pathId)}/upload`, { method: 'POST', body: form });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) { setError(`${file.name}: ${payload.error ?? 'upload failed'}`); setUploading(null); return; }
      urls.push(payload.url);
    }
    apply(urls);
    setUploading(null);
  };

  const save = () => startTransition(async () => {
    if (!draft || !original) return;
    setError(null);
    const works = draft.works.flatMap((work) => {
      const before = original.works.find((item) => item.id === work.id)!;
      const change: { workId: string; title?: string; fileUrls?: string[] } = { workId: work.id };
      if (work.title.trim() !== before.title) change.title = work.title;
      if (JSON.stringify(work.fileUrls) !== JSON.stringify(before.fileUrls)) change.fileUrls = work.fileUrls;
      return Object.keys(change).length > 1 ? [change] : [];
    });
    const answers: Record<string, string | string[] | null> = {};
    for (const field of draft.fields) {
      const before = original.fields.find((item) => item.id === field.id)!;
      if (JSON.stringify(field.value) !== JSON.stringify(before.value)) answers[field.id] = field.value;
    }
    if (!works.length && !Object.keys(answers).length) { setError('Nothing has changed yet.'); return; }
    const response = await fetch(`/api/me/submissions/${encodeURIComponent(submissionId)}/edit`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ works, answers }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) { setError(payload.error ?? 'Your changes were not saved.'); return; }
    toast.success(`Saved. ${organizationName} can see what changed.`);
    setOpen(false);
    router.refresh();
  });

  const setWork = (id: string, patch: Partial<EditableWork>) => setDraft((current) => current && ({ ...current, works: current.works.map((work) => (work.id === id ? { ...work, ...patch } : work)) }));
  const setField = (id: string, value: string | string[] | null) => setDraft((current) => current && ({ ...current, fields: current.fields.map((field) => (field.id === id ? { ...field, value } : field)) }));

  return (
    <>
      <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={begin}><PencilLine aria-hidden="true" />{pending && !open ? 'Checking…' : 'Change this submission'}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Change your submission</DialogTitle>
            <DialogDescription>You can fix titles, replace files and update answers until {organizationName} starts reading. They will see what you changed and when.</DialogDescription>
          </DialogHeader>
          {draft ? (
            <div className="grid max-h-[60vh] gap-5 overflow-y-auto">
              {draft.works.map((work, index) => (
                <fieldset key={work.id} className="grid gap-3 rounded-lg border border-border p-3">
                  <legend className="px-1 text-sm font-medium text-foreground">Work {index + 1}</legend>
                  <Field>
                    <FieldLabel htmlFor={`edit-title-${work.id}`}>Title</FieldLabel>
                    <Input id={`edit-title-${work.id}`} value={work.title} maxLength={300} onChange={(event) => setWork(work.id, { title: event.target.value })} />
                  </Field>
                  <div className="grid gap-2">
                    <span className="text-sm text-foreground">Files</span>
                    {work.fileUrls.length ? <ul className="grid gap-1">{work.fileUrls.map((url) => <li key={url} className="flex items-center justify-between gap-2 text-sm"><span className="truncate">{fileLabel(url)}</span><Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${fileLabel(url)}`} onClick={() => setWork(work.id, { fileUrls: work.fileUrls.filter((item) => item !== url) })}><X aria-hidden="true" /></Button></li>)}</ul> : <p className="text-xs text-muted-foreground">No file attached.</p>}
                    <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-foreground underline underline-offset-2">
                      <Upload aria-hidden="true" className="size-4" />{uploading === work.id ? 'Uploading…' : 'Add a file'}
                      <input type="file" multiple className="sr-only" disabled={Boolean(uploading)} onChange={(event) => { const files = event.currentTarget.files; if (files) void upload(files, work.id, (urls) => setWork(work.id, { fileUrls: [...work.fileUrls, ...urls] })); event.currentTarget.value = ''; }} />
                    </label>
                  </div>
                </fieldset>
              ))}
              {draft.fields.map((field) => (
                field.type === 'text' ? (
                  <Field key={field.id}>
                    <FieldLabel htmlFor={`edit-field-${field.id}`}>{field.label}{field.required ? '' : ' (optional)'}</FieldLabel>
                    <Textarea id={`edit-field-${field.id}`} rows={3} maxLength={10_000} value={asList(field.value).join('\n')} onChange={(event) => setField(field.id, event.target.value)} />
                  </Field>
                ) : (
                  <div key={field.id} className="grid gap-2">
                    <span className="text-sm text-foreground">{field.label}{field.required ? '' : ' (optional)'}</span>
                    {asList(field.value).length ? <ul className="grid gap-1">{asList(field.value).map((url) => <li key={url} className="flex items-center justify-between gap-2 text-sm"><span className="truncate">{fileLabel(url)}</span><Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${fileLabel(url)}`} onClick={() => { const next = asList(field.value).filter((item) => item !== url); setField(field.id, next.length ? next : null); }}><X aria-hidden="true" /></Button></li>)}</ul> : <p className="text-xs text-muted-foreground">No file attached.</p>}
                    <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-foreground underline underline-offset-2">
                      <Upload aria-hidden="true" className="size-4" />{uploading === field.id ? 'Uploading…' : 'Add a file'}
                      <input type="file" multiple className="sr-only" disabled={Boolean(uploading)} onChange={(event) => { const files = event.currentTarget.files; if (files) void upload(files, field.id, (urls) => setField(field.id, [...asList(field.value), ...urls])); event.currentTarget.value = ''; }} />
                    </label>
                    {field.required ? <FieldDescription>Required. Keep at least one file.</FieldDescription> : null}
                  </div>
                )
              ))}
            </div>
          ) : null}
          {error ? <Alert variant="destructive"><AlertTitle>Not saved</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="button" onClick={save} disabled={pending || Boolean(uploading)}>{pending ? 'Saving…' : 'Save changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
