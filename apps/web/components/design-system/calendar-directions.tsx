'use client'

import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CalendarSync,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Clock3,
  ExternalLink,
  Inbox,
  Link2,
  Menu,
  MoreHorizontal,
  Settings2,
} from 'lucide-react'
import { useMemo, useState, useSyncExternalStore } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import styles from './calendar-directions.module.css'

type Direction = 'agenda' | 'month' | 'lanes'
type Fixture = 'active' | 'empty' | 'undated' | 'conflict' | 'moved' | 'dense' | 'timezone' | 'feed'
type EventFilter = 'all' | 'deadlines' | 'responses' | 'submissions'
type EventKind = 'deadline' | 'estimate' | 'submission'

type CalendarEvent = {
  id: string
  day: number
  date: string
  weekday: string
  kind: EventKind
  label: string
  title: string
  organization: string
  stage: string
  work?: string
  action: string
  detail: string
  manual?: boolean
  changed?: boolean
}

type UndatedItem = {
  id: string
  timing: 'Rolling' | 'Date not confirmed' | 'Conflict'
  title: string
  organization: string
  stage: string
  detail: string
  action: string
}

const directions: Array<{ id: Direction; number: string; title: string; description: string }> = [
  { id: 'agenda', number: '01', title: 'Agenda ledger', description: 'A mobile-first chronological reading of exact dates, estimates, and undated work.' },
  { id: 'month', number: '02', title: 'Month + agenda', description: 'A familiar month scan paired with a readable selected-day agenda and event detail.' },
  { id: 'lanes', number: '03', title: 'Deadline lanes', description: 'A high-volume planning view organized by urgency and certainty rather than month cells.' },
]

const baseEvents: CalendarEvent[] = [
  { id: 'north-river', day: 14, date: '14 Aug 2026', weekday: 'Friday', kind: 'deadline', label: 'Deadline', title: 'North River Review — Call for Submissions', organization: 'North River Review', stage: 'Preparing', work: 'Saltwater Lessons', action: 'Continue preparing', detail: 'Exact source date. Biography and cover note still need attention.' },
  { id: 'meridian', day: 18, date: '18 Aug 2026', weekday: 'Tuesday', kind: 'submission', label: 'Submission event', title: 'Meridian New Writing Anthology', organization: 'Meridian Press', stage: 'Revision requested', work: 'After the Harmattan', action: 'View submission', detail: 'Revision response requested by the Organization. The durable event remains on the submission.' },
  { id: 'ecologies', day: 21, date: '21 Aug 2026', weekday: 'Friday', kind: 'estimate', label: 'Estimated response', title: 'Emerging Ecologies Prize', organization: 'Field Notes Foundation', stage: 'In review', work: 'Borrowed Ground', action: 'View submission', detail: 'Based on past response timing. This is an estimate, not an Organization commitment.' },
  { id: 'compass', day: 28, date: '28 Aug 2026', weekday: 'Friday', kind: 'deadline', label: 'Deadline', title: 'Compass Literary Awards', organization: 'Compass Literary Awards', stage: 'Saved', action: 'Review opportunity', detail: 'Exact source date. No Work is linked yet.' },
  { id: 'futurepoem', day: 30, date: '30 Aug 2026', weekday: 'Sunday', kind: 'deadline', label: 'Private Tracker date', title: 'Futurepoem Other Futures Award', organization: 'Futurepoem', stage: 'Preparing', work: 'Saltwater Lessons', action: 'Continue preparing', detail: 'Imported private date. Review the official source before relying on it.', manual: true },
]

const baseUndated: UndatedItem[] = [
  { id: 'rolling', timing: 'Rolling', title: 'Field Notes Open Call', organization: 'Field Notes', stage: 'Saved', detail: 'The Organization accepts work throughout the year. No closing date belongs on the grid.', action: 'Review opportunity' },
  { id: 'unknown', timing: 'Date not confirmed', title: 'New Voices Residency', organization: 'Common Ground Arts', stage: 'Preparing', detail: 'A safe exact deadline is not available yet. Keep preparation visible without inventing a date.', action: 'Review timing' },
]

