'use client'

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ExternalLink,
  FileText,
  FileUp,
  Inbox,
  Library,
  ListChecks,
  LoaderCircle,
  Menu,
  MessageSquareText,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

import { MissaWordmark } from '@/components/missa-wordmark'
import styles from './creator-utilities-directions.module.css'

type Direction = 'focus' | 'desk' | 'guided'
type Surface = 'home' | 'import' | 'ask'
type Fixture =
  | 'home-next-task'
  | 'home-new-account'
  | 'home-no-activity'
  | 'home-competing'
  | 'home-same-deadline'
  | 'home-hidden-target'
  | 'home-fit-conflict'
  | 'home-partial-failure'
  | 'home-session-expired'
  | 'home-long-content'
  | 'home-rtl'
  | 'home-no-projection'
  | 'import-upload'
  | 'import-wrong-type'
  | 'import-too-large'
  | 'import-malformed'
  | 'import-map'
  | 'import-missing-required'
  | 'import-review'
  | 'import-exact-match'
  | 'import-several-candidates'
  | 'import-taxonomy-review'
  | 'import-status-conflict'
  | 'import-duplicate-row'
  | 'import-preview-expired'
  | 'import-concurrent'
  | 'import-confirm'
  | 'import-all-skipped'
  | 'import-offline'
  | 'import-ambiguous'
  | 'import-failed'
  | 'import-result'
  | 'ask-empty'
  | 'ask-results'
  | 'ask-no-results'
  | 'ask-clarify'
  | 'ask-out-of-scope'
  | 'ask-source-unavailable'
  | 'ask-partial'
  | 'ask-rate-limit'
  | 'ask-database-unavailable'
  | 'ask-disabled'
  | 'ask-pending'
  | 'ask-failed'
  | 'ask-ambiguous'
  | 'ask-history'
  | 'ask-long-content'
  | 'ask-rtl'

const directions: Array<{ id: Direction; number: string; name: string; description: string }> = [
  { id: 'focus', number: '01', name: 'Focused task', description: 'One primary job and its consequence lead; supporting context stays short and local.' },
  { id: 'desk', number: '02', name: 'Creator desk', description: 'A durable work list and focused detail keep complex review and evidence visible together.' },
  { id: 'guided', number: '03', name: 'Guided utility', description: 'Named stages and one current action make unfamiliar or high-risk work easier to recover.' },
]

const surfaces: Array<{ id: Surface; label: string }> = [
  { id: 'home', label: 'Creator Home' },
  { id: 'import', label: 'Tracker Import' },
  { id: 'ask', label: 'Ask Missa' },
]

const fixtures: Record<Surface, Array<{ id: Fixture; label: string }>> = {
  home: [
    { id: 'home-next-task', label: 'One consequential next task' },
    { id: 'home-new-account', label: 'New account' },
    { id: 'home-no-activity', label: 'No activity, useful Opportunities' },
    { id: 'home-competing', label: 'Several competing tasks' },
    { id: 'home-same-deadline', label: 'Same deadline and timezone' },
    { id: 'home-hidden-target', label: 'Removed Opportunity target' },
    { id: 'home-fit-conflict', label: 'Private preference conflict' },
    { id: 'home-partial-failure', label: 'One subsystem unavailable' },
    { id: 'home-session-expired', label: 'Session expired' },
    { id: 'home-long-content', label: 'Long multilingual title' },
    { id: 'home-rtl', label: 'Mixed RTL and Latin' },
    { id: 'home-no-projection', label: 'No typed Home projection' },
  ],
  import: [
    { id: 'import-upload', label: 'Choose valid CSV' },
    { id: 'import-wrong-type', label: 'Wrong file type' },
    { id: 'import-too-large', label: 'File exceeds limits' },
    { id: 'import-malformed', label: 'Malformed or formula-like cells' },
    { id: 'import-map', label: 'Map columns' },
    { id: 'import-missing-required', label: 'Required mapping missing' },
    { id: 'import-review', label: 'Mixed row review' },
    { id: 'import-exact-match', label: 'Exact stable identifier match' },
    { id: 'import-several-candidates', label: 'Several possible matches' },
    { id: 'import-taxonomy-review', label: 'Legacy field review' },
    { id: 'import-status-conflict', label: 'Tracker status conflict' },
    { id: 'import-duplicate-row', label: 'Duplicate CSV row' },
    { id: 'import-preview-expired', label: 'Preview expired' },
    { id: 'import-concurrent', label: 'Tracker changed concurrently' },
    { id: 'import-confirm', label: 'Confirm exact changes' },
    { id: 'import-all-skipped', label: 'All rows skipped' },
    { id: 'import-offline', label: 'Offline after review' },
    { id: 'import-ambiguous', label: 'Commit response ambiguous' },
    { id: 'import-failed', label: 'Commit failed safely' },
    { id: 'import-result', label: 'Durable receipt' },
  ],
  ask: [
    { id: 'ask-empty', label: 'New bounded search' },
    { id: 'ask-results', label: 'Published results with evidence' },
    { id: 'ask-no-results', label: 'No current match' },
    { id: 'ask-clarify', label: 'Ambiguous taxonomy term' },
    { id: 'ask-out-of-scope', label: 'Request outside scope' },
    { id: 'ask-source-unavailable', label: 'Official source unavailable' },
    { id: 'ask-partial', label: 'Partial results' },
    { id: 'ask-rate-limit', label: 'Rate limited' },
    { id: 'ask-database-unavailable', label: 'Published collection unavailable' },
    { id: 'ask-disabled', label: 'Capability disabled' },
    { id: 'ask-pending', label: 'Search pending' },
    { id: 'ask-failed', label: 'Search failed' },
    { id: 'ask-ambiguous', label: 'Send outcome ambiguous' },
    { id: 'ask-history', label: 'Latest conversation' },
    { id: 'ask-long-content', label: 'Long title and source' },
    { id: 'ask-rtl', label: 'Mixed RTL and Latin' },
  ],
}

