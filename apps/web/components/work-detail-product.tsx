'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import {
  ArrowLeft,
  FileText,
  Link2,
  Pencil,
  ShieldCheck,
  Trash2,
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
import type { LibraryProductTerm } from '@/components/library-product';
import { taxonomyFacetLabel } from '@/lib/taxonomy-labels';
import styles from './work-detail-product.module.css';
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

export type WorkDetailSection = 'overview' | 'files' | 'practice' | 'history';

type FileSummary = { id: string; filename: string; contentType: string; byteLength: number; createdAt: string };
type TrackerConnection = {
  opportunityId: string;
  title: string;
  organizationName?: string;
  status: string;
  deadline?: string;
};
type ChecklistConnection = { opportunityId: string; title: string; itemCount: number };

type Props = {
  work: {
    id: string;
    revision?: number;
    title: string;
    description?: string;
    fileId?: string;
    createdAt: string;
    updatedAt: string;
    terms: LibraryProductTerm[];
  };
  currentFile?: FileSummary;
  currentFileMissing: boolean;
  files: FileSummary[];
  trackerConnections: TrackerConnection[];
  checklistConnections: ChecklistConnection[];
  returnTo: string;
  initialSection: WorkDetailSection;
  storageReady: boolean;
  /** Submissions that preserved this Work; null when snapshots are unavailable here. */
  submittedWith?: Array<{ opportunityId: string; title: string; recordedAt: string }> | null;
};

const recordHref = (opportunityId: string, section?: string) =>
  `/tracker?application=${encodeURIComponent(opportunityId)}${section ? `&section=${section}` : ''}`;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function statusLabel(value: string): string {
  return value.split('-').map((part) => part.slice(0, 1).toLocaleUpperCase() + part.slice(1)).join(' ');
}