const filterKinds: Record<EventFilter, EventKind[]> = { all: ['deadline', 'estimate', 'submission'], deadlines: ['deadline'], responses: ['estimate'], submissions: ['submission'] }
const monthDays = Array.from({ length: 42 }, (_, index) => index - 4)

function AppHeader() {
  return <header className={styles.appHeader}><a href='#calendar-content' className={styles.wordmark}>Missa</a><nav aria-label='Primary navigation'><a href='#'>Opportunities</a><a href='#' aria-current='page'>Tracker</a><a href='#'>Library</a></nav><div className={styles.headerActions}><Button type='button' variant='ghost' size='icon' aria-label='Open Inbox'><Inbox aria-hidden='true' /></Button><Button type='button' variant='ghost' size='icon' className={styles.mobileMenu} aria-label='Open navigation'><Menu aria-hidden='true' /></Button><button type='button' className={styles.avatar} aria-label='Open Profile'>A</button></div></header>
}

function ReviewBar({ direction, setDirection, fixture, setFixture }: { direction: Direction; setDirection: (direction: Direction) => void; fixture: Fixture; setFixture: (fixture: Fixture) => void }) {
  return <div className={styles.reviewBar} aria-label='Design review controls'><div className={styles.directionButtons}>{directions.map((item) => <button key={item.id} type='button' data-active={direction === item.id} onClick={() => setDirection(item.id)}><span>{item.number}</span>{item.title}</button>)}</div><label><span>Edge state</span><select value={fixture} onChange={(event) => setFixture(event.target.value as Fixture)}><option value='active'>Active Calendar</option><option value='empty'>First-use empty</option><option value='undated'>All timing undated</option><option value='conflict'>Conflicting dates</option><option value='moved'>Deadline moved</option><option value='dense'>Dense month</option><option value='timezone'>Timezone boundary</option><option value='feed'>Feed disconnected</option></select></label></div>
}

function SelectedReviewBar({ fixture, setFixture }: { fixture: Fixture; setFixture: (fixture: Fixture) => void }) {
  return <div className={styles.selectedReviewBar} aria-label='Design review controls'><div><strong>Selected Calendar composition</strong><span>Month + Agenda · mobile Agenda fallback</span></div><label><span>Edge state</span><select value={fixture} onChange={(event) => setFixture(event.target.value as Fixture)}><option value='active'>Active Calendar</option><option value='empty'>First-use empty</option><option value='undated'>All timing undated</option><option value='conflict'>Conflicting dates</option><option value='moved'>Deadline moved</option><option value='dense'>Dense month</option><option value='timezone'>Timezone boundary</option><option value='feed'>Feed disconnected</option></select></label></div>
}

function DirectionIntro({ direction }: { direction: Direction }) {
  const item = directions.find((entry) => entry.id === direction)!
  return <section className={styles.directionIntro}><span>{item.number}</span><div><p>Tracker Calendar direction</p><h1>{item.title}</h1><p>{item.description}</p></div></section>
}

function TrackerHeading({ onFeed, headingLevel = 'h2' }: { onFeed: () => void; headingLevel?: 'h1' | 'h2' }) {
  const Heading = headingLevel
  return <><div className={styles.pageHeading}><div><p className={styles.eyebrow}>Tracker view</p><Heading>Calendar</Heading><p>Exact opportunity deadlines, submission events, estimated responses, and timing that still needs review.</p></div><Button type='button' variant='outline' onClick={onFeed}><CalendarSync aria-hidden='true' />Calendar subscription</Button></div><nav className={styles.trackerViews} aria-label='Tracker views'><button type='button'>Active</button><button type='button'>Submissions</button><button type='button' aria-current='page'>Calendar</button><button type='button'>Works</button></nav></>
}

