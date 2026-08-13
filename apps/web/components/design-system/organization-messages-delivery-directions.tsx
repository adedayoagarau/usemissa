'use client'

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  FileText,
  Filter,
  Gavel,
  LockKeyhole,
  Mail,
  Menu,
  MessageSquareReply,
  MoreHorizontal,
  PenLine,
  Receipt,
  Search,
  Send,
  ShieldCheck,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'

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
import { Input } from '@/components/ui/input'

import { MissaWordmark } from '@/components/missa-wordmark'
import styles from './organization-messages-delivery-directions.module.css'

type Direction = 'ledger' | 'outcome' | 'runbook'
type Surface = 'messages' | 'delivery'
type Fixture =
  | 'message-partial'
  | 'message-empty'
  | 'message-large'
  | 'message-stale'
  | 'message-correction'
  | 'message-missing-recipient'
  | 'message-scheduled'
  | 'message-provider-down'
  | 'message-mixed-work'
  | 'message-legal'
  | 'message-viewer'
  | 'delivery-active'
  | 'delivery-empty'
  | 'delivery-mixed-work'
  | 'delivery-overdue'
  | 'delivery-no-date'
  | 'delivery-blocked'
  | 'delivery-payment'
  | 'delivery-agreement'
  | 'delivery-asset-revision'
  | 'delivery-legacy'
  | 'delivery-concurrent'
  | 'delivery-finance'
  | 'delivery-legal'
  | 'delivery-viewer'

type MessageState = 'Draft' | 'Needs approval' | 'Scheduled' | 'Sending' | 'Sent' | 'Partly sent' | 'Failed' | 'Corrected'
type RecipientState = 'Ready' | 'Sent' | 'Delivered' | 'Missing address' | 'Failed' | 'Suppressed'
type DeliveryState = 'Ready to set up' | 'Active' | 'Blocked' | 'Complete'
type TaskState = 'Not started' | 'In progress' | 'Blocked' | 'Complete' | 'Not required'

type MessageRecord = {
  id: string
  subject: string
  purpose: string
  opportunity: string
  audience: string
  state: MessageState
  timing: string
  attention: string
}

type Recipient = {
  id: string
  name: string
  work: string
  address: string
  state: RecipientState
  note: string
}

type DeliveryRecord = {
  id: string
  work: string
  submitter: string
  opportunity: string
  state: DeliveryState
  next: string
  owner: string
  due: string
}

type DeliveryTask = {
  id: string
  group: 'Agreement' | 'Materials' | 'Finance' | 'Publication'
  title: string
  owner: string
  due: string
  state: TaskState
  evidence: string
}

const directions = [
  {
    id: 'ledger' as const,
    number: '01',
    name: 'Correspondence ledger',
    description: 'A compact record-first view for high-volume scanning and audit.',
  },
  {
    id: 'outcome' as const,
    number: '02',
    name: 'Outcome desk',
    description: 'Keeps the selected Work, communication, and next obligation together.',
  },
  {
    id: 'runbook' as const,
    number: '03',
    name: 'Program runbook',
    description: 'Groups recurring communication and fulfillment by Opportunity phase.',
  },
]

const messageFixtures: Array<{ value: Fixture; label: string }> = [
  { value: 'message-partial', label: 'Message partly sent' },
  { value: 'message-empty', label: 'No messages' },
  { value: 'message-large', label: 'Thousands of recipients' },
  { value: 'message-stale', label: 'Decision changed after preview' },
  { value: 'message-correction', label: 'Correction required' },
  { value: 'message-missing-recipient', label: 'Missing recipient address' },
  { value: 'message-scheduled', label: 'Scheduled with timezone' },
  { value: 'message-provider-down', label: 'Send interrupted' },
  { value: 'message-mixed-work', label: 'Mixed Work outcomes' },
  { value: 'message-legal', label: 'Legal approval projection' },
  { value: 'message-viewer', label: 'Read-only Viewer' },
]

const deliveryFixtures: Array<{ value: Fixture; label: string }> = [
  { value: 'delivery-active', label: 'Active publication plan' },
  { value: 'delivery-empty', label: 'No accepted Works' },
  { value: 'delivery-mixed-work', label: 'Mixed Work outcomes' },
  { value: 'delivery-overdue', label: 'Overdue obligation' },
  { value: 'delivery-no-date', label: 'No due date' },
  { value: 'delivery-blocked', label: 'Blocked task' },
  { value: 'delivery-payment', label: 'Payment held' },
  { value: 'delivery-agreement', label: 'Agreement unsigned' },
  { value: 'delivery-asset-revision', label: 'Asset needs revision' },
  { value: 'delivery-legacy', label: 'Legacy generic task' },
  { value: 'delivery-concurrent', label: 'Task changed elsewhere' },
  { value: 'delivery-finance', label: 'Finance projection' },
  { value: 'delivery-legal', label: 'Legal projection' },
  { value: 'delivery-viewer', label: 'Read-only Viewer' },
]

