'use client'

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Download,
  Eye,
  FileText,
  Filter,
  Flag,
  Inbox,
  Mail,
  Menu,
  MessageSquareText,
  MoreHorizontal,
  Paperclip,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserRoundCheck,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'

import styles from './organization-workflow-directions.module.css'

type Direction = 'queue' | 'ledger' | 'desk'
type Surface = 'submissions' | 'reviews' | 'decisions'
type Fixture =
  | 'mixed'
  | 'empty'
  | 'large'
  | 'missing-file'
  | 'payment-problem'
  | 'withdrawn-work'
  | 'taxonomy-conflict'
  | 'blind'
  | 'duplicate-assignment'
  | 'review-conflict'
  | 'review-save-failure'
  | 'review-overdue'
  | 'split-review'
  | 'partial-decision'
  | 'mixed-decision'
  | 'decision-incomplete'
  | 'decision-concurrent'
  | 'message-partial'
  | 'message-missing-recipient'
  | 'message-scheduled'
  | 'import-integrity'
  | 'finance'
  | 'legal'
  | 'viewer'
  | 'foreign'
  | 'mobile-urgent'

type SubmissionRow = {
  id: string
  submitter: string
  works: string[]
  opportunity: string
  category: string
  receipt: 'Received' | 'Needs attention' | 'Withdrawn'
  review: 'Not started' | 'Assigning' | 'In review' | 'Review complete' | 'Review paused'
  decision: 'No decisions' | 'Partially decided' | 'Partially accepted' | 'Mixed' | 'Accepted' | 'Declined' | 'Waitlisted'
  payment: 'Paid' | 'Waived' | 'Pending' | 'Failed' | 'Disputed' | 'Refunded' | 'Not required' | 'Unknown'
  next: string
  due: string
}

type WorkDecision = 'No decision' | 'Accepted' | 'Declined' | 'Waitlisted'

const directions = [
  {
    id: 'queue' as const,
    number: '01',
    name: 'Queue and dossier',
    description: 'A consequence-first queue keeps the selected Submission and its next safe action in view.',
  },
  {
    id: 'ledger' as const,
    number: '02',
    name: 'Lifecycle ledger',
    description: 'A broad operational ledger separates receipt, review, decision, communication, and payment lanes.',
  },
  {
    id: 'desk' as const,
    number: '03',
    name: 'Evidence desk',
    description: 'A focused reading surface keeps Work evidence beside review or decision controls.',
  },
]

function selectedDirectionForSurface(surface: Surface): Direction {
  return surface === 'submissions' ? 'queue' : 'desk'
}

const fixtures: Array<{ value: Fixture; label: string; surface: Surface }> = [
  { value: 'mixed', label: 'Mixed operational queue', surface: 'submissions' },
  { value: 'empty', label: 'No Submissions', surface: 'submissions' },
  { value: 'large', label: '10,000 Submissions', surface: 'submissions' },
  { value: 'missing-file', label: 'Missing required file', surface: 'submissions' },
  { value: 'payment-problem', label: 'Payment dispute', surface: 'submissions' },
  { value: 'withdrawn-work', label: 'One Work withdrawn', surface: 'submissions' },
  { value: 'taxonomy-conflict', label: 'Practice-rule conflict', surface: 'submissions' },
  { value: 'import-integrity', label: 'Imported status conflict', surface: 'submissions' },
  { value: 'blind', label: 'Blind review', surface: 'reviews' },
  { value: 'duplicate-assignment', label: 'Duplicate assignment', surface: 'reviews' },
  { value: 'review-conflict', label: 'Reviewer conflict', surface: 'reviews' },
  { value: 'review-save-failure', label: 'Review save failure', surface: 'reviews' },
  { value: 'review-overdue', label: 'Reviews overdue', surface: 'reviews' },
  { value: 'split-review', label: 'Split recommendations', surface: 'reviews' },
  { value: 'partial-decision', label: 'Partially accepted packet', surface: 'decisions' },
  { value: 'mixed-decision', label: 'Mixed packet decisions', surface: 'decisions' },
  { value: 'decision-incomplete', label: 'Incomplete review gate', surface: 'decisions' },
  { value: 'decision-concurrent', label: 'Decision changed elsewhere', surface: 'decisions' },
  { value: 'message-partial', label: 'Message partly sent', surface: 'decisions' },
  { value: 'message-missing-recipient', label: 'Missing recipient', surface: 'decisions' },
  { value: 'message-scheduled', label: 'Decision messages scheduled', surface: 'decisions' },
  { value: 'finance', label: 'Finance projection', surface: 'submissions' },
  { value: 'legal', label: 'Legal projection', surface: 'decisions' },
  { value: 'viewer', label: 'Read-only Viewer', surface: 'submissions' },
  { value: 'foreign', label: 'Foreign Organization', surface: 'submissions' },
  { value: 'mobile-urgent', label: 'Urgent mobile correction', surface: 'decisions' },
]