function fixtures(fixture: Fixture): { events: CalendarEvent[]; undated: UndatedItem[] } {
  if (fixture === 'empty') return { events: [], undated: [] }
  if (fixture === 'undated') return { events: [], undated: [...baseUndated, { id: 'conflict-undated', timing: 'Conflict', title: 'North River Review — Call for Submissions', organization: 'North River Review', stage: 'Preparing', detail: 'Two official pages list different dates.', action: 'Review conflict' }] }
  if (fixture === 'conflict') return { events: baseEvents.filter((event) => event.id !== 'north-river'), undated: [{ id: 'conflict', timing: 'Conflict', title: 'North River Review — Call for Submissions', organization: 'North River Review', stage: 'Preparing', detail: 'One official page says 14 August; another says 28 August 2026. Missa has not placed either value on the grid.', action: 'Review both sources' }, ...baseUndated] }
  if (fixture === 'moved') return { events: baseEvents.map((event) => event.id === 'north-river' ? { ...event, day: 28, date: '28 Aug 2026', detail: 'Deadline moved from 14 August to 28 August 2026. The change history preserves both values.', changed: true } : event), undated: baseUndated }
  if (fixture === 'dense') return { events: Array.from({ length: 18 }, (_, index) => ({ ...baseEvents[index % baseEvents.length]!, id: `dense-${index}`, day: index < 7 ? 14 : 16 + (index % 12), date: index < 7 ? '14 Aug 2026' : `${16 + (index % 12)} Aug 2026`, title: `${baseEvents[index % baseEvents.length]!.title} · ${index + 1}` })), undated: baseUndated }
  if (fixture === 'timezone') return { events: [{ ...baseEvents[0]!, id: 'timezone', title: 'Seoul Arts Residency', organization: 'Seoul Arts Foundation', date: '31 Aug 2026', day: 31, detail: 'Source date: 31 August 2026. It remains the same date in Los Angeles; no midnight conversion is applied.' }], undated: baseUndated }
  return { events: baseEvents, undated: baseUndated }
}

function EventTone({ kind }: { kind: EventKind }) {
  if (kind === 'deadline') return <CalendarDays aria-hidden='true' />
  if (kind === 'estimate') return <CircleDashed aria-hidden='true' />
  return <Clock3 aria-hidden='true' />
}

function Filters({ filter, setFilter }: { filter: EventFilter; setFilter: (filter: EventFilter) => void }) {
  const options: Array<{ id: EventFilter; label: string }> = [{ id: 'all', label: 'All dates' }, { id: 'deadlines', label: 'Deadlines' }, { id: 'responses', label: 'Estimated responses' }, { id: 'submissions', label: 'Submission events' }]
  return <div className={styles.filterRow} role='group' aria-label='Calendar filters'>{options.map((option) => <button key={option.id} type='button' data-active={filter === option.id} onClick={() => setFilter(option.id)}>{option.label}</button>)}</div>
}

function EventRow({ event, selected, onSelect }: { event: CalendarEvent; selected: boolean; onSelect: (event: CalendarEvent) => void }) {
  return <article className={styles.eventRow} data-kind={event.kind} data-selected={selected}><span className={styles.eventIcon}><EventTone kind={event.kind} /></span><button type='button' onClick={() => onSelect(event)}><span>{event.label}{event.manual ? ' · Private import' : ''}{event.changed ? ' · Moved' : ''}</span><strong>{event.title}</strong><small>{event.organization} · {event.stage}{event.work ? ` · ${event.work}` : ''}</small></button><Button type='button' variant='ghost' size='icon' aria-label={`More actions for ${event.title}`}><MoreHorizontal aria-hidden='true' /></Button></article>
}

function UndatedList({ items, onStatus }: { items: UndatedItem[]; onStatus: (message: string) => void }) {
  return <section className={styles.undated} aria-labelledby='undated-title'><header><div><p className={styles.eyebrow}>Always visible</p><h3 id='undated-title'>Undated, rolling, and conflicting</h3></div><span>{items.length}</span></header>{items.length ? <div>{items.map((item) => <article key={item.id}><Badge variant={item.timing === 'Conflict' ? 'destructive' : 'outline'}>{item.timing}</Badge><div><strong>{item.title}</strong><p>{item.organization} · {item.stage}</p><small>{item.detail}</small></div><Button type='button' variant='outline' onClick={() => onStatus(`${item.action} opened for ${item.title}.`)}>{item.action}</Button></article>)}</div> : <p className={styles.quietEmpty}>Every tracked item in this fixture has safe exact timing.</p>}</section>
}

