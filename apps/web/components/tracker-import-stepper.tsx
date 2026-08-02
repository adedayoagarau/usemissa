'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Download, FileUp, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { ImportField, ImportMapping } from '@missa/radar-engine';

type Step = 'upload' | 'mapping' | 'review' | 'result';
type Decision = 'match' | 'create-manual' | 'keep-current' | 'use-imported' | 'skip';
type PreviewRow = {
  rowNumber: number;
  values: Record<string, string>;
  normalized: Record<string, string | number | null>;
  classification: string;
  candidates: Array<{ opportunityId: string; title: string; organizationName?: string; confidence: string; reason?: string }>;
  defaultAction: Decision | 'needs-review';
  warnings: string[];
  errors: string[];
  conflict?: { current: { status: string; submittedAt?: string }; imported: { status?: string; submittedAt?: string } };
};
type Preview = { previewToken: string; expiresAt: string; columns: string[]; detectedMapping: ImportMapping; rows: PreviewRow[]; summary: { total: number; matched: number; createManual: number; needsReview: number; skipped: number } };

const FIELDS: Array<[ImportField, string, boolean]> = [
  ['title', 'Title', true], ['organization', 'Organization', true], ['status', 'Status', true], ['deadline', 'Deadline', false], ['submittedAt', 'Submitted date', false], ['responseAt', 'Response date', false], ['work', 'Work', false], ['genre', 'Genre', false], ['fee', 'Fee', false], ['notes', 'Notes', false], ['sourceUrl', 'Source URL', false],
];