const baseSubmissions: SubmissionRow[] = [
  {
    id: 'river-maps',
    submitter: 'Amaka Nwosu',
    works: ['River Maps', 'Notes for a Returning City'],
    opportunity: '2027 Poetry and Essay Prize',
    category: 'Poetry · Written work',
    receipt: 'Received',
    review: 'Review complete',
    decision: 'Partially accepted',
    payment: 'Paid',
    next: 'Complete one Work decision',
    due: 'Today',
  },
  {
    id: 'soft-machines',
    submitter: 'Tomi Adeyemi',
    works: ['Soft Machines'],
    opportunity: 'New Voices Residency',
    category: 'Hybrid writing · Residency',
    receipt: 'Needs attention',
    review: 'Not started',
    decision: 'No decisions',
    payment: 'Waived',
    next: 'Resolve missing portfolio file',
    due: 'Before assignment',
  },
  {
    id: 'night-bus',
    submitter: 'Ifeanyi Okoro',
    works: ['Night Bus to Enugu'],
    opportunity: '2027 Poetry and Essay Prize',
    category: 'Creative nonfiction · Written work',
    receipt: 'Received',
    review: 'In review',
    decision: 'No decisions',
    payment: 'Paid',
    next: 'One review due',
    due: '14 Aug',
  },
  {
    id: 'market-light',
    submitter: 'Zainab Bello',
    works: ['Market Light'],
    opportunity: 'Public Art Writing Commission',
    category: 'Art writing · Commission',
    receipt: 'Withdrawn',
    review: 'Review paused',
    decision: 'No decisions',
    payment: 'Refunded',
    next: 'No action',
    due: '—',
  },
]

const initialDecisions: Record<string, WorkDecision> = {
  'River Maps': 'Accepted',
  'Notes for a Returning City': 'No decision',
}

function roleForFixture(fixture: Fixture) {
  if (fixture === 'finance') return 'Finance'
  if (fixture === 'legal') return 'Legal'
  if (fixture === 'viewer') return 'Viewer'
  return 'Program manager'
}

function AppHeader() {
  return (
    <header className={styles.appHeader}>
      <a href='#workflow-content' className={styles.skipLink}>Skip to content</a>
      <a href='#' className={`${styles.wordmark} missa-wordmark missa-wordmark--app`}>Missa</a>
      <nav aria-label='Product navigation'><a href='#'>Profile</a><a href='#' aria-current='page'>Organization</a></nav>
      <div className={styles.headerActions}>
        <Button type='button' variant='outline' size='sm'><Search aria-hidden='true' />Search <span>⌘K</span></Button>
        <button type='button' className={styles.avatar} aria-label='Open Profile'>AO</button>
      </div>
    </header>
  )
}