function EventDetail({ event, onStatus }: { event?: CalendarEvent; onStatus: (message: string) => void }) {
  if (!event) return <aside className={styles.eventDetail}><CalendarDays aria-hidden='true' /><h3>Select a date</h3><p>Choose an event to see its timing, Tracker context, and safest next action.</p></aside>
  return <aside className={styles.eventDetail} data-kind={event.kind}><div className={styles.detailTop}><span className={styles.eventIcon}><EventTone kind={event.kind} /></span><div><p className={styles.eyebrow}>{event.label}</p><h3>{event.title}</h3><p>{event.organization}</p></div><Button type='button' variant='ghost' size='icon' aria-label={`More actions for ${event.title}`}><MoreHorizontal aria-hidden='true' /></Button></div><dl><div><dt>Date</dt><dd>{event.weekday}, {event.date}</dd></div><div><dt>Tracker stage</dt><dd>{event.stage}</dd></div><div><dt>Work</dt><dd>{event.work ?? 'Not linked'}</dd></div><div><dt>Timing</dt><dd>{event.kind === 'estimate' ? 'Estimate · may vary' : event.manual ? 'Private imported date' : 'Exact source date'}</dd></div></dl><p>{event.detail}</p><div className={styles.detailActions}><Button type='button' onClick={() => onStatus(`${event.action} opened for ${event.title}.`)}>{event.action}<ArrowRight aria-hidden='true' /></Button>{event.kind === 'deadline' && !event.manual ? <a href='#'>Official source <ExternalLink aria-hidden='true' /></a> : null}</div></aside>
}

function EmptyCalendar() {
  return <section className={styles.emptyState}><CalendarDays aria-hidden='true' /><p className={styles.eyebrow}>Tracker Calendar</p><h3>No dates to show yet</h3><p>Save an opportunity to keep its exact deadline here. Rolling and unknown timing will stay visible instead of receiving an invented date.</p><Button type='button'>Browse opportunities</Button></section>
}

function groupEventsByDate(events: CalendarEvent[]): Array<[string, CalendarEvent[]]> {
  const groups = new Map<string, CalendarEvent[]>()
  for (const event of events) groups.set(event.date, [...(groups.get(event.date) ?? []), event])
  return [...groups.entries()].sort(([, left], [, right]) => left[0]!.day - right[0]!.day)
}

function subscribeToNarrowScreen(callback: () => void) {
  const query = window.matchMedia('(max-width: 760px)')
  query.addEventListener('change', callback)
  return () => query.removeEventListener('change', callback)
}

function getNarrowScreenSnapshot() {
  return window.matchMedia('(max-width: 760px)').matches
}

function AgendaDirection({ events, undated, filter, setFilter, selected, setSelected, onStatus, showToolbar = true }: { events: CalendarEvent[]; undated: UndatedItem[]; filter: EventFilter; setFilter: (filter: EventFilter) => void; selected?: CalendarEvent; setSelected: (event: CalendarEvent) => void; onStatus: (message: string) => void; showToolbar?: boolean }) {
  const filtered = events.filter((event) => filterKinds[filter].includes(event.kind))
  const grouped = groupEventsByDate(filtered)
  if (!events.length && !undated.length) return <EmptyCalendar />
  return <div className={styles.agendaDirection}><div>{showToolbar ? <div className={styles.periodToolbar}><div><Button type='button' variant='outline' size='icon' aria-label='Previous month'><ChevronLeft aria-hidden='true' /></Button><Button type='button' variant='outline'>Today</Button><Button type='button' variant='outline' size='icon' aria-label='Next month'><ChevronRight aria-hidden='true' /></Button></div><h3>August 2026</h3><Filters filter={filter} setFilter={setFilter} /></div> : <Filters filter={filter} setFilter={setFilter} />}<div className={styles.agendaLayout}><section className={styles.agenda} aria-label='Calendar agenda'>{grouped.map(([date, rows]) => <section key={date}><header><time>{date}</time><span>{rows[0]!.weekday}</span></header><div>{rows.map((event) => <EventRow key={event.id} event={event} selected={selected?.id === event.id} onSelect={setSelected} />)}</div></section>)}{!grouped.length ? <p className={styles.quietEmpty}>No events match this filter.</p> : null}</section><EventDetail event={selected ?? filtered[0]} onStatus={onStatus} /></div></div><UndatedList items={undated} onStatus={onStatus} /></div>
}

