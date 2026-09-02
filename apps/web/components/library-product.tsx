'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  BookOpenText,
  ChevronDown,
  Copy,
  File,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  FolderOpen,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TaxonomyBrowsePicker } from '@/components/taxonomy-browse-picker';
import { captureProductEvent } from '@/components/analytics-provider';
import styles from './library-product.module.css';

export type LibraryProductView = 'works' | 'files' | 'answers';
export type LibraryProductSort = 'updated' | 'title';

export type LibraryProductTerm = {
  termId: string;
  label: string;
  facet: string;
};

export type LibraryProductWork = {
  id: string;
  revision?: number;
  title: string;
  description?: string;
  updatedAt: string;
  file?: { id: string; filename: string; contentType: string; byteLength: number };
  terms: LibraryProductTerm[];
  trackerCount: number;
  checklistCount: number;
};

export type LibraryProductFile = {
  id: string;
  revision?: number;
  filename: string;
  contentType: string;
  byteLength: number;
  createdAt: string;
  linkedWorks: Array<{ id: string; title: string }>;
  checklistCount: number;
};

export type LibraryProductAnswer = {
  id: string;
  revision?: number;
  name: string;
  body: string;
  updatedAt: string;
  checklistCount: number;
};

type DeleteTarget =
  | { kind: 'file'; id: string; revision?: number; name: string; linkedWorks: number; checklists: number }
  | { kind: 'answer'; id: string; revision?: number; name: string; linkedWorks: 0; checklists: number };