function isSurface(value: string): value is Surface {
  return surfaces.some((item) => item.id === value)
}

function ReviewControls({ direction, surface, fixture, selectedOnly, onDirection, onSurface, onFixture }: { direction: Direction; surface: Surface; fixture: Fixture; selectedOnly: boolean; onDirection: (value: Direction) => void; onSurface: (value: Surface) => void; onFixture: (value: Fixture) => void }) {
  return <div className={styles.reviewControls} aria-label='Design review controls'>{selectedOnly ? null : <div className={styles.directionButtons} role='group' aria-label='Creator utility direction'>{directions.map((item) => <button key={item.id} type='button' data-active={direction === item.id} aria-pressed={direction === item.id} onClick={() => onDirection(item.id)}><span>{item.number}</span>{item.name}</button>)}</div>}<div className={styles.selectors}><label><span>Utility</span><select aria-label='Creator utility' value={surface} onChange={(event) => { if (isSurface(event.target.value)) onSurface(event.target.value) }}>{surfaces.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label><span>Edge state</span><select aria-label='Creator utility edge state' value={fixture} onChange={(event) => onFixture(event.target.value as Fixture)}>{fixtures[surface].map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label></div></div>
}

function DirectionIntro({ direction, selectedOnly }: { direction: Direction; selectedOnly: boolean }) {
  const item = directions.find((candidate) => candidate.id === direction)!
  return <section className={styles.directionIntro}><span>{item.number}</span><div><p>{selectedOnly ? 'Selected Creator utilities composition' : 'Creator utilities direction'}</p><h1>{item.name}</h1><p>{item.description}</p></div><Badge variant='outline'>{selectedOnly ? 'Selected · local only' : 'Selection pending'}</Badge></section>
}

function ProfileShell({ surface }: { surface: Surface }) {
  return <header className={styles.profileHeader}><a href='#creator-main' className={styles.skipLink}>Skip to content</a><MissaWordmark href='#home' size='app' className={styles.wordmark} /><div className={styles.productSwitch}><button type='button' aria-pressed='true'>Profile</button><button type='button'>Organization</button></div><nav aria-label='Profile navigation'><a href='#opportunities'>Opportunities</a><a href='#tracker' aria-current={surface === 'import' ? 'page' : undefined}>Tracker</a><a href='#library'>Library</a><a href='#inbox'>Inbox</a></nav><button type='button' className={styles.accountButton} aria-label='Open Profile'>AO</button><Button variant='outline' size='icon' className={styles.menuButton} aria-label='Open navigation'><Menu /></Button></header>
}

function UtilityRail({ surface }: { surface: Surface }) {
  return <aside className={styles.utilityRail}><p>Current utility</p><a href='#home' aria-current={surface === 'home' ? 'page' : undefined}><Sparkles />Continue</a><a href='#import' aria-current={surface === 'import' ? 'page' : undefined}><FileUp />Import</a><a href='#ask' aria-current={surface === 'ask' ? 'page' : undefined}><MessageSquareText />Ask Missa</a><span>These are contextual utilities, not primary Profile destinations.</span></aside>
}

type HomeTask = { label: string; title: string; reason: string; destination: string; tone?: 'attention' | 'neutral' }

function homeTasks(fixture: Fixture): HomeTask[] {
  const main: HomeTask = { label: 'Application draft', title: fixture === 'home-long-content' ? 'International Fellowship for Writers, Translators, Interdisciplinary Researchers, and Artists Working Across Languages' : fixture === 'home-rtl' ? 'منحة الكتابة الدولية · International Writing Fellowship' : 'International Writing Fellowship', reason: 'Draft closes in 3 days · Readiness section incomplete', destination: 'Continue application', tone: 'attention' }
  if (fixture === 'home-new-account') return [{ label: 'Start here', title: 'Browse published Opportunities', reason: 'Your Profile can stay empty while you explore.', destination: 'Browse Opportunities' }]
  if (fixture === 'home-no-activity') return [{ label: 'Published Opportunities', title: 'Three calls match your explicit interests', reason: 'Writing · Fellowship · No application fee', destination: 'Review Opportunities' }]
  if (fixture === 'home-hidden-target') return [{ label: 'Tracker item unavailable', title: 'The Opportunity you saved is no longer public', reason: 'Your private note remains available even though the public record does not.', destination: 'Open Tracker', tone: 'attention' }]
  if (fixture === 'home-fit-conflict') return [{ label: 'Profile preference needs review', title: 'Writing is both preferred and excluded', reason: 'Resolve the private preference before using it for recommendations.', destination: 'Review preferences', tone: 'attention' }]
  if (fixture === 'home-no-projection') return []
  if (fixture === 'home-competing' || fixture === 'home-same-deadline') return [main, { label: 'Tracker deadline', title: 'New Media Production Commission', reason: fixture === 'home-same-deadline' ? 'Also due 18 September · America/Los_Angeles' : 'Preparation deadline tomorrow', destination: 'Open Tracker', tone: 'attention' }, { label: 'Inbox review', title: 'Confirm one imported Opportunity', reason: 'A possible match needs your decision.', destination: 'Review import' }]
  return [main, { label: 'Inbox', title: 'One decision message is ready to read', reason: 'Explicitly unread · North River Review', destination: 'Open Inbox' }]
}

function TaskCard({ task, primary = false }: { task: HomeTask; primary?: boolean }) {
  return <article className={styles.taskCard} data-primary={primary} data-tone={task.tone ?? 'neutral'}><div><p>{task.label}</p><h3 dir='auto'>{task.title}</h3><span>{task.reason}</span></div><Button variant={primary ? 'default' : 'outline'}>{task.destination} <ArrowRight /></Button></article>
}

function HomeSurface({ direction, fixture }: { direction: Direction; fixture: Fixture }) {
  const tasks = homeTasks(fixture)
  const partial = fixture === 'home-partial-failure'
  const expired = fixture === 'home-session-expired'
  if (fixture === 'home-no-projection') return <main id='creator-main' className={styles.utilityMain}><section className={styles.noProjection}><Sparkles /><p className={styles.eyebrow}>Home decision</p><h2>Home is not useful enough yet</h2><p>Without a typed next-task projection and versioned priority policy, `/home` should redirect to Opportunities instead of inventing a dashboard.</p><Button>Open Opportunities <ArrowRight /></Button></section></main>
  return <main id='creator-main' className={styles.utilityMain}><header className={styles.utilityHeading}><div><p className={styles.eyebrow}>Private Profile scope</p><h2>Good evening, Ayo.</h2><p>Continue one useful thing. Priority is based on explicit state and deadlines—not artistic value, prestige, or hidden scores.</p></div><Badge variant='outline'>Profile</Badge></header>{expired ? <Alert variant='destructive'><ShieldCheck /><AlertTitle>Your session ended</AlertTitle><AlertDescription>Log in again to return to this exact task. The destination is preserved and server state will be rechecked.</AlertDescription><Button>Log in</Button></Alert> : null}{partial ? <Alert><AlertCircle /><AlertTitle>Inbox is temporarily unavailable</AlertTitle><AlertDescription>Tracker and application work remain available. No missing Inbox state is converted into “all clear.”</AlertDescription></Alert> : null}<section className={styles.nextTask} aria-labelledby='next-task'><div className={styles.sectionTitle}><p className={styles.eyebrow}>Next task</p><h2 id='next-task'>What to continue now</h2></div><TaskCard task={tasks[0]!} primary /></section>{tasks.length > 1 ? <section className={styles.attentionList}><div className={styles.sectionTitle}><p className={styles.eyebrow}>After that</p><h2>Other work requiring your decision</h2></div>{tasks.slice(1).map((task) => <TaskCard key={task.title} task={task} />)}</section> : null}<section className={styles.savedWork}><div className={styles.sectionTitle}><p className={styles.eyebrow}>Saved and in progress</p><h2>Return by product</h2></div><div><a href='#tracker'><ListChecks /><span><strong>Tracker</strong><small>6 active items · 2 with your deadlines</small></span><ChevronRight /></a><a href='#library'><Library /><span><strong>Library</strong><small>3 Works · 1 used in a draft</small></span><ChevronRight /></a><a href='#inbox'><Inbox /><span><strong>Inbox</strong><small>{partial ? 'Temporarily unavailable' : '1 unread decision message'}</small></span><ChevronRight /></a></div></section>{direction === 'desk' ? <section className={styles.relevantOpportunity}><Image src='/media/home/gallery-interior.webp' alt='A gallery interior associated with the New Media Production Commission' fill sizes='320px' /><div><p className={styles.eyebrow}>Continue exploring</p><h3>New Media Production Commission</h3><span>Commission · Film and moving image · Fee published</span><a href='#open'>Open Opportunity <ArrowRight /></a></div></section> : null}</main>
}

function importStep(fixture: Fixture): 'upload' | 'map' | 'review' | 'confirm' | 'result' {
  if (['import-map', 'import-missing-required'].includes(fixture)) return 'map'
  if (['import-review', 'import-exact-match', 'import-several-candidates', 'import-taxonomy-review', 'import-status-conflict', 'import-duplicate-row', 'import-preview-expired', 'import-concurrent'].includes(fixture)) return 'review'
  if (['import-confirm', 'import-all-skipped', 'import-offline', 'import-ambiguous', 'import-failed'].includes(fixture)) return 'confirm'
  if (fixture === 'import-result') return 'result'
  return 'upload'
}

function ImportSteps({ current }: { current: ReturnType<typeof importStep> }) {
  const steps = [['upload', 'Choose file'], ['map', 'Map columns'], ['review', 'Review rows'], ['confirm', 'Confirm'], ['result', 'Receipt']] as const
  const currentIndex = steps.findIndex(([id]) => id === current)
  return <nav className={styles.importSteps} aria-label='Import steps'>{steps.map(([id, label], index) => <div key={id} aria-current={id === current ? 'step' : undefined} data-complete={index < currentIndex}><span>{index < currentIndex ? <Check /> : index + 1}</span><strong>{label}</strong></div>)}</nav>
}

function ImportNotice({ fixture }: { fixture: Fixture }) {
  const content = fixture === 'import-wrong-type' ? ['Choose a CSV file', 'The selected file is not a supported CSV. Nothing was uploaded or changed.'] : fixture === 'import-too-large' ? ['This file exceeds the import limits', 'Use a CSV up to 5 MiB and 10,000 rows, or split the file before trying again.'] : fixture === 'import-malformed' ? ['Some cells need review', 'Malformed quoting and formula-like text remain inert. No spreadsheet formulas are evaluated.'] : fixture === 'import-missing-required' ? ['Map three required fields', 'Title, Organization, and Tracker status must be mapped before row review.'] : fixture === 'import-preview-expired' ? ['This preview expired', 'Prepare a new preview before importing. The Tracker has not changed.'] : fixture === 'import-concurrent' ? ['Tracker changed after preview', 'Compare the current Tracker with the imported rows and prepare a new preview.'] : fixture === 'import-offline' ? ['You are offline', 'The reviewed decisions remain on this page, but import is unavailable until you reconnect.'] : fixture === 'import-ambiguous' ? ['Import response is unclear', 'Do not submit again yet. Check for an existing receipt using the same idempotency key.'] : fixture === 'import-failed' ? ['Import did not complete', 'The transaction was rolled back. Nothing changed in your Tracker.'] : null
  return content ? <Alert variant={['import-wrong-type', 'import-too-large', 'import-failed'].includes(fixture) ? 'destructive' : 'default'}><AlertCircle /><AlertTitle>{content[0]}</AlertTitle><AlertDescription>{content[1]}</AlertDescription></Alert> : null
}

function UploadStep({ fixture }: { fixture: Fixture }) {
  return <section className={styles.importPanel}><div className={styles.panelHeading}><p className={styles.eyebrow}>Step 1</p><h2>Choose your CSV</h2><p>CSV only, up to 5 MiB and 10,000 rows. The file is private and no Organization receives it.</p></div><ImportNotice fixture={fixture} /><div className={styles.dropzone}><FileUp /><strong>{fixture === 'import-upload' ? 'submission-tracker.csv' : 'Drop your CSV here'}</strong><span>{fixture === 'import-upload' ? '24 KB · ready to preview' : 'or choose a file from your device'}</span><Button variant='outline'>Choose CSV</Button></div><div className={styles.panelActions}><Button variant='outline'>Download template</Button><Button disabled={fixture !== 'import-upload'}>Review columns <ArrowRight /></Button></div></section>
}

function MappingStep({ fixture }: { fixture: Fixture }) {
  const mappings = [['Opportunity title', 'Title'], ['Organization', 'Organization'], ['Tracker status', fixture === 'import-missing-required' ? '' : 'Status'], ['Deadline', 'Due date'], ['Work title', 'Submitted work'], ['Legacy field / genre', 'Genre']]
  return <section className={styles.importPanel}><div className={styles.panelHeading}><p className={styles.eyebrow}>Step 2</p><h2>Map columns</h2><p>Source columns remain visible beside Missa fields and sample values.</p></div><ImportNotice fixture={fixture} /><div className={styles.mappingList}>{mappings.map(([target, source], index) => <label key={target}><span><strong>{target}</strong><small>{index < 3 ? 'Required' : 'Optional'} · sample: {index === 0 ? 'River Prize' : index === 1 ? 'North River Review' : index === 2 ? 'Submitted' : '—'}</small></span><select aria-label={`Map ${target}`} defaultValue={source}><option value=''>Not mapped</option><option>{source || 'Status'}</option><option>Notes</option><option>Ignore this column</option></select></label>)}</div><Alert><FileText /><AlertTitle>Field values need a separate review</AlertTitle><AlertDescription>Legacy Genre values do not silently become canonical taxonomy terms. Their facet, alias, and unresolved state remain visible later.</AlertDescription></Alert><div className={styles.panelActions}><Button variant='outline'>Back</Button><Button disabled={fixture === 'import-missing-required'}>Review rows <ArrowRight /></Button></div></section>
}

type ImportRow = { row: number; title: string; organization: string; state: string; reason: string; action: string }

const importRows: ImportRow[] = [
  { row: 2, title: 'International Writing Fellowship', organization: 'North River Review', state: 'Exact match', reason: 'Known Opportunity ID and official source URL match.', action: 'Match existing' },
  { row: 3, title: 'River Prize', organization: 'River Arts', state: 'Possible match', reason: 'Normalized title and Organization match two published records.', action: 'Needs your decision' },
  { row: 4, title: 'Field Notes Residency', organization: 'Atlas House', state: 'New manual item', reason: 'No stable identifier or published candidate found.', action: 'Create manual entry' },
]

function ReviewStep({ fixture, direction }: { fixture: Fixture; direction: Direction }) {
  const rows = fixture === 'import-duplicate-row' ? [...importRows, { ...importRows[1]!, row: 5, state: 'Duplicate CSV row', reason: 'Same normalized row content as row 3.', action: 'Skip duplicate' }] : importRows
  return <section className={styles.importPanel}><div className={styles.panelHeading}><p className={styles.eyebrow}>Step 3</p><h2>Review every row</h2><p>Possible matches remain your decision. Each suggestion includes the exact facts that produced it.</p></div><ImportNotice fixture={fixture} />{fixture === 'import-taxonomy-review' ? <Alert><BookOpen /><AlertTitle>Two field labels need review</AlertTitle><AlertDescription>“Creative writing” resolves to canonical Writing. “Experimental words” remains unresolved under the Genre/Form facets and will not block other rows.</AlertDescription></Alert> : null}{fixture === 'import-status-conflict' ? <Alert><AlertCircle /><AlertTitle>Current and imported Tracker states differ</AlertTitle><AlertDescription>Current: Preparing. Imported: Submitted. Choose which private Tracker state to keep; neither changes an Organization Submission.</AlertDescription></Alert> : null}<div className={styles.rowReview} data-direction={direction}>{rows.map((row) => <article key={row.row}><header><span>Row {row.row}</span><Badge variant='outline'>{row.state}</Badge></header><h3>{row.title}</h3><p>{row.organization}</p><dl><div><dt>Reason</dt><dd>{row.reason}</dd></div><div><dt>Current decision</dt><dd>{row.action}</dd></div></dl><div><Button variant='outline' size='sm'>Review match</Button><Button variant='ghost' size='sm'>Skip row</Button></div></article>)}</div><div className={styles.panelActions}><Button variant='outline'>Back</Button><Button>Review exact changes <ArrowRight /></Button></div></section>
}

function ConfirmStep({ fixture }: { fixture: Fixture }) {
  const allSkipped = fixture === 'import-all-skipped'
  return <section className={styles.importPanel}><div className={styles.panelHeading}><p className={styles.eyebrow}>Step 4</p><h2>{allSkipped ? 'Nothing will be imported' : 'Confirm exact changes'}</h2><p>No write has happened yet. Confirming uses the reviewed file, mappings, candidate set, and row decisions.</p></div><ImportNotice fixture={fixture} /><dl className={styles.confirmCounts}><div><dt>Add to Tracker</dt><dd>{allSkipped ? 0 : 1}</dd></div><div><dt>Match existing</dt><dd>{allSkipped ? 0 : 1}</dd></div><div><dt>Keep current state</dt><dd>{allSkipped ? 0 : 1}</dd></div><div><dt>Skip</dt><dd>{allSkipped ? 3 : 0}</dd></div><div><dt>Unresolved taxonomy</dt><dd>{allSkipped ? 0 : 1}</dd></div></dl><Alert><ShieldCheck /><AlertTitle>Private Tracker only</AlertTitle><AlertDescription>No Organization, Submission, Work snapshot, or application is changed or notified.</AlertDescription></Alert><div className={styles.panelActions}><Button variant='outline'>Back to row review</Button><Button disabled={allSkipped || fixture === 'import-offline' || fixture === 'import-ambiguous' || fixture === 'import-failed'}>Import 3 reviewed rows</Button></div></section>
}

function ResultStep() {
  return <section className={styles.importPanel}><div className={styles.receiptMark}><CheckCircle2 /></div><div className={styles.panelHeading}><p className={styles.eyebrow}>Import receipt · IMP-2026-0818</p><h2>Import complete</h2><p>Three reviewed rows were processed in one private Tracker transaction.</p></div><dl className={styles.confirmCounts}><div><dt>Added</dt><dd>1</dd></div><div><dt>Matched</dt><dd>1</dd></div><div><dt>Kept current</dt><dd>1</dd></div><div><dt>Skipped</dt><dd>0</dd></div></dl><div className={styles.panelActions}><Button variant='outline'>Download receipt</Button><Button>Review imported rows <ArrowRight /></Button></div></section>
}

function ImportSurface({ direction, fixture }: { direction: Direction; fixture: Fixture }) {
  const step = importStep(fixture)
  return <main id='creator-main' className={styles.utilityMain}><header className={styles.importHeading}><a href='#tracker'><ArrowLeft />Back to Tracker</a><p className={styles.eyebrow}>Private Tracker utility</p><h2>Import your tracker</h2><p>Review every match, conflict, and taxonomy value before anything changes.</p></header><ImportSteps current={step} />{step === 'upload' ? <UploadStep fixture={fixture} /> : step === 'map' ? <MappingStep fixture={fixture} /> : step === 'review' ? <ReviewStep fixture={fixture} direction={direction} /> : step === 'confirm' ? <ConfirmStep fixture={fixture} /> : <ResultStep />}</main>
}

type SearchResult = { title: string; organization: string; deadline: string; fee: string; type: string; practice: string; source: string }

const searchResults: SearchResult[] = [
  { title: 'International Writing Fellowship', organization: 'North River Review', deadline: '18 September 2026', fee: 'No application fee', type: 'Fellowship', practice: 'Writing', source: 'North River Review call page' },
  { title: 'New Voices Poetry Prize', organization: 'Field House Press', deadline: 'Deadline needs confirmation', fee: 'Fee unclear', type: 'Prize', practice: 'Poetry', source: 'Field House Press guidelines' },
]

function ParsedQuery() {
  return <section className={styles.parsedQuery} aria-label='Search understood as'><p>Search understood as</p><div><Badge variant='outline'>Type · Fellowship</Badge><Badge variant='outline'>Field · Writing</Badge><Badge variant='outline'>Fee · No fee</Badge><Badge variant='outline'>Deadline · Closing soon</Badge></div><button type='button'>Edit search filters</button></section>
}

function SearchEvidence({ result }: { result: SearchResult }) {
  return <article className={styles.searchEvidence}><header><div><h3 dir='auto'>{result.title}</h3><p>{result.organization}</p></div><Badge variant='outline'>{result.type}</Badge></header><dl><div><CalendarDays /><dt>Deadline</dt><dd>{result.deadline}</dd></div><div><CircleDollarSign /><dt>Fee</dt><dd>{result.fee}</dd></div><div><BookOpen /><dt>Field</dt><dd>{result.practice}</dd></div></dl><p className={styles.sourceLine}><FileText />{result.source}</p><div><a href='#detail'>Open Opportunity <ArrowRight /></a><a href='#source'>Official source <ExternalLink /></a><button type='button'>Report a problem</button></div></article>
}

function AskState({ fixture }: { fixture: Fixture }) {
  if (fixture === 'ask-empty') return <section className={styles.askEmpty}><Sparkles /><h3>What published Opportunity are you looking for?</h3><p>Try an Opportunity type, field, geography, fee preference, or deadline. Missa searches its published collection only.</p><div>{['Free fellowships for writers', 'Residencies closing this month', 'Film commissions in Europe'].map((item) => <button key={item} type='button'>{item}</button>)}</div></section>
  if (fixture === 'ask-disabled') return <Alert><MessageSquareText /><AlertTitle>Ask Missa is not available</AlertTitle><AlertDescription>Browse and filters remain available. This capability does not become a primary Profile destination when disabled.</AlertDescription><Button variant='outline'>Open Opportunities</Button></Alert>
  if (fixture === 'ask-pending') return <div className={styles.askPending} role='status'><LoaderCircle /><span>Searching published Opportunities…</span></div>
  const content = fixture === 'ask-no-results' ? ['No matching published records', 'Try a broader field or remove one filter. This does not mean no Opportunities exist.'] : fixture === 'ask-clarify' ? ['Which “documentary” do you mean?', 'Documentary film and documentary writing map to different reviewed field terms.'] : fixture === 'ask-out-of-scope' ? ['I cannot assess your chance of acceptance', 'I can search published Opportunities and summarize their stated facts. I do not judge eligibility, artistic quality, or likely outcomes.'] : fixture === 'ask-source-unavailable' ? ['One official source is unavailable', 'The published Missa record remains readable, but open the source again before acting on consequential facts.'] : fixture === 'ask-partial' ? ['Two results found; one source could not be opened', 'The available results are shown without converting the missing source into a confidence score.'] : fixture === 'ask-rate-limit' ? ['Search temporarily limited', 'Wait before sending another search. Your current message remains available.'] : fixture === 'ask-database-unavailable' ? ['Published Opportunities are temporarily unavailable', 'Your conversation remains intact. Browse and search may also be limited until the collection returns.'] : fixture === 'ask-failed' ? ['Search did not complete', 'Your question remains in the composer. Retry once without duplicating the turn.'] : fixture === 'ask-ambiguous' ? ['The send outcome is unclear', 'Do not submit the same turn again yet. Check the conversation using its idempotency receipt.'] : null
  if (content) return <Alert variant={['ask-failed', 'ask-database-unavailable'].includes(fixture) ? 'destructive' : 'default'}><AlertCircle /><AlertTitle>{content[0]}</AlertTitle><AlertDescription>{content[1]}</AlertDescription>{fixture === 'ask-clarify' ? <div className={styles.clarifyActions}><Button variant='outline'>Documentary film</Button><Button variant='outline'>Documentary writing</Button></div> : null}</Alert>
  return <><article className={styles.message} data-role='user'><UserRound /><p>{fixture === 'ask-rtl' ? 'ابحث عن منح للكتّاب · Find fellowships for writers' : 'Find free fellowships for writers closing soon.'}</p></article><article className={styles.message} data-role='assistant'><Sparkles /><div><p>I found {fixture === 'ask-partial' ? 'two available' : 'two'} published Opportunities matching the supported filters below. Review each record and its official source before acting.</p><ParsedQuery /><div className={styles.evidenceList}>{searchResults.map((result, index) => <SearchEvidence key={result.title} result={fixture === 'ask-long-content' && index === 0 ? { ...result, title: 'International Fellowship for Writers, Translators, Interdisciplinary Researchers, and Artists Working Across Languages', source: 'North River Review official international fellowship guidelines and application requirements' } : result} />)}</div></div></article></>
}

function AskSurface({ direction, fixture }: { direction: Direction; fixture: Fixture }) {
  const [message, setMessage] = useState(fixture === 'ask-failed' ? 'Find free fellowships for writers' : '')
  const history = fixture === 'ask-history'
  return <main id='creator-main' className={styles.askMain}><header className={styles.askHeading}><div><p className={styles.eyebrow}>Bounded published-Opportunity search</p><h2>Ask Missa</h2><p>Search and clarify public facts with the supporting records attached. Ask does not replace browse, detail, Tracker, or your judgement.</p></div>{history ? <Button variant='outline'>Latest conversation</Button> : <Badge variant='outline'>Profile only</Badge>}</header><div className={styles.askLayout} data-direction={direction}>{direction === 'desk' ? <aside className={styles.conversationList}><p>Conversations</p><button type='button' data-current='true'><strong>Free writing fellowships</strong><span>Latest conversation</span></button><button type='button'><strong>Film commissions</strong><span>2 results</span></button><small>Rename, delete, export, and retention need an approved history policy before promotion.</small></aside> : null}<section className={styles.conversation} aria-label='Ask Missa conversation'><div className={styles.messages}><AskState fixture={fixture} /></div><form onSubmit={(event) => event.preventDefault()}><label htmlFor='ask-message'>Ask about published Opportunities</label><div><Textarea id='ask-message' value={message} onChange={(event) => setMessage(event.target.value)} placeholder='e.g. Find free fellowships for writers' disabled={fixture === 'ask-disabled' || fixture === 'ask-pending'} /><Button type='submit' size='icon-lg' aria-label='Send question' disabled={!message.trim() || fixture === 'ask-disabled' || fixture === 'ask-pending'}><Send /></Button></div><p>Missa searches published Opportunities only. Sources stay attached. Shift+Enter starts a new line.</p></form></section></div></main>
}

function CreatorPreview({ direction, surface, fixture }: { direction: Direction; surface: Surface; fixture: Fixture }) {
  return <div className={styles.preview} data-direction={direction} data-surface={surface}><ProfileShell surface={surface} /><div className={styles.previewBody}>{direction === 'guided' ? <UtilityRail surface={surface} /> : null}{surface === 'home' ? <HomeSurface direction={direction} fixture={fixture} /> : surface === 'import' ? <ImportSurface direction={direction} fixture={fixture} /> : <AskSurface direction={direction} fixture={fixture} />}</div></div>
}

function CreatorUtilitiesExperience({ selectedOnly }: { selectedOnly: boolean }) {
  const [direction, setDirection] = useState<Direction>('focus')
  const [surface, setSurface] = useState<Surface>('home')
  const [fixture, setFixture] = useState<Fixture>('home-next-task')
  const activeDirection: Direction = selectedOnly ? 'desk' : direction

  function changeSurface(next: Surface) {
    setSurface(next)
    setFixture(fixtures[next][0]!.id)
  }

  return <div className={styles.page}><ReviewControls direction={activeDirection} surface={surface} fixture={fixture} selectedOnly={selectedOnly} onDirection={setDirection} onSurface={changeSurface} onFixture={setFixture} /><DirectionIntro direction={activeDirection} selectedOnly={selectedOnly} /><CreatorPreview key={`${activeDirection}-${surface}-${fixture}`} direction={activeDirection} surface={surface} fixture={fixture} /></div>
}

export function CreatorUtilitiesDirections() {
  return <CreatorUtilitiesExperience selectedOnly={false} />
}

export function CreatorUtilitiesSelected() {
  return <CreatorUtilitiesExperience selectedOnly />
}