function MonthDirection({ events, undated, filter, setFilter, selected, setSelected, onStatus, mobileAgendaFallback = false }: { events: CalendarEvent[]; undated: UndatedItem[]; filter: EventFilter; setFilter: (filter: EventFilter) => void; selected?: CalendarEvent; setSelected: (event: CalendarEvent) => void; onStatus: (message: string) => void; mobileAgendaFallback?: boolean }) {
  const isNarrowScreen = useSyncExternalStore(subscribeToNarrowScreen, getNarrowScreenSnapshot, () => false)
  const [manualViewMode, setManualViewMode] = useState<'month' | 'agenda' | undefined>()
  const [chosenDay, setChosenDay] = useState(selected?.day ?? events[0]?.day ?? 14)
  const viewMode = manualViewMode ?? (mobileAgendaFallback && isNarrowScreen ? 'agenda' : 'month')
  const selectEvent = (event: CalendarEvent) => { setChosenDay(event.day); setSelected(event) }
  if (!events.length && !undated.length) return <EmptyCalendar />
  const chosenEvents = events.filter((event) => event.day === chosenDay)
  return <div className={styles.monthDirection}><div className={styles.periodToolbar}><div><Button type='button' variant='outline' size='icon' aria-label='Previous month'><ChevronLeft aria-hidden='true' /></Button><Button type='button' variant='outline'>Today</Button><Button type='button' variant='outline' size='icon' aria-label='Next month'><ChevronRight aria-hidden='true' /></Button></div><h3>August 2026</h3><div className={styles.viewChoice}><button type='button' data-active={viewMode === 'month'} onClick={() => setManualViewMode('month')}>Month</button><button type='button' data-active={viewMode === 'agenda'} onClick={() => setManualViewMode('agenda')}>Agenda</button></div></div>{viewMode === 'month' ? <><div className={styles.monthLayout}><section className={styles.monthGrid} aria-label='August 2026 month'><div className={styles.weekdays}>{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day) => <span key={day}>{day}</span>)}</div><div className={styles.days}>{monthDays.map((day, index) => { const inMonth = day > 0 && day <= 31; const dayEvents = inMonth ? events.filter((event) => event.day === day) : []; return <button key={`${day}-${index}`} type='button' disabled={!inMonth} data-selected={day === chosenDay} onClick={() => { setChosenDay(day); const first = dayEvents[0]; if (first) selectEvent(first) }} aria-label={inMonth ? `${day} August, ${dayEvents.length} events` : 'Outside August'}><span>{inMonth ? day : day <= 0 ? 31 + day : day - 31}</span><span className={styles.dayEvents}>{dayEvents.slice(0, 3).map((event) => <i key={event.id} data-kind={event.kind} />)}{dayEvents.length > 3 ? <small>+{dayEvents.length - 3}</small> : null}</span></button> })}</div></section><section className={styles.dayAgenda}><header><p className={styles.eyebrow}>Selected day</p><h3>{chosenDay} August</h3><span>{chosenEvents.length} events</span></header>{chosenEvents.length ? chosenEvents.map((event) => <EventRow key={event.id} event={event} selected={selected?.id === event.id} onSelect={selectEvent} />) : <p className={styles.quietEmpty}>Nothing dated for this day.</p>}<EventDetail event={chosenEvents.find((event) => event.id === selected?.id) ?? chosenEvents[0]} onStatus={onStatus} /></section></div><UndatedList items={undated} onStatus={onStatus} /></> : <AgendaDirection events={events} undated={undated} filter={filter} setFilter={setFilter} selected={selected} setSelected={selectEvent} onStatus={onStatus} showToolbar={false} />}</div>
}

