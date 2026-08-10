'use client'

import {
  AlertCircle,
  Archive,
  ArrowLeft,
  ArrowRight,
  BellRing,
  CalendarClock,
  Check,
  CheckCheck,
  CircleCheck,
  ExternalLink,
  FileCheck2,
  Filter,
  Inbox,
  MailCheck,
  Menu,
  MoreHorizontal,
  Search,
  Settings2,
  Sparkles,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

import styles from './inbox-directions.module.css'

type Direction = 'queue' | 'briefing' | 'review'
type Fixture = 'active' | 'empty' | 'decision' | 'ambiguous' | 'conflict' | 'error' | 'large'
type InboxFilter = 'attention' | 'all' | 'submissions' | 'changes' | 'email'
type ItemKind = 'decision' | 'email' | 'change' | 'reminder' | 'receipt' | 'recommendation'

type InboxItem = {
  id: string
  kind: ItemKind
  category: string
  title: string
  organization: string
  summary: string
  reason: string
  time: string
  unread: boolean
  attention: boolean
  action: string
  detail: string
  previous?: string
  current?: string
}

const directions: Array<{ id: Direction; number: string; title: string; description: string }> = [
  { id: 'queue', number: '01', title: 'Attention queue', description: 'A calm list-detail inbox ordered by consequence, with one clear next action.' },
  { id: 'briefing', number: '02', title: 'Daily briefing', description: 'A grouped editorial digest that separates decisions, changes, reminders, and discovery.' },
  { id: 'review', number: '03', title: 'Review desk', description: 'A decision-first surface for creators who import many submission emails.' },
]

const baseItems: InboxItem[] = [
  {
    id: 'decision', kind: 'decision', category: 'Submission decision', title: 'Your North River Review submission has a decision', organization: 'North River Review',
    summary: 'A decision is ready for Saltwater Lessons.', reason: 'You submitted Saltwater Lessons through Missa on 18 July.', time: 'Today · 9:42 AM', unread: true, attention: true, action: 'View decision',
    detail: 'Open the submission record to read the decision and keep the exact Work version, receipt, and Organization history together.',
  },
  {
    id: 'email', kind: 'email', category: 'Email update', title: 'A possible status update needs your review', organization: 'Field Notes Foundation',
    summary: '“Thank you for your submission. Borrowed Ground is now with our review panel…”', reason: 'Missa saved a short excerpt from an email you forwarded. Nothing changes in Tracker until you confirm it.', time: 'Today · 8:16 AM', unread: true, attention: true, action: 'Review update',
    detail: 'The email appears to refer to Emerging Ecologies Prize and may mean the submission is in review. Confirm, correct, keep a private manual record, ignore it, or delete Missa’s saved excerpt.',
  },
  {
    id: 'deadline', kind: 'change', category: 'Opportunity change', title: 'North River Review extended its deadline', organization: 'North River Review',
    summary: 'The official deadline moved from 14 August to 28 August 2026.', reason: 'This opportunity is in your Tracker.', time: 'Yesterday', unread: true, attention: false, action: 'Review change',
    detail: 'Your preparation remains in progress. The official source now lists 28 August 2026; the previous value is preserved in the change history.', previous: '14 Aug 2026', current: '28 Aug 2026',
  },
  {
    id: 'receipt', kind: 'receipt', category: 'Submission receipt', title: 'Compass Literary Awards received your submission', organization: 'Compass Literary Awards',
    summary: 'Receipt recorded for After the Harmattan.', reason: 'You recorded this external submission in Tracker.', time: '2 days ago', unread: false, attention: false, action: 'View receipt',
    detail: 'The receipt belongs to the external submission record and the Work snapshot you selected at the time.',
  },
  {
    id: 'reminder', kind: 'reminder', category: 'Deadline reminder', title: 'PEN America Open Call closes in 12 days', organization: 'PEN America',
    summary: 'No Work is linked yet.', reason: 'You asked Missa to remind you about this saved opportunity.', time: '3 days ago', unread: false, attention: false, action: 'Continue preparing',
    detail: 'Link a Work or review the opportunity before deciding whether to prepare an application.',
  },
  {
    id: 'followed', kind: 'recommendation', category: 'From an Organization you follow', title: 'Futurepoem opened a new poetry award', organization: 'Futurepoem',
    summary: 'Other Futures Award · closes 30 September 2026.', reason: 'You follow Futurepoem.', time: '4 days ago', unread: false, attention: false, action: 'View opportunity',
    detail: 'This is a quieter discovery update. It should never outrank decisions, active submissions, or Tracker changes.',
  },
]

const filterMap: Record<InboxFilter, ItemKind[]> = {
  attention: ['decision', 'email', 'change', 'reminder'], all: ['decision', 'email', 'change', 'reminder', 'receipt', 'recommendation'], submissions: ['decision', 'receipt'], changes: ['change', 'reminder'], email: ['email'],
}

function AppHeader() {
  return (
    <header className={styles.appHeader}>
      <a href='#inbox-content' className={styles.wordmark}>Missa</a>
      <nav aria-label='Primary navigation'><a href='#'>Opportunities</a><a href='#'>Tracker</a><a href='#'>Library</a></nav>
      <div className={styles.headerActions}><Button type='button' variant='ghost' size='icon' aria-label='Open Inbox'><Inbox aria-hidden='true' /></Button><Button type='button' variant='ghost' size='icon' className={styles.mobileMenu} aria-label='Open navigation'><Menu aria-hidden='true' /></Button><button type='button' className={styles.avatar} aria-label='Open Profile'>A</button></div>
    </header>
  )
}

function ReviewBar({ direction, setDirection, fixture, setFixture }: { direction: Direction; setDirection: (direction: Direction) => void; fixture: Fixture; setFixture: (fixture: Fixture) => void }) {
  return (
    <div className={styles.reviewBar} aria-label='Design review controls'>
      <div className={styles.directionButtons}>{directions.map((item) => <button key={item.id} type='button' data-active={direction === item.id} onClick={() => setDirection(item.id)}><span>{item.number}</span>{item.title}</button>)}</div>
      <label><span>Edge state</span><select value={fixture} onChange={(event) => setFixture(event.target.value as Fixture)}><option value='active'>Active Inbox</option><option value='empty'>Caught up</option><option value='decision'>One urgent decision</option><option value='ambiguous'>Email needs correction</option><option value='conflict'>Conflicting opportunity change</option><option value='error'>Could not load</option><option value='large'>Large history</option></select></label>
    </div>
  )
}

function SelectedReviewBar({ fixture, setFixture }: { fixture: Fixture; setFixture: (fixture: Fixture) => void }) {
  return (
    <div className={styles.selectedReviewBar} aria-label='Design review controls'>
      <div><strong>Selected Inbox direction</strong><span>Daily Briefing · focused Email Review Desk</span></div>
      <label><span>Edge state</span><select value={fixture} onChange={(event) => setFixture(event.target.value as Fixture)}><option value='active'>Active Inbox</option><option value='empty'>Caught up</option><option value='decision'>One urgent decision</option><option value='ambiguous'>Email needs correction</option><option value='conflict'>Conflicting opportunity change</option><option value='error'>Could not load</option><option value='large'>Large history</option></select></label>
    </div>
  )
}

function DirectionIntro({ direction }: { direction: Direction }) {
  const item = directions.find((entry) => entry.id === direction)!
  return <section className={styles.directionIntro}><span>{item.number}</span><div><p>Inbox direction</p><h1>{item.title}</h1><p>{item.description}</p></div></section>
}

function KindIcon({ kind }: { kind: ItemKind }) {
  if (kind === 'decision') return <CircleCheck aria-hidden='true' />
  if (kind === 'email') return <MailCheck aria-hidden='true' />
  if (kind === 'change') return <BellRing aria-hidden='true' />
  if (kind === 'reminder') return <CalendarClock aria-hidden='true' />
  if (kind === 'receipt') return <FileCheck2 aria-hidden='true' />
  return <Sparkles aria-hidden='true' />
}

function itemsForFixture(fixture: Fixture): InboxItem[] {
  if (fixture === 'empty' || fixture === 'error') return []
  if (fixture === 'decision') return [baseItems[0]!]
  if (fixture === 'ambiguous') return [{ ...baseItems[1]!, id: 'ambiguous', title: 'We could not connect this email to one opportunity', organization: 'Sender domain unavailable', summary: '“Your recent submission has moved to the next stage…”', detail: 'Choose from two possible Tracker records or keep the update as a private manual record. Nothing changes until you decide.' }]
  if (fixture === 'conflict') return [{ ...baseItems[2]!, id: 'conflict', attention: true, title: 'Two official pages list different deadlines', summary: 'One source says 28 August; another still says 14 August 2026.', detail: 'Missa will not choose a deadline for you. Review both official pages and decide how you want the Tracker reminder to behave.', current: '28 Aug 2026 · source A', previous: '14 Aug 2026 · source B' }]
  if (fixture === 'large') return Array.from({ length: 24 }, (_, index) => ({ ...baseItems[index % baseItems.length]!, id: `large-${index}`, title: `${baseItems[index % baseItems.length]!.title} · ${index + 1}` }))
  return baseItems
}

function PageHeading({ unread, onMarkAll, headingLevel = 'h2' }: { unread: number; onMarkAll: () => void; headingLevel?: 'h1' | 'h2' }) {
  const Heading = headingLevel
  return <div className={styles.pageHeading}><div><p className={styles.eyebrow}>Private updates</p><Heading>Inbox</Heading><p>Decisions, submission events, opportunity changes, and email updates that need your attention.</p></div><div><Button type='button' variant='outline' disabled={!unread} onClick={onMarkAll}><CheckCheck aria-hidden='true' />Mark all read</Button><Button type='button' variant='ghost' size='icon' aria-label='Inbox settings'><Settings2 aria-hidden='true' /></Button></div></div>
}

function InboxFilters({ active, onChange, counts }: { active: InboxFilter; onChange: (filter: InboxFilter) => void; counts: Record<InboxFilter, number> }) {
  const filters: Array<{ id: InboxFilter; label: string }> = [{ id: 'attention', label: 'Needs attention' }, { id: 'all', label: 'All' }, { id: 'submissions', label: 'Submission updates' }, { id: 'changes', label: 'Opportunity changes' }, { id: 'email', label: 'Email review' }]
  return <nav className={styles.filters} aria-label='Inbox views'>{filters.map((filter) => <button key={filter.id} type='button' aria-current={active === filter.id ? 'page' : undefined} onClick={() => onChange(filter.id)}>{filter.label}<span>{counts[filter.id]}</span></button>)}</nav>
}

function ItemRow({ item, selected, onSelect }: { item: InboxItem; selected: boolean; onSelect: (item: InboxItem) => void }) {
  return <article className={styles.itemRow} data-selected={selected} data-unread={item.unread}><span className={styles.kindIcon}><KindIcon kind={item.kind} /></span><button type='button' className={styles.itemButton} onClick={() => onSelect(item)}><span className={styles.itemTopline}><span>{item.category}</span><time>{item.time}</time></span><strong>{item.title}</strong><span>{item.summary}</span><small>{item.organization}</small></button>{item.unread ? <span className={styles.unreadMark}>Unread</span> : null}</article>
}

function Detail({ item, fixture, onAction, onArchive, onClose }: { item: InboxItem; fixture: Fixture; onAction: (message: string) => void; onArchive: () => void; onClose: () => void }) {
  const isEmail = item.kind === 'email'
  return <aside className={styles.detail} aria-label={`Inbox detail for ${item.title}`}><div className={styles.detailMobileBar}><Button type='button' variant='ghost' onClick={onClose}><ArrowLeft aria-hidden='true' />Back to Inbox</Button></div><div className={styles.detailHeader}><span className={styles.kindIcon}><KindIcon kind={item.kind} /></span><div><p className={styles.eyebrow}>{item.category}</p><h2>{item.title}</h2><p>{item.organization} · {item.time}</p></div><Button type='button' variant='ghost' size='icon' aria-label={`More actions for ${item.title}`}><MoreHorizontal aria-hidden='true' /></Button></div>{fixture === 'conflict' ? <Alert variant='destructive'><AlertCircle aria-hidden='true' /><AlertTitle>Conflicting official information</AlertTitle><AlertDescription>Missa has preserved both values and will not silently choose one.</AlertDescription></Alert> : null}<div className={styles.detailBody}><section><p>{item.detail}</p><p className={styles.reason}><strong>Why you’re seeing this</strong>{item.reason}</p></section>{item.previous || item.current ? <section><p className={styles.eyebrow}>Changed facts</p><dl className={styles.changeFacts}><div><dt>{fixture === 'conflict' ? 'Official page A' : 'Previous'}</dt><dd>{item.previous}</dd></div><div><dt>{fixture === 'conflict' ? 'Official page B' : 'Current'}</dt><dd>{item.current}</dd></div></dl><a href='#'>Open official source <ExternalLink aria-hidden='true' /></a></section> : null}{isEmail ? <section><p className={styles.eyebrow}>Missa’s saved excerpt</p><blockquote>{item.summary}</blockquote><p className={styles.retention}>Attachments were not imported. This saved excerpt is private and will be removed after the retention period.</p>{fixture === 'ambiguous' ? <div className={styles.choiceList}><label><span>Related Tracker record</span><select defaultValue=''><option value='' disabled>Choose an opportunity</option><option>Emerging Ecologies Prize</option><option>Compass Literary Awards</option></select></label><label><span>What does the email say?</span><select defaultValue='in-review'><option value='in-review'>In review</option><option value='received'>Received</option><option value='shortlisted'>Shortlisted</option><option value='manual'>Keep as private note</option></select></label></div> : null}</section> : null}</div><div className={styles.detailActions}><Button type='button' onClick={() => onAction(`${item.action} opened for ${item.title}.`)}>{item.action}<ArrowRight aria-hidden='true' /></Button>{isEmail ? <Button type='button' variant='outline' onClick={() => onAction('The proposed update was ignored. Tracker was not changed.')}>Ignore update</Button> : null}<Button type='button' variant='ghost' onClick={onArchive}><Archive aria-hidden='true' />Archive</Button></div></aside>
}

function EmptyState() {
  return <section className={styles.emptyState}><Check aria-hidden='true' /><p className={styles.eyebrow}>Caught up</p><h2>Nothing needs your attention</h2><p>New decisions, material opportunity changes, reminders, and email updates will appear here. Your archived history stays available.</p><Button type='button' variant='outline'>Browse archived items</Button></section>
}

function ErrorState() {
  return <Alert variant='destructive' className={styles.errorState}><AlertCircle aria-hidden='true' /><AlertTitle>We could not load your Inbox</AlertTitle><AlertDescription>Your Tracker and submissions are unchanged. Check your connection and try again.</AlertDescription><Button type='button' variant='outline'>Try again</Button></Alert>
}

function AttentionQueue({ items, fixture, filter, setFilter, query, setQuery, selected, setSelected, onAction, onArchive, emailReviewDesk = false }: { items: InboxItem[]; fixture: Fixture; filter: InboxFilter; setFilter: (filter: InboxFilter) => void; query: string; setQuery: (query: string) => void; selected?: InboxItem; setSelected: (item: InboxItem | undefined) => void; onAction: (message: string) => void; onArchive: (item: InboxItem) => void; emailReviewDesk?: boolean }) {
  const counts = useMemo(() => Object.fromEntries((Object.keys(filterMap) as InboxFilter[]).map((key) => [key, items.filter((item) => filterMap[key].includes(item.kind) && (key !== 'attention' || item.attention)).length])) as Record<InboxFilter, number>, [items])
  const needle = query.trim().toLowerCase()
  const filtered = items.filter((item) => filterMap[filter].includes(item.kind) && (filter !== 'attention' || item.attention) && (!needle || `${item.title} ${item.organization} ${item.summary}`.toLowerCase().includes(needle)))
  const visibleSelected = selected && filtered.some((item) => item.id === selected.id) ? selected : filtered[0]
  return <><InboxFilters active={filter} onChange={setFilter} counts={counts} />{fixture === 'error' ? <ErrorState /> : fixture === 'empty' ? <EmptyState /> : emailReviewDesk && filter === 'email' ? <ReviewDesk items={items} fixture={fixture} onAction={onAction} emptyWhenNoEmail /> : <div className={styles.queueLayout}><section className={styles.queue} aria-label='Inbox items'><div className={styles.queueTools}><label><Search aria-hidden='true' /><span className={styles.srOnly}>Search Inbox</span><input type='search' value={query} onChange={(event) => setQuery(event.target.value)} placeholder='Search Inbox' /></label><Button type='button' variant='outline'><Filter aria-hidden='true' />Filter</Button></div><div className={styles.itemList}>{filtered.map((item) => <ItemRow key={item.id} item={item} selected={visibleSelected?.id === item.id} onSelect={setSelected} />)}{!filtered.length ? <div className={styles.noResults}><Search aria-hidden='true' /><h2>No items match this view</h2><p>Clear search or choose another Inbox view.</p><Button type='button' variant='outline' onClick={() => setQuery('')}>Clear search</Button></div> : null}</div>{fixture === 'large' ? <div className={styles.pagination}><span>Showing 24 of 143</span><Button type='button' variant='outline'>Next page</Button></div> : null}</section>{visibleSelected ? <Detail item={visibleSelected} fixture={fixture} onAction={onAction} onArchive={() => onArchive(visibleSelected)} onClose={() => setSelected(undefined)} /> : null}</div>}</>
}

function DailyBriefing({ items, fixture, onSelect }: { items: InboxItem[]; fixture: Fixture; onSelect: (item: InboxItem) => void }) {
  if (fixture === 'empty') return <EmptyState />
  if (fixture === 'error') return <ErrorState />
  const groups = [{ title: 'Act now', kinds: ['decision', 'email'] as ItemKind[] }, { title: 'Changed in your Tracker', kinds: ['change', 'reminder'] as ItemKind[] }, { title: 'Submission record', kinds: ['receipt'] as ItemKind[] }, { title: 'From Organizations you follow', kinds: ['recommendation'] as ItemKind[] }]
  return <div className={styles.briefing}><header><p className={styles.eyebrow}>Friday, 8 August</p><h2>Your Missa briefing</h2><p>{items.filter((item) => item.attention).length} items need attention. Everything else is grouped by the object it belongs to.</p></header>{fixture === 'conflict' ? <Alert variant='destructive'><AlertCircle aria-hidden='true' /><AlertTitle>One opportunity has conflicting deadline information</AlertTitle><AlertDescription>Review both official pages before changing your reminder.</AlertDescription></Alert> : null}{groups.map((group) => { const groupItems = items.filter((item) => group.kinds.includes(item.kind)); if (!groupItems.length) return null; return <section key={group.title}><div className={styles.groupHeading}><h3>{group.title}</h3><span>{groupItems.length}</span></div><div className={styles.briefRows}>{groupItems.map((item) => <button type='button' key={item.id} onClick={() => onSelect(item)}><span className={styles.kindIcon}><KindIcon kind={item.kind} /></span><span><small>{item.category} · {item.time}</small><strong>{item.title}</strong><span>{item.summary}</span></span><ArrowRight aria-hidden='true' /></button>)}</div></section> })}</div>
}

function ReviewDesk({ items, fixture, onAction, emptyWhenNoEmail = false }: { items: InboxItem[]; fixture: Fixture; onAction: (message: string) => void; emptyWhenNoEmail?: boolean }) {
  if (fixture === 'empty') return <EmptyState />
  if (fixture === 'error') return <ErrorState />
  const emailItems = items.filter((item) => item.kind === 'email')
  if (emptyWhenNoEmail && !emailItems.length) return <section className={styles.emptyState}><MailCheck aria-hidden='true' /><p className={styles.eyebrow}>Email review</p><h2>No email updates need review</h2><p>Possible submission updates from Gmail Sync or your forwarding address will wait here until you decide.</p><Button type='button' variant='outline'>Email Sync settings</Button></section>
  const reviewItems = emailItems.length ? emailItems : [baseItems[1]!]
  return <div className={styles.reviewDesk}><section className={styles.reviewIntro}><p className={styles.eyebrow}>Email review</p><h2>Confirm before Tracker changes</h2><p>Missa keeps only a private sanitized excerpt. Review the related opportunity and customer status; internal matching labels stay out of this screen.</p><Button type='button' variant='outline'><Settings2 aria-hidden='true' />Email Sync settings</Button></section><div className={styles.reviewColumns}><section className={styles.reviewList} aria-label='Email updates to review'>{reviewItems.map((item, index) => <button key={item.id} type='button' data-active={index === 0}><MailCheck aria-hidden='true' /><span><small>Needs your review · {item.time}</small><strong>{item.title}</strong><span>{item.organization}</span></span></button>)}</section><section className={styles.reviewForm}><p className={styles.eyebrow}>Suggested update</p><h3>{fixture === 'ambiguous' ? 'Choose the related opportunity' : 'Emerging Ecologies Prize'}</h3><blockquote>{reviewItems[0]!.summary}</blockquote>{fixture === 'ambiguous' ? <Alert><AlertCircle aria-hidden='true' /><AlertTitle>More than one Tracker record may match</AlertTitle><AlertDescription>Choose the right record or keep this as a private manual note.</AlertDescription></Alert> : null}<div className={styles.choiceList}><label><span>Related Tracker record</span><select defaultValue={fixture === 'ambiguous' ? '' : 'ecologies'}><option value='' disabled>Choose an opportunity</option><option value='ecologies'>Emerging Ecologies Prize</option><option value='compass'>Compass Literary Awards</option></select></label><label><span>What does the email say?</span><select defaultValue='in-review'><option value='in-review'>In review</option><option value='received'>Received</option><option value='shortlisted'>Shortlisted</option><option value='manual'>Keep as private note</option></select></label></div><p className={styles.reason}><strong>What will happen</strong>Confirming will update this Tracker record and keep this excerpt as private evidence. It will not change the opportunity, Work, or Organization.</p><div className={styles.reviewActions}><Button type='button' onClick={() => onAction('Email update confirmed. The Tracker record moved to In review.')}>Confirm update</Button><Button type='button' variant='outline' onClick={() => onAction('The email update was ignored. Tracker was not changed.')}>Ignore</Button><Button type='button' variant='ghost' onClick={() => onAction('Missa’s saved excerpt was deleted.')}>Delete saved excerpt</Button></div></section></div></div>
}

export function InboxDirections() {
  const [direction, setDirection] = useState<Direction>('queue')
  const [fixture, setFixture] = useState<Fixture>('active')
  const [filter, setFilter] = useState<InboxFilter>('attention')
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<InboxItem[]>(baseItems)
  const [selected, setSelected] = useState<InboxItem | undefined>(baseItems[0])
  const [status, setStatus] = useState('')

  function changeFixture(next: Fixture) {
    const nextItems = itemsForFixture(next)
    setFixture(next); setItems(nextItems); setSelected(nextItems[0]); setQuery(''); setFilter('attention'); setStatus('')
  }
  function markAllRead() { setItems((current) => current.map((item) => ({ ...item, unread: false }))); setStatus('All Inbox items marked as read.') }
  function archiveSelected(item: InboxItem) { const remaining = items.filter((candidate) => candidate.id !== item.id); setItems(remaining); setSelected(remaining[0]); setStatus('Inbox item archived.') }
  const unread = items.filter((item) => item.unread).length

  return <div className={styles.pageShell}><ReviewBar direction={direction} setDirection={setDirection} fixture={fixture} setFixture={changeFixture} /><AppHeader /><DirectionIntro direction={direction} /><main id='inbox-content' className={styles.main}><PageHeading unread={unread} onMarkAll={markAllRead} />{direction === 'queue' ? <AttentionQueue items={items} fixture={fixture} filter={filter} setFilter={setFilter} query={query} setQuery={setQuery} selected={selected} setSelected={setSelected} onAction={setStatus} onArchive={archiveSelected} /> : null}{direction === 'briefing' ? <DailyBriefing items={items} fixture={fixture} onSelect={(item) => { setSelected(item); setDirection('queue'); setFilter('all') }} /> : null}{direction === 'review' ? <ReviewDesk items={items} fixture={fixture} onAction={setStatus} /> : null}<p className={styles.liveStatus} role='status' aria-live='polite'>{status}{status ? <Check aria-hidden='true' /> : null}</p></main></div>
}

export function InboxSelected() {
  const [fixture, setFixture] = useState<Fixture>('active')
  const [items, setItems] = useState<InboxItem[]>(baseItems)
  const [status, setStatus] = useState('')
  const [reviewOpen, setReviewOpen] = useState(false)

  function changeFixture(next: Fixture) {
    const nextItems = itemsForFixture(next)
    setFixture(next); setItems(nextItems); setReviewOpen(false); setStatus('')
  }
  function markAllRead() { setItems((current) => current.map((item) => ({ ...item, unread: false }))); setStatus('All Inbox items marked as read.') }
  const unread = items.filter((item) => item.unread).length

  return <div className={styles.pageShell}><SelectedReviewBar fixture={fixture} setFixture={changeFixture} /><AppHeader /><main id='inbox-content' className={styles.main}><PageHeading unread={unread} onMarkAll={markAllRead} headingLevel='h1' />{reviewOpen ? <><Button type='button' variant='ghost' onClick={() => setReviewOpen(false)}><ArrowLeft aria-hidden='true' />Back to briefing</Button><ReviewDesk items={items} fixture={fixture} onAction={setStatus} /></> : <DailyBriefing items={items} fixture={fixture} onSelect={(item) => item.kind === 'email' ? setReviewOpen(true) : setStatus(`${item.action} opened for ${item.title}.`)} />}<p className={styles.liveStatus} role='status' aria-live='polite'>{status}{status ? <Check aria-hidden='true' /> : null}</p></main></div>
}