function ReviewControls({ direction, selectedOnly, setDirection, surface, setSurface, fixture, setFixture }: {
  direction: Direction
  selectedOnly: boolean
  setDirection: (direction: Direction) => void
  surface: Surface
  setSurface: (surface: Surface) => void
  fixture: Fixture
  setFixture: (fixture: Fixture) => void
}) {
  return (
    <div className={styles.reviewBar} aria-label='Design review controls'>
      {selectedOnly ? <div className={styles.selectedLabel}><strong>Selected workflow composition</strong><span>{surface === 'submissions' ? '01 · Queue and dossier' : '03 · Evidence desk'}</span></div> : <div className={styles.directionButtons} role='group' aria-label='Visual direction'>
        {directions.map((item) => <button type='button' key={item.id} data-active={direction === item.id} onClick={() => setDirection(item.id)}><span>{item.number}</span>{item.name}</button>)}
      </div>}
      <div className={styles.surfaceButtons} role='group' aria-label='Workflow surface'>
        {(['submissions', 'reviews', 'decisions'] as Surface[]).map((item) => <button type='button' key={item} data-active={surface === item} onClick={() => setSurface(item)}>{item[0]!.toUpperCase() + item.slice(1)}</button>)}
      </div>
      <label><span>Edge state</span><select value={fixture} onChange={(event) => setFixture(event.target.value as Fixture)}>{fixtures.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
    </div>
  )
}

function DirectionIntro({ direction }: { direction: Direction }) {
  const item = directions.find((candidate) => candidate.id === direction)!
  return <section className={styles.directionIntro} aria-label={`${item.name} visual direction`}><span>{item.number}</span><div><p>Organization workflow direction</p><strong>{item.name}</strong><p>{item.description}</p></div></section>
}

function OrganizationBar({ surface, role }: { surface: Surface; role: string }) {
  return (
    <div className={styles.organizationBar}>
      <button type='button' aria-label={`Switch Organization. Current: North River Review, ${role}`}><span className={styles.organizationMark}>NR</span><span><strong>North River Review</strong><small>{role}</small></span><ChevronDown aria-hidden='true' /></button>
      <nav aria-label='Organization navigation'>
        <a href='#'>Overview</a><a href='#'>Opportunities</a><a href='#' aria-current={surface === 'submissions' ? 'page' : undefined}>Submissions</a><a href='#' aria-current={surface === 'reviews' ? 'page' : undefined}>Reviews</a><a href='#' aria-current={surface === 'decisions' ? 'page' : undefined}>Decisions</a>
      </nav>
      <Button type='button' variant='ghost' size='icon' aria-label='Open Organization navigation'><Menu aria-hidden='true' /></Button>
    </div>
  )
}

function StateBadge({ value }: { value: string }) {
  const tone = ['Accepted', 'Review complete', 'Paid', 'Sent', 'Ready'].includes(value)
    ? 'positive'
    : ['Needs attention', 'Failed', 'Disputed', 'Overdue', 'Conflict', 'Partly sent'].includes(value)
      ? 'attention'
      : ['In review', 'Assigning', 'Partially accepted', 'Partially decided', 'Scheduled'].includes(value)
        ? 'information'
        : 'neutral'
  return <span className={styles.stateBadge} data-tone={tone}>{value}</span>
}

function SurfaceHeader({ surface, role }: { surface: Surface; role: string }) {
  const copy = {
    submissions: ['Submissions', 'Triage received work and move only ready records into review.'],
    reviews: ['Reviews', 'Assign eligible reviewers, resolve conflicts, and complete each round.'],
    decisions: ['Decisions', 'Prepare per-Work outcomes, then review communication separately.'],
  }[surface]
  return <header className={styles.pageHeader}><div><p className={styles.eyebrow}>North River Review · {role}</p><h1>{copy[0]}</h1><p>{copy[1]}</p></div>{role === 'Viewer' ? <Badge variant='outline'>Read only</Badge> : null}</header>
}

function rowsForFixture(fixture: Fixture): SubmissionRow[] {
  if (fixture === 'empty' || fixture === 'foreign') return []
  if (fixture === 'large') return Array.from({ length: 18 }, (_, index) => ({ ...baseSubmissions[index % baseSubmissions.length]!, id: `large-${index}`, submitter: `${baseSubmissions[index % baseSubmissions.length]!.submitter} · ${index + 1}` }))
  if (fixture === 'missing-file') return [{ ...baseSubmissions[1]!, next: 'Required portfolio file is missing' }, ...baseSubmissions.filter((item) => item.id !== 'soft-machines')]
  if (fixture === 'payment-problem') return [{ ...baseSubmissions[0]!, payment: 'Disputed', next: 'Payment dispute needs Finance' }, ...baseSubmissions.slice(1)]
  if (fixture === 'withdrawn-work') return [{ ...baseSubmissions[0]!, works: ['River Maps', 'Notes for a Returning City · Withdrawn'], decision: 'Accepted', next: 'Prepare message for active Work only' }, ...baseSubmissions.slice(1)]
  if (fixture === 'import-integrity') return [{ ...baseSubmissions[0]!, decision: 'Accepted', review: 'Not started', next: 'Resolve imported outcome without Work decisions' }, ...baseSubmissions.slice(1)]
  if (fixture === 'finance') return baseSubmissions.map((row) => ({ ...row, submitter: 'Identity withheld', works: ['Creative Work'] }))
  return baseSubmissions
}

function SubmissionFilters({ query, setQuery }: { query: string; setQuery: (value: string) => void }) {
  return (
    <form className={styles.filters} role='search' onSubmit={(event) => event.preventDefault()}>
      <label className={styles.searchField}><span>Search Submissions</span><div><Search aria-hidden='true' /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder='Search name, Work, or Opportunity' /></div></label>
      <label><span>Attention</span><select defaultValue='all'><option value='all'>All</option><option>Needs attention</option><option>Ready for review</option><option>Decision ready</option></select></label>
      <label><span>Opportunity</span><select defaultValue='all'><option value='all'>All Opportunities</option><option>2027 Poetry and Essay Prize</option><option>New Voices Residency</option></select></label>
      <Button type='submit' variant='outline'><Filter aria-hidden='true' />Apply</Button>
    </form>
  )
}

function SubmissionTable({ rows, selected, setSelected, selectedIds, setSelectedIds, role }: {
  rows: SubmissionRow[]
  selected: string
  setSelected: (id: string) => void
  selectedIds: string[]
  setSelectedIds: (ids: string[]) => void
  role: string
}) {
  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.includes(row.id))
  return (
    <div className={styles.tableWrap}>
      <table>
        <caption className='sr-only'>Organization Submissions</caption>
        <thead><tr>{role === 'Viewer' ? null : <th scope='col'><Checkbox aria-label='Select all visible Submissions' checked={allSelected} onCheckedChange={(checked) => setSelectedIds(checked ? rows.map((row) => row.id) : [])} /></th>}<th scope='col'>Submission</th><th scope='col'>Opportunity</th><th scope='col'>Receipt</th><th scope='col'>Review</th><th scope='col'>Decision</th>{role === 'Finance' ? <th scope='col'>Payment</th> : null}<th scope='col'>Next</th><th scope='col'><span className='sr-only'>Open</span></th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id} data-selected={row.id === selected}>{role === 'Viewer' ? null : <td><Checkbox aria-label={`Select Submission from ${row.submitter}`} checked={selectedIds.includes(row.id)} onCheckedChange={(checked) => setSelectedIds(checked ? [...selectedIds, row.id] : selectedIds.filter((id) => id !== row.id))} /></td>}<th scope='row'><button type='button' onClick={() => setSelected(row.id)}>{row.submitter}</button><small>{row.works.length} Work{row.works.length === 1 ? '' : 's'} · {row.category}</small></th><td>{row.opportunity}</td><td><StateBadge value={row.receipt} /></td><td><StateBadge value={row.review} /></td><td><StateBadge value={row.decision} /></td>{role === 'Finance' ? <td><StateBadge value={row.payment} /></td> : null}<td><strong>{row.next}</strong><small>{row.due}</small></td><td><Button type='button' variant='ghost' size='icon' aria-label={`More actions for Submission from ${row.submitter}`}><MoreHorizontal aria-hidden='true' /></Button></td></tr>)}</tbody>
      </table>
    </div>
  )
}