const baseMessages: MessageRecord[] = [
  {
    id: 'acceptance-river-maps',
    subject: 'Acceptance and next steps',
    purpose: 'Acceptance',
    opportunity: '2027 Poetry and Essay Prize',
    audience: '24 recipients',
    state: 'Partly sent',
    timing: 'Sent 8 Aug · 10:30 AM PDT',
    attention: '2 recipients need attention',
  },
  {
    id: 'waitlist-round-one',
    subject: 'Your Work is on the waitlist',
    purpose: 'Waitlist',
    opportunity: '2027 Poetry and Essay Prize',
    audience: '11 recipients',
    state: 'Scheduled',
    timing: '12 Aug · 9:00 AM PDT',
    attention: 'Ready to send',
  },
  {
    id: 'revision-new-voices',
    subject: 'A revision is needed',
    purpose: 'Revision request',
    opportunity: 'New Voices Residency',
    audience: '6 recipients',
    state: 'Needs approval',
    timing: 'Not scheduled',
    attention: 'Legal approval needed',
  },
  {
    id: 'decline-public-art',
    subject: 'An update on your submission',
    purpose: 'Decline',
    opportunity: 'Public Art Writing Commission',
    audience: '38 recipients',
    state: 'Sent',
    timing: 'Sent 6 Aug · 4:15 PM PDT',
    attention: 'No action needed',
  },
]

const baseRecipients: Recipient[] = [
  { id: 'amaka', name: 'Amaka Nwosu', work: 'River Maps', address: 'amaka@example.com', state: 'Delivered', note: 'Delivery receipt recorded' },
  { id: 'tomi', name: 'Tomi Adeyemi', work: 'Soft Machines', address: 'tomi@example.com', state: 'Sent', note: 'Accepted for sending' },
  { id: 'ifeanyi', name: 'Ifeanyi Okoro', work: 'Night Bus to Enugu', address: 'ifeanyi@example.com', state: 'Failed', note: 'Temporary delivery failure; safe to retry' },
  { id: 'zainab', name: 'Zainab Bello', work: 'Market Light', address: 'Not available', state: 'Missing address', note: 'Add an address or exclude with a reason' },
]

const baseDelivery: DeliveryRecord[] = [
  {
    id: 'river-maps',
    work: 'River Maps',
    submitter: 'Amaka Nwosu',
    opportunity: '2027 Poetry and Essay Prize',
    state: 'Active',
    next: 'Approve author agreement',
    owner: 'Maya · Legal',
    due: 'Today',
  },
  {
    id: 'night-bus',
    work: 'Night Bus to Enugu',
    submitter: 'Ifeanyi Okoro',
    opportunity: '2027 Poetry and Essay Prize',
    state: 'Blocked',
    next: 'Resolve payment details',
    owner: 'Daniel · Finance',
    due: '2 days overdue',
  },
  {
    id: 'soft-machines',
    work: 'Soft Machines',
    submitter: 'Tomi Adeyemi',
    opportunity: 'New Voices Residency',
    state: 'Ready to set up',
    next: 'Choose an onboarding plan',
    owner: 'Unassigned',
    due: 'No date',
  },
  {
    id: 'field-notes',
    work: 'Field Notes for a Moving City',
    submitter: 'Zainab Bello',
    opportunity: 'Public Art Writing Commission',
    state: 'Complete',
    next: 'No open obligations',
    owner: 'Program team',
    due: 'Completed 5 Aug',
  },
]

const baseTasks: DeliveryTask[] = [
  { id: 'agreement', group: 'Agreement', title: 'Approve author agreement', owner: 'Maya Chen · Legal', due: 'Today', state: 'In progress', evidence: 'Signed agreement required' },
  { id: 'manuscript', group: 'Materials', title: 'Receive final manuscript', owner: 'Kemi Adebayo', due: '12 Aug', state: 'Complete', evidence: 'Final manuscript · DOCX' },
  { id: 'bio', group: 'Materials', title: 'Approve biography and headshot', owner: 'Kemi Adebayo', due: '14 Aug', state: 'Blocked', evidence: 'Headshot revision requested' },
  { id: 'honorarium', group: 'Finance', title: 'Confirm honorarium details', owner: 'Daniel Kim · Finance', due: '16 Aug', state: 'Not started', evidence: 'Payment confirmation required' },
  { id: 'proof', group: 'Publication', title: 'Send publication proof', owner: 'Editorial team', due: '24 Aug', state: 'Not started', evidence: 'Proof file and send record required' },
  { id: 'publish', group: 'Publication', title: 'Confirm publication', owner: 'Editorial team', due: '10 Sep', state: 'Not started', evidence: 'Publication URL required' },
]

function roleForFixture(fixture: Fixture) {
  if (fixture === 'message-legal' || fixture === 'delivery-legal') return 'Legal'
  if (fixture === 'delivery-finance') return 'Finance'
  if (fixture === 'message-viewer' || fixture === 'delivery-viewer') return 'Viewer'
  return 'Program manager'
}

function isMessageFixture(fixture: Fixture) {
  return fixture.startsWith('message-')
}

function toneForState(value: string) {
  if (['Delivered', 'Sent', 'Complete', 'Approved', 'Signed', 'Paid'].includes(value)) return 'positive'
  if (['Partly sent', 'Failed', 'Missing address', 'Blocked', 'Overdue', 'Needs approval', 'Needs revision'].includes(value)) return 'attention'
  if (['Scheduled', 'Sending', 'Active', 'In progress', 'Ready', 'Ready to set up'].includes(value)) return 'information'
  return 'neutral'
}

function StateChip({ value }: { value: string }) {
  return <span className={styles.stateChip} data-tone={toneForState(value)}>{value}</span>
}

function AppHeader() {
  return (
    <header className={styles.appHeader}>
      <a href='#main-content' className={styles.skipLink}>Skip to content</a>
      <MissaWordmark href='#' size='app' className={styles.wordmark} />
      <nav aria-label='Product navigation'><a href='#'>Profile</a><a href='#' aria-current='page'>Organization</a></nav>
      <div className={styles.headerActions}>
        <Button type='button' variant='outline' size='sm'><Search aria-hidden='true' />Search <span>⌘K</span></Button>
        <button type='button' className={styles.avatar} aria-label='Open Profile'>AO</button>
      </div>
    </header>
  )
}