export function WorkDetailProduct({ work, currentFile, currentFileMissing, files, trackerConnections, checklistConnections, returnTo, initialSection, storageReady, submittedWith = null }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [section, setSection] = useState(initialSection);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [title, setTitle] = useState(work.title);
  const [description, setDescription] = useState(work.description ?? '');
  const [fileId, setFileId] = useState(work.fileId ?? '');
  const [termIds, setTermIds] = useState(work.terms.map((term) => term.termId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<string>();

  const referenceCount = trackerConnections.length + checklistConnections.reduce((sum, item) => sum + item.itemCount, 0);
  const groupedTerms = work.terms.reduce<Record<string, LibraryProductTerm[]>>((groups, term) => {
    (groups[term.facet] ??= []).push(term);
    return groups;
  }, {});

  function chooseSection(next: WorkDetailSection) {
    setSection(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'overview') params.delete('section'); else params.set('section', next);
    router.replace(`/library/works/${encodeURIComponent(work.id)}?${params.toString()}`, { scroll: false });
  }

  function openEditor() {
    setTitle(work.title);
    setDescription(work.description ?? '');
    setFileId(work.fileId ?? '');
    setTermIds(work.terms.map((term) => term.termId));
    setError(undefined);
    setEditOpen(true);
  }

  async function saveWork(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    setStatus(undefined);
    try {
      const response = await fetch(`/api/me/library/works/${encodeURIComponent(work.id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', ...(work.revision ? { 'Idempotency-Key': crypto.randomUUID() } : {}) },
        body: JSON.stringify({ title, description, fileId: fileId || null, taxonomyTermIds: termIds, ...(work.revision ? { expectedRevision: work.revision } : {}) }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Couldn’t update this piece.');
      captureProductEvent('work_taxonomy_saved', { taxonomyTermCount: termIds.length });
      setEditOpen(false);
      setStatus('Work updated. Existing submission receipts were not changed.');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Couldn’t update this piece.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteWork() {
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/me/library/works/${encodeURIComponent(work.id)}`, {
        method: 'DELETE',
        headers: work.revision ? { 'content-type': 'application/json', 'Idempotency-Key': crypto.randomUUID() } : undefined,
        body: work.revision ? JSON.stringify({ expectedRevision: work.revision }) : undefined,
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Couldn’t delete this piece.');
      router.push(returnTo);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Couldn’t delete this piece.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={styles.work} aria-labelledby="work-title">
      <div className={styles.topbar}>
        <Link href={returnTo} className={buttonVariants({ variant: 'ghost' })}><ArrowLeft aria-hidden="true" />Back to Library</Link>
        <p><ShieldCheck aria-hidden="true" />Private Work</p>
      </div>

      <header className={styles.hero}>
        <span className={styles.mark} aria-hidden="true">{work.title.slice(0, 1).toLocaleUpperCase()}</span>
        <div>
          <p className={styles.eyebrow}>Private Work</p>
          <h1 id="work-title">{work.title}</h1>
          {work.description ? <p>{work.description}</p> : <p className={styles.quiet}>Add a description to tell this piece apart from others with similar titles.</p>}
          <div className={styles.heroActions}><Button type="button" onClick={openEditor}><Pencil aria-hidden="true" />Edit Work</Button>{currentFile && storageReady ? <a href={`/api/me/library/files/${encodeURIComponent(currentFile.id)}`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'outline' })}>Open current file</a> : null}</div>
        </div>
      </header>

      {status ? <p className={styles.status} role="status" aria-live="polite">{status}</p> : null}
      {error && !editOpen && !deleteOpen ? <p className={styles.error} role="alert">{error}</p> : null}

      <nav className={styles.nav} aria-label="Work detail views">
        {(['overview', 'files', 'practice', 'history'] as WorkDetailSection[]).map((item) => <Button variant="outline" size="sm" key={item} type="button" aria-current={section === item ? 'page' : undefined} onClick={() => chooseSection(item)}>{item === 'practice' ? 'Details' : item.slice(0, 1).toLocaleUpperCase() + item.slice(1)}</Button>)}
      </nav>

      {section === 'overview' ? <div className={styles.body}>
        <section>
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Current material</p><h2>{currentFile ? currentFile.filename : currentFileMissing ? 'File reference unavailable' : 'No file linked'}</h2></div><Button type="button" variant="outline" onClick={openEditor}>{currentFile ? 'Change current file' : 'Link a file'}</Button></div>
          {currentFile ? <div className={styles.fileRow}><span><FileText aria-hidden="true" /></span><div><strong>{currentFile.filename}</strong><p>{currentFile.contentType} · {formatBytes(currentFile.byteLength)} · Added {formatDate(currentFile.createdAt)}</p></div>{storageReady ? <a href={`/api/me/library/files/${encodeURIComponent(currentFile.id)}`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'outline' })}>Open</a> : <span className={styles.unavailable}>Bytes unavailable here</span>}</div> : <p className={styles.emptyCopy}>{currentFileMissing ? 'This piece still lists its old file, but Library no longer has that file’s details. Choose another current file. The missing one may already have gone out with a submission.' : 'Linking a current file helps you prepare future applications. It does not alter files already captured in a submission receipt.'}</p>}
        </section>
        <section className={styles.connectionGrid}>
          <div><p className={styles.eyebrow}>Tracker</p><strong>{trackerConnections.length} connected {trackerConnections.length === 1 ? 'opportunity' : 'opportunities'}</strong><p>Stages and deadlines remain Tracker facts.</p><Link href="/tracker?view=works" className={buttonVariants({ variant: 'link' })}>View in Tracker</Link></div>
          <div><p className={styles.eyebrow}>Preparation</p><strong>{checklistConnections.reduce((sum, item) => sum + item.itemCount, 0)} checklist {checklistConnections.reduce((sum, item) => sum + item.itemCount, 0) === 1 ? 'reference' : 'references'}</strong><p>Checklist links show where you’re preparing this piece.</p></div>
          {submittedWith ? <div><p className={styles.eyebrow}>Submitted with</p><strong>{submittedWith.length ? `${submittedWith.length} preserved ${submittedWith.length === 1 ? 'submission' : 'submissions'}` : 'Not submitted yet'}</strong><p>{submittedWith.length ? 'Each keeps the exact version you sent. Editing this piece never changes them.' : 'When you record a submission that uses this piece, the version you sent is kept there.'}</p>{submittedWith[0] ? <Link href={recordHref(submittedWith[0].opportunityId, 'materials')} className={buttonVariants({ variant: 'link' })}>Open latest snapshot</Link> : null}</div> : <div><p className={styles.eyebrow}>Submission receipts</p><strong>Not connected to Library identity</strong><p>Missa keeps receipts in Tracker, but cannot yet prove which Library revision was sent.</p><Link href="/tracker?view=submissions" className={buttonVariants({ variant: 'link' })}>View submissions</Link></div>}
        </section>
        <section>
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Work details</p><h2>How you describe this piece</h2></div><Button type="button" variant="outline" onClick={openEditor}>Edit details</Button></div>
          {work.terms.length ? <dl className={styles.taxonomy}>{Object.entries(groupedTerms).map(([facet, terms]) => <div key={facet}><dt>{taxonomyFacetLabel(facet)}</dt><dd>{terms.map((term) => term.label).join(' · ')}</dd></div>)}</dl> : <p className={styles.emptyCopy}>No details added yet. Add terms that describe this piece. They don’t decide eligibility or quality.</p>}
        </section>
      </div> : null}

      {section === 'files' ? <div className={styles.body}><section><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Current file</p><h2>{currentFile ? 'One linked file' : 'No linked file'}</h2></div><Button type="button" onClick={openEditor}>{currentFile ? 'Change file' : 'Link a file'}</Button></div><p className={styles.explainer}>This Work currently supports one current Library file. Choosing another file changes future preparation only; submitted files remain in their receipts.</p>{currentFile ? <div className={styles.fileRow}><span><FileText aria-hidden="true" /></span><div><strong>{currentFile.filename}</strong><p>{currentFile.contentType} · {formatBytes(currentFile.byteLength)} · Added {formatDate(currentFile.createdAt)}</p></div>{storageReady ? <a href={`/api/me/library/files/${encodeURIComponent(currentFile.id)}`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'outline' })}>Open</a> : <span className={styles.unavailable}>Bytes unavailable here</span>}</div> : <p className={styles.emptyCopy}>No current file is attached.</p>}</section></div> : null}

      {section === 'practice' ? <div className={styles.body}><section><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Work details</p><h2>Describe the piece, not its eligibility</h2></div><Button type="button" onClick={openEditor}>Edit details</Button></div><p className={styles.explainer}>Missa saves what you pick and shows it in plain words. No term ever becomes a quality score or an eligibility verdict.</p>{work.terms.length ? <dl className={styles.taxonomy}>{Object.entries(groupedTerms).map(([facet, terms]) => <div key={facet}><dt>{taxonomyFacetLabel(facet)}</dt><dd>{terms.map((term) => term.label).join(' · ')}</dd></div>)}</dl> : <p className={styles.emptyCopy}>No details added yet.</p>}</section></div> : null}

      {section === 'history' ? <div className={styles.body}>
        <section><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Provable Work record</p><h2>Identity and preparation connections</h2></div></div><ol className={styles.timeline}><li><span aria-hidden="true" /><div><time>{formatDate(work.updatedAt)}</time><strong>Work last updated</strong><p>Current Library identity, file link, or field description changed.</p></div></li><li><span aria-hidden="true" /><div><time>{formatDate(work.createdAt)}</time><strong>Work created</strong><p>Private Library identity established.</p></div></li></ol></section>
        <section><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Tracker connections</p><h2>{trackerConnections.length ? 'Where this piece is in use' : 'No Tracker connections'}</h2></div></div>{trackerConnections.length ? <div className={styles.connectionList}>{trackerConnections.map((connection) => <article key={connection.opportunityId}><div><h3>{connection.title}</h3><p>{connection.organizationName ?? 'Organization not listed'}</p></div><dl><div><dt>Stage</dt><dd>{statusLabel(connection.status)}</dd></div><div><dt>Deadline</dt><dd>{connection.deadline ? formatDate(connection.deadline) : 'Not listed'}</dd></div></dl><Link href={recordHref(connection.opportunityId)} className={buttonVariants({ variant: 'outline' })}>Open record</Link></article>)}</div> : <p className={styles.emptyCopy}>Link this piece from Tracker when you start preparing for a call.</p>}</section>
        {checklistConnections.length ? <section><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Preparation</p><h2>Checklist references</h2></div></div><div className={styles.connectionList}>{checklistConnections.map((connection) => <article key={connection.opportunityId}><div><h3>{connection.title}</h3><p>{connection.itemCount} linked requirement{connection.itemCount === 1 ? '' : 's'}</p></div><Link href={recordHref(connection.opportunityId, 'prepare')} className={buttonVariants({ variant: 'outline' })}>Open preparation</Link></article>)}</div></section> : null}
        {submittedWith ? <section><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Submitted with</p><h2>{submittedWith.length ? 'Preserved in these submissions' : 'Not part of a recorded submission yet'}</h2></div></div>{submittedWith.length ? <div className={styles.connectionList}>{submittedWith.map((version) => <article key={`${version.opportunityId}-${version.recordedAt}`}><div><h3>{version.title}</h3><p>Preserved {formatDate(version.recordedAt)} · later edits don’t change it</p></div><Link href={recordHref(version.opportunityId, 'materials')} className={buttonVariants({ variant: 'outline' })}>View snapshot</Link></article>)}</div> : <p className={styles.emptyCopy}>Record a submission that uses this piece, and the version you sent is kept with it.</p>}</section> : <section className={styles.historyNotice}><Link2 aria-hidden="true" /><div><h2>Missa doesn’t guess which version you sent</h2><p>It won’t match a receipt to this piece by title alone. Until submissions save which Library piece was sent, go by the receipt in Tracker.</p></div><Link href="/tracker?view=submissions" className={buttonVariants({ variant: 'outline' })}>View receipts</Link></section>}
      </div> : null}

      <section className={styles.removal} aria-labelledby="removal-title"><div><p className={styles.eyebrow}>Removal</p><h2 id="removal-title">Delete only when nothing depends on this piece</h2><p>{referenceCount ? `Detach ${trackerConnections.length} Tracker connection${trackerConnections.length === 1 ? '' : 's'} and ${checklistConnections.reduce((sum, item) => sum + item.itemCount, 0)} checklist reference${checklistConnections.reduce((sum, item) => sum + item.itemCount, 0) === 1 ? '' : 's'} first.` : 'Deleting removes this piece from Library. Its files stay in Library, and submission receipts don’t change.'}</p></div><Button type="button" variant="outline" disabled={referenceCount > 0} onClick={() => { setError(undefined); setDeleteOpen(true); }}><Trash2 aria-hidden="true" />Delete Work</Button></section>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className={styles.editDialog}>
          <form onSubmit={saveWork}>
            <DialogHeader><DialogTitle>Edit Work</DialogTitle><DialogDescription>Changes apply to this private Library Work and future preparation. Existing Organization submissions and receipts are not rewritten.</DialogDescription></DialogHeader>
            <div className={styles.formBody}>
              <div><Label htmlFor="edit-work-title">Work title</Label><Input id="edit-work-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} required /><p>{title.length}/200 characters</p></div>
              <div><Label htmlFor="edit-work-description">Description <span>Optional</span></Label><Textarea id="edit-work-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={4000} rows={5} /><p>{description.length}/4,000 characters</p></div>
              <div><Label htmlFor="edit-work-file">Current file <span>Optional</span></Label><NativeSelect id="edit-work-file" value={fileId} onChange={(event) => setFileId(event.target.value)}><NativeSelectOption value="">No current file</NativeSelectOption>{files.map((file) => <NativeSelectOption key={file.id} value={file.id}>{file.filename}</NativeSelectOption>)}</NativeSelect><p>Changing this selection does not delete the previous file or alter a submitted receipt.</p></div>
              <fieldset><legend>Work details <span>Optional · up to 32</span></legend><TaxonomyBrowsePicker idPrefix={`edit-work-${work.id}`} selectedTermIds={termIds} onSelectedTermIdsChange={setTermIds} description="Choose terms that describe the piece. They stay private and don’t decide eligibility or quality." /></fieldset>
              {error ? <p className={styles.error} role="alert">{error}</p> : null}
            </div>
            <DialogFooter><DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose><Button type="submit" disabled={busy || !title.trim()}>{busy ? 'Saving…' : 'Save changes'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete “{work.title}”?</DialogTitle><DialogDescription>This permanently removes the private Work identity and its description. Separate Library files remain. Existing submission receipts are not rewritten.</DialogDescription></DialogHeader>
          <p className={styles.deleteCopy}>This action cannot be undone. If a new Tracker or checklist link was added since this page loaded, Missa will block deletion.</p>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <DialogFooter><DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose><Button type="button" variant="destructive" disabled={busy} onClick={() => void deleteWork()}>{busy ? 'Deleting…' : 'Delete permanently'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