function SubmissionDossier({ row, fixture, role }: { row?: SubmissionRow; fixture: Fixture; role: string }) {
  if (!row) return null
  const identityVisible = role !== 'Finance' && fixture !== 'blind'
  return (
    <aside className={styles.dossier} aria-label='Selected Submission'>
      <header><div><p className={styles.eyebrow}>Selected Submission</p><h2>{identityVisible ? row.submitter : 'Identity withheld'}</h2><p>{row.opportunity}</p></div><Button type='button' variant='ghost' size='icon' aria-label='Close selected Submission'><ArrowRight aria-hidden='true' /></Button></header>
      {fixture === 'import-integrity' ? <Alert variant='destructive'><ShieldAlert aria-hidden='true' /><AlertTitle>Imported outcome needs repair</AlertTitle><AlertDescription>This packet says Accepted but has no per-Work decisions. Review the original import before any message or delivery action.</AlertDescription></Alert> : null}
      {fixture === 'taxonomy-conflict' ? <Alert><Flag aria-hidden='true' /><AlertTitle>Practice context needs review</AlertTitle><AlertDescription>The submitted term and Opportunity rule conflict. This does not determine eligibility or the creative decision.</AlertDescription></Alert> : null}
      <dl className={styles.factList}><div><dt>Receipt</dt><dd>{row.receipt}</dd></div><div><dt>Review</dt><dd>{row.review}</dd></div><div><dt>Decision summary</dt><dd>{row.decision}</dd></div><div><dt>Payment</dt><dd>{row.payment}</dd></div><div><dt>Category</dt><dd>{row.category}</dd></div></dl>
      <section className={styles.workList}><header><h3>Works</h3><span>{row.works.length}</span></header>{row.works.map((work, index) => <article key={work}><div className={styles.fileIcon}><FileText aria-hidden='true' /></div><div><strong>{work}</strong><p>{index === 0 ? 'PDF · 14 pages · Available' : fixture === 'missing-file' ? 'Required file missing' : 'PDF · 9 pages · Available'}</p></div><Button type='button' variant='ghost' size='icon' aria-label={`Open ${work}`}><ChevronRight aria-hidden='true' /></Button></article>)}</section>
      <footer><div><strong>{row.next}</strong><span>{row.due}</span></div><Button type='button' variant='outline'>Open full dossier</Button></footer>
    </aside>
  )
}