type Props = {
  works: LibraryProductWork[];
  files: LibraryProductFile[];
  answers: LibraryProductAnswer[];
  initialView: LibraryProductView;
  initialSort: LibraryProductSort;
  initialQuery: string;
  storageReady: boolean;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function words(value: string): number {
  return value.trim() ? value.trim().split(/\s+/u).length : 0;
}

function FileGlyph({ contentType }: { contentType: string }) {
  if (contentType.startsWith('image/')) return <FileImage aria-hidden="true" />;
  if (contentType.startsWith('audio/')) return <FileAudio aria-hidden="true" />;
  if (contentType.startsWith('video/')) return <FileVideo aria-hidden="true" />;
  if (contentType === 'application/pdf' || contentType.startsWith('text/')) return <FileText aria-hidden="true" />;
  return <File aria-hidden="true" />;
}

function excerpt(value: string, max = 180): string {
  const compact = value.replace(/\s+/gu, ' ').trim();
  return compact.length > max ? `${compact.slice(0, max - 1)}…` : compact;
}

export function LibraryProduct({ works, files, answers, initialView, initialSort, initialQuery, storageReady }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setViewState] = useState(initialView);
  const [sort, setSortState] = useState(initialSort);
  const [query, setQuery] = useState(initialQuery);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<string>();
  const [workTitle, setWorkTitle] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [workFileId, setWorkFileId] = useState('');
  const [workTermIds, setWorkTermIds] = useState<string[]>([]);
  const [answerName, setAnswerName] = useState('');
  const [answerBody, setAnswerBody] = useState('');
  const [uploadFile, setUploadFile] = useState<File>();

  function writeUrl(next: { view?: LibraryProductView; sort?: LibraryProductSort; q?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextView = next.view ?? view;
    const nextSort = next.sort ?? sort;
    const nextQuery = next.q ?? query;
    if (nextView === 'works') params.delete('view'); else params.set('view', nextView);
    if (nextSort === 'updated') params.delete('sort'); else params.set('sort', nextSort);
    if (nextQuery.trim()) params.set('q', nextQuery.trim().slice(0, 200)); else params.delete('q');
    const value = params.toString();
    router.replace(value ? `/library?${value}` : '/library', { scroll: false });
  }

  function setView(next: LibraryProductView) {
    setViewState(next);
    setError(undefined);
    writeUrl({ view: next });
  }

  function setSort(next: LibraryProductSort) {
    setSortState(next);
    writeUrl({ sort: next });
  }

  const needle = query.trim().toLocaleLowerCase();
  const visibleWorks = useMemo(() => {
    const filtered = needle
      ? works.filter((work) => `${work.title} ${work.description ?? ''} ${work.file?.filename ?? ''} ${work.terms.map((term) => term.label).join(' ')}`.toLocaleLowerCase().includes(needle))
      : works;
    return [...filtered].sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title) : b.updatedAt.localeCompare(a.updatedAt));
  }, [needle, sort, works]);
  const visibleFiles = useMemo(() => {
    const filtered = needle ? files.filter((file) => file.filename.toLocaleLowerCase().includes(needle)) : files;
    return [...filtered].sort((a, b) => sort === 'title' ? a.filename.localeCompare(b.filename) : b.createdAt.localeCompare(a.createdAt));
  }, [files, needle, sort]);
  const visibleAnswers = useMemo(() => {
    const filtered = needle ? answers.filter((answer) => answer.name.toLocaleLowerCase().includes(needle)) : answers;
    return [...filtered].sort((a, b) => sort === 'title' ? a.name.localeCompare(b.name) : b.updatedAt.localeCompare(a.updatedAt));
  }, [answers, needle, sort]);

  const count = view === 'works' ? visibleWorks.length : view === 'files' ? visibleFiles.length : visibleAnswers.length;
  const total = view === 'works' ? works.length : view === 'files' ? files.length : answers.length;
  const createLabel = view === 'works' ? 'New Work' : view === 'files' ? 'Upload file' : 'New Saved Answer';

  async function submitCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    setStatus(undefined);
    try {
      let response: Response;
      if (view === 'works') {
        response = await fetch('/api/me/library/works', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
          body: JSON.stringify({
            title: workTitle,
            description: workDescription,
            fileId: workFileId || undefined,
            taxonomyTermIds: workTermIds,
          }),
        });
      } else if (view === 'answers') {
        response = await fetch('/api/me/library/saved-answers', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
          body: JSON.stringify({ name: answerName, body: answerBody }),
        });
      } else {
        const data = new FormData();
        if (uploadFile) data.append('file', uploadFile);
        response = await fetch('/api/me/library/files', { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: data });
      }
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'We could not update your Library.');
      if (view === 'works') captureProductEvent('work_taxonomy_saved', { taxonomyTermCount: workTermIds.length });
      setCreateOpen(false);
      setWorkTitle('');
      setWorkDescription('');
      setWorkFileId('');
      setWorkTermIds([]);
      setAnswerName('');
      setAnswerBody('');
      setUploadFile(undefined);
      setStatus(view === 'works' ? 'Work created.' : view === 'files' ? 'File uploaded.' : 'Saved Answer created.');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not update your Library.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem() {
    if (!deleteTarget) return;
    setBusy(true);
    setError(undefined);
    try {
      const path = deleteTarget.kind === 'file'
        ? `/api/me/library/files/${encodeURIComponent(deleteTarget.id)}`
        : `/api/me/library/saved-answers/${encodeURIComponent(deleteTarget.id)}`;
      const response = await fetch(path, {
        method: 'DELETE',
        headers: deleteTarget.revision ? { 'content-type': 'application/json', 'Idempotency-Key': crypto.randomUUID() } : undefined,
        body: deleteTarget.revision ? JSON.stringify({ expectedRevision: deleteTarget.revision }) : undefined,
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'We could not delete that item.');
      setStatus(`${deleteTarget.name} deleted.`);
      setDeleteTarget(undefined);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not delete that item.');
    } finally {
      setBusy(false);
    }
  }

  async function copyAnswer(answer: LibraryProductAnswer) {
    try {
      await navigator.clipboard.writeText(answer.body);
      setStatus(`${answer.name} copied.`);
    } catch {
      setError('Your browser did not allow copying. Open the answer and copy the text manually.');
    }
  }

  function workHref(workId: string): string {
    const params = new URLSearchParams();
    if (view !== 'works') params.set('view', view);
    if (sort !== 'updated') params.set('sort', sort);
    if (query.trim()) params.set('q', query.trim().slice(0, 200));
    const returnTo = params.toString() ? `/library?${params}` : '/library';
    return `/library/works/${encodeURIComponent(workId)}?from=${encodeURIComponent(returnTo)}`;
  }

  return (
    <section className={styles.library} aria-labelledby="library-title">
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Private creative archive</p>
          <h1 id="library-title">Library</h1>
          <p>Find the Work, file, or reusable answer you need without changing what an Organization already received.</p>
        </div>
        <Button type="button" onClick={() => { setError(undefined); setCreateOpen(true); }}><Plus aria-hidden="true" />{createLabel}</Button>
      </header>

      <div className={styles.viewBar}>
        <nav aria-label="Library views">
          {([
            ['works', 'Works', works.length],
            ['files', 'Files', files.length],
            ['answers', 'Saved Answers', answers.length],
          ] as Array<[LibraryProductView, string, number]>).map(([id, label, itemCount]) => (
            <button key={id} type="button" aria-current={view === id ? 'page' : undefined} onClick={() => setView(id)}>
              {label}<span>{itemCount}</span>
            </button>
          ))}
        </nav>
        <p><ShieldCheck aria-hidden="true" />Private by default</p>
      </div>

      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {status ? <p className={styles.status} role="status" aria-live="polite">{status}</p> : null}

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <span>Search {view === 'answers' ? 'Saved Answers' : view}</span>
          <span><Search aria-hidden="true" /><Input type="search" value={query} onChange={(event) => { const next = event.target.value; setQuery(next); writeUrl({ q: next }); }} placeholder={view === 'works' ? 'Title, file, or field term' : view === 'files' ? 'Filename' : 'Saved Answer name'} /></span>
        </label>
        <label className={styles.sort}>
          <span>Sort</span>
          <span><select value={sort} onChange={(event) => setSort(event.target.value as LibraryProductSort)}><option value="updated">Recently updated</option><option value="title">Title A–Z</option></select><ChevronDown aria-hidden="true" /></span>
        </label>
      </div>

      <div className={styles.resultMeta}><p>{query.trim() ? `${count} matching` : total} {view === 'answers' ? 'Saved Answers' : view}</p><span>{query.trim() ? `Search: ${query.trim()}` : 'All items'}</span></div>

      {view === 'works' ? (
        visibleWorks.length ? <div className={styles.results}>{visibleWorks.map((work) => (
          <article key={work.id} className={styles.workRow}>
            <span className={styles.workMark} aria-hidden="true">{work.title.slice(0, 1).toLocaleUpperCase()}</span>
            <div className={styles.identity}>
              <p>{work.terms.slice(0, 2).map((term) => term.label).join(' · ') || 'Field not described yet'}</p>
              <h2>{work.title}</h2>
              {work.description ? <p>{excerpt(work.description)}</p> : <p className={styles.quiet}>No description yet.</p>}
              {work.terms.length ? <div className={styles.terms} aria-label={`Field terms for ${work.title}`}>{work.terms.slice(0, 4).map((term) => <span key={term.termId}>{term.label}</span>)}</div> : null}
            </div>
            <dl className={styles.facts}>
              <div><dt>Current file</dt><dd>{work.file?.filename ?? 'No file linked'}</dd></div>
              <div><dt>Connections</dt><dd>{work.trackerCount} Tracker · {work.checklistCount} checklist</dd></div>
              <div><dt>Updated</dt><dd>{formatDate(work.updatedAt)}</dd></div>
            </dl>
            <Link href={workHref(work.id)} className={buttonVariants({ variant: 'outline' })}>Open Work</Link>
          </article>
        ))}</div> : <EmptyState icon={<FolderOpen aria-hidden="true" />} title={query.trim() ? `No Works match “${query.trim()}”` : 'Begin with a Work, not a folder'} body={query.trim() ? 'Clear search or try a title, filename, or field term.' : 'A Work keeps its current file, field terms, and preparation connections together.'} action={query.trim() ? <Button type="button" variant="outline" onClick={() => setQuery('')}>Clear search</Button> : <Button type="button" onClick={() => setCreateOpen(true)}><Plus aria-hidden="true" />Create your first Work</Button>} />
      ) : null}

      {view === 'files' ? (
        visibleFiles.length ? <div className={styles.results}>{visibleFiles.map((file) => (
          <article key={file.id} className={styles.resourceRow}>
            <span className={styles.resourceIcon}><FileGlyph contentType={file.contentType} /></span>
            <div className={styles.identity}><h2>{file.filename}</h2><p>{file.linkedWorks.length ? `Linked to ${file.linkedWorks.map((work) => work.title).join(', ')}` : 'Not linked to a Work'}</p></div>
            <dl className={styles.facts}><div><dt>Size</dt><dd>{formatBytes(file.byteLength)}</dd></div><div><dt>Added</dt><dd>{formatDate(file.createdAt)}</dd></div><div><dt>Preparation</dt><dd>{file.checklistCount} checklist reference{file.checklistCount === 1 ? '' : 's'}</dd></div></dl>
            <div className={styles.actions}>
              {storageReady ? <a href={`/api/me/library/files/${encodeURIComponent(file.id)}`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'outline' })}>Open file</a> : <Button type="button" variant="outline" disabled>File unavailable</Button>}
              <Button type="button" variant="ghost" size="icon" aria-label={`Delete ${file.filename}`} onClick={() => setDeleteTarget({ kind: 'file', id: file.id, revision: file.revision, name: file.filename, linkedWorks: file.linkedWorks.length, checklists: file.checklistCount })}><Trash2 aria-hidden="true" /></Button>
            </div>
          </article>
        ))}</div> : <EmptyState icon={<Upload aria-hidden="true" />} title={query.trim() ? `No files match “${query.trim()}”` : 'No files yet'} body={query.trim() ? 'Clear search or try part of the filename.' : storageReady ? 'Upload a private file, then attach it to a Work.' : 'Private file storage is unavailable in this environment. Your Works and Saved Answers are still available.'} action={query.trim() ? <Button type="button" variant="outline" onClick={() => setQuery('')}>Clear search</Button> : storageReady ? <Button type="button" onClick={() => setCreateOpen(true)}><Upload aria-hidden="true" />Upload file</Button> : undefined} />
      ) : null}

      {view === 'answers' ? (
        visibleAnswers.length ? <div className={styles.results}>{visibleAnswers.map((answer) => (
          <article key={answer.id} className={styles.answerRow}>
            <span className={styles.resourceIcon}><BookOpenText aria-hidden="true" /></span>
            <div className={styles.identity}><h2>{answer.name}</h2><p>{excerpt(answer.body)}</p><span>{words(answer.body)} words · Updated {formatDate(answer.updatedAt)}</span></div>
            <div className={styles.actions}>
              <Button type="button" variant="outline" onClick={() => void copyAnswer(answer)}><Copy aria-hidden="true" />Copy</Button>
              <Button type="button" variant="ghost" size="icon" aria-label={`Delete ${answer.name}`} onClick={() => setDeleteTarget({ kind: 'answer', id: answer.id, revision: answer.revision, name: answer.name, linkedWorks: 0, checklists: answer.checklistCount })}><Trash2 aria-hidden="true" /></Button>
            </div>
          </article>
        ))}</div> : <EmptyState icon={<BookOpenText aria-hidden="true" />} title={query.trim() ? `No Saved Answers match “${query.trim()}”` : 'No Saved Answers yet'} body={query.trim() ? 'Clear search or try the answer name.' : 'Save a biography, statement, or recurring response you want to adapt later.'} action={query.trim() ? <Button type="button" variant="outline" onClick={() => setQuery('')}>Clear search</Button> : <Button type="button" onClick={() => setCreateOpen(true)}><Plus aria-hidden="true" />Create a Saved Answer</Button>} />
      ) : null}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className={view === 'works' ? styles.createDialog : undefined}>
          <form onSubmit={submitCreate}>
            <DialogHeader>
              <DialogTitle>{createLabel}</DialogTitle>
              <DialogDescription>{view === 'works' ? 'Create one private creative object. Files and field terms can be changed later without changing a submitted receipt.' : view === 'files' ? 'Upload one private file up to 100 MiB.' : 'Save reusable text privately. Reusing it later creates a separate submission answer.'}</DialogDescription>
            </DialogHeader>
            <div className={styles.formBody}>
              {view === 'works' ? <>
                <div><Label htmlFor="new-work-title">Work title</Label><Input id="new-work-title" value={workTitle} onChange={(event) => setWorkTitle(event.target.value)} maxLength={200} required /><p>{workTitle.length}/200 characters</p></div>
                <div><Label htmlFor="new-work-description">Description <span>Optional</span></Label><Textarea id="new-work-description" value={workDescription} onChange={(event) => setWorkDescription(event.target.value)} maxLength={4000} rows={4} /><p>{workDescription.length}/4,000 characters</p></div>
                <div><Label htmlFor="new-work-file">Current file <span>Optional</span></Label><select id="new-work-file" value={workFileId} onChange={(event) => setWorkFileId(event.target.value)}><option value="">No file yet</option>{files.map((file) => <option key={file.id} value={file.id}>{file.filename}</option>)}</select><p>Only the current file is linked today. Submitted files remain in their receipts.</p></div>
                <fieldset><legend>Field terms <span>Optional · up to 32</span></legend><TaxonomyBrowsePicker idPrefix="create-library-work" selectedTermIds={workTermIds} onSelectedTermIdsChange={setWorkTermIds} description="Describe the Work across independent facets. These terms stay private and do not determine eligibility or quality." /></fieldset>
              </> : null}
              {view === 'files' ? <div><Label htmlFor="library-file">Choose file</Label><Input id="library-file" type="file" disabled={!storageReady || busy} onChange={(event) => setUploadFile(event.target.files?.[0])} required /><p>{storageReady ? '1 byte to 100 MiB. Preview support depends on file type.' : 'Private file storage is unavailable in this environment.'}</p></div> : null}
              {view === 'answers' ? <><div><Label htmlFor="answer-name">Saved Answer name</Label><Input id="answer-name" value={answerName} onChange={(event) => setAnswerName(event.target.value)} maxLength={120} required /><p>{answerName.length}/120 characters</p></div><div><Label htmlFor="answer-body">Answer</Label><Textarea id="answer-body" value={answerBody} onChange={(event) => setAnswerBody(event.target.value)} maxLength={20000} rows={9} required /><p>{answerBody.length}/20,000 characters · {words(answerBody)} words</p></div></> : null}
              {error ? <p className={styles.error} role="alert">{error}</p> : null}
            </div>
            <DialogFooter><DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose><Button type="submit" disabled={busy || (view === 'works' ? !workTitle.trim() : view === 'files' ? !storageReady || !uploadFile : !answerName.trim() || !answerBody.trim())}>{busy ? 'Saving…' : view === 'works' ? 'Create Work' : view === 'files' ? 'Upload file' : 'Save Answer'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(undefined); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete {deleteTarget?.kind === 'file' ? 'file' : 'Saved Answer'}?</DialogTitle><DialogDescription>This removes “{deleteTarget?.name}” from your private Library. Historical submission receipts are separate and are not rewritten.</DialogDescription></DialogHeader>
          {deleteTarget && (deleteTarget.linkedWorks || deleteTarget.checklists) ? <p className={styles.blockedDelete} role="alert">Deletion is unavailable while this item is linked to {deleteTarget.linkedWorks ? `${deleteTarget.linkedWorks} Work${deleteTarget.linkedWorks === 1 ? '' : 's'}` : ''}{deleteTarget.linkedWorks && deleteTarget.checklists ? ' and ' : ''}{deleteTarget.checklists ? `${deleteTarget.checklists} preparation checklist${deleteTarget.checklists === 1 ? '' : 's'}` : ''}. Detach those private references first.</p> : <p className={styles.deleteCopy}>This action cannot be undone. The stored file bytes are also removed when file storage is available.</p>}
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <DialogFooter><DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose><Button type="button" variant="destructive" disabled={busy || Boolean(deleteTarget && (deleteTarget.linkedWorks || deleteTarget.checklists))} onClick={() => void deleteItem()}>{busy ? 'Deleting…' : 'Delete permanently'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function EmptyState({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
  return <section className={styles.empty}><span>{icon}</span><h2>{title}</h2><p>{body}</p>{action ? <div>{action}</div> : null}</section>;
}
