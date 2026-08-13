'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Download,
  FileText,
  FileUp,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
  Tags,
} from 'lucide-react';
import type { ImportField, ImportMapping, ImportRowDecision, ImportTaxonomyDecision } from '@missa/radar-engine';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import styles from './tracker-import-stepper.module.css';

type Step = 'upload' | 'mapping' | 'review' | 'confirm' | 'result';
type Candidate = {
  opportunityId: string;
  title: string;
  organizationName?: string;
  matchKind: 'exact-source-url' | 'possible';
  reasons: string[];
};
type TaxonomyReview = {
  sourcePhrase: string;
  status: 'resolved' | 'ambiguous' | 'unresolved';
  options: Array<{ termId: string; facet: string; label: string }>;
};
type PreviewRow = {
  rowNumber: number;
  values: Partial<Record<ImportField, string>>;
  state: 'exact-match' | 'possible-match' | 'no-match' | 'needs-correction' | 'duplicate-row';
  candidates: Candidate[];
  defaultAction: 'match' | 'create-manual' | 'skip' | 'needs-review';
  warnings: string[];
  errors: string[];
  taxonomy?: TaxonomyReview;
  conflict?: { current: { status: string; submittedAt?: string }; imported: { status?: string; submittedAt?: string } };
};
type Preview = {
  previewToken: string;
  expiresAt: string;
  columns: string[];
  detectedMapping: ImportMapping;
  rows: PreviewRow[];
  summary: { total: number; matched: number; createManual: number; needsReview: number; taxonomyReview: number; skipped: number };
};
type ImportResult = {
  importId: string;
  imported: number;
  matched: number;
  createdManual: number;
  skipped: number;
  needsReview: number;
  unresolvedTaxonomy: number;
};

const STEPS: Array<{ id: Step; label: string }> = [
  { id: 'upload', label: 'Choose file' },
  { id: 'mapping', label: 'Map columns' },
  { id: 'review', label: 'Review rows' },
  { id: 'confirm', label: 'Confirm' },
  { id: 'result', label: 'Receipt' },
];

const FIELDS: Array<[ImportField, string, boolean]> = [
  ['title', 'Opportunity title', true],
  ['organization', 'Organization', true],
  ['status', 'Tracker status', true],
  ['deadline', 'Deadline', false],
  ['submittedAt', 'Submitted date', false],
  ['responseAt', 'Response date', false],
  ['work', 'Work title', false],
  ['genre', 'Legacy field or genre', false],
  ['fee', 'Fee', false],
  ['notes', 'Private notes', false],
  ['sourceUrl', 'Official source URL', false],
];

const stateLabels: Record<PreviewRow['state'], string> = {
  'exact-match': 'Exact source match',
  'possible-match': 'Possible match',
  'no-match': 'No published match',
  'needs-correction': 'Needs correction',
  'duplicate-row': 'Duplicate CSV row',
};

const facetLabels: Record<string, string> = {
  'practice-family': 'Field', discipline: 'Discipline', form: 'Form', genre: 'Genre', subgenre: 'Subgenre', medium: 'Medium', technique: 'Technique or process', mode: 'Mode or approach', role: 'Role', theme: 'Theme or subject', audience: 'Audience', language: 'Language',
};

function warningText(warning: string): string | undefined {
  if (warning === 'formulaLike') return 'Formula-like text is inert. Confirm how to handle this row.';
  if (warning === 'ambiguousDate') return 'A date can be read more than one way. Confirm the row or skip it.';
  if (warning === 'unknownStatus') return 'The imported status is not a Missa Tracker status.';
  if (warning === 'duplicate') return 'This row repeats an earlier CSV row.';
  return undefined;
}