function SubmissionEmpty({ fixture }: { fixture: Fixture }) {
  if (fixture === 'foreign') return <Alert><ShieldCheck aria-hidden='true' /><AlertTitle>These Submissions are not available</AlertTitle><AlertDescription>Return to an Organization you can access. Missa will not reveal whether another Organization has records here.</AlertDescription></Alert>
  return <section className={styles.emptyState}><Inbox aria-hidden='true' /><h2>No Submissions yet</h2><p>Submissions will appear after an Opportunity is published and someone completes its submission flow.</p><Button type='button' variant='outline'>View Opportunities</Button></section>
}

function SubmissionsSurface({ direction, fixture, role, onStatus }: { direction: Direction; fixture: Fixture; role: string; onStatus: (message: string) => void }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState('river-maps')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const rows = rowsForFixture(fixture).filter((row) => !query || `${row.submitter} ${row.works.join(' ')} ${row.opportunity}`.toLowerCase().includes(query.toLowerCase()))
  const active = rows.find((row) => row.id === selected) ?? rows[0]
  return (
    <main id='workflow-content' className={styles.main} data-direction={direction}>
      <SurfaceHeader surface='submissions' role={role} />
      {fixture === 'payment-problem' ? <Alert><CircleDollarSign aria-hidden='true' /><AlertTitle>One payment dispute needs Finance</AlertTitle><AlertDescription>Review payment state separately. A dispute does not determine eligibility, review, or decision.</AlertDescription></Alert> : null}
      {fixture === 'mobile-urgent' ? <Alert variant='destructive'><AlertCircle aria-hidden='true' /><AlertTitle>A withdrawn Work is still assigned</AlertTitle><AlertDescription>Remove the Work from active review before the reviewer opens the packet.</AlertDescription></Alert> : null}
      <SubmissionFilters query={query} setQuery={setQuery} />
      {selectedIds.length ? <div className={styles.bulkBar}><p><strong>{selectedIds.length} selected</strong><span>Current page only</span></p><Button type='button' variant='outline' onClick={() => onStatus(`${selectedIds.length} Submissions opened for assignment preview.`)}><UserRoundCheck aria-hidden='true' />Preview assignment</Button><Button type='button' variant='outline'><Download aria-hidden='true' />Review export</Button><Button type='button' variant='ghost' onClick={() => setSelectedIds([])}>Clear</Button></div> : null}
      {rows.length ? <div className={styles.submissionLayout}><SubmissionTable rows={rows} selected={active?.id ?? ''} setSelected={setSelected} selectedIds={selectedIds} setSelectedIds={setSelectedIds} role={role} />{direction === 'ledger' ? null : <SubmissionDossier row={active} fixture={fixture} role={role} />}</div> : <SubmissionEmpty fixture={fixture} />}
      {direction === 'ledger' && active ? <SubmissionDossier row={active} fixture={fixture} role={role} /> : null}
      {fixture === 'large' ? <nav className={styles.pagination} aria-label='Submission pages'><span>1–50 of 10,000</span><Button type='button' variant='outline' disabled><ArrowLeft aria-hidden='true' />Previous</Button><Button type='button' variant='outline'>Next<ArrowRight aria-hidden='true' /></Button></nav> : null}
    </main>
  )
}

const assignments = [
  { work: 'River Maps', reviewer: 'Maya Chen', progress: 'Submitted', due: '12 Aug', recommendation: 'Recommend', score: '8.4' },
  { work: 'River Maps', reviewer: 'Jon Bell', progress: 'In progress', due: 'Today', recommendation: '—', score: '—' },
  { work: 'Notes for a Returning City', reviewer: 'Lola Mensah', progress: 'Conflict', due: 'Today', recommendation: 'Withheld', score: '—' },
  { work: 'Night Bus to Enugu', reviewer: 'Seyi Hart', progress: 'Overdue', due: '7 Aug', recommendation: '—', score: '—' },
]