function LanesDirection({ events, undated, selected, setSelected, onStatus }: { events: CalendarEvent[]; undated: UndatedItem[]; selected?: CalendarEvent; setSelected: (event: CalendarEvent) => void; onStatus: (message: string) => void }) {
  if (!events.length && !undated.length) return <EmptyCalendar />
  const lanes = [{ title: 'Next 7 days', copy: 'Exact dates that need preparation now', rows: events.filter((event) => event.kind === 'deadline' && event.day <= 18) }, { title: 'Later this month', copy: 'Exact dates beyond the immediate week', rows: events.filter((event) => event.kind === 'deadline' && event.day > 18) }, { title: 'Responses and submission events', copy: 'Estimates and actual dated events stay distinct', rows: events.filter((event) => event.kind !== 'deadline') }]
  return <div className={styles.lanesDirection}><div className={styles.periodToolbar}><div><Button type='button' variant='outline' size='icon' aria-label='Previous period'><ChevronLeft aria-hidden='true' /></Button><Button type='button' variant='outline'>Today</Button><Button type='button' variant='outline' size='icon' aria-label='Next period'><ChevronRight aria-hidden='true' /></Button></div><h3>August 2026</h3><Button type='button' variant='outline'><Settings2 aria-hidden='true' />View settings</Button></div><div className={styles.lanes}>{lanes.map((lane) => <section key={lane.title}><header><h3>{lane.title}</h3><p>{lane.copy}</p><span>{lane.rows.length}</span></header><div>{lane.rows.map((event) => <EventRow key={event.id} event={event} selected={selected?.id === event.id} onSelect={setSelected} />)}{!lane.rows.length ? <p className={styles.quietEmpty}>No items in this lane.</p> : null}</div></section>)}</div><div className={styles.lanesBottom}><UndatedList items={undated} onStatus={onStatus} /><EventDetail event={selected ?? events[0]} onStatus={onStatus} /></div></div>
}

function FeedSettings({ disconnected, onClose, onStatus }: { disconnected: boolean; onClose: () => void; onStatus: (message: string) => void }) {
  return <div className={styles.feedOverlay}><section role='dialog' aria-modal='true' aria-labelledby='feed-title' className={styles.feedDialog}><header><div><p className={styles.eyebrow}>Private calendar subscription</p><h2 id='feed-title'>{disconnected ? 'Connect your calendar' : 'Calendar subscription'}</h2></div><Button type='button' variant='ghost' onClick={onClose}>Close</Button></header><Alert><Link2 aria-hidden='true' /><AlertTitle>The subscription link is a private key</AlertTitle><AlertDescription>Anyone with the link can read the projected dates. It never includes Work files, Saved Answers, email excerpts, or submission text.</AlertDescription></Alert><fieldset><legend>Feed scope</legend><label><input type='radio' name='feed-scope' defaultChecked />Exact tracked deadlines</label><label><input type='radio' name='feed-scope' />Deadlines plus estimated responses</label></fieldset><div className={styles.feedActions}><Button type='button' onClick={() => onStatus(disconnected ? 'Private calendar link created and copied.' : 'Private calendar link copied.')}><CalendarSync aria-hidden='true' />{disconnected ? 'Create and copy link' : 'Copy link'}</Button>{!disconnected ? <><Button type='button' variant='outline' onClick={() => onStatus('A new private calendar link was created. The previous link no longer works.')}>Rotate link</Button><Button type='button' variant='ghost' onClick={() => onStatus('Calendar subscription disconnected. Issued links no longer work.')}>Disconnect</Button></> : null}</div><p>After copying, subscribe from Apple Calendar, Google Calendar, Outlook, or another app. Calendar clients choose when subscribed feeds refresh.</p></section></div>
}

