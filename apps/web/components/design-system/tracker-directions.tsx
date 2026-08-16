'use client'

import Image from 'next/image'
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  ChevronDown,
  CircleDot,
  Clock3,
  Ellipsis,
  FileText,
  FolderKanban,
  Import,
  Inbox,
  Library,
  Menu,
  Search,
  Tag,
} from 'lucide-react'
import { useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

import { MissaWordmark } from '@/components/missa-wordmark'
import styles from './tracker-directions.module.css'

type Direction = 'attention' | 'board' | 'works'
type Fixture = 'active' | 'imported' | 'conflict' | 'mixed' | 'empty' | 'large'
type TrackerView = 'active' | 'submissions' | 'calendar' | 'works'

type TrackerItem = {
  id: string
  title: string
  organization: string
  stage: 'Saved' | 'Preparing' | 'Submitted' | 'In progress' | 'Outcome'
  deadline: string
  work?: string
  note: string
  action: string
  tone?: 'attention' | 'positive' | 'neutral'
  imported?: boolean
  imageSrc?: string
  imageAlt?: string
}

const baseItems: TrackerItem[] = [
  {
    id: 'north-river',
    title: 'North River Review — Call for Submissions',
    organization: 'North River Review',
    stage: 'Preparing',
    deadline: '14 Aug 2026 · 6 days',
    work: 'Saltwater Lessons',
    note: 'Biography and cover note still need attention.',
    action: 'Continue preparing',
    tone: 'attention',
  },
  {
    id: 'pen-america',
    title: 'PEN America Open Call — Writing for Change',
    organization: 'PEN America',
    stage: 'Saved',
    deadline: '31 Oct 2026',
    note: 'No Work linked yet.',
    action: 'Review opportunity',
    imageSrc: '/media/home/artist-at-work.webp',
    imageAlt: 'Writer working at a table',
  },
  {
    id: 'compass',
    title: 'Compass Literary Awards',
    organization: 'Organization not confirmed',
    stage: 'Submitted',
    deadline: 'Submitted 18 Jul 2026',
    work: 'After the Harmattan',
    note: 'Creator-recorded external submission.',
    action: 'Open record',
    imageSrc: '/media/home/portfolio-still-life.webp',
    imageAlt: 'Still life with books and sculptural objects',
  },
  {
    id: 'ecologies',
    title: 'Emerging Ecologies Prize',
    organization: 'Field Notes Foundation',
    stage: 'In progress',
    deadline: 'In review',
    work: 'Borrowed Ground',
    note: 'Hosted submission · receipt available.',
    action: 'View submission',
    imageSrc: '/media/home/opportunity-architecture.webp',
    imageAlt: 'Contemporary arts building under a clear sky',
  },
]

const directions: Array<{ id: Direction; number: string; title: string; description: string }> = [
  { id: 'attention', number: '01', title: 'Next actions', description: 'An attention-led list for quickly resuming the most consequential work.' },
  { id: 'board', number: '02', title: 'Stage board', description: 'A high-volume desktop pipeline with a real list fallback for narrow screens.' },
  { id: 'works', number: '03', title: 'Work map', description: 'A Work-centered view for creators submitting the same body of work across calls.' },
]

function ReviewBar({ direction, setDirection, fixture, setFixture }: {
  direction: Direction
  setDirection: (direction: Direction) => void
  fixture: Fixture
  setFixture: (fixture: Fixture) => void
}) {
  return (
    <div className={styles.reviewBar} aria-label='Design review controls'>
      <div className={styles.directionButtons}>
        {directions.map((item) => (
          <button key={item.id} type='button' data-active={direction === item.id} onClick={() => setDirection(item.id)}>
            <span>{item.number}</span>{item.title}
          </button>
        ))}
      </div>
      <label>
        <span>Edge state</span>
        <select value={fixture} onChange={(event) => setFixture(event.target.value as Fixture)}>
          <option value='active'>Active Tracker</option>
          <option value='imported'>Imported unmatched row</option>
          <option value='conflict'>Status conflict</option>
          <option value='mixed'>Mixed Work decision</option>
          <option value='empty'>First-use empty</option>
          <option value='large'>Large history</option>
        </select>
      </label>
    </div>
  )
}

function AppHeader() {
  return (
    <header className={styles.appHeader}>
      <MissaWordmark href='#tracker-content' size='app' className={styles.wordmark} />
      <nav aria-label='Primary navigation'>
        <a href='#'>Opportunities</a>
        <a href='#' aria-current='page'>Tracker</a>
        <a href='#'>Library</a>
      </nav>
      <div className={styles.headerActions}>
        <Button type='button' variant='ghost' size='icon' aria-label='Open Inbox'><Inbox aria-hidden='true' /></Button>
        <Button type='button' variant='ghost' size='icon' className={styles.mobileMenu} aria-label='Open navigation'><Menu aria-hidden='true' /></Button>
        <button type='button' className={styles.avatar} aria-label='Open Profile'>A</button>
      </div>
    </header>
  )
}

function DirectionIntro({ direction }: { direction: Direction }) {
  const item = directions.find((entry) => entry.id === direction)!
  return (
    <section className={styles.directionIntro}>
      <span>{item.number}</span>
      <div><p>Tracker direction</p><h1>{item.title}</h1><p>{item.description}</p></div>
    </section>
  )
}

function PageHeading({ headingLevel = 'h2' }: { headingLevel?: 'h1' | 'h2' }) {
  const Heading = headingLevel
  return (
    <div className={styles.pageHeading}>
      <div><Heading>Tracker</Heading><p>Keep the next deadline, preparation step, and submission record together.</p></div>
      <div className={styles.pageActions}>
        <Button type='button' variant='outline'><Import aria-hidden='true' />Import</Button>
        <Button type='button' variant='outline'><Ellipsis aria-hidden='true' /><span className={styles.srOnly}>More Tracker actions</span></Button>
      </div>
    </div>
  )
}

function PrimaryViews({ active }: { active: 'active' | 'submissions' | 'calendar' | 'works' }) {
  const views = [
    { id: 'active', label: 'Active' },
    { id: 'submissions', label: 'Submissions' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'works', label: 'Works' },
  ] as const
  return (
    <nav className={styles.primaryViews} aria-label='Tracker views'>
      {views.map((view) => <button key={view.id} type='button' data-active={active === view.id}>{view.label}</button>)}
      <button type='button' className={styles.moreViews}>More views <ChevronDown aria-hidden='true' /></button>
    </nav>
  )
}

function FixtureNotice({ fixture }: { fixture: Fixture }) {
  if (fixture === 'conflict') {
    return (
      <Alert variant='destructive' className={styles.fixtureNotice}>
        <AlertTriangle aria-hidden='true' />
        <AlertTitle>Compass Literary Awards changed elsewhere</AlertTitle>
        <AlertDescription>Your Tracker says Submitted, while a newer hosted event says Withdrawn. Review the event history before choosing the current state.</AlertDescription>
      </Alert>
    )
  }
  if (fixture === 'imported') {
    return (
      <Alert className={styles.fixtureNotice}>
        <Import aria-hidden='true' />
        <AlertTitle>One imported row still needs a match</AlertTitle>
        <AlertDescription>The title and Organization were preserved as private text. Choose a canonical opportunity or keep it as an editable manual record.</AlertDescription>
      </Alert>
    )
  }
  if (fixture === 'mixed') {
    return (
      <Alert className={styles.fixtureNotice}>
        <CircleDot aria-hidden='true' />
        <AlertTitle>One submission has different Work decisions</AlertTitle>
        <AlertDescription>“Saltwater Lessons” was accepted and “After the Harmattan” was declined. The submission summary is Mixed; each Work keeps its own result.</AlertDescription>
      </Alert>
    )
  }
  return null
}

function ItemMedia({ item }: { item: TrackerItem }) {
  const [failed, setFailed] = useState(false)
  const initials = item.organization === 'Organization not confirmed'
    ? '?'
    : item.organization.split(' ').slice(0, 2).map((part) => part[0]).join('')

  if (item.imageSrc && !failed) {
    return <span className={styles.itemPhoto}><Image src={item.imageSrc} alt={item.imageAlt ?? ''} fill sizes='56px' onError={() => setFailed(true)} /></span>
  }

  return <span className={styles.itemMonogram} aria-hidden='true'>{initials}</span>
}

function ItemCard({ item, compact = false, onAction }: { item: TrackerItem; compact?: boolean; onAction?: (item: TrackerItem) => void }) {
  return (
    <Card className={compact ? styles.itemCardCompact : styles.itemCard}>
      <div className={styles.itemIdentity}>
        <ItemMedia item={item} />
        <div>
          <div className={styles.itemLabels}>
            <Badge variant='outline'>{item.stage}</Badge>
            {item.imported ? <Badge variant='secondary'>Imported · unmatched</Badge> : null}
          </div>
          <h3>{item.title}</h3>
          <p>{item.organization}</p>
        </div>
      </div>
      <dl className={styles.itemFacts}>
        <div><dt><CalendarDays aria-hidden='true' />Timing</dt><dd>{item.deadline}</dd></div>
        <div><dt><Library aria-hidden='true' />Work</dt><dd>{item.work ?? 'Not linked'}</dd></div>
      </dl>
      <p className={styles.itemNote}>{item.note}</p>
      <div className={styles.itemAction}>
        <Button type='button' variant={item.tone === 'attention' ? 'default' : 'outline'} onClick={() => onAction?.(item)}>{item.action}<ArrowRight aria-hidden='true' /></Button>
        <Button type='button' variant='ghost' size='icon' aria-label={`More actions for ${item.title}`}><Ellipsis aria-hidden='true' /></Button>
      </div>
    </Card>
  )
}

function EmptyState() {
  return (
    <div className={styles.emptyState}>
      <FolderKanban aria-hidden='true' />
      <h3>Your Tracker is ready for its first opportunity</h3>
      <p>Save a call to keep its deadline and preparation here. Nothing in Tracker is public.</p>
      <Button type='button'>Browse opportunities</Button>
      <Button type='button' variant='ghost'><Import aria-hidden='true' />Import an existing tracker</Button>
    </div>
  )
}

function itemsForFixture(fixture: Fixture): TrackerItem[] {
  if (fixture === 'empty') return []
  if (fixture === 'imported') return [
    { id: 'import', title: 'Winter Writing Prize 2025', organization: 'Old spreadsheet entry', stage: 'Submitted', deadline: 'Submitted date unknown', note: 'No canonical opportunity match yet.', action: 'Review import', imported: true },
    ...baseItems,
  ]
  if (fixture === 'large') {
    return Array.from({ length: 18 }, (_, index) => ({
      ...baseItems[index % baseItems.length]!,
      id: `large-${index}`,
      title: `${baseItems[index % baseItems.length]!.title} · ${index + 1}`,
    }))
  }
  if (fixture === 'mixed') return [
    { id: 'mixed', title: 'Meridian New Writing Anthology', organization: 'Meridian Press', stage: 'Outcome', deadline: 'Decision received 7 Aug 2026', work: '2 Works · mixed decision', note: 'One accepted · one declined. Open the submission for item-level outcomes.', action: 'View decisions', tone: 'positive' },
    ...baseItems,
  ]
  return baseItems
}

function AttentionDirection({ fixture, onAction, sectionHeadingLevel = 'h3' }: { fixture: Fixture; onAction?: (item: TrackerItem) => void; sectionHeadingLevel?: 'h2' | 'h3' }) {
  const SectionHeading = sectionHeadingLevel
  const [query, setQuery] = useState('')
  const allItems = itemsForFixture(fixture)
  const normalizedQuery = query.trim().toLowerCase()
  const items = normalizedQuery
    ? allItems.filter((item) => `${item.title} ${item.organization} ${item.work ?? ''}`.toLowerCase().includes(normalizedQuery))
    : allItems
  if (!items.length) return <EmptyState />
  const urgent = items.filter((item) => item.tone === 'attention')
  return (
    <div className={styles.attentionLayout}>
      {urgent.length ? (
        <section className={styles.attentionPanel} aria-labelledby='attention-title'>
          <div className={styles.sectionLabel}><span>Now</span><SectionHeading id='attention-title'>Needs attention</SectionHeading></div>
          {urgent.map((item) => (
            <div key={item.id} className={styles.attentionRow}>
              <div><Clock3 aria-hidden='true' /><span><strong>{item.title}</strong><small>{item.note}</small></span></div>
              <Button type='button' onClick={() => onAction?.(item)}>{item.action}<ArrowRight aria-hidden='true' /></Button>
            </div>
          ))}
        </section>
      ) : null}
      <section aria-labelledby='active-title'>
        <div className={styles.listHeading}>
          <div className={styles.sectionLabel}><span>Active</span><SectionHeading id='active-title'>{items.length} opportunities</SectionHeading></div>
          <label className={styles.searchField}><Search aria-hidden='true' /><span className={styles.srOnly}>Search Tracker</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder='Search Tracker' /></label>
        </div>
        <div className={styles.itemList}>{items.map((item) => <ItemCard key={item.id} item={item} onAction={onAction} />)}</div>
        {fixture === 'large' ? <Button type='button' variant='outline' className={styles.loadMore}>Load 18 more</Button> : null}
      </section>
    </div>
  )
}

const stages: TrackerItem['stage'][] = ['Saved', 'Preparing', 'Submitted', 'In progress', 'Outcome']

function StageBoardDirection({ fixture, onAction, columnHeadingLevel = 'h3' }: { fixture: Fixture; onAction?: (item: TrackerItem) => void; columnHeadingLevel?: 'h2' | 'h3' }) {
  const ColumnHeading = columnHeadingLevel
  const items = itemsForFixture(fixture)
  if (!items.length) return <EmptyState />
  return (
    <div>
      <div className={styles.boardToolbar}>
        <label className={styles.searchField}><Search aria-hidden='true' /><span className={styles.srOnly}>Search Tracker</span><input placeholder='Search Tracker' /></label>
        <Button type='button' variant='outline'><Tag aria-hidden='true' />Filter</Button>
      </div>
      <div className={styles.stageBoard}>
        {stages.map((stage) => {
          const stageItems = items.filter((item) => item.stage === stage)
          return (
            <section key={stage} className={styles.stageColumn} aria-labelledby={`stage-${stage.replaceAll(' ', '-')}`}>
              <header><ColumnHeading id={`stage-${stage.replaceAll(' ', '-')}`}>{stage}</ColumnHeading><span>{stageItems.length}</span></header>
              <div>{stageItems.map((item) => <ItemCard key={item.id} item={item} compact onAction={onAction} />)}</div>
              {!stageItems.length ? <p>No items</p> : null}
            </section>
          )
        })}
      </div>
      <p className={styles.boardNote}>On phones this board becomes stage-labelled lists in reading order; dragging is never required.</p>
    </div>
  )
}

type WorkGroup = { title: string; detail: string; items: TrackerItem[] }

function workGroups(items: TrackerItem[]): WorkGroup[] {
  const map = new Map<string, TrackerItem[]>()
  for (const item of items) {
    const key = item.work ?? 'Unassigned'
    map.set(key, [...(map.get(key) ?? []), item])
  }
  return [...map.entries()].map(([title, grouped]) => ({
    title,
    detail: title === 'Unassigned' ? 'Opportunities not connected to a Library Work' : `${grouped.length} Tracker item${grouped.length === 1 ? '' : 's'}`,
    items: grouped,
  }))
}

function WorkDirection({ fixture, onAction, groupHeadingLevel = 'h3' }: { fixture: Fixture; onAction?: (item: TrackerItem) => void; groupHeadingLevel?: 'h2' | 'h3' }) {
  const GroupHeading = groupHeadingLevel
  const items = itemsForFixture(fixture)
  if (!items.length) return <EmptyState />
  return (
    <div className={styles.workLayout}>
      <aside className={styles.workNav}>
        <p>Library Works</p>
        {workGroups(items).map((group, index) => <button type='button' key={group.title} data-active={index === 0}><FileText aria-hidden='true' /><span>{group.title}<small>{group.items.length} linked</small></span></button>)}
        <Button type='button' variant='ghost'><Library aria-hidden='true' />Open Library</Button>
      </aside>
      <div className={styles.workGroups}>
        {workGroups(items).map((group) => (
          <section key={group.title}>
            <header><div><p>Work</p><GroupHeading>{group.title}</GroupHeading><span>{group.detail}</span></div>{group.title !== 'Unassigned' ? <Button type='button' variant='outline'>Open Work</Button> : null}</header>
            <div>{group.items.map((item) => <ItemCard key={item.id} item={item} onAction={onAction} />)}</div>
          </section>
        ))}
      </div>
    </div>
  )
}

export function TrackerDirections() {
  const [direction, setDirection] = useState<Direction>('attention')
  const [fixture, setFixture] = useState<Fixture>('active')
  return (
    <div className={styles.pageShell} data-density='comfortable'>
      <ReviewBar direction={direction} setDirection={setDirection} fixture={fixture} setFixture={setFixture} />
      <AppHeader />
      <DirectionIntro direction={direction} />
      <main id='tracker-content' className={styles.main}>
        <PageHeading />
        <PrimaryViews active={direction === 'works' ? 'works' : 'active'} />
        <FixtureNotice fixture={fixture} />
        {direction === 'attention' ? <AttentionDirection fixture={fixture} /> : null}
        {direction === 'board' ? <StageBoardDirection fixture={fixture} /> : null}
        {direction === 'works' ? <WorkDirection fixture={fixture} /> : null}
      </main>
    </div>
  )
}

function SelectedReviewBar({ fixture, setFixture }: { fixture: Fixture; setFixture: (fixture: Fixture) => void }) {
  return (
    <aside className={styles.selectedReviewBar} aria-label='Design review controls'>
      <div><strong>Selected Tracker</strong><span>Local library preview</span></div>
      <label>
        <span>Edge state</span>
        <select value={fixture} onChange={(event) => setFixture(event.target.value as Fixture)}>
          <option value='active'>Active Tracker</option>
          <option value='imported'>Imported unmatched row</option>
          <option value='conflict'>Status conflict</option>
          <option value='mixed'>Mixed Work decision</option>
          <option value='empty'>First-use empty</option>
          <option value='large'>Large history</option>
        </select>
      </label>
    </aside>
  )
}

function SelectedViews({ active, onChange }: { active: TrackerView; onChange: (view: TrackerView) => void }) {
  const views: Array<{ id: TrackerView; label: string }> = [
    { id: 'active', label: 'Active' },
    { id: 'submissions', label: 'Submissions' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'works', label: 'Works' },
  ]

  return (
    <nav className={styles.primaryViews} aria-label='Tracker views'>
      {views.map((view) => (
        <button key={view.id} type='button' data-active={active === view.id} aria-current={active === view.id ? 'page' : undefined} onClick={() => onChange(view.id)}>
          {view.label}
        </button>
      ))}
      <button type='button' className={styles.moreViews}>More views <ChevronDown aria-hidden='true' /></button>
    </nav>
  )
}

function SubmissionView({ fixture, onAction }: { fixture: Fixture; onAction: (item: TrackerItem) => void }) {
  const items = itemsForFixture(fixture).filter((item) => ['Submitted', 'In progress', 'Outcome'].includes(item.stage))

  if (!items.length) {
    return (
      <div className={styles.emptyState}>
        <Inbox aria-hidden='true' />
        <h2>No submission records yet</h2>
        <p>Submitted opportunities will keep their receipt, Work snapshot, messages, and decisions here.</p>
        <Button type='button'>Open active Tracker</Button>
      </div>
    )
  }

  return (
    <section className={styles.selectedViewSection} aria-labelledby='submissions-title'>
      <header><div><p>Submission history</p><h2 id='submissions-title'>{items.length} submission records</h2></div><Badge variant='outline'>Private</Badge></header>
      <div className={styles.submissionExplanation}>Hosted receipts and creator-recorded external submissions remain distinguishable. Packet outcomes never overwrite per-Work decisions.</div>
      <div className={styles.itemList}>{items.map((item) => <ItemCard key={item.id} item={item} onAction={onAction} />)}</div>
    </section>
  )
}

function CalendarView({ fixture, onAction }: { fixture: Fixture; onAction: (item: TrackerItem) => void }) {
  const items = itemsForFixture(fixture)
  if (!items.length) return <EmptyState />

  const dated = items.filter((item) => /\b(?:Aug|Sep|Oct|Nov|Dec)\b/.test(item.deadline))
  const undated = items.filter((item) => !dated.includes(item))

  return (
    <div className={styles.calendarLayout}>
      <section aria-labelledby='calendar-title'>
        <header className={styles.calendarHeading}><div><p>August–October 2026</p><h2 id='calendar-title'>Upcoming dates</h2></div><CalendarDays aria-hidden='true' /></header>
        <div className={styles.calendarRows}>
          {dated.map((item) => (
            <button type='button' key={item.id} onClick={() => onAction(item)}>
              <time>{item.deadline.split(' · ')[0]}</time>
              <span><strong>{item.title}</strong><small>{item.stage} · {item.work ?? 'No Work linked'}</small></span>
              <ArrowRight aria-hidden='true' />
            </button>
          ))}
        </div>
      </section>
      <aside aria-labelledby='undated-title'>
        <p>Keep visible</p>
        <h2 id='undated-title'>Undated and response items</h2>
        {undated.length ? undated.map((item) => (
          <button type='button' key={item.id} onClick={() => onAction(item)}><strong>{item.title}</strong><span>{item.deadline}</span></button>
        )) : <span>No undated items</span>}
      </aside>
    </div>
  )
}

export function TrackerSelected() {
  const [fixture, setFixture] = useState<Fixture>('active')
  const [view, setView] = useState<TrackerView>('active')
  const [activeLayout, setActiveLayout] = useState<'list' | 'board'>('list')
  const [announcement, setAnnouncement] = useState('')

  function handleAction(item: TrackerItem) {
    setAnnouncement(`${item.action} opened for ${item.title}.`)
  }

  return (
    <div className={styles.pageShell} data-density='comfortable'>
      <SelectedReviewBar fixture={fixture} setFixture={(nextFixture) => { setFixture(nextFixture); setAnnouncement('') }} />
      <AppHeader />
      <main id='tracker-content' className={styles.main}>
        <PageHeading headingLevel='h1' />
        <SelectedViews active={view} onChange={(nextView) => { setView(nextView); setAnnouncement('') }} />
        <FixtureNotice fixture={fixture} />
        <p className={styles.trackerStatus} role='status' aria-live='polite'>{announcement}</p>

        {view === 'active' ? (
          <>
            <div className={styles.layoutSwitch} aria-label='Active Tracker layout'>
              <button type='button' data-active={activeLayout === 'list'} aria-pressed={activeLayout === 'list'} onClick={() => setActiveLayout('list')}>Next actions</button>
              <button type='button' data-active={activeLayout === 'board'} aria-pressed={activeLayout === 'board'} onClick={() => setActiveLayout('board')}>Stage board</button>
            </div>
            {activeLayout === 'list' ? <AttentionDirection fixture={fixture} onAction={handleAction} sectionHeadingLevel='h2' /> : <StageBoardDirection fixture={fixture} onAction={handleAction} columnHeadingLevel='h2' />}
          </>
        ) : null}
        {view === 'submissions' ? <SubmissionView fixture={fixture} onAction={handleAction} /> : null}
        {view === 'calendar' ? <CalendarView fixture={fixture} onAction={handleAction} /> : null}
        {view === 'works' ? <WorkDirection fixture={fixture} onAction={handleAction} groupHeadingLevel='h2' /> : null}
      </main>
    </div>
  )
}