function ReviewReader({ fixture, onStatus }: { fixture: Fixture; onStatus: (message: string) => void }) {
  const [notes, setNotes] = useState('The language is controlled and the city sections hold together. I would ask for a shorter ending.')
  const [recommendation, setRecommendation] = useState('recommend')
  return (
    <section className={styles.reader}>
      <article className={styles.workReader}><header><div><p className={styles.eyebrow}>Assigned Work 1 of 2</p><h2>River Maps</h2><p>{fixture === 'blind' ? 'Identity withheld · Poetry' : 'Amaka Nwosu · Poetry'}</p></div><Button type='button' variant='outline'><Paperclip aria-hidden='true' />Open PDF</Button></header><div className={styles.manuscript}><p>I return by water, each bridge a version of the city that learned my name.</p><p>The map folds differently at dusk. Roads become questions; the river keeps the answer.</p><p>At the old market, light settles on every roof except the one I remember.</p></div></article>
      <form className={styles.rubric} onSubmit={(event) => { event.preventDefault(); onStatus(fixture === 'review-save-failure' ? 'Review could not be saved. Your recommendation and notes remain here.' : 'Review draft saved.') }}><header><div><p className={styles.eyebrow}>Reader round · Due today</p><h2>Recommendation</h2></div><StateBadge value={fixture === 'review-save-failure' ? 'Needs attention' : 'Draft'} /></header>{fixture === 'review-conflict' ? <Alert variant='destructive'><ShieldAlert aria-hidden='true' /><AlertTitle>You declared a conflict</AlertTitle><AlertDescription>This Work is no longer available for review. The Program manager can reassign it.</AlertDescription></Alert> : null}<fieldset disabled={fixture === 'review-conflict'}><legend>Overall recommendation</legend><RadioGroup value={recommendation} onValueChange={(value) => setRecommendation(value)}><label><RadioGroupItem value='recommend' />Recommend</label><label><RadioGroupItem value='consider' />Consider</label><label><RadioGroupItem value='do-not-recommend' />Do not recommend</label></RadioGroup></fieldset><label><span>Notes for the review team</span><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} aria-describedby='review-note-help' /></label><p id='review-note-help'>Private to the permitted review team. Identity remains hidden in this round.</p><footer><Button type='button' variant='outline' onClick={() => onStatus('Conflict form opened.')}>Declare conflict</Button><Button type='submit'>Save draft</Button><Button type='button' onClick={() => onStatus('Review validation passed. Final submission confirmation opened.')}>Review and submit</Button></footer></form>
    </section>
  )
}

function ReviewsSurface({ direction, fixture, role, onStatus }: { direction: Direction; fixture: Fixture; role: string; onStatus: (message: string) => void }) {
  const reviewerMode = direction === 'desk' || fixture === 'blind' || fixture === 'review-save-failure' || fixture === 'review-conflict'
  return (
    <main id='workflow-content' className={styles.main} data-direction={direction}>
      <SurfaceHeader surface='reviews' role={role} />
      {reviewerMode ? <ReviewReader fixture={fixture} onStatus={onStatus} /> : <>
        <section className={styles.roundHeader}><div><p className={styles.eyebrow}>2027 Poetry and Essay Prize</p><h2>Reader round</h2><p>Blind review · Rubric version 2 · Reviews due 14 August</p></div><div className={styles.roundStats}><span><strong>42</strong>Assigned</span><span><strong>31</strong>Submitted</span><span><strong>2</strong>Conflicts</span><span><strong>4</strong>Overdue</span></div><Button type='button' onClick={() => onStatus('Assignment preview opened with eligible reviewers only.')}><UserRoundCheck aria-hidden='true' />Assign reviewers</Button></section>
        {fixture === 'duplicate-assignment' ? <Alert><Users aria-hidden='true' /><AlertTitle>Maya Chen is already assigned</AlertTitle><AlertDescription>The existing active assignment remains unchanged. Choose another eligible reviewer or open the current assignment.</AlertDescription></Alert> : null}
        {fixture === 'split-review' ? <Alert><MessageSquareText aria-hidden='true' /><AlertTitle>Recommendations differ on River Maps</AlertTitle><AlertDescription>Two reviewers recommend it and two do not. Review the permitted evidence; Missa will not turn disagreement into an automatic decision.</AlertDescription></Alert> : null}
        <div className={styles.assignmentTable}><table><caption className='sr-only'>Reader round assignments</caption><thead><tr><th scope='col'>Work</th><th scope='col'>Reviewer</th><th scope='col'>Progress</th><th scope='col'>Due</th><th scope='col'>Recommendation</th><th scope='col'>Score</th><th scope='col'><span className='sr-only'>Action</span></th></tr></thead><tbody>{assignments.map((item) => <tr key={`${item.work}-${item.reviewer}`}><th scope='row'><button type='button'>{item.work}</button><small>Poetry · Written work</small></th><td>{item.reviewer}</td><td><StateBadge value={fixture === 'review-overdue' && item.progress === 'In progress' ? 'Overdue' : item.progress} /></td><td>{item.due}</td><td>{item.recommendation}</td><td>{item.score}</td><td><Button type='button' variant='ghost' size='icon' aria-label={`Open assignment for ${item.reviewer}`}><ChevronRight aria-hidden='true' /></Button></td></tr>)}</tbody></table></div>
      </>}
    </main>
  )
}