function ReviewBar({ direction, selectedOnly, setDirection, surface, setSurface, fixture, setFixture }: {
  direction: Direction
  selectedOnly: boolean
  setDirection: (direction: Direction) => void
  surface: Surface
  setSurface: (surface: Surface) => void
  fixture: Fixture
  setFixture: (fixture: Fixture) => void
}) {
  const choices = surface === 'messages' ? messageFixtures : deliveryFixtures
  return (
    <aside className={styles.reviewBar} aria-label='Design review controls'>
      {selectedOnly ? <div className={styles.selectedLabel}><strong>Selected post-decision composition</strong><span>02 · Outcome desk</span></div> : <div className={styles.directionButtons} role='group' aria-label='Visual direction'>
        {directions.map((item) => (
          <button type='button' key={item.id} data-active={direction === item.id} onClick={() => setDirection(item.id)}>
            <span>{item.number}</span>{item.name}{item.id === 'outcome' ? <small>Selected</small> : null}
          </button>
        ))}
      </div>}
      <div className={styles.surfaceButtons} role='group' aria-label='Organization surface'>
        <button type='button' data-active={surface === 'messages'} onClick={() => { setSurface('messages'); if (!isMessageFixture(fixture)) setFixture('message-partial') }}>Messages</button>
        <button type='button' data-active={surface === 'delivery'} onClick={() => { setSurface('delivery'); if (isMessageFixture(fixture)) setFixture('delivery-active') }}>Delivery</button>
      </div>
      <label><span>Edge state</span><select value={fixture} onChange={(event) => setFixture(event.target.value as Fixture)}>{choices.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
    </aside>
  )
}

function DirectionIntro({ direction }: { direction: Direction }) {
  const item = directions.find((candidate) => candidate.id === direction)!
  return (
    <section className={styles.directionIntro} aria-label={`${item.name} direction`}>
      <span>{item.number}</span>
      <div><p>Organization post-decision direction</p><strong>{item.name}</strong><p>{item.description}</p></div>
      {direction === 'outcome' ? <Badge variant='outline'>Selected family</Badge> : <Badge variant='outline'>Comparison retained</Badge>}
    </section>
  )
}

function OrganizationBar({ surface, role }: { surface: Surface; role: string }) {
  return (
    <div className={styles.organizationBar}>
      <button type='button' aria-label={`Switch Organization. Current: North River Review, ${role}`}>
        <span className={styles.organizationMark}>NR</span><span><strong>North River Review</strong><small>{role}</small></span><ChevronDown aria-hidden='true' />
      </button>
      <nav aria-label='Organization navigation'>
        <a href='#'>Overview</a><a href='#'>Opportunities</a><a href='#'>Submissions</a><a href='#'>Reviews</a><a href='#'>Decisions</a><a href='#' aria-current={surface === 'messages' ? 'page' : undefined}>Messages</a><a href='#' aria-current={surface === 'delivery' ? 'page' : undefined}>Delivery</a>
      </nav>
      <Button type='button' variant='ghost' size='icon' aria-label='Open Organization navigation'><Menu aria-hidden='true' /></Button>
    </div>
  )
}

function SurfaceHeader({ surface, role }: { surface: Surface; role: string }) {
  const copy = surface === 'messages'
    ? ['Messages', 'Prepare consequential correspondence and see exactly what happened for every recipient.']
    : ['Delivery', 'Coordinate the next obligation for every accepted Work without mistaking a task for external proof.']
  return (
    <header className={styles.pageHeader}>
      <div><p className={styles.eyebrow}>North River Review · {role}</p><h1>{copy[0]}</h1><p>{copy[1]}</p></div>
      {role === 'Viewer' ? <Badge variant='outline'>Read only</Badge> : surface === 'messages' ? <Button type='button'><PenLine aria-hidden='true' />New message</Button> : <Button type='button'><ClipboardCheck aria-hidden='true' />Set up accepted Work</Button>}
    </header>
  )
}

function FixtureAlert({ fixture }: { fixture: Fixture }) {
  const alerts: Partial<Record<Fixture, { title: string; body: string; action?: string }>> = {
    'message-partial': { title: 'Two recipients need attention', body: 'Twenty-two messages were accepted for sending. One address is missing and one send failed. No duplicate send is queued.', action: 'Review unresolved recipients' },
    'message-stale': { title: 'Decision changed after this preview', body: 'One selected Work is now waitlisted. Rebuild and approve the audience before any message can be sent.', action: 'Rebuild preview' },
    'message-correction': { title: 'A correction is required', body: 'The original message named the wrong publication date. Send a linked correction only to affected recipients.', action: 'Prepare correction' },
    'message-provider-down': { title: 'Sending stopped safely', body: 'The interruption left four recipients unresolved. Confirm the current ledger before retrying only those recipients.', action: 'Review unresolved recipients' },
    'message-missing-recipient': { title: 'One recipient has no usable address', body: 'Add a valid address or exclude the recipient with a reason before approval.', action: 'Resolve recipient' },
    'message-legal': { title: 'Terms need Legal approval', body: 'The acceptance copy includes publication rights. The approved version must remain unchanged after Legal signs off.', action: 'Review terms' },
    'delivery-overdue': { title: 'One obligation is overdue', body: 'Payment details were due two days ago. The publication date has not changed.', action: 'Open blocker' },
    'delivery-blocked': { title: 'A required asset is blocked', body: 'The submitted headshot cannot be used. A revision request is linked to this Work.', action: 'Review request' },
    'delivery-payment': { title: 'Payment is on hold', body: 'Finance needs corrected payout details. No paid state is shown until confirmation is recorded.', action: 'Open Finance task' },
    'delivery-agreement': { title: 'Agreement is not signed', body: 'Publication preparation can continue, but release cannot be marked complete.', action: 'Open agreement' },
    'delivery-asset-revision': { title: 'Headshot needs revision', body: 'The file was received, but it does not meet the Organization’s configured publication requirements.', action: 'Review asset' },
    'delivery-legacy': { title: 'This Work has a legacy task', body: 'The existing pending task has no owner, type, or completion evidence. Set up a delivery plan before relying on it.', action: 'Set up plan' },
    'delivery-concurrent': { title: 'This plan changed elsewhere', body: 'Reload the current task state before recording another change. Your unsaved note remains in this view.', action: 'Reload plan' },
    'delivery-legal': { title: 'Legal view', body: 'Only agreement and rights obligations are shown. Review notes and Finance details remain outside this projection.' },
    'delivery-finance': { title: 'Finance view', body: 'Only award and payment obligations are shown. Review notes and unpublished creative files remain outside this projection.' },
  }
  const copy = alerts[fixture]
  if (!copy) return null
  return (
    <Alert className={styles.fixtureAlert}>
      <AlertTriangle aria-hidden='true' />
      <AlertTitle>{copy.title}</AlertTitle>
      <AlertDescription>{copy.body}</AlertDescription>
      {copy.action ? <Button type='button' variant='outline' size='sm'>{copy.action}<ArrowRight aria-hidden='true' /></Button> : null}
    </Alert>
  )
}

function messagesForFixture(fixture: Fixture): MessageRecord[] {
  if (fixture === 'message-empty') return []
  if (fixture === 'message-large') return Array.from({ length: 14 }, (_, index) => ({ ...baseMessages[index % baseMessages.length]!, id: `message-${index}`, subject: `${baseMessages[index % baseMessages.length]!.subject} · Batch ${index + 1}`, audience: index === 0 ? '4,826 recipients' : baseMessages[index % baseMessages.length]!.audience }))
  if (fixture === 'message-stale') return [{ ...baseMessages[0]!, state: 'Needs approval', attention: 'Decision changed after preview' }, ...baseMessages.slice(1)]
  if (fixture === 'message-correction') return [{ ...baseMessages[0]!, subject: 'Correction: publication date', state: 'Corrected', attention: 'Linked to the original message' }, ...baseMessages.slice(1)]
  if (fixture === 'message-scheduled') return [{ ...baseMessages[1]!, id: baseMessages[0]!.id, timing: '12 Aug · 9:00 AM America/Los_Angeles' }, ...baseMessages.slice(1)]
  if (fixture === 'message-provider-down') return [{ ...baseMessages[0]!, state: 'Failed', attention: '4 unresolved; retry not started' }, ...baseMessages.slice(1)]
  if (fixture === 'message-missing-recipient') return [{ ...baseMessages[0]!, state: 'Needs approval', attention: '1 address must be resolved' }, ...baseMessages.slice(1)]
  if (fixture === 'message-legal') return [{ ...baseMessages[2]!, id: baseMessages[0]!.id, attention: 'Publication terms need approval' }, ...baseMessages.slice(1)]
  return baseMessages
}

function recipientsForFixture(fixture: Fixture): Recipient[] {
  if (fixture === 'message-missing-recipient') return [baseRecipients[0]!, { ...baseRecipients[3]!, note: 'Required recipient; message cannot be approved' }]
  if (fixture === 'message-provider-down') return baseRecipients.map((item, index) => index < 2 ? item : { ...item, state: 'Failed', note: 'Unresolved after interruption' })
  if (fixture === 'message-stale') return baseRecipients.map((item) => ({ ...item, state: 'Ready', note: 'Preview invalidated; not queued' }))
  if (fixture === 'message-large') return Array.from({ length: 12 }, (_, index) => ({ ...baseRecipients[index % baseRecipients.length]!, id: `recipient-${index}`, name: `${baseRecipients[index % baseRecipients.length]!.name} · ${index + 1}` }))
  return baseRecipients
}

function QueueToolbar({ surface, query, setQuery }: { surface: Surface; query: string; setQuery: (value: string) => void }) {
  return (
    <form className={styles.queueToolbar} role='search' onSubmit={(event) => event.preventDefault()}>
      <label><span>Search {surface === 'messages' ? 'messages' : 'accepted Works'}</span><div><Search aria-hidden='true' /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={surface === 'messages' ? 'Subject, Opportunity, or purpose' : 'Work, person, or Opportunity'} /></div></label>
      <Button type='button' variant='outline' size='icon' aria-label={`Filter ${surface}`}><Filter aria-hidden='true' /></Button>
    </form>
  )
}

function EmptyState({ surface }: { surface: Surface }) {
  return (
    <section className={styles.emptyState}>
      {surface === 'messages' ? <Mail aria-hidden='true' /> : <ClipboardCheck aria-hidden='true' />}
      <h2>{surface === 'messages' ? 'No messages yet' : 'No accepted Works yet'}</h2>
      <p>{surface === 'messages' ? 'Drafts and sent correspondence will appear here with recipient-level outcomes.' : 'A delivery plan can begin after at least one Work has an accepted decision.'}</p>
      <Button type='button' variant='outline'>{surface === 'messages' ? 'Create a draft' : 'Review decisions'}</Button>
    </section>
  )
}

function MessageQueue({ records, selected, setSelected }: { records: MessageRecord[]; selected: string; setSelected: (id: string) => void }) {
  return (
    <section className={styles.queuePanel} aria-label='Message ledger'>
      <div className={styles.panelHeading}><div><p className={styles.eyebrow}>Correspondence</p><h2>{records.length === 1 ? '1 message' : `${records.length} messages`}</h2></div><Button type='button' variant='ghost' size='icon' aria-label='More message actions'><MoreHorizontal aria-hidden='true' /></Button></div>
      <ul className={styles.recordList}>
        {records.map((record) => (
          <li key={record.id}>
            <button type='button' data-selected={selected === record.id} onClick={() => setSelected(record.id)}>
              <span className={styles.recordIcon}><Mail aria-hidden='true' /></span>
              <span className={styles.recordCopy}><strong>{record.subject}</strong><small>{record.opportunity}</small><span><StateChip value={record.state} /><small>{record.audience}</small></span><small data-attention={record.attention !== 'No action needed' && record.attention !== 'Ready to send'}>{record.attention}</small></span>
              <ChevronRight aria-hidden='true' />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function RecipientLedger({ recipients }: { recipients: Recipient[] }) {
  return (
    <section className={styles.recipientSection} aria-labelledby='recipient-heading'>
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Resolved audience</p><h3 id='recipient-heading'>Recipient ledger</h3></div><Button type='button' variant='outline' size='sm'><UsersRound aria-hidden='true' />Review audience</Button></div>
      <div className={styles.desktopTable}>
        <table>
          <thead><tr><th scope='col'>Recipient</th><th scope='col'>Work</th><th scope='col'>Address</th><th scope='col'>State</th><th scope='col'>Meaning</th></tr></thead>
          <tbody>{recipients.map((recipient) => <tr key={recipient.id}><th scope='row'>{recipient.name}</th><td>{recipient.work}</td><td>{recipient.address}</td><td><StateChip value={recipient.state} /></td><td>{recipient.note}</td></tr>)}</tbody>
        </table>
      </div>
      <ul className={styles.mobileRows}>{recipients.map((recipient) => <li key={recipient.id}><div><strong>{recipient.name}</strong><StateChip value={recipient.state} /></div><p>{recipient.work}</p><p>{recipient.address}</p><small>{recipient.note}</small></li>)}</ul>
    </section>
  )
}

function MessageDetail({ record, fixture, recipients, role, onOpenConfirm, onBack, backButtonRef }: { record: MessageRecord; fixture: Fixture; recipients: Recipient[]; role: string; onOpenConfirm: () => void; onBack: () => void; backButtonRef: RefObject<HTMLButtonElement | null> }) {
  const sendBlocked = role === 'Viewer' || ['message-stale', 'message-missing-recipient', 'message-legal'].includes(fixture)
  const unresolved = recipients.filter((recipient) => ['Failed', 'Missing address'].includes(recipient.state)).length
  return (
    <article className={styles.detailPanel} aria-labelledby='message-subject'>
      <button ref={backButtonRef} type='button' className={styles.mobileBack} onClick={onBack}><ArrowLeft aria-hidden='true' />Back to messages</button>
      <header className={styles.detailHeader}>
        <div><div className={styles.titleLine}><StateChip value={record.state} /><span>{record.purpose}</span></div><h2 id='message-subject'>{record.subject}</h2><p>{record.opportunity}</p></div>
        <Button type='button' variant='outline' size='icon' aria-label='More actions for this message'><MoreHorizontal aria-hidden='true' /></Button>
      </header>
      <dl className={styles.factStrip}>
        <div><dt><Gavel aria-hidden='true' />Decision snapshot</dt><dd>{fixture === 'message-mixed-work' ? '1 accepted · 1 declined' : 'Accepted · River Maps'}</dd></div>
        <div><dt><UsersRound aria-hidden='true' />Audience</dt><dd>{record.audience}</dd></div>
        <div><dt><ShieldCheck aria-hidden='true' />Approval</dt><dd>{fixture === 'message-legal' ? 'Legal review needed' : 'Approved by Maya Chen'}</dd></div>
        <div><dt><CalendarClock aria-hidden='true' />Timing</dt><dd>{record.timing}</dd></div>
      </dl>
      <section className={styles.messagePreview} aria-labelledby='preview-heading'>
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Approved external copy</p><h3 id='preview-heading'>Message preview</h3></div><Button type='button' variant='outline' size='sm'><PenLine aria-hidden='true' />Edit draft</Button></div>
        <dl><div><dt>From</dt><dd>North River Review &lt;submissions@northriver.org&gt;</dd></div><div><dt>Reply to</dt><dd>editorial@northriver.org</dd></div><div><dt>Subject</dt><dd>{record.subject}</dd></div></dl>
        <div className={styles.messageBody}>
          <p>Hello Amaka,</p>
          <p>We’re delighted to accept <strong>River Maps</strong> for the 2027 Poetry and Essay Prize anthology.</p>
          <p>Please review the author agreement and send your final manuscript, biography, and headshot by 14 August.</p>
          <p>Warmly,<br />North River Review</p>
        </div>
      </section>
      <RecipientLedger recipients={recipients} />
      <aside className={styles.internalNote} aria-label='Internal note'><LockKeyhole aria-hidden='true' /><div><strong>Internal note · never sent</strong><p>Legal approved the standard rights language. Confirm the publication date before preparing any correction.</p></div></aside>
      <footer className={styles.detailActions}>
        <div><strong>{unresolved > 0 ? `${unresolved} unresolved ${unresolved === 1 ? 'recipient' : 'recipients'}` : 'No unresolved recipients'}</strong><small id='send-help'>{sendBlocked ? role === 'Viewer' ? 'Your role can read this record but cannot send.' : 'Resolve the highlighted gate before sending.' : 'Only unresolved recipients will be included.'}</small></div>
        <Button type='button' variant='outline'><MessageSquareReply aria-hidden='true' />Open replies</Button>
        <Button type='button' aria-disabled={sendBlocked} aria-describedby='send-help' onClick={sendBlocked ? undefined : onOpenConfirm}><Send aria-hidden='true' />{fixture === 'message-correction' ? 'Review correction' : unresolved > 0 ? 'Send remaining' : 'Review send'}</Button>
      </footer>
    </article>
  )
}

function deliveryForFixture(fixture: Fixture): DeliveryRecord[] {
  if (fixture === 'delivery-empty') return []
  if (fixture === 'delivery-overdue' || fixture === 'delivery-payment') return [{ ...baseDelivery[1]!, id: baseDelivery[0]!.id }, ...baseDelivery.slice(1)]
  if (fixture === 'delivery-no-date') return [{ ...baseDelivery[2]!, id: baseDelivery[0]!.id }, ...baseDelivery.slice(1)]
  if (fixture === 'delivery-blocked' || fixture === 'delivery-asset-revision') return [{ ...baseDelivery[0]!, state: 'Blocked', next: 'Resolve headshot revision', due: 'Before publication proof' }, ...baseDelivery.slice(1)]
  if (fixture === 'delivery-agreement' || fixture === 'delivery-legal') return [{ ...baseDelivery[0]!, state: 'Blocked', next: 'Agreement is not signed' }, ...baseDelivery.slice(1)]
  if (fixture === 'delivery-legacy') return [{ ...baseDelivery[0]!, state: 'Ready to set up', next: 'Replace legacy pending task', owner: 'Unassigned', due: 'No date' }, ...baseDelivery.slice(1)]
  if (fixture === 'delivery-mixed-work') return [{ ...baseDelivery[0]!, next: 'Continue accepted Work only' }, ...baseDelivery.slice(1)]
  return baseDelivery
}

function tasksForFixture(fixture: Fixture): DeliveryTask[] {
  let tasks = baseTasks
  if (fixture === 'delivery-overdue') tasks = baseTasks.map((task) => task.id === 'honorarium' ? { ...task, state: 'Blocked', due: '2 days overdue', evidence: 'Corrected payout details required' } : task)
  if (fixture === 'delivery-no-date') tasks = baseTasks.map((task) => task.id === 'proof' ? { ...task, due: 'No date' } : task)
  if (fixture === 'delivery-blocked' || fixture === 'delivery-asset-revision') tasks = baseTasks.map((task) => task.id === 'bio' ? { ...task, state: 'Blocked', evidence: 'Replacement headshot required' } : task)
  if (fixture === 'delivery-payment' || fixture === 'delivery-finance') tasks = baseTasks.filter((task) => task.group === 'Finance').map((task) => ({ ...task, state: 'Blocked', evidence: 'Payout details need correction' }))
  if (fixture === 'delivery-agreement' || fixture === 'delivery-legal') tasks = baseTasks.filter((task) => task.group === 'Agreement').map((task) => ({ ...task, state: 'Blocked', evidence: 'Signed agreement required' }))
  if (fixture === 'delivery-legacy') tasks = [{ id: 'legacy', group: 'Publication', title: 'Pending delivery task', owner: 'Unassigned', due: 'No date', state: 'Not started', evidence: 'No evidence rule configured' }]
  return tasks
}

function DeliveryQueue({ records, selected, setSelected, role }: { records: DeliveryRecord[]; selected: string; setSelected: (id: string) => void; role: string }) {
  return (
    <section className={styles.queuePanel} aria-label='Accepted Work delivery inventory'>
      <div className={styles.panelHeading}><div><p className={styles.eyebrow}>Accepted Works</p><h2>{records.length === 1 ? '1 Work' : `${records.length} Works`}</h2></div><Button type='button' variant='ghost' size='icon' aria-label='More Delivery actions'><MoreHorizontal aria-hidden='true' /></Button></div>
      <ul className={styles.recordList}>
        {records.map((record) => (
          <li key={record.id}>
            <button type='button' data-selected={selected === record.id} onClick={() => setSelected(record.id)}>
              <span className={styles.recordIcon}>{record.state === 'Complete' ? <CheckCircle2 aria-hidden='true' /> : <FileCheck2 aria-hidden='true' />}</span>
              <span className={styles.recordCopy}><strong>{record.work}</strong><small>{role === 'Finance' ? 'Identity withheld' : record.submitter} · {record.opportunity}</small><span><StateChip value={record.state} /><small>{record.due}</small></span><small data-attention={record.state === 'Blocked'}>{record.next}</small></span>
              <ChevronRight aria-hidden='true' />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function TaskIcon({ state }: { state: TaskState }) {
  if (state === 'Complete') return <CheckCircle2 aria-hidden='true' />
  if (state === 'Blocked') return <CircleAlert aria-hidden='true' />
  if (state === 'In progress') return <Clock3 aria-hidden='true' />
  return <Circle aria-hidden='true' />
}

function DeliveryDetail({ record, tasks, fixture, role, locallyComplete, onComplete, onBack, backButtonRef }: { record: DeliveryRecord; tasks: DeliveryTask[]; fixture: Fixture; role: string; locallyComplete: string[]; onComplete: (task: DeliveryTask) => void; onBack: () => void; backButtonRef: RefObject<HTMLButtonElement | null> }) {
  const groups = ['Agreement', 'Materials', 'Finance', 'Publication'] as const
  const readOnly = role === 'Viewer'
  return (
    <article className={styles.detailPanel} aria-labelledby='work-title'>
      <button ref={backButtonRef} type='button' className={styles.mobileBack} onClick={onBack}><ArrowLeft aria-hidden='true' />Back to accepted Works</button>
      <header className={styles.detailHeader}>
        <div><div className={styles.titleLine}><StateChip value={record.state} /><span>Accepted Work</span></div><h2 id='work-title'>{record.work}</h2><p>{role === 'Finance' ? 'Identity withheld' : record.submitter} · {record.opportunity}</p></div>
        <Button type='button' variant='outline' size='icon' aria-label='More actions for this accepted Work'><MoreHorizontal aria-hidden='true' /></Button>
      </header>
      <dl className={styles.factStrip}>
        <div><dt><Gavel aria-hidden='true' />Decision</dt><dd>Accepted · recorded per Work</dd></div>
        <div><dt><UserRound aria-hidden='true' />Next owner</dt><dd>{record.owner}</dd></div>
        <div><dt><CalendarClock aria-hidden='true' />Due</dt><dd>{record.due}</dd></div>
        <div><dt><Mail aria-hidden='true' />Correspondence</dt><dd>Acceptance partly sent</dd></div>
      </dl>
      {fixture === 'delivery-mixed-work' ? <aside className={styles.mixedWork}><FileText aria-hidden='true' /><div><strong>This Submission contains two Works</strong><p><span>River Maps · Accepted</span><span>Notes for a Returning City · Declined</span></p></div></aside> : null}
      <section className={styles.planSection} aria-labelledby='plan-heading'>
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Publication plan</p><h3 id='plan-heading'>Obligations</h3></div>{readOnly ? null : <Button type='button' variant='outline' size='sm'><ClipboardCheck aria-hidden='true' />Add task</Button>}</div>
        <div className={styles.taskGroups}>
          {groups.map((group) => {
            const grouped = tasks.filter((task) => task.group === group)
            if (grouped.length === 0) return null
            return (
              <section key={group} className={styles.taskGroup} aria-labelledby={`task-group-${group}`}>
                <header><h4 id={`task-group-${group}`}>{group}</h4><span>{grouped.length} {grouped.length === 1 ? 'obligation' : 'obligations'}</span></header>
                <ul>{grouped.map((task) => {
                  const complete = locallyComplete.includes(task.id) || task.state === 'Complete'
                  const state = complete ? 'Complete' : task.state
                  return (
                    <li key={task.id} data-state={state}>
                      <span className={styles.taskIcon}><TaskIcon state={state} /></span>
                      <span className={styles.taskCopy}><strong>{task.title}</strong><small>{task.owner} · {task.due}</small><small>{task.evidence}</small></span>
                      <StateChip value={state} />
                      {readOnly || complete ? null : <Button type='button' variant='outline' size='sm' onClick={() => onComplete(task)}>Review completion</Button>}
                    </li>
                  )
                })}</ul>
              </section>
            )
          })}
        </div>
      </section>
      <aside className={styles.proofBoundary}><ShieldCheck aria-hidden='true' /><div><strong>Completion has a boundary</strong><p>Marking an obligation complete records the configured evidence. It does not itself prove an external signature, payment, publication, or email delivery.</p></div></aside>
      <footer className={styles.detailActions}>
        <div><strong>{record.next}</strong><small>{readOnly ? 'Your role can read this plan but cannot change it.' : 'The next action stays with the named owner.'}</small></div>
        <Button type='button' variant='outline'><Mail aria-hidden='true' />Open correspondence</Button>
        {readOnly ? null : <Button type='button'><ArrowRight aria-hidden='true' />Open next obligation</Button>}
      </footer>
    </article>
  )
}

function OrganizationMessagesDeliveryExperience({ selectedOnly }: { selectedOnly: boolean }) {
  const [direction, setDirection] = useState<Direction>('outcome')
  const [surface, setSurface] = useState<Surface>('messages')
  const [fixture, setFixture] = useState<Fixture>('message-partial')
  const [query, setQuery] = useState('')
  const [selectedMessage, setSelectedMessage] = useState(baseMessages[0]!.id)
  const [selectedWork, setSelectedWork] = useState(baseDelivery[0]!.id)
  const [confirmSend, setConfirmSend] = useState(false)
  const [completionTask, setCompletionTask] = useState<DeliveryTask | null>(null)
  const [locallyComplete, setLocallyComplete] = useState<string[]>([])
  const [reviewStatus, setReviewStatus] = useState('')
  const [mobileDetail, setMobileDetail] = useState(false)
  const mobileBackRef = useRef<HTMLButtonElement>(null)
  const role = roleForFixture(fixture)
  const activeDirection: Direction = selectedOnly ? 'outcome' : direction

  const messages = useMemo(() => messagesForFixture(fixture).filter((item) => `${item.subject} ${item.opportunity} ${item.purpose}`.toLowerCase().includes(query.toLowerCase())), [fixture, query])
  const selectedMessageRecord = messages.find((item) => item.id === selectedMessage) ?? messages[0]
  const recipients = useMemo(() => recipientsForFixture(fixture), [fixture])
  const delivery = useMemo(() => deliveryForFixture(fixture).filter((item) => `${item.work} ${item.submitter} ${item.opportunity}`.toLowerCase().includes(query.toLowerCase())), [fixture, query])
  const selectedDeliveryRecord = delivery.find((item) => item.id === selectedWork) ?? delivery[0]
  const tasks = useMemo(() => tasksForFixture(fixture), [fixture])

  useEffect(() => {
    if (mobileDetail && window.matchMedia('(max-width: 860px)').matches) mobileBackRef.current?.focus()
  }, [mobileDetail, selectedMessage, selectedWork, surface])

  const returnToQueue = () => {
    setMobileDetail(false)
    window.requestAnimationFrame(() => {
      const label = surface === 'messages' ? 'Message ledger' : 'Accepted Work delivery inventory'
      document.querySelector<HTMLButtonElement>(`section[aria-label="${label}"] button[data-selected="true"]`)?.focus()
    })
  }

  return (
    <div className={styles.pageShell}>
      <ReviewBar direction={activeDirection} selectedOnly={selectedOnly} setDirection={setDirection} surface={surface} setSurface={(next) => { setSurface(next); setQuery(''); setReviewStatus(''); setMobileDetail(false) }} fixture={fixture} setFixture={(next) => { setFixture(next); setQuery(''); setReviewStatus(''); setLocallyComplete([]); setMobileDetail(false) }} />
      <AppHeader />
      <DirectionIntro direction={activeDirection} />
      <OrganizationBar surface={surface} role={role} />
      <main id='main-content' className={styles.main} data-mobile-detail={mobileDetail}>
        <SurfaceHeader surface={surface} role={role} />
        <FixtureAlert fixture={fixture} />
        {reviewStatus ? <div className={styles.reviewStatus} role='status'><Check aria-hidden='true' />{reviewStatus}</div> : null}
        <QueueToolbar surface={surface} query={query} setQuery={setQuery} />
        {surface === 'messages' ? (
          messages.length === 0 ? <EmptyState surface='messages' /> : (
            <div className={styles.workbench} data-direction={activeDirection} data-mobile-detail={mobileDetail}>
              <MessageQueue records={messages} selected={selectedMessageRecord!.id} setSelected={(id) => { setSelectedMessage(id); setReviewStatus(''); setMobileDetail(true) }} />
              <MessageDetail record={selectedMessageRecord!} fixture={fixture} recipients={recipients} role={role} onOpenConfirm={() => setConfirmSend(true)} onBack={returnToQueue} backButtonRef={mobileBackRef} />
            </div>
          )
        ) : (
          delivery.length === 0 ? <EmptyState surface='delivery' /> : (
            <div className={styles.workbench} data-direction={activeDirection} data-mobile-detail={mobileDetail}>
              <DeliveryQueue records={delivery} selected={selectedDeliveryRecord!.id} setSelected={(id) => { setSelectedWork(id); setReviewStatus(''); setMobileDetail(true) }} role={role} />
              <DeliveryDetail record={selectedDeliveryRecord!} tasks={tasks} fixture={fixture} role={role} locallyComplete={locallyComplete} onComplete={setCompletionTask} onBack={returnToQueue} backButtonRef={mobileBackRef} />
            </div>
          )
        )}
        <aside className={styles.reviewBoundary} aria-label='Local review boundary'><ShieldCheck aria-hidden='true' /><div><strong>Local premium-library review</strong><p>Option 2 is selected. These fixtures do not send messages, change decisions, complete tasks, or touch product routes.</p></div></aside>
      </main>

      <AlertDialog open={confirmSend} onOpenChange={setConfirmSend}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Review the unresolved recipients</AlertDialogTitle><AlertDialogDescription>This local fixture would retry only recipients whose current state is unresolved. It would not resend to recipients already recorded as sent or delivered.</AlertDialogDescription></AlertDialogHeader>
          <div className={styles.dialogFacts}><p><strong>2</strong> unresolved recipients</p><p><strong>22</strong> already sent</p><p><strong>0</strong> duplicate sends queued</p></div>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => setReviewStatus('Local review completed. No message was sent.')}>Confirm review</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(completionTask)} onOpenChange={(open) => { if (!open) setCompletionTask(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Record this obligation as complete?</AlertDialogTitle><AlertDialogDescription>{completionTask?.title}. The configured evidence is “{completionTask?.evidence}”. This does not claim an external payment, signature, publication, or delivery receipt unless that evidence is present.</AlertDialogDescription></AlertDialogHeader>
          <div className={styles.evidenceBox}><Receipt aria-hidden='true' /><div><strong>Completion evidence</strong><p>{completionTask?.evidence}</p></div></div>
          <AlertDialogFooter><AlertDialogCancel>Keep open</AlertDialogCancel><AlertDialogAction onClick={() => { if (completionTask) setLocallyComplete((current) => [...new Set([...current, completionTask.id])]); setReviewStatus('Obligation marked complete in this local fixture only.'); setCompletionTask(null) }}>Record completion</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export function OrganizationMessagesDeliveryDirections() {
  return <OrganizationMessagesDeliveryExperience selectedOnly={false} />
}

export function OrganizationMessagesDeliverySelected() {
  return <OrganizationMessagesDeliveryExperience selectedOnly />
}