function downloadTemplate() {
  const blob = new Blob(['Title,Organization,Status,Deadline,Submitted Date,Work,Legacy Field,Fee,Notes,URL\r\nExample call,Example organization,Saved,2026-12-31,,,,,,\r\n'], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'missa-tracker-template.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

function initialDecision(row: PreviewRow): ImportRowDecision | undefined {
  if (row.state === 'duplicate-row') return 'skip';
  if (row.errors.length || row.warnings.some((warning) => warning !== 'taxonomyReview') || row.taxonomy || row.conflict) return undefined;
  if (row.state === 'exact-match' && row.candidates[0]) return { action: 'match', opportunityId: row.candidates[0].opportunityId };
  if (row.state === 'no-match') return 'create-manual';
  return undefined;
}

function decisionAction(decision: ImportRowDecision | undefined): string | undefined {
  return typeof decision === 'string' ? decision : decision?.action;
}

function decisionTaxonomy(decision: ImportRowDecision | undefined): ImportTaxonomyDecision | undefined {
  return typeof decision === 'object' ? decision.taxonomy : undefined;
}

function selectedTaxonomyTermId(decision: ImportRowDecision | undefined): string | undefined {
  const taxonomy = decisionTaxonomy(decision);
  return taxonomy?.action === 'use-term' ? taxonomy.termId : undefined;
}

function decisionDateLocale(decision: ImportRowDecision | undefined): 'mdy' | 'dmy' | undefined {
  return typeof decision === 'object' ? decision.dateLocale : undefined;
}

function retainedDecisionContext(decision: ImportRowDecision | undefined) {
  const taxonomy = decisionTaxonomy(decision);
  const dateLocale = decisionDateLocale(decision);
  return { ...(taxonomy ? { taxonomy } : {}), ...(dateLocale ? { dateLocale } : {}) };
}

function isResolved(row: PreviewRow, decision: ImportRowDecision | undefined): boolean {
  const action = decisionAction(decision);
  if (!action) return false;
  if (action === 'skip') return true;
  if (row.errors.length || row.state === 'needs-correction' || row.state === 'duplicate-row') return false;
  if (row.state === 'possible-match' && typeof decision !== 'object' && action !== 'create-manual') return false;
  if (['match', 'keep-current', 'use-imported'].includes(action) && (typeof decision !== 'object' || !decision.opportunityId)) return false;
  if (row.warnings.includes('ambiguousDate') && action !== 'keep-current' && !decisionDateLocale(decision)) return false;
  if (row.taxonomy && !decisionTaxonomy(decision)) return false;
  if (action === 'create-manual' && decisionTaxonomy(decision)?.action === 'use-opportunity') return false;
  return true;
}

function ImportSteps({ step }: { step: Step }) {
  const current = STEPS.findIndex((item) => item.id === step);
  return (
    <nav className={styles.steps} aria-label="Import progress">
      <ol>{STEPS.map((item, index) => <li key={item.id} aria-current={item.id === step ? 'step' : undefined} data-complete={index < current}><span>{index < current ? <Check aria-hidden="true" /> : index + 1}</span><strong>{item.label}</strong></li>)}</ol>
    </nav>
  );
}

export function TrackerImportStepper() {
  const inputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const idempotencyReceipt = useRef<string | undefined>(undefined);
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File>();
  const [mapping, setMapping] = useState<ImportMapping>();
  const [preview, setPreview] = useState<Preview>();
  const [decisions, setDecisions] = useState<Record<string, ImportRowDecision>>({});
  const [filter, setFilter] = useState<'all' | 'review' | 'exact' | 'manual' | 'skip'>('all');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<ImportResult>();

  function announceError(message: string) {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  }

  function chooseFile(next?: File) {
    setError(undefined);
    if (!next) return;
    if (!next.name.toLowerCase().endsWith('.csv') && next.type !== 'text/csv') {
      announceError('Choose a .csv file. Nothing was uploaded or changed.');
      return;
    }
    if (next.size > 5 * 1024 * 1024) {
      announceError('Choose a CSV no larger than 5 MiB. Nothing was uploaded or changed.');
      return;
    }
    setFile(next);
    setPreview(undefined);
    setMapping(undefined);
    setDecisions({});
    setResult(undefined);
    idempotencyReceipt.current = undefined;
    setStep('upload');
  }

  async function requestPreview(nextMapping?: ImportMapping) {
    if (!file) throw new Error('Choose a CSV file to continue.');
    const body = new FormData();
    body.append('file', file);
    if (nextMapping) body.append('mapping', JSON.stringify(nextMapping));
    const response = await fetch('/api/me/imports/tracker/preview', { method: 'POST', body });
    const data = await response.json().catch(() => ({})) as Preview & { error?: string };
    if (!response.ok) throw new Error(data.error ?? 'We could not prepare this import. Nothing changed in your Tracker.');
    return data;
  }

  async function previewFile() {
    setBusy(true); setError(undefined);
    try {
      const next = await requestPreview();
      setPreview(next); setMapping(next.detectedMapping); setStep('mapping');
    } catch (caught) { announceError(caught instanceof Error ? caught.message : 'We could not prepare this import. Nothing changed in your Tracker.'); }
    finally { setBusy(false); }
  }

  async function startReview() {
    if (!preview || !mapping) return;
    const missing = FIELDS.filter(([field, , required]) => required && !mapping[field]).map(([, label]) => label);
    if (missing.length) { announceError(`Map required fields before continuing: ${missing.join(', ')}.`); return; }
    setBusy(true); setError(undefined);
    try {
      const refreshed = await requestPreview(mapping);
      setPreview(refreshed);
      setDecisions(Object.fromEntries(refreshed.rows.flatMap((row) => {
        const decision = initialDecision(row);
        return decision ? [[String(row.rowNumber), decision]] : [];
      })));
      idempotencyReceipt.current = undefined;
      setStep('review');
    } catch (caught) { announceError(caught instanceof Error ? caught.message : 'We could not refresh this preview. Nothing changed in your Tracker.'); }
    finally { setBusy(false); }
  }

  function updateDecision(row: PreviewRow, action: ImportRowDecision) {
    setDecisions((current) => ({ ...current, [String(row.rowNumber)]: action }));
  }

  function updateTaxonomy(row: PreviewRow, taxonomy: ImportTaxonomyDecision) {
    setDecisions((current) => {
      const existing = current[String(row.rowNumber)];
      const action = decisionAction(existing) ?? (row.state === 'no-match' ? 'create-manual' : 'needs-review');
      if (action === 'needs-review') return current;
      const opportunityId = typeof existing === 'object' ? existing.opportunityId : undefined;
      return { ...current, [String(row.rowNumber)]: { action: action as Exclude<ReturnType<typeof decisionAction>, undefined>, ...(opportunityId ? { opportunityId } : {}), ...(decisionDateLocale(existing) ? { dateLocale: decisionDateLocale(existing) } : {}), taxonomy } as ImportRowDecision };
    });
  }

  function updateDateLocale(row: PreviewRow, dateLocale: 'mdy' | 'dmy') {
    setDecisions((current) => {
      const existing = current[String(row.rowNumber)];
      const action = decisionAction(existing) ?? (row.state === 'no-match' ? 'create-manual' : row.state === 'exact-match' ? 'match' : undefined);
      if (!action) return current;
      const opportunityId = typeof existing === 'object' ? existing.opportunityId : row.state === 'exact-match' ? row.candidates[0]?.opportunityId : undefined;
      return { ...current, [String(row.rowNumber)]: { action, ...(opportunityId ? { opportunityId } : {}), ...(decisionTaxonomy(existing) ? { taxonomy: decisionTaxonomy(existing) } : {}), dateLocale } as ImportRowDecision };
    });
  }

  const unresolvedRows = useMemo(() => preview?.rows.filter((row) => !isResolved(row, decisions[String(row.rowNumber)])) ?? [], [preview, decisions]);
  const visibleRows = useMemo(() => preview?.rows.filter((row) => {
    const action = decisionAction(decisions[String(row.rowNumber)]);
    if (filter === 'review') return !isResolved(row, decisions[String(row.rowNumber)]);
    if (filter === 'exact') return row.state === 'exact-match';
    if (filter === 'manual') return action === 'create-manual';
    if (filter === 'skip') return action === 'skip';
    return true;
  }) ?? [], [preview, filter, decisions]);

  const counts = useMemo(() => {
    const values = Object.values(decisions).map(decisionAction);
    return {
      match: values.filter((action) => ['match', 'keep-current', 'use-imported'].includes(action ?? '')).length,
      manual: values.filter((action) => action === 'create-manual').length,
      skip: values.filter((action) => action === 'skip').length,
      unresolvedTaxonomy: Object.values(decisions).filter((decision) => decisionTaxonomy(decision)?.action === 'keep-unresolved').length,
    };
  }, [decisions]);

  async function commit() {
    if (!preview || !mapping || !file || unresolvedRows.length) { announceError('Resolve every row before importing. Nothing has changed yet.'); return; }
    setBusy(true); setError(undefined);
    const idempotencyKey = idempotencyReceipt.current ?? crypto.randomUUID();
    idempotencyReceipt.current = idempotencyKey;
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('previewToken', preview.previewToken);
      body.append('mapping', JSON.stringify(mapping));
      body.append('decisions', JSON.stringify(decisions));
      const response = await fetch('/api/me/imports/tracker/commit', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body });
      const data = await response.json().catch(() => ({})) as ImportResult & { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'The import result is unclear. Do not submit again with a new key; retry this confirmation.');
      setResult(data); setStep('result');
    } catch (caught) { announceError(caught instanceof Error ? caught.message : 'Nothing was changed in your Tracker. Try this confirmation again.'); }
    finally { setBusy(false); }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.heading}>
          <Link href="/tracker"><ArrowLeft aria-hidden="true" />Back to Tracker</Link>
          <p>Private Tracker utility</p>
          <h1>Import your tracker</h1>
          <span>Review every match, conflict, and field value before anything changes.</span>
        </header>
        <ImportSteps step={step} />
        {error ? <div ref={errorRef} tabIndex={-1}><Alert variant="destructive"><AlertTriangle aria-hidden="true" /><AlertTitle>Import needs attention</AlertTitle><AlertDescription>{error}</AlertDescription></Alert></div> : null}

        {step === 'upload' ? <section className={styles.panel} aria-labelledby="upload-heading">
          <header><p>Step 1</p><h2 id="upload-heading">Choose your CSV</h2><span>CSV only, up to 5 MiB and 10,000 rows. The file stays private and is not sent to Organizations.</span></header>
          <div className={styles.dropzone} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); chooseFile(event.dataTransfer.files[0]); }}>
            <FileUp aria-hidden="true" /><strong>{file?.name ?? 'Drop your CSV here'}</strong><span>{file ? `${Math.max(1, Math.ceil(file.size / 1024))} KB · ready to preview` : 'or choose a file from your device'}</span>
            <input ref={inputRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => chooseFile(event.target.files?.[0])} />
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>Choose CSV</Button>
          </div>
          <div className={styles.actions}><Button type="button" variant="outline" onClick={downloadTemplate}><Download aria-hidden="true" />Download template</Button><Button type="button" disabled={!file || busy} onClick={previewFile}>{busy ? <><LoaderCircle className={styles.spinner} aria-hidden="true" />Preparing…</> : <>Review columns <ArrowRight aria-hidden="true" /></>}</Button></div>
        </section> : null}

        {step === 'mapping' && preview && mapping ? <section className={styles.panel} aria-labelledby="mapping-heading">
          <header><p>Step 2</p><h2 id="mapping-heading">Map columns</h2><span>Source columns remain visible. Opportunity, Organization, and Tracker status are required.</span></header>
          <div className={styles.mapping}>{FIELDS.map(([field, label, required]) => <label key={field} htmlFor={`mapping-${field}`}><span><strong>{label}</strong><small>{required ? 'Required' : 'Optional'}</small></span><select id={`mapping-${field}`} value={mapping[field] ?? ''} onChange={(event) => setMapping({ ...mapping, [field]: event.target.value || null })}><option value="">Not mapped</option>{preview.columns.map((column) => <option key={column} value={column}>{column}</option>)}</select></label>)}</div>
          <Alert><Tags aria-hidden="true" /><AlertTitle>Legacy field values receive their own review</AlertTitle><AlertDescription>A Genre or legacy Field column never silently becomes Missa taxonomy. You will confirm a facet and term—or keep the value explicitly unresolved.</AlertDescription></Alert>
          <div className={styles.actions}><Button type="button" variant="outline" onClick={() => setStep('upload')}>Back</Button><Button type="button" disabled={busy} onClick={startReview}>{busy ? 'Refreshing…' : <>Review rows <ArrowRight aria-hidden="true" /></>}</Button></div>
        </section> : null}

        {step === 'review' && preview ? <section className={styles.panel} aria-labelledby="review-heading">
          <header><p>Step 3</p><h2 id="review-heading">Review every row</h2><span aria-live="polite">{preview.rows.length} rows · {unresolvedRows.length} still need your decision. Nothing has changed.</span></header>
          <div className={styles.filters} role="group" aria-label="Filter import rows">{([['all', 'All'], ['review', 'Needs review'], ['exact', 'Exact source match'], ['manual', 'Manual entry'], ['skip', 'Skip']] as const).map(([value, label]) => <Button key={value} type="button" variant={filter === value ? 'secondary' : 'ghost'} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</Button>)}</div>
          <div className={styles.rows}>{visibleRows.map((row) => {
            const decision = decisions[String(row.rowNumber)];
            const action = decisionAction(decision);
            const selectedOpportunityId = typeof decision === 'object' ? decision.opportunityId : undefined;
            return <article key={row.rowNumber} className={styles.row} data-unresolved={!isResolved(row, decision)}>
              <header><div><p>Row {row.rowNumber}</p><h3>{row.values.title || 'Untitled row'}</h3><span>{row.values.organization || 'Organization not mapped'} · {row.values.status || 'Status not mapped'}</span></div><Badge variant="outline">{stateLabels[row.state]}</Badge></header>
              {row.candidates.length ? <section className={styles.candidates} aria-label={`Possible matches for row ${row.rowNumber}`}><h4>Published Opportunity candidates</h4>{row.candidates.map((candidate) => <label key={candidate.opportunityId} data-selected={selectedOpportunityId === candidate.opportunityId || row.state === 'exact-match' && !selectedOpportunityId}><input type="radio" name={`candidate-${row.rowNumber}`} checked={selectedOpportunityId === candidate.opportunityId || row.state === 'exact-match' && !selectedOpportunityId} onChange={() => updateDecision(row, { action: row.conflict ? 'keep-current' : 'match', opportunityId: candidate.opportunityId, ...retainedDecisionContext(decision) })} /><span><strong>{candidate.title}</strong><small>{candidate.organizationName}</small>{candidate.reasons.map((reason) => <em key={reason}><Check aria-hidden="true" />{reason}</em>)}</span></label>)}</section> : null}
              {row.conflict ? <Alert><RotateCcw aria-hidden="true" /><AlertTitle>Current and imported Tracker states differ</AlertTitle><AlertDescription>Current: {row.conflict.current.status}. Imported: {row.conflict.imported.status ?? 'unknown'}. Choose which private Tracker state to keep.</AlertDescription></Alert> : null}
              {row.errors.length ? <Alert variant="destructive"><AlertTriangle aria-hidden="true" /><AlertTitle>This row cannot be imported as written</AlertTitle><AlertDescription>{row.errors.join(' ')}</AlertDescription></Alert> : null}
              {row.warnings.map(warningText).filter(Boolean).map((message) => <Alert key={message}><FileText aria-hidden="true" /><AlertTitle>Review imported text</AlertTitle><AlertDescription>{message}</AlertDescription></Alert>)}
              {row.warnings.includes('ambiguousDate') ? <section className={styles.dateReview}><div><strong>How should Missa read the imported date?</strong><span>{row.values.deadline || row.values.submittedAt || row.values.responseAt}</span></div><div><Button type="button" variant={decisionDateLocale(decision) === 'mdy' ? 'secondary' : 'outline'} disabled={!action && row.state === 'possible-match'} onClick={() => updateDateLocale(row, 'mdy')}>Month / day / year</Button><Button type="button" variant={decisionDateLocale(decision) === 'dmy' ? 'secondary' : 'outline'} disabled={!action && row.state === 'possible-match'} onClick={() => updateDateLocale(row, 'dmy')}>Day / month / year</Button></div>{!action && row.state === 'possible-match' ? <small>Choose a candidate or manual Tracker item first.</small> : null}</section> : null}
              {row.taxonomy ? <section className={styles.taxonomy}><div><Tags aria-hidden="true" /><span><strong>Review “{row.taxonomy.sourcePhrase}”</strong><small>{row.taxonomy.status === 'resolved' ? 'A canonical term is available, but you must confirm it.' : row.taxonomy.status === 'ambiguous' ? 'This phrase can mean more than one facet.' : 'No canonical term is confirmed.'}</small></span></div>{row.taxonomy.options.length ? <div className={styles.taxonomyOptions}>{row.taxonomy.options.map((option) => <button key={option.termId} type="button" aria-pressed={selectedTaxonomyTermId(decision) === option.termId} onClick={() => updateTaxonomy(row, { action: 'use-term', termId: option.termId })}><small>{facetLabels[option.facet] ?? option.facet}</small><strong>{option.label}</strong></button>)}</div> : null}<div className={styles.taxonomyActions}>{action && action !== 'create-manual' ? <Button type="button" variant={decisionTaxonomy(decision)?.action === 'use-opportunity' ? 'secondary' : 'outline'} onClick={() => updateTaxonomy(row, { action: 'use-opportunity' })}>Use published Opportunity field</Button> : null}<Button type="button" variant={decisionTaxonomy(decision)?.action === 'keep-unresolved' ? 'secondary' : 'ghost'} onClick={() => updateTaxonomy(row, { action: 'keep-unresolved' })}>Keep unresolved</Button></div></section> : null}
              <div className={styles.rowActions}><Button type="button" variant={action === 'create-manual' ? 'secondary' : 'outline'} disabled={row.state === 'needs-correction'} onClick={() => updateDecision(row, { action: 'create-manual', ...(decisionTaxonomy(decision)?.action !== 'use-opportunity' && decisionTaxonomy(decision) ? { taxonomy: decisionTaxonomy(decision) } : {}), ...(decisionDateLocale(decision) ? { dateLocale: decisionDateLocale(decision) } : {}) })}>Create manual Tracker item</Button>{row.conflict && row.candidates[0] ? <><Button type="button" variant={action === 'keep-current' ? 'secondary' : 'outline'} onClick={() => updateDecision(row, { action: 'keep-current', opportunityId: selectedOpportunityId ?? row.candidates[0]!.opportunityId, ...retainedDecisionContext(decision) })}>Keep current status</Button><Button type="button" variant={action === 'use-imported' ? 'secondary' : 'outline'} onClick={() => updateDecision(row, { action: 'use-imported', opportunityId: selectedOpportunityId ?? row.candidates[0]!.opportunityId, ...retainedDecisionContext(decision) })}>Use imported status</Button></> : null}<Button type="button" variant={action === 'skip' ? 'secondary' : 'ghost'} onClick={() => updateDecision(row, 'skip')}>Skip row</Button></div>
            </article>;
          })}{visibleRows.length === 0 ? <p className={styles.noRows}>No rows in this view.</p> : null}</div>
          <div className={styles.actions}><Button type="button" variant="outline" onClick={() => setStep('mapping')}>Back</Button><Button type="button" disabled={unresolvedRows.length > 0} onClick={() => setStep('confirm')}>Review exact changes <ArrowRight aria-hidden="true" /></Button></div>
        </section> : null}

        {step === 'confirm' && preview ? <section className={styles.panel} aria-labelledby="confirm-heading">
          <header><p>Step 4</p><h2 id="confirm-heading">Confirm exact changes</h2><span>No write has happened yet. Confirming uses this file, mapping, candidate set, and every row decision.</span></header>
          <dl className={styles.counts}><div><dt>Add or update matched items</dt><dd>{counts.match}</dd></div><div><dt>Create manual Tracker items</dt><dd>{counts.manual}</dd></div><div><dt>Skip rows</dt><dd>{counts.skip}</dd></div><div><dt>Keep unresolved field text</dt><dd>{counts.unresolvedTaxonomy}</dd></div></dl>
          <Alert><ShieldCheck aria-hidden="true" /><AlertTitle>Private Tracker only</AlertTitle><AlertDescription>No Organization, Submission, Work snapshot, or application is changed or notified.</AlertDescription></Alert>
          <div className={styles.actions}><Button type="button" variant="outline" onClick={() => setStep('review')}>Back to row review</Button><Button type="button" disabled={busy} onClick={commit}>{busy ? <><LoaderCircle className={styles.spinner} aria-hidden="true" />Importing…</> : counts.match + counts.manual === 0 ? 'Finish review with no changes' : `Import ${counts.match + counts.manual} reviewed rows`}</Button></div>
        </section> : null}

        {step === 'result' && result ? <section className={`${styles.panel} ${styles.receipt}`} aria-labelledby="receipt-heading">
          <CheckCircle2 aria-hidden="true" /><header><p>Import receipt · {result.importId}</p><h2 id="receipt-heading">{result.imported > 0 ? 'Import complete' : 'Review complete — no changes'}</h2><span>{result.imported > 0 ? `${result.imported} reviewed rows changed your private Tracker.` : 'Every row was skipped, so your Tracker stayed exactly as it was.'} Nothing was shared with Organizations.</span></header>
          <dl className={styles.counts}><div><dt>Matched</dt><dd>{result.matched}</dd></div><div><dt>Manual items</dt><dd>{result.createdManual}</dd></div><div><dt>Skipped</dt><dd>{result.skipped}</dd></div><div><dt>Unresolved field text</dt><dd>{result.unresolvedTaxonomy}</dd></div></dl>
          <div className={styles.actions}>{result.imported > 0 ? <Button render={<Link href={`/tracker?import=${encodeURIComponent(result.importId)}`} />}>Review imported rows <ArrowRight aria-hidden="true" /></Button> : null}<Button variant="outline" render={<Link href="/tracker" />}>Back to Tracker</Button></div>
        </section> : null}
      </div>
    </main>
  );
}