function DecisionMessageState({ fixture, onStatus }: { fixture: Fixture; onStatus: (message: string) => void }) {
  if (fixture === 'message-partial') return <Alert><Mail aria-hidden='true' /><AlertTitle>48 sent, 2 could not be sent</AlertTitle><AlertDescription>Successful messages remain sent. Review the two recipients and try only those messages again.</AlertDescription><Button type='button' variant='outline' onClick={() => onStatus('Two failed recipients opened for review.')}>Review 2 recipients</Button></Alert>
  if (fixture === 'message-missing-recipient') return <Alert variant='destructive'><AlertCircle aria-hidden='true' /><AlertTitle>One recipient has no usable email address</AlertTitle><AlertDescription>That person is excluded from the send. Add an approved address or use another permitted communication method.</AlertDescription></Alert>
  if (fixture === 'message-scheduled') return <Alert><CalendarClock aria-hidden='true' /><AlertTitle>Decision messages scheduled for 18 August at 9:00 AM WAT</AlertTitle><AlertDescription>Fifty messages are ready. You can cancel before sending begins.</AlertDescription><Button type='button' variant='outline'>Cancel schedule</Button></Alert>
  return null
}

function DecisionsSurface({ direction, fixture, role, onStatus }: { direction: Direction; fixture: Fixture; role: string; onStatus: (message: string) => void }) {
  const [decisions, setDecisions] = useState(initialDecisions)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [finalized, setFinalized] = useState(false)
  const blocked = fixture === 'decision-incomplete' || fixture === 'decision-concurrent' || role === 'Viewer' || role === 'Legal'
  const works = fixture === 'mixed-decision'
    ? [{ title: 'River Maps', review: 'Complete', outcome: 'Accepted' as WorkDecision }, { title: 'Notes for a Returning City', review: 'Complete', outcome: 'Waitlisted' as WorkDecision }]
    : [{ title: 'River Maps', review: 'Complete', outcome: decisions['River Maps']! }, { title: 'Notes for a Returning City', review: fixture === 'decision-incomplete' ? '1 of 2 reviews' : 'Complete', outcome: decisions['Notes for a Returning City']! }]
  return (
    <main id='workflow-content' className={styles.main} data-direction={direction}>
      <SurfaceHeader surface='decisions' role={role} />
      <DecisionMessageState fixture={fixture} onStatus={onStatus} />
      {fixture === 'decision-concurrent' ? <Alert variant='destructive'><RefreshCw aria-hidden='true' /><AlertTitle>This decision changed elsewhere</AlertTitle><AlertDescription>River Maps is now Waitlisted. Compare the current record with your Accepted draft before continuing.</AlertDescription><Button type='button' variant='outline'>Compare changes</Button></Alert> : null}
      {fixture === 'mobile-urgent' ? <Alert variant='destructive'><Mail aria-hidden='true' /><AlertTitle>Correction required for one sent decision</AlertTitle><AlertDescription>The Work outcome changed after communication. Review the correction and recipient before sending anything else.</AlertDescription><Button type='button' variant='outline'>Open correction</Button></Alert> : null}
      <div className={styles.decisionLayout}>
        <section className={styles.decisionWorks}>
          <header><div><p className={styles.eyebrow}>2027 Poetry and Essay Prize</p><h2>{fixture === 'mixed-decision' ? 'Mixed decision packet' : 'Amaka Nwosu · 2 Works'}</h2><p>Decide each active Work. The Submission summary is derived.</p></div><StateBadge value={finalized ? 'Accepted' : fixture === 'mixed-decision' ? 'Mixed' : 'Partially accepted'} /></header>
          {works.map((work) => <article key={work.title}><div className={styles.workIdentity}><FileText aria-hidden='true' /><div><h3>{work.title}</h3><p>Poetry · Written work</p></div></div><dl><div><dt>Review</dt><dd>{work.review}</dd></div><div><dt>Recommendation</dt><dd>{work.title === 'River Maps' ? '2 recommend · 1 consider' : '1 recommend · 1 pending'}</dd></div></dl><fieldset disabled={role === 'Viewer' || role === 'Legal'}><legend>Decision for {work.title}</legend><RadioGroup value={work.outcome} onValueChange={(value) => setDecisions((current) => ({ ...current, [work.title]: value as WorkDecision }))}><label><RadioGroupItem value='Accepted' />Accept</label><label><RadioGroupItem value='Declined' />Decline</label><label><RadioGroupItem value='Waitlisted' />Waitlist</label><label><RadioGroupItem value='No decision' />No decision</label></RadioGroup></fieldset><Button type='button' variant='ghost'><Eye aria-hidden='true' />Review evidence</Button></article>)}
          {role === 'Legal' ? <Alert><ShieldCheck aria-hidden='true' /><AlertTitle>Legal review projection</AlertTitle><AlertDescription>You can review approved decision copy and agreement consequences. Outcome controls are unavailable.</AlertDescription></Alert> : null}
        </section>
        <aside className={styles.decisionSummary}><header><p className={styles.eyebrow}>Draft summary</p><h2>{Object.values(decisions).includes('No decision') ? '1 of 2 Works decided' : '2 of 2 Works decided'}</h2></header><dl className={styles.factList}><div><dt>Accepted</dt><dd>{Object.values(decisions).filter((item) => item === 'Accepted').length}</dd></div><div><dt>Declined</dt><dd>{Object.values(decisions).filter((item) => item === 'Declined').length}</dd></div><div><dt>Waitlisted</dt><dd>{Object.values(decisions).filter((item) => item === 'Waitlisted').length}</dd></div><div><dt>Communication</dt><dd>{finalized ? 'Ready to prepare' : 'Not prepared'}</dd></div><div><dt>Delivery</dt><dd>{finalized ? 'Not started' : 'Not applicable yet'}</dd></div></dl>{blocked ? <p className={styles.blockReason}>{fixture === 'decision-incomplete' ? 'Complete the required review or record an authorized override before finalizing.' : fixture === 'decision-concurrent' ? 'Resolve the changed decision before finalizing.' : 'Your role cannot finalize decisions.'}</p> : null}<Button type='button' variant='outline' onClick={() => onStatus('Decision draft saved. No message was sent.')}>Save draft</Button><Button type='button' disabled={blocked || Object.values(decisions).includes('No decision')} onClick={() => setConfirmOpen(true)}>Review and finalize</Button>{finalized ? <Button type='button' variant='outline'><Mail aria-hidden='true' />Prepare decision messages</Button> : null}</aside>
      </div>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Finalize decisions for 2 Works?</AlertDialogTitle><AlertDialogDescription>River Maps will be accepted and Notes for a Returning City will be {decisions['Notes for a Returning City'].toLowerCase()}. One accepted Work will become ready for delivery setup. No message will be sent.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Review again</AlertDialogCancel><AlertDialogAction onClick={() => { setFinalized(true); setConfirmOpen(false); onStatus('Two Work decisions finalized. No message was sent.') }}>Finalize decisions</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </main>
  )
}