function downloadTemplate() {
  const blob = new Blob(['Title,Organization,Status,Deadline,Submitted Date,Work,Genre,Fee,Notes,URL\r\nExample call,Example organization,Saved,2026-12-31,,,,,\r\n'], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'missa-tracker-template.csv'; anchor.click(); URL.revokeObjectURL(url);
}

export function TrackerImportStepper() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File>();
  const [mapping, setMapping] = useState<ImportMapping>();
  const [preview, setPreview] = useState<Preview>();
  const [decisions, setDecisions] = useState<Record<string, Decision | { action: Decision; opportunityId?: string }>>({});
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<{ importId: string; imported: number; matched: number; createdManual: number; skipped: number; needsReview: number }>();

  function chooseFile(next?: File) { setError(undefined); if (!next) return; if (!next.name.toLowerCase().endsWith('.csv') && next.type !== 'text/csv') { setError('Choose a .csv file.'); return; } setFile(next); setPreview(undefined); setMapping(undefined); setStep('upload'); }
  async function previewFile() {
    if (!file) { setError('Choose a CSV file to continue.'); return; }
    setBusy(true); setError(undefined);
    try {
      const body = new FormData(); body.append('file', file); if (mapping) body.append('mapping', JSON.stringify(mapping));
      const response = await fetch('/api/me/imports/tracker/preview', { method: 'POST', body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? 'We could not prepare this import.');
      setPreview(data as Preview); setMapping((data as Preview).detectedMapping); setStep('mapping');
    } catch (previewError) { setError(previewError instanceof Error ? previewError.message : 'We could not prepare this import.'); }
    finally { setBusy(false); }
  }
  async function startReview() {
    if (!preview || !mapping) return;
    const missing = FIELDS.filter(([field, , required]) => required && !mapping[field]).map(([, label]) => label);
    if (missing.length) { setError(`Map required fields before continuing: ${missing.join(', ')}.`); return; }
    setBusy(true); setError(undefined);
    try {
      const body = new FormData(); body.append('file', file!); body.append('mapping', JSON.stringify(mapping));
      const response = await fetch('/api/me/imports/tracker/preview', { method: 'POST', body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? 'We could not refresh this preview.');
      const refreshed = data as Preview;
      setPreview(refreshed);
      setDecisions(Object.fromEntries(refreshed.rows.map((row) => {
        const warningNeedsAction = row.warnings.includes('formulaLike') || row.warnings.includes('ambiguousDate');
        const invalidNeedsAction = row.errors.length > 0 || row.classification === 'ambiguous';
        const defaultDecision = row.conflict && !warningNeedsAction && !invalidNeedsAction ? 'keep-current' : row.defaultAction;
        return [String(row.rowNumber), warningNeedsAction || invalidNeedsAction ? undefined : defaultDecision];
      })) as Record<string, Decision>);
      setStep('review');
    } catch (previewError) { setError(previewError instanceof Error ? previewError.message : 'We could not refresh this preview.'); }
    finally { setBusy(false); }
  }
  function updateDecision(row: PreviewRow, action: Decision, opportunityId?: string) { setDecisions((current) => ({ ...current, [String(row.rowNumber)]: opportunityId ? { action, opportunityId } : action })); }
  const visibleRows = useMemo(() => preview?.rows.filter((row) => filter === 'all' || filter === 'matched' && row.classification === 'matched' || filter === 'review' && (row.classification === 'ambiguous' || row.errors.length > 0 || row.warnings.length > 0 || row.conflict) || filter === 'create' && decisions[String(row.rowNumber)] === 'create-manual' || filter === 'skip' && decisions[String(row.rowNumber)] === 'skip') ?? [], [preview, filter, decisions]);
  const unresolved = preview?.rows.filter((row) => { const decision = decisions[String(row.rowNumber)]; return !decision && row.defaultAction !== 'skip'; }).length ?? 0;

  async function commit() {
    if (!preview || !mapping || !file || unresolved > 0) { setError('Resolve each row before importing.'); return; }
    setBusy(true); setError(undefined);
    try {
      const body = new FormData(); body.append('file', file); body.append('previewToken', preview.previewToken); body.append('mapping', JSON.stringify(mapping)); body.append('decisions', JSON.stringify(decisions));
      const response = await fetch('/api/me/imports/tracker/commit', { method: 'POST', body }); const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? 'Nothing was changed in your Tracker.');
      setResult(data); setStep('result');
    } catch (commitError) { setError(commitError instanceof Error ? commitError.message : 'Nothing was changed in your Tracker.'); }
    finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-white px-4 py-8 sm:px-6 lg:px-8"><div className="mx-auto max-w-[960px]">
    <header className="max-w-2xl"><Link href="/tracker" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" aria-hidden="true" />Back to Tracker</Link><h1 className="mt-5 font-heading text-3xl font-medium tracking-tight text-foreground">Import your tracker</h1><p className="mt-2 text-base leading-7 text-muted-foreground">Bring your submission history with you. Review every match before anything changes.</p></header>
    <nav aria-label="Import steps" className="mt-8 grid grid-cols-4 gap-2 text-xs sm:text-sm">{(['upload', 'mapping', 'review', 'result'] as Step[]).map((item, index) => <div key={item} aria-current={step === item ? 'step' : undefined} className={`border-b-2 px-1 pb-3 ${step === item ? 'border-primary font-medium text-foreground' : 'border-border text-muted-foreground'}`}><span className="font-mono">{index + 1}</span> {item === 'result' ? 'Import' : item === 'mapping' ? 'Map columns' : item[0].toUpperCase() + item.slice(1)}</div>)}</nav>
    {error && <p role="alert" className="mt-6 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"><TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{error}</p>}
    {step === 'upload' && <Card className="mt-6"><CardHeader><CardTitle>Upload a CSV</CardTitle><p className="text-sm text-muted-foreground">CSV only, up to 5 MiB and 10,000 rows. Your file is used to prepare this import and is not shared with organizations.</p></CardHeader><CardContent className="space-y-5"><div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); chooseFile(event.dataTransfer.files[0]); }} className="rounded-lg border border-dashed border-border-strong bg-white p-8 text-center"><FileUp className="mx-auto size-8 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm font-medium">Drop your CSV here</p><p className="mt-1 text-xs text-muted-foreground">or choose a file from your device</p><input ref={inputRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => chooseFile(event.target.files?.[0])} /><Button type="button" variant="outline" className="mt-4 min-h-11" onClick={() => inputRef.current?.click()}>Choose CSV</Button>{file && <p className="mt-3 text-sm text-foreground">{file.name} <span className="font-mono text-xs text-muted-foreground">({Math.ceil(file.size / 1024)} KB)</span></p>}</div><div className="flex flex-wrap gap-2"><Button type="button" disabled={!file || busy} onClick={previewFile} className="min-h-11 min-w-40">{busy ? 'Preparing…' : 'Review columns'}</Button><Button type="button" variant="outline" className="min-h-11 gap-2" onClick={downloadTemplate}><Download className="size-4" aria-hidden="true" />Download CSV template</Button></div></CardContent></Card>}
    {step === 'mapping' && preview && mapping && <Card className="mt-6"><CardHeader><CardTitle>Map columns</CardTitle><p className="text-sm text-muted-foreground">Missa detected these columns. Required fields must be mapped before review.</p></CardHeader><CardContent className="space-y-3">{FIELDS.map(([field, label, required]) => <div key={field} className="grid gap-2 border-b border-border py-3 sm:grid-cols-[1fr_1fr] sm:items-center"><Label htmlFor={`mapping-${field}`}>{label}{required ? ' (required)' : ''}</Label><select id={`mapping-${field}`} value={mapping[field] ?? ''} onChange={(event) => setMapping({ ...mapping, [field]: event.target.value || null })} className="h-11 rounded-lg border border-border-strong bg-white px-3 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-primary"> <option value="">Not mapped</option>{preview.columns.map((column) => <option key={column} value={column}>{column}</option>)}</select></div>)}<div className="flex flex-wrap gap-2 pt-3"><Button type="button" variant="outline" className="min-h-11" onClick={() => setStep('upload')}>Back</Button><Button type="button" disabled={busy} className="min-h-11 min-w-40" onClick={startReview}>{busy ? 'Refreshing…' : 'Preview matches'}</Button></div></CardContent></Card>}
    {step === 'review' && preview && mapping && <Card className="mt-6"><CardHeader><CardTitle>Review before importing</CardTitle><p aria-live="polite" className="text-sm text-muted-foreground">Found {preview.summary.matched} matches · Will create {preview.summary.createManual} · Needs review {unresolved} · Will skip {preview.summary.skipped}. Nothing changes until you confirm.</p><div className="flex flex-wrap gap-2 pt-3">{[['all', 'All'], ['matched', 'Matched'], ['review', 'Needs review'], ['create', 'Will create'], ['skip', 'Will skip']].map(([value, label]) => <Button key={value} type="button" variant={filter === value ? 'secondary' : 'ghost'} className="min-h-11" onClick={() => setFilter(value)}>{label}</Button>)}</div></CardHeader><CardContent className="space-y-3">{visibleRows.map((row) => { const value = decisions[String(row.rowNumber)]; const selected = typeof value === 'object' ? value.opportunityId : row.candidates[0]?.opportunityId; return <div key={row.rowNumber} className="rounded-lg border border-border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-xs text-muted-foreground">Row {row.rowNumber}</p><p className="mt-1 font-medium text-foreground">{row.values.title || 'Untitled row'}</p><p className="text-sm text-muted-foreground">{row.values.organization || 'Organization not mapped'} · {row.values.status || 'Status not mapped'}</p></div><Badge variant="outline">{row.classification}</Badge></div>{row.candidates.length > 0 && <div className="mt-4"><Label htmlFor={`candidate-${row.rowNumber}`}>Radar match</Label><select id={`candidate-${row.rowNumber}`} value={selected ?? ''} onChange={(event) => updateDecision(row, 'match', event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-border-strong bg-white px-3 text-sm"><option value="">Choose a candidate</option>{row.candidates.map((candidate) => <option key={candidate.opportunityId} value={candidate.opportunityId}>{candidate.title} · {candidate.confidence}</option>)}</select></div>}{row.warnings.length > 0 && <p className="mt-3 text-sm text-amber-700">Review: {row.warnings.join(', ')}</p>}{row.errors.length > 0 && <p className="mt-3 text-sm text-destructive">{row.errors.join(' ')}</p>}{row.conflict && <p className="mt-3 text-sm text-amber-700">Already tracked: current {row.conflict.current.status}; imported {row.conflict.imported.status ?? 'unknown'}.</p>}<div className="mt-4 flex flex-wrap gap-2"><Button type="button" variant={value === 'create-manual' ? 'secondary' : 'outline'} className="min-h-11" onClick={() => updateDecision(row, 'create-manual')}>Create manual entry</Button>{row.candidates.length > 0 && <><Button type="button" variant={value === 'use-imported' ? 'secondary' : 'outline'} className="min-h-11" onClick={() => updateDecision(row, 'use-imported', selected)}>Use imported</Button><Button type="button" variant={value === 'keep-current' ? 'secondary' : 'outline'} className="min-h-11" onClick={() => updateDecision(row, 'keep-current', selected)}>Keep current</Button></>}<Button type="button" variant={value === 'skip' ? 'secondary' : 'ghost'} className="min-h-11" onClick={() => updateDecision(row, 'skip')}>Skip row</Button></div></div>})}{visibleRows.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No rows in this view.</p>}<div className="flex flex-wrap justify-between gap-2 border-t border-border pt-5"><Button type="button" variant="outline" className="min-h-11" onClick={() => setStep('mapping')}>Back</Button><Button type="button" disabled={busy || unresolved > 0} onClick={commit} className="min-h-11 min-w-48">{busy ? 'Importing…' : `Import ${preview.rows.length - unresolved} rows`}</Button></div></CardContent></Card>}
    {step === 'result' && result && <Card className="mt-6"><CardContent className="space-y-5 pt-6"><CheckCircle2 className="size-8 text-green" aria-hidden="true" /><div><h2 className="font-heading text-xl font-medium text-foreground">Import complete</h2><p aria-live="polite" className="mt-2 text-sm text-muted-foreground">{result.imported} rows added to your private Tracker. Nothing was shared with organizations.</p></div><dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4"><div><dt className="text-muted-foreground">Matched</dt><dd className="font-mono text-lg">{result.matched}</dd></div><div><dt className="text-muted-foreground">Manual entries</dt><dd className="font-mono text-lg">{result.createdManual}</dd></div><div><dt className="text-muted-foreground">Skipped</dt><dd className="font-mono text-lg">{result.skipped}</dd></div><div><dt className="text-muted-foreground">Needs review</dt><dd className="font-mono text-lg">{result.needsReview}</dd></div></dl><div className="flex flex-wrap gap-2"><Button render={<Link href="/tracker" />} className="min-h-11">Review imported rows</Button><Button variant="outline" render={<Link href="/tracker" />} className="min-h-11">Back to Tracker</Button></div></CardContent></Card>}
  </div></main>;
}
