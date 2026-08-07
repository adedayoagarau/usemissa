'use client';

import { useEffect, useState } from 'react';
import { FileText, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { taxonomyLabelFor } from '@missa/taxonomy';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TaxonomyBrowsePicker } from '@/components/taxonomy-browse-picker';
import { captureProductEvent } from '@/components/analytics-provider';

type WorkAssignment = {
  termId: string;
  primary: boolean;
  assignmentOrigin: 'user' | 'import' | 'extractor' | 'organization' | 'reviewer';
};
type Work = { id: string; title: string; description?: string; fileId?: string; taxonomyAssignments?: WorkAssignment[]; updatedAt: string };
type LibraryFile = { id: string; filename: string; contentType: string; byteLength: number; createdAt: string };
type SavedAnswer = { id: string; name: string; body: string; updatedAt: string };
type Library = { works: Work[]; files: LibraryFile[]; savedAnswers: SavedAnswer[] };
type Tab = 'works' | 'files' | 'answers';

const empty: Library = { works: [], files: [], savedAnswers: [] };
const buttonClass = 'min-h-11';

function assignmentsFor(termIds: string[]): WorkAssignment[] {
  return termIds.map((termId, index) => ({ termId, primary: index === 0, assignmentOrigin: 'user' }));
}

export function LibraryClient() {
  const [tab, setTab] = useState<Tab>('works');
  const [library, setLibrary] = useState<Library>(empty);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [workTitle, setWorkTitle] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [workTaxonomyTermIds, setWorkTaxonomyTermIds] = useState<string[]>([]);
  const [answerName, setAnswerName] = useState('');
  const [answerBody, setAnswerBody] = useState('');
  const [editingWork, setEditingWork] = useState<string>();
  const [editingAnswer, setEditingAnswer] = useState<string>();

  async function load() {
    const response = await fetch('/api/me/library', { cache: 'no-store' });
    if (!response.ok) throw new Error('We could not load your Library.');
    setLibrary(await response.json() as Library);
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/me/library', { cache: 'no-store', signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<Library> : undefined)
      .then((body) => { if (body) setLibrary(body); })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  async function request(path: string, init: RequestInit, success: string) {
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const response = await fetch(path, init);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? 'We could not update your Library.');
      await load();
      setMessage(success);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not update your Library.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function addWork(event: React.FormEvent) {
    event.preventDefault();
    if (!workTitle.trim()) return;
    const ok = await request('/api/me/library/works', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: workTitle, description: workDescription, taxonomyTermIds: workTaxonomyTermIds }),
    }, 'Work saved');
    if (ok) {
      captureProductEvent('work_taxonomy_saved', { taxonomyTermCount: workTaxonomyTermIds.length });
      setWorkTitle('');
      setWorkDescription('');
      setWorkTaxonomyTermIds([]);
    }
  }

  async function addAnswer(event: React.FormEvent) {
    event.preventDefault();
    if (!answerName.trim() || !answerBody.trim()) return;
    const ok = await request('/api/me/library/saved-answers', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: answerName, body: answerBody }),
    }, 'Saved Answer saved');
    if (ok) {
      setAnswerName('');
      setAnswerBody('');
    }
  }

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append('file', file);
    await request('/api/me/library/files', { method: 'POST', body }, 'File uploaded');
    event.target.value = '';
  }

  async function remove(path: string, success: string) {
    if (!window.confirm('Delete this Library item? This cannot be undone.')) return;
    await request(path, { method: 'DELETE' }, success);
  }

  async function saveWork(work: Work) {
    const ok = await request(`/api/me/library/works/${work.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: work.title, description: work.description, taxonomyTermIds: work.taxonomyAssignments?.map((assignment) => assignment.termId) ?? [] }),
    }, 'Work updated');
    if (ok) {
      captureProductEvent('work_taxonomy_saved', { taxonomyTermCount: work.taxonomyAssignments?.length ?? 0 });
      setEditingWork(undefined);
    }
  }

  async function saveAnswer(answer: SavedAnswer) {
    const ok = await request(`/api/me/library/saved-answers/${answer.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: answer.name, body: answer.body }),
    }, 'Saved Answer updated');
    if (ok) setEditingAnswer(undefined);
  }

  const tabs: Array<[Tab, string, number]> = [
    ['works', 'Works', library.works.length],
    ['files', 'Files', library.files.length],
    ['answers', 'Saved Answers', library.savedAnswers.length],
  ];

  return <section className="mt-8 space-y-5" aria-label="Library contents">
    <div className="flex flex-wrap gap-2 border-b border-border pb-2" role="tablist" aria-label="Library sections">
      {tabs.map(([value, label, count]) => <button key={value} type="button" role="tab" aria-selected={tab === value} className={`min-h-11 rounded-lg px-3 text-sm ${tab === value ? 'bg-accent-tint font-medium text-accent-deep' : 'text-muted-foreground hover:bg-muted'}`} onClick={() => setTab(value)}>{label} <span className="ml-1 font-mono text-xs">{count}</span></button>)}
    </div>
    {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
    {message && <p role="status" aria-live="polite" className="text-sm text-green">{message}</p>}

    {tab === 'works' && <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <Card className="bg-white">
        <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="size-4" aria-hidden="true" />Add a Work</CardTitle><p className="text-sm text-muted-foreground">Keep a work’s title, context, and canonical practice terms ready for future submissions.</p></CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={addWork}>
            <Input aria-label="Work title" placeholder="Work title" value={workTitle} onChange={(event) => setWorkTitle(event.target.value)} className="min-h-11" />
            <Textarea aria-label="Work description" placeholder="Short description (optional)" value={workDescription} onChange={(event) => setWorkDescription(event.target.value)} />
            <fieldset className="space-y-2 rounded-lg border border-border p-3"><legend className="px-1 text-sm font-medium text-foreground">Work practice terms</legend><TaxonomyBrowsePicker idPrefix="new-work-taxonomy" selectedTermIds={workTaxonomyTermIds} onSelectedTermIdsChange={setWorkTaxonomyTermIds} description="These private terms help Missa explain why an opportunity may fit this Work." /></fieldset>
            <Button className={buttonClass} disabled={busy || !workTitle.trim()}>Save Work</Button>
          </form>
        </CardContent>
      </Card>
      <div className="space-y-3">
        {library.works.length === 0 ? <Empty icon={<FileText className="size-5" aria-hidden="true" />} title="No Works yet" body="Add the first work you want to keep close." /> : library.works.map((work) => editingWork === work.id ? <Card key={work.id} className="bg-white"><CardContent className="space-y-3 p-5"><Input aria-label="Edit work title" value={work.title} onChange={(event) => setLibrary((current) => ({ ...current, works: current.works.map((item) => item.id === work.id ? { ...item, title: event.target.value } : item) }))} /><Textarea aria-label="Edit work description" value={work.description ?? ''} onChange={(event) => setLibrary((current) => ({ ...current, works: current.works.map((item) => item.id === work.id ? { ...item, description: event.target.value } : item) }))} /><TaxonomyBrowsePicker idPrefix={`edit-work-${work.id}`} selectedTermIds={work.taxonomyAssignments?.map((assignment) => assignment.termId) ?? []} onSelectedTermIdsChange={(termIds) => setLibrary((current) => ({ ...current, works: current.works.map((item) => item.id === work.id ? { ...item, taxonomyAssignments: assignmentsFor(termIds) } : item) }))} /><div className="flex gap-2"><Button className={buttonClass} disabled={busy} onClick={() => void saveWork(work)}>Save changes</Button><Button type="button" variant="outline" className={buttonClass} onClick={() => setEditingWork(undefined)}>Cancel</Button></div></CardContent></Card> : <Card key={work.id} className="bg-white"><CardContent className="flex items-start justify-between gap-4 p-5"><div><h2 className="font-medium text-foreground">{work.title}</h2>{work.description && <p className="mt-1 text-sm leading-6 text-muted-foreground">{work.description}</p>}{work.taxonomyAssignments?.length ? <p className="mt-2 text-xs text-muted-foreground">Terms: {work.taxonomyAssignments.map((assignment) => taxonomyLabelFor(assignment.termId)).join(', ')}</p> : null}<p className="mt-3 font-mono text-xs text-muted-foreground">Updated {new Date(work.updatedAt).toLocaleDateString()}</p></div><div className="flex shrink-0 gap-1"><Button type="button" variant="ghost" size="icon" aria-label={`Edit ${work.title}`} onClick={() => setEditingWork(work.id)}><Pencil className="size-4" /></Button><Button type="button" variant="ghost" size="icon" aria-label={`Delete ${work.title}`} disabled={busy} onClick={() => void remove(`/api/me/library/works/${work.id}`, 'Work deleted')}><Trash2 className="size-4" /></Button></div></CardContent></Card>)}
      </div>
    </div>}

    {tab === 'files' && <div className="space-y-4"><Card className="bg-white"><CardHeader><CardTitle className="flex items-center gap-2"><Upload className="size-4" aria-hidden="true" />Add a File</CardTitle><p className="text-sm text-muted-foreground">Files are private to you and stored as metadata in Missa. Uploads require the configured private file store.</p></CardHeader><CardContent><label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted"><Upload className="mr-2 size-4" aria-hidden="true" />Choose file<input type="file" className="sr-only" onChange={(event) => void upload(event)} disabled={busy} /></label></CardContent></Card>{library.files.length === 0 ? <Empty icon={<Upload className="size-5" aria-hidden="true" />} title="No Files yet" body="Upload a private file when storage is configured." /> : <div className="grid gap-3 sm:grid-cols-2">{library.files.map((file) => <Card key={file.id} className="bg-white"><CardContent className="flex items-center justify-between gap-3 p-4"><div><p className="font-medium text-foreground">{file.filename}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{Math.ceil(file.byteLength / 1024)} KB · {file.contentType}</p></div><Button type="button" variant="ghost" size="icon" aria-label={`Delete ${file.filename}`} disabled={busy} onClick={() => void remove(`/api/me/library/files/${file.id}`, 'File deleted')}><Trash2 className="size-4" /></Button></CardContent></Card>)}</div>}</div>}

    {tab === 'answers' && <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]"><Card className="bg-white"><CardHeader><CardTitle className="flex items-center gap-2"><Plus className="size-4" aria-hidden="true" />Save an Answer</CardTitle><p className="text-sm text-muted-foreground">Reuse an artist statement, short bio, or other response.</p></CardHeader><CardContent><form className="space-y-3" onSubmit={addAnswer}><Input aria-label="Saved Answer name" placeholder="Name, e.g. Artist statement" value={answerName} onChange={(event) => setAnswerName(event.target.value)} className="min-h-11" /><Textarea aria-label="Saved Answer body" placeholder="Write the reusable answer" value={answerBody} onChange={(event) => setAnswerBody(event.target.value)} className="min-h-32" /><Button className={buttonClass} disabled={busy || !answerName.trim() || !answerBody.trim()}>Save Answer</Button></form></CardContent></Card><div className="space-y-3">{library.savedAnswers.length === 0 ? <Empty icon={<FileText className="size-5" aria-hidden="true" />} title="No Saved Answers yet" body="Save your first reusable response." /> : library.savedAnswers.map((answer) => editingAnswer === answer.id ? <Card key={answer.id} className="bg-white"><CardContent className="space-y-3 p-5"><Input aria-label="Edit Saved Answer name" value={answer.name} onChange={(event) => setLibrary((current) => ({ ...current, savedAnswers: current.savedAnswers.map((item) => item.id === answer.id ? { ...item, name: event.target.value } : item) }))} /><Textarea aria-label="Edit Saved Answer body" value={answer.body} onChange={(event) => setLibrary((current) => ({ ...current, savedAnswers: current.savedAnswers.map((item) => item.id === answer.id ? { ...item, body: event.target.value } : item) }))} className="min-h-32" /><div className="flex gap-2"><Button className={buttonClass} disabled={busy} onClick={() => void saveAnswer(answer)}>Save changes</Button><Button type="button" variant="outline" className={buttonClass} onClick={() => setEditingAnswer(undefined)}>Cancel</Button></div></CardContent></Card> : <Card key={answer.id} className="bg-white"><CardContent className="flex items-start justify-between gap-4 p-5"><div><h2 className="font-medium text-foreground">{answer.name}</h2><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{answer.body}</p><p className="mt-3 font-mono text-xs text-muted-foreground">Updated {new Date(answer.updatedAt).toLocaleDateString()}</p></div><div className="flex shrink-0 gap-1"><Button type="button" variant="ghost" size="icon" aria-label={`Edit ${answer.name}`} onClick={() => setEditingAnswer(answer.id)}><Pencil className="size-4" /></Button><Button type="button" variant="ghost" size="icon" aria-label={`Delete ${answer.name}`} disabled={busy} onClick={() => void remove(`/api/me/library/saved-answers/${answer.id}`, 'Saved Answer deleted')}><Trash2 className="size-4" /></Button></div></CardContent></Card>)}</div></div>}
  </section>;
}

function Empty({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return <Card className="border-dashed bg-white"><CardContent className="flex items-start gap-3 p-6"><span className="rounded-lg bg-muted p-2 text-muted-foreground">{icon}</span><div><p className="font-medium text-foreground">{title}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p></div></CardContent></Card>;
}