function OrganizationWorkflowExperience({ selectedOnly }: { selectedOnly: boolean }) {
  const [direction, setDirection] = useState<Direction>('queue')
  const [surface, setSurface] = useState<Surface>('submissions')
  const [fixture, setFixture] = useState<Fixture>('mixed')
  const [status, setStatus] = useState('')
  const role = roleForFixture(fixture)
  const activeDirection = selectedOnly ? selectedDirectionForSurface(surface) : direction
  const directionInfo = useMemo(() => directions.find((item) => item.id === activeDirection)!, [activeDirection])

  function changeFixture(value: Fixture) {
    setFixture(value)
    setSurface(fixtures.find((item) => item.value === value)?.surface ?? 'submissions')
    setStatus('')
  }

  return (
    <div className={styles.pageShell}>
      <ReviewControls direction={activeDirection} selectedOnly={selectedOnly} setDirection={setDirection} surface={surface} setSurface={setSurface} fixture={fixture} setFixture={changeFixture} />
      <AppHeader />
      <DirectionIntro direction={directionInfo.id} />
      <OrganizationBar surface={surface} role={role} />
      {surface === 'submissions' ? <SubmissionsSurface key={fixture} direction={activeDirection} fixture={fixture} role={role} onStatus={setStatus} /> : null}
      {surface === 'reviews' ? <ReviewsSurface key={fixture} direction={activeDirection} fixture={fixture} role={role} onStatus={setStatus} /> : null}
      {surface === 'decisions' ? <DecisionsSurface key={fixture} direction={activeDirection} fixture={fixture} role={role} onStatus={setStatus} /> : null}
      <p className={styles.liveStatus} role='status' aria-live='polite'>{status}{status ? <Check aria-hidden='true' /> : null}</p>
    </div>
  )
}

export function OrganizationWorkflowDirections() {
  return <OrganizationWorkflowExperience selectedOnly={false} />
}

export function OrganizationWorkflowSelected() {
  return <OrganizationWorkflowExperience selectedOnly />
}