export function CalendarDirections() {
  const [direction, setDirection] = useState<Direction>('agenda')
  const [fixture, setFixture] = useState<Fixture>('active')
  const [filter, setFilter] = useState<EventFilter>('all')
  const [selected, setSelected] = useState<CalendarEvent | undefined>(baseEvents[0])
  const [feedOpen, setFeedOpen] = useState(false)
  const [status, setStatus] = useState('')
  const data = useMemo(() => fixtures(fixture), [fixture])

  function changeFixture(next: Fixture) { const nextData = fixtures(next); setFixture(next); setSelected(nextData.events[0]); setFilter('all'); setFeedOpen(next === 'feed'); setStatus('') }

  return <div className={styles.pageShell}><ReviewBar direction={direction} setDirection={setDirection} fixture={fixture} setFixture={changeFixture} /><AppHeader /><DirectionIntro direction={direction} /><main id='calendar-content' className={styles.main}><TrackerHeading onFeed={() => setFeedOpen(true)} />{fixture === 'conflict' ? <Alert variant='destructive' className={styles.fixtureAlert}><AlertTriangle aria-hidden='true' /><AlertTitle>One tracked opportunity has conflicting official deadlines</AlertTitle><AlertDescription>It remains in the undated conflict group until you review both sources.</AlertDescription></Alert> : null}{fixture === 'moved' ? <Alert className={styles.fixtureAlert}><CalendarDays aria-hidden='true' /><AlertTitle>North River Review moved its deadline</AlertTitle><AlertDescription>The Calendar now shows 28 August. The previous 14 August value remains in change history.</AlertDescription></Alert> : null}{fixture === 'timezone' ? <Alert className={styles.fixtureAlert}><Clock3 aria-hidden='true' /><AlertTitle>Date-only deadlines do not shift across timezones</AlertTitle><AlertDescription>31 August remains 31 August in Los Angeles and Seoul unless the source provides a closing time and timezone.</AlertDescription></Alert> : null}{direction === 'agenda' ? <AgendaDirection events={data.events} undated={data.undated} filter={filter} setFilter={setFilter} selected={selected} setSelected={setSelected} onStatus={setStatus} /> : null}{direction === 'month' ? <MonthDirection key={fixture} events={data.events} undated={data.undated} filter={filter} setFilter={setFilter} selected={selected} setSelected={setSelected} onStatus={setStatus} /> : null}{direction === 'lanes' ? <LanesDirection events={data.events} undated={data.undated} selected={selected} setSelected={setSelected} onStatus={setStatus} /> : null}<p className={styles.liveStatus} role='status' aria-live='polite'>{status}{status ? <Check aria-hidden='true' /> : null}</p></main>{feedOpen ? <FeedSettings disconnected={fixture === 'feed'} onClose={() => setFeedOpen(false)} onStatus={setStatus} /> : null}</div>
}

export function CalendarSelected() {
  const [fixture, setFixture] = useState<Fixture>('active')
  const [filter, setFilter] = useState<EventFilter>('all')
  const [selected, setSelected] = useState<CalendarEvent | undefined>(baseEvents[0])
  const [feedOpen, setFeedOpen] = useState(false)
  const [status, setStatus] = useState('')
  const data = useMemo(() => fixtures(fixture), [fixture])

  function changeFixture(next: Fixture) {
    const nextData = fixtures(next)
    setFixture(next); setSelected(nextData.events[0]); setFilter('all'); setFeedOpen(next === 'feed'); setStatus('')
  }

  return <div className={styles.pageShell}><SelectedReviewBar fixture={fixture} setFixture={changeFixture} /><AppHeader /><main id='calendar-content' className={styles.main}><TrackerHeading onFeed={() => setFeedOpen(true)} headingLevel='h1' />{fixture === 'conflict' ? <Alert variant='destructive' className={styles.fixtureAlert}><AlertTriangle aria-hidden='true' /><AlertTitle>One tracked opportunity has conflicting official deadlines</AlertTitle><AlertDescription>It remains in the undated conflict group until you review both sources.</AlertDescription></Alert> : null}{fixture === 'moved' ? <Alert className={styles.fixtureAlert}><CalendarDays aria-hidden='true' /><AlertTitle>North River Review moved its deadline</AlertTitle><AlertDescription>The Calendar now shows 28 August. The previous 14 August value remains in change history.</AlertDescription></Alert> : null}{fixture === 'timezone' ? <Alert className={styles.fixtureAlert}><Clock3 aria-hidden='true' /><AlertTitle>Date-only deadlines do not shift across timezones</AlertTitle><AlertDescription>31 August remains 31 August in Los Angeles and Seoul unless the source provides a closing time and timezone.</AlertDescription></Alert> : null}<MonthDirection key={fixture} events={data.events} undated={data.undated} filter={filter} setFilter={setFilter} selected={selected} setSelected={setSelected} onStatus={setStatus} mobileAgendaFallback /><p className={styles.liveStatus} role='status' aria-live='polite'>{status}{status ? <Check aria-hidden='true' /> : null}</p></main>{feedOpen ? <FeedSettings disconnected={fixture === 'feed'} onClose={() => setFeedOpen(false)} onStatus={setStatus} /> : null}</div>
}
