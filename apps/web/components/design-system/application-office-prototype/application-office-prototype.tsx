'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Clock3,
  Compass,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  Fingerprint,
  FolderKanban,
  GitCompareArrows,
  Globe2,
  Info,
  Library,
  Link2,
  ListChecks,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  Map,
  MessageSquare,
  MoreHorizontal,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightOpen,
  Play,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkle,
  Upload,
  X,
} from 'lucide-react'

import { MissaWordmark } from '@/components/missa-wordmark'
import styles from './application-office-prototype.module.css'

type ViewId = 'overview' | 'for-you' | 'notifications' | 'pipeline' | 'calendar' | 'submissions' | 'work' | 'messages' | 'archive' | 'map' | 'compile' | 'graph' | 'workspace' | 'budget' | 'review' | 'impact' | 'bridge'

type AppState = {
  practice: 'Writer' | 'Musician' | 'Writer + Musician'
  project: 'Saltwater Lessons' | 'The Tidal Archive'
  compiled: boolean
  workMatched: boolean
  budgetComplete: boolean
  versionAccepted: boolean
  filledFields: number
  submitted: boolean
  receipt: string
}

type FinalActionContext =
  | { kind: 'publication'; organizationName: string }
  | { kind: 'application'; opportunityName: string }
  | { kind: 'external'; platformName: string }

function getFinalActionLabel(context: FinalActionContext) {
  if (context.kind === 'publication') return `Submit to ${context.organizationName}`
  if (context.kind === 'application') return `Apply for ${context.opportunityName}`
  return `Continue on ${context.platformName}`
}

const northRiverFinalAction: FinalActionContext = {
  kind: 'publication',
  organizationName: 'North River Review',
}

const applicationViews: Array<{ id: ViewId; label: string; shortLabel: string; eyebrow: string }> = [
  { id: 'compile', label: 'Compile Preview', shortLabel: 'Compile', eyebrow: 'See the work before committing' },
  { id: 'graph', label: 'Living Graph', shortLabel: 'Graph', eyebrow: 'One application, every dependency' },
  { id: 'workspace', label: 'Component Workspace', shortLabel: 'Work', eyebrow: 'Resolve one component in context' },
  { id: 'budget', label: 'Budget', shortLabel: 'Budget', eyebrow: 'Balance the complete project plan' },
  { id: 'review', label: 'Review and Submit', shortLabel: 'Review', eyebrow: 'Confirm the evidence before sending' },
  { id: 'impact', label: 'Change Impact', shortLabel: 'Change', eyebrow: 'Review what changed before accepting it' },
  { id: 'bridge', label: 'Apply Bridge', shortLabel: 'Bridge', eyebrow: 'Carry reviewed work to its destination' },
]

const prototypeViews: Array<{ id: ViewId; label: string }> = [
  { id: 'overview', label: 'Tracker overview' },
  { id: 'for-you', label: 'For you' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'graph', label: 'Application workspace' },
  { id: 'budget', label: 'Application budget' },
  { id: 'review', label: 'Review and submit' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'messages', label: 'Messages' },
]

const applicationViewIds = new Set<ViewId>(applicationViews.map((view) => view.id))
const allViewIds = new Set<ViewId>(['overview', 'for-you', 'notifications', 'pipeline', 'calendar', 'submissions', 'work', 'messages', 'archive', 'map', ...applicationViews.map((view) => view.id)])

const initialState: AppState = {
  practice: 'Writer + Musician',
  project: 'Saltwater Lessons',
  compiled: false,
  workMatched: false,
  budgetComplete: false,
  versionAccepted: false,
  filledFields: 0,
  submitted: false,
  receipt: '',
}

const graphNodes = [
  { id: 'eligibility', number: '01', label: 'Eligibility', detail: '2 of 3 known', state: 'unknown' },
  { id: 'project', number: '02', label: 'Project definition', detail: 'Profile + project', state: 'ready' },
  { id: 'narrative', number: '03', label: 'Narrative', detail: '2 answers to refine', state: 'active' },
  { id: 'budget', number: '04', label: 'Budget', detail: '1 category unknown', state: 'unknown' },
  { id: 'timeline', number: '05', label: 'Timeline', detail: '4 milestones projected', state: 'ready' },
  { id: 'samples', number: '06', label: 'Work samples', detail: '1 of 2 matched', state: 'active' },
  { id: 'compliance', number: '07', label: 'Compliance review', detail: 'Waits on 03, 04, 06', state: 'blocked' },
  { id: 'package', number: '08', label: 'Application package', detail: 'Not yet prepared', state: 'blocked' },
] as const

const primaryNav = ['Opportunities', 'Tracker', 'Library', 'Messages', 'Profile']

function StatusMark({ state }: { state: 'ready' | 'unknown' | 'active' | 'blocked' }) {
  if (state === 'ready') return <CheckCircle2 aria-hidden='true' />
  if (state === 'unknown') return <Info aria-hidden='true' />
  if (state === 'blocked') return <LockKeyhole aria-hidden='true' />
  return <CircleDot aria-hidden='true' />
}

function AppHeader({ current, submitted, onNavigate, onMenu }: { current: ViewId; submitted: boolean; onNavigate: (view: ViewId) => void; onMenu: () => void }) {
  const inApplication = applicationViewIds.has(current)
  return (
    <>
      <div className={styles.prototypeNotice} role='note'>
        <span><Sparkle aria-hidden='true' /> Interactive concept</span>
        <strong>Application data is not persisted</strong>
      </div>
      <header className={styles.appHeader}>
        <MissaWordmark href='/design-system' size='compact' className={styles.wordmark} />
        <nav aria-label='Primary navigation' className={styles.primaryNav}>
          {primaryNav.map((item) => (
            <button key={item} type='button' className={item === 'Tracker' ? styles.navActive : undefined}>{item}</button>
          ))}
        </nav>
        <button type='button' className={styles.profileButton} aria-label='Open account menu'>
          <span>NA</span>
          <small>Nasreen Adeyemi</small>
          <ChevronDown aria-hidden='true' />
        </button>
      </header>
      <div className={styles.opportunityBar}>
        <button type='button' className={styles.mobileMenuButton} onClick={onMenu} aria-label='Open Tracker menu'><Menu aria-hidden='true' /></button>
        <button type='button' className={styles.backButton} onClick={() => onNavigate('overview')}>{inApplication ? <><ArrowLeft aria-hidden='true' /> Tracker</> : <><LayoutDashboard aria-hidden='true' /> Tracker home</>}</button>
        <div className={styles.opportunityIdentity}>
          <strong>{inApplication ? 'North River Review' : 'Tracker — your private workbench'}</strong>
          <span>{inApplication ? `Call for submissions · ${submitted ? 'Submitted' : 'Draft'}` : <><CircleDot aria-hidden='true' /> 3 actions today</>}</span>
        </div>
        <div className={styles.deadline}><CalendarDays aria-hidden='true' /><span>{inApplication ? 'Due Aug 28 · 13 days left' : 'This week'}</span>{!inApplication ? <small>4 active dates</small> : null}</div>
        {inApplication ? <button type='button' className={styles.textButton}>View opportunity <ExternalLink aria-hidden='true' /></button> : <button type='button' className={styles.iconButton} aria-label='Open notifications' onClick={() => onNavigate('notifications')}><Bell aria-hidden='true' /><i className={styles.notificationDot} /></button>}
      </div>
    </>
  )
}

function TrackerRail({ current, onNavigate, collapsed, onToggle, mobileOpen, onClose }: { current: ViewId; onNavigate: (view: ViewId) => void; collapsed: boolean; onToggle: () => void; mobileOpen: boolean; onClose: () => void }) {
  const navigate = (view: ViewId) => { onNavigate(view); onClose() }
  const groups: Array<{ label: string; views: Array<{ id: ViewId; label: string; detail: string; icon: React.ReactNode }> }> = [
    { label: 'Focus', views: [
      { id: 'overview', label: 'Today', detail: 'Priority work and signals', icon: <LayoutDashboard aria-hidden='true' /> },
      { id: 'for-you', label: 'For you', detail: 'Personalized opportunities', icon: <Compass aria-hidden='true' /> },
      { id: 'notifications', label: 'Notifications', detail: 'Changes and reminders', icon: <Bell aria-hidden='true' /> },
    ] },
    { label: 'Run the work', views: [
      { id: 'pipeline', label: 'Pipeline', detail: 'Everything in motion', icon: <FolderKanban aria-hidden='true' /> },
      { id: 'graph', label: 'Applications', detail: 'Prepare and submit', icon: <ListChecks aria-hidden='true' /> },
      { id: 'calendar', label: 'Calendar', detail: 'Your time and deadlines', icon: <CalendarDays aria-hidden='true' /> },
      { id: 'work', label: 'Work', detail: 'Library connections', icon: <BriefcaseBusiness aria-hidden='true' /> },
    ] },
    { label: 'Relationships', views: [
      { id: 'messages', label: 'Messages', detail: 'DMs and email threads', icon: <MessageSquare aria-hidden='true' /> },
      { id: 'submissions', label: 'Submissions', detail: 'Receipts and outcomes', icon: <ReceiptText aria-hidden='true' /> },
      { id: 'archive', label: 'Archive', detail: 'History retained', icon: <Archive aria-hidden='true' /> },
    ] },
    { label: 'System', views: [
      { id: 'map', label: 'Tracker map', detail: 'Every section and contract', icon: <Map aria-hidden='true' /> },
    ] },
  ]
  return (
    <>
      {mobileOpen ? <button type='button' className={styles.drawerBackdrop} aria-label='Close Tracker menu' onClick={onClose} /> : null}
      <aside className={`${styles.officeRail} ${collapsed ? styles.officeRailCollapsed : ''} ${mobileOpen ? styles.officeRailOpen : ''}`} aria-label='Tracker views'>
      <div className={styles.officeBrand}>
        <span>Private workbench</span>
        <strong>Tracker</strong>
        <small>Nasreen Adeyemi</small>
        <button type='button' className={styles.railToggle} onClick={onToggle} aria-label={collapsed ? 'Expand Tracker menu' : 'Collapse Tracker menu'}>{collapsed ? <PanelLeftOpen aria-hidden='true' /> : <PanelLeftClose aria-hidden='true' />}<span>{collapsed ? 'Expand' : 'Collapse menu'}</span></button>
        <button type='button' className={styles.drawerClose} onClick={onClose} aria-label='Close Tracker menu'><X aria-hidden='true' /></button>
      </div>
      <nav className={styles.trackerNav}>
        {groups.map((group) => <section className={styles.railGroup} key={group.label}><h2>{group.label}</h2>{group.views.map((view) => {
          const selected = view.id === current || (view.id === 'graph' && applicationViewIds.has(current))
          return (
            <button
              key={view.id}
              type='button'
              className={selected ? styles.railActive : undefined}
              aria-current={selected ? 'page' : undefined}
              onClick={() => navigate(view.id)}
              title={collapsed ? view.label : undefined}
            >
              <span className={styles.railIcon}>{view.icon}</span>
              <span className={styles.railCopy}><strong>{view.label}</strong><small>{view.detail}</small></span>
            </button>
          )
        })}</section>)}
      </nav>
      {!collapsed && applicationViewIds.has(current) ? (
        <div className={styles.applicationSubnav}>
          <span>North River Review</span>
          {applicationViews.map((view, index) => <button type='button' key={view.id} aria-current={current === view.id ? 'step' : undefined} onClick={() => navigate(view.id)}><small>{String(index + 1).padStart(2, '0')}</small><strong>{view.shortLabel}</strong></button>)}
        </div>
      ) : null}
      <div className={styles.officeBoundary}>
        <ShieldCheck aria-hidden='true' />
        <div><strong>Prepared is not submitted.</strong><span>Tracker stops before protected actions.</span></div>
      </div>
      </aside>
    </>
  )
}

function SectionHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <header className={styles.sectionHeading}>
      <div>
        <p>{eyebrow}</p>
        <h1 tabIndex={-1}>{title}</h1>
        <span>{description}</span>
      </div>
      {action ? <div className={styles.headingAction}>{action}</div> : null}
    </header>
  )
}

const trackerItems = [
  { title: 'North River Review', organization: 'North River Review', stage: 'Preparing', deadline: 'Aug 28', work: 'Saltwater Lessons', tone: 'active' },
  { title: 'Headlands Artist Residency', organization: 'Headlands Center', stage: 'Interested', deadline: 'Sep 11', work: 'The Tidal Archive', tone: 'quiet' },
  { title: 'Listening Futures Fund', organization: 'Sound & Society', stage: 'Submitted', deadline: 'Oct 06', work: 'Saltwater Lessons', tone: 'ready' },
  { title: 'Coastal Stories Commission', organization: 'Field Notes Press', stage: 'Outcome', deadline: 'Oct 21', work: 'Low Tide Choir', tone: 'unknown' },
] as const

function TrackerOverview({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  return (
    <div className={styles.view} data-view='overview'>
      <SectionHeading eyebrow='Sunday · August 16' title='Your workbench, already oriented.' description='Tracker brings active opportunities, application work, dates, submissions, and Work connections into one private operating view.' action={<button type='button' className={styles.primaryButton} onClick={() => onNavigate('pipeline')}>Open pipeline <ArrowRight aria-hidden='true' /></button>} />
      <div className={styles.overviewMetrics}>
        <button type='button' onClick={() => onNavigate('pipeline')}><span>Active</span><strong>7</strong><small>2 need attention</small></button>
        <button type='button' onClick={() => onNavigate('graph')}><span>Preparing</span><strong>2</strong><small>1 on critical path</small></button>
        <button type='button' onClick={() => onNavigate('calendar')}><span>This week</span><strong>4</strong><small>dates and sessions</small></button>
        <button type='button' onClick={() => onNavigate('submissions')}><span>Awaiting response</span><strong>3</strong><small>receipts retained</small></button>
      </div>
      <div className={styles.overviewGrid}>
        <section className={styles.todayPanel} aria-labelledby='today-title'>
          <header><div><p>Today</p><h2 id='today-title'>Three useful moves</h2></div><span>42 min planned</span></header>
          <ol>
            <li><button type='button' onClick={() => onNavigate('workspace')}><span>01</span><div><strong>Choose the second work sample</strong><small>North River Review · unblocks compliance review</small></div><ArrowRight aria-hidden='true' /></button></li>
            <li><button type='button' onClick={() => onNavigate('impact')}><span>02</span><div><strong>Review one source change</strong><small>File limit changed from 25 MB to 10 MB</small></div><ArrowRight aria-hidden='true' /></button></li>
            <li><button type='button' onClick={() => onNavigate('calendar')}><span>03</span><div><strong>Place two proposed work sessions</strong><small>Nothing is added until you approve the schedule</small></div><ArrowRight aria-hidden='true' /></button></li>
          </ol>
        </section>
        <aside className={styles.deskBrief}>
          <p>Tracker brief</p><strong>North River Review is the highest-leverage application today.</strong><span>One Work decision unlocks the final compliance pass. The deadline still fits your current plan.</span>
          <div><RefreshCw aria-hidden='true' /><p><strong>Reuse signal</strong><span>Your short biography is used in three active applications.</span></p></div>
          <button type='button' onClick={() => onNavigate('graph')}>Open application graph <ArrowRight aria-hidden='true' /></button>
        </aside>
      </div>
      <section className={styles.activeDesk} aria-labelledby='active-desk-title'>
        <header><div><p>In motion</p><h2 id='active-desk-title'>Active pipeline</h2></div><button type='button' onClick={() => onNavigate('pipeline')}>See all 7 <ArrowRight aria-hidden='true' /></button></header>
        <div>{trackerItems.slice(0, 3).map((item) => <button type='button' key={item.title} onClick={() => item.stage === 'Preparing' ? onNavigate('graph') : onNavigate('pipeline')}><span className={styles[`itemTone_${item.tone}`]}>{item.stage}</span><strong>{item.title}</strong><small>{item.organization}</small><div><span>{item.deadline}</span><span>{item.work}</span></div></button>)}</div>
      </section>
    </div>
  )
}

function PersonalizedOpportunities({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  const [saved, setSaved] = useState<string[]>(['Nightjar Multidisciplinary Award'])
  const opportunities = [
    { title: 'Atlantic Ecologies Fellowship', organization: 'Common Shore Institute', deadline: 'Sep 24', fit: 'Essay + sound practice', availability: 'Fits your September window', note: 'International applicants · no fee' },
    { title: 'Nightjar Multidisciplinary Award', organization: 'Nightjar Foundation', deadline: 'Oct 03', fit: 'Field recording + installation', availability: 'Uses The Tidal Archive', note: 'Project support · $18,000' },
    { title: 'Public Memory Commission', organization: 'Harbor Arts Council', deadline: 'Oct 18', fit: 'Coastal memory theme', availability: 'Remote first round', note: 'Commission · fee not stated' },
  ]
  const toggle = (title: string) => setSaved((items) => items.includes(title) ? items.filter((item) => item !== title) : [...items, title])
  return (
    <div className={styles.view} data-view='for-you'>
      <SectionHeading eyebrow='For you' title='Opportunities shaped around your actual work.' description='Recommendations combine your practices, Work, eligibility, availability, geography, and past decisions. Each factor stays independently adjustable.' action={<button type='button' className={styles.secondaryButton}><SlidersHorizontal aria-hidden='true' /> Tune recommendations</button>} />
      <div className={styles.personalizationBar}><Compass aria-hidden='true' /><div><strong>Current lens: writer + musician</strong><span>Saltwater Lessons · international · no-fee preferred · available September–October</span></div><button type='button'>Edit lens</button></div>
      <div className={styles.opportunityRecommendations}>{opportunities.map((item) => <article key={item.title}><div className={styles.recommendationMeta}><span>Personalized opportunity</span><time>{item.deadline}</time></div><h2>{item.title}</h2><p>{item.organization}</p><dl><div><dt>Practice</dt><dd>{item.fit}</dd></div><div><dt>Timing</dt><dd>{item.availability}</dd></div><div><dt>Terms</dt><dd>{item.note}</dd></div></dl><div className={styles.recommendationActions}><button type='button' className={saved.includes(item.title) ? styles.primaryButton : styles.secondaryButton} onClick={() => toggle(item.title)}>{saved.includes(item.title) ? <><Check aria-hidden='true' /> In Tracker</> : <>Add to Tracker <ArrowRight aria-hidden='true' /></>}</button><button type='button' className={styles.textButton} onClick={() => onNavigate('pipeline')}>View opportunity</button></div></article>)}</div>
      <p className={styles.personalizationBoundary}>Tracker explains the matching inputs it used. It does not predict acceptance, invent eligibility, or collapse separate preferences into one opaque score.</p>
    </div>
  )
}

function TrackerNotifications({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  const [allRead, setAllRead] = useState(false)
  const notifications = [
    { type: 'Change', title: 'North River Review changed its file-size limit', detail: 'Two application components may be affected.', time: '18 min', view: 'impact' as ViewId },
    { type: 'Message', title: 'Amina at Sound & Society replied', detail: '“Yes, collaborative field recordings are eligible.”', time: '2 h', view: 'messages' as ViewId },
    { type: 'Calendar', title: 'One proposed work session needs approval', detail: 'Wednesday at 2:30 PM · 45 minutes.', time: '5 h', view: 'calendar' as ViewId },
    { type: 'Opportunity', title: 'Atlantic Ecologies Fellowship matches your lens', detail: 'International · no fee · September window.', time: 'Yesterday', view: 'for-you' as ViewId },
  ]
  return (
    <div className={styles.view} data-view='notifications'>
      <SectionHeading eyebrow='Notifications' title='What changed, what matters, what can wait.' description='Tracker groups source changes, messages, reminders, and opportunity signals by consequence—not by whichever system emitted them.' action={<button type='button' className={styles.secondaryButton} onClick={() => setAllRead(true)}><Check aria-hidden='true' /> Mark all read</button>} />
      <div className={styles.notificationFilters}><button type='button' aria-pressed='true'>Needs attention <span>{allRead ? 0 : 2}</span></button><button type='button'>Changes</button><button type='button'>Messages</button><button type='button'>Upcoming</button></div>
      <section className={styles.notificationList}>{notifications.map((item, index) => <button type='button' key={item.title} onClick={() => onNavigate(item.view)} className={!allRead && index < 2 ? styles.notificationUnread : undefined}><span className={styles.notificationType}>{item.type}</span><div><strong>{item.title}</strong><small>{item.detail}</small></div><time>{item.time}</time><ArrowRight aria-hidden='true' /></button>)}</section>
    </div>
  )
}

function TrackerMessages() {
  const threads = [
    { id: 'sound', person: 'Amina Bello', organization: 'Sound & Society', subject: 'Eligibility question', preview: 'Yes, collaborative field recordings are eligible.', unread: true },
    { id: 'headlands', person: 'Headlands team', organization: 'Headlands Center', subject: 'Residency access needs', preview: 'Thanks for sharing your access requirements.', unread: false },
    { id: 'north', person: 'North River Review', organization: 'North River Review', subject: 'Application confirmation', preview: 'Your draft remains available until August 28.', unread: false },
  ]
  const [selected, setSelected] = useState('sound')
  const [draft, setDraft] = useState('Thank you — that answers my question.')
  const [sent, setSent] = useState(false)
  const thread = threads.find((item) => item.id === selected) ?? threads[0]
  return (
    <div className={styles.view} data-view='messages'>
      <SectionHeading eyebrow='Messages' title='Conversations stay attached to the work.' description='Direct messages, forwarded email, and provider replies retain their opportunity, application, Work, and submission context.' action={<button type='button' className={styles.secondaryButton}><Search aria-hidden='true' /> Search messages</button>} />
      <div className={styles.messageWorkspace}>
        <aside aria-label='Message threads'><header><strong>Inbox</strong><span>1 unread</span></header>{threads.map((item) => <button type='button' key={item.id} onClick={() => { setSelected(item.id); setSent(false) }} aria-pressed={selected === item.id}><span className={styles.messageAvatar}>{item.person.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><div><strong>{item.person}{item.unread ? <i /> : null}</strong><small>{item.subject}</small><span>{item.preview}</span></div></button>)}</aside>
        <section aria-labelledby='thread-title'><header><div><p>{thread.organization}</p><h2 id='thread-title'>{thread.subject}</h2></div><button type='button' className={styles.iconButton}><MoreHorizontal aria-hidden='true' /></button></header><div className={styles.threadBody}><article><span>{thread.person}</span><p>{thread.preview}</p><time>Today · 9:14 AM</time></article>{sent ? <article className={styles.myMessage}><span>You</span><p>{draft}</p><time>Just now · prototype only</time></article> : null}<div className={styles.threadContext}><Link2 aria-hidden='true' /><span><strong>Linked context</strong>Listening Futures Fund · Eligibility · application revision 1</span></div></div><div className={styles.messageComposer}><textarea aria-label='Write a reply' value={draft} onChange={(event) => { setDraft(event.target.value); setSent(false) }} /><button type='button' className={styles.primaryButton} disabled={!draft.trim()} onClick={() => setSent(true)}><Send aria-hidden='true' /> Send reply</button><small>Prototype only. No message is sent.</small></div></section>
      </div>
    </div>
  )
}

function TrackerMap() {
  const contracts = [
    ['Today', 'Chooses the highest-leverage private actions across Tracker.', 'Signals, deadlines, messages, availability', 'Source records or provider state'],
    ['For you', 'Personalizes opportunities from explicit creator and Work inputs.', 'Profile lens, Work, eligibility, preferences', 'Acceptance likelihood or invented facts'],
    ['Notifications', 'Prioritizes changes, replies, reminders, and opportunity signals.', 'Event intents from every Tracker room', 'Canonical opportunity or message content'],
    ['Pipeline', 'Owns the creator’s relationship and status for each opportunity.', 'Tracked opportunity, status, notes, imports', 'Organization facts or master Work files'],
    ['Applications', 'Owns preparation graphs, responses, versions, requirements, and handoff.', 'Opportunity version, Profile facts, Work selections', 'Protected actions or final submission authority'],
    ['Calendar', 'Keeps Missa dates canonical and projects creator-approved events.', 'Official deadlines, response windows, time zone, availability, connection status', 'Provider delivery, refresh, or private-calendar access without proof'],
    ['Work', 'Shows where Library Work and versions are being used.', 'Library references and submission snapshots', 'Master files, Work identity, or public presentation'],
    ['Messages', 'Keeps DMs and email threads attached to opportunity context.', 'Provider messages, forwarded email, replies', 'Eligibility or outcome facts until confirmed'],
    ['Submissions', 'Retains receipts, snapshots, decisions, outcomes, and follow-up.', 'Provider proof and creator-recorded external submissions', 'A claim of submission without proof'],
    ['Archive', 'Removes inactive records from focus without deleting history.', 'Closed and archived Tracker relationships', 'Destructive erasure of activity history'],
    ['Profile boundary', 'Supplies identity, practice, preferences, access needs, and availability.', 'Creator-controlled facts', 'Per-opportunity workflow or submission history'],
    ['Library boundary', 'Supplies Work identity, files, versions, rights, and presentation.', 'Creator-controlled Work records', 'Opportunity status or application decisions'],
  ]
  return (
    <div className={styles.view} data-view='map'>
      <SectionHeading eyebrow='Tracker map · prototype contract' title='Every room, with a clear job.' description='Tracker behaves like a complete office because each section owns one kind of work and hands context to the next without becoming a second source of truth.' action={<span className={styles.privateBadge}><Map aria-hidden='true' /> 12 contracts</span>} />
      <div className={styles.contractLegend}><span><strong>Owns</strong> what this room is responsible for</span><span><strong>Receives</strong> the context it may use</span><span><strong>Never</strong> the boundary it must not cross</span></div>
      <div className={styles.contractGrid}>{contracts.map(([name, owns, receives, never], index) => <article key={name}><span>{String(index + 1).padStart(2, '0')}</span><h2>{name}</h2><dl><div><dt>Owns</dt><dd>{owns}</dd></div><div><dt>Receives</dt><dd>{receives}</dd></div><div><dt>Never</dt><dd>{never}</dd></div></dl></article>)}</div>
    </div>
  )
}

function TrackerPipeline({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  const [mode, setMode] = useState<'board' | 'list'>('board')
  const [scope, setScope] = useState<'All' | 'Writing' | 'Music'>('All')
  const stages = ['Interested', 'Preparing', 'Submitted', 'Outcome'] as const
  return (
    <div className={styles.view} data-view='pipeline'>
      <SectionHeading eyebrow='Pipeline' title='Everything in motion, by stage.' description='Status, deadlines, Work links, imports, conflicts, and next actions stay attached to the creator’s relationship with each opportunity.' action={<button type='button' className={styles.primaryButton}>Add opportunity <ArrowRight aria-hidden='true' /></button>} />
      <div className={styles.pipelineToolbar}>
        <div className={styles.segmented}>{(['All', 'Writing', 'Music'] as const).map((item) => <button type='button' key={item} aria-pressed={scope === item} onClick={() => setScope(item)}>{item}</button>)}</div>
        <div><button type='button' className={styles.iconTextButton}><SlidersHorizontal aria-hidden='true' /> Filters</button><div className={styles.segmented}><button type='button' aria-pressed={mode === 'board'} onClick={() => setMode('board')}>Board</button><button type='button' aria-pressed={mode === 'list'} onClick={() => setMode('list')}>List</button></div></div>
      </div>
      {mode === 'board' ? <div className={styles.pipelineBoard}>{stages.map((stage) => <section key={stage}><header><strong>{stage}</strong><span>{trackerItems.filter((item) => item.stage === stage).length}</span></header>{trackerItems.filter((item) => item.stage === stage).map((item) => <button type='button' key={item.title} onClick={() => item.stage === 'Preparing' ? onNavigate('graph') : undefined}><small>{item.organization}</small><strong>{item.title}</strong><div><span>{item.deadline}</span><span>{item.work}</span></div>{item.stage === 'Preparing' ? <em>Next: choose work sample</em> : null}</button>)}</section>)}</div> : <div className={styles.pipelineList}>{trackerItems.map((item) => <button type='button' key={item.title} onClick={() => item.stage === 'Preparing' ? onNavigate('graph') : undefined}><span className={styles[`itemTone_${item.tone}`]}>{item.stage}</span><strong>{item.title}</strong><span>{item.organization}</span><span>{item.work}</span><time>{item.deadline}</time><ArrowRight aria-hidden='true' /></button>)}</div>}
      <p className={styles.prototypeFilterNote}>Prototype filter: {scope}. The sample inventory is intentionally small; production Tracker retains independent type, organization, status, Work, and archive controls.</p>
    </div>
  )
}

type CalendarProvider = 'google' | 'outlook' | 'feed'
type CalendarDialogMode = 'closed' | 'event' | 'sync'
type CalendarDialogResult = 'idle' | 'connected' | 'feed-ready' | 'download-ready'

function TrackerCalendar({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  const [dialogMode, setDialogMode] = useState<CalendarDialogMode>('closed')
  const [dialogResult, setDialogResult] = useState<CalendarDialogResult>('idle')
  const [provider, setProvider] = useState<CalendarProvider>('google')
  const [connection, setConnection] = useState<CalendarProvider | null>(null)
  const [updatePolicy, setUpdatePolicy] = useState<'ask' | 'automatic'>('ask')
  const [deadlineAdded, setDeadlineAdded] = useState(false)

  const providerName = connection === 'google' ? 'Google Calendar' : connection === 'outlook' ? 'Outlook Calendar' : connection === 'feed' ? 'calendar feed' : 'calendar'
  const hasDirectConnection = connection === 'google' || connection === 'outlook'
  const openDialog = (mode: Exclude<CalendarDialogMode, 'closed'>) => { setDialogMode(mode); setDialogResult('idle') }
  const closeDialog = () => { setDialogMode('closed'); setDialogResult('idle') }

  return (
    <div className={styles.view} data-view='calendar'>
      <SectionHeading eyebrow='Calendar' title='Dates and work sessions in one place.' description='Missa keeps the source date in Tracker. You choose what is added to another calendar and how later changes are handled.' action={<button type='button' className={styles.secondaryButton} onClick={() => openDialog('sync')}><CalendarDays aria-hidden='true' /> {connection ? 'Calendar settings' : 'Connect calendar'}</button>} />
      <section className={styles.calendarConnection} aria-label='Calendar connection status'>
        <div className={connection ? styles.calendarConnectedIcon : styles.calendarDisconnectedIcon}>{connection ? <CheckCircle2 aria-hidden='true' /> : <Link2 aria-hidden='true' />}</div>
        <div><span>{connection ? `${providerName} connected` : 'No calendar connected'}</span><strong>{connection === 'feed' ? 'Tracked deadlines are included in a private subscription.' : connection ? 'Approved Missa events can be added in one click.' : 'Tracker still keeps every deadline and reminder in Missa.'}</strong><p>{connection === 'feed' ? 'This is a one-way subscription. Your calendar app controls when updates appear.' : connection ? `Deadline changes will ${updatePolicy === 'ask' ? 'wait for your approval' : 'update approved events automatically'}.` : 'Connect a calendar for one-click adds, or download individual calendar files.'}</p></div>
        <button type='button' onClick={() => openDialog('sync')}>{connection ? 'Manage' : 'Choose calendar'} <ArrowRight aria-hidden='true' /></button>
      </section>
      <div className={styles.personalizationBar}><Clock3 aria-hidden='true' /><div><strong>Your planning lens: Tuesday and Thursday afternoons</strong><span>America/Los_Angeles · 45-minute focus blocks · protect Monday mornings · teaching hours excluded</span></div><button type='button'>Edit availability</button></div>
      <div className={styles.calendarWorkspace}>
        <section><header><div><p>August 17–23</p><h2>This week</h2></div><span>4 items</span></header><div className={styles.weekStrip}>{['Mon 17', 'Tue 18', 'Wed 19', 'Thu 20', 'Fri 21', 'Sat 22', 'Sun 23'].map((day, index) => <button type='button' key={day} className={index === 2 ? styles.dayActive : undefined}><span>{day.split(' ')[0]}</span><strong>{day.split(' ')[1]}</strong>{index === 1 || index === 2 || index === 4 ? <i /> : null}</button>)}</div><ol className={styles.calendarAgenda}><li><time>Tue · 10:00</time><button type='button' onClick={() => onNavigate('workspace')}><strong>Work sample review</strong><span>North River Review · 45 min proposal</span></button></li><li><time>Wed · 14:30</time><button type='button' onClick={() => onNavigate('impact')}><strong>Compliance change review</strong><span>Proposed · not added to your calendar</span></button></li><li><time>Fri · all day</time><button type='button'><strong>Headlands residency deadline</strong><span>Official opportunity date</span></button></li></ol></section>
        <aside><p>Schedule proposal</p><h2>The critical path still fits.</h2><span>Tracker found three focused sessions before Aug 28. Approving creates private events; declining leaves the application unchanged.</span><div><strong>2 h 20 min</strong><small>estimated preparation time</small></div><button type='button' className={styles.primaryButton}>Review proposed sessions</button><button type='button' className={styles.textButton}>Keep planning manually</button></aside>
      </div>
      <section className={styles.upcomingDeadline} aria-labelledby='upcoming-deadline-title'>
        <div className={styles.deadlineDate}><span>Aug</span><strong>28</strong><small>2026</small></div>
        <div><p>Upcoming deadline</p><h2 id='upcoming-deadline-title'>North River Review</h2><span>Call for submissions · Official opportunity date</span><div className={styles.deadlineEvidence}><Info aria-hidden='true' /><span><strong>Time not provided by North River Review</strong>Missa will use an all-day event and keep the opportunity link with it.</span></div></div>
        <div className={styles.deadlineCalendarAction}><span>{connection === 'feed' ? 'Included in Missa Deadlines feed' : deadlineAdded ? `Added to ${providerName}` : connection ? `Ready for ${providerName}` : 'Not added to another calendar'}</span><button type='button' className={styles.primaryButton} onClick={() => openDialog('event')}>{connection === 'feed' ? 'Review calendar feed' : deadlineAdded ? 'Review calendar event' : 'Add deadline to calendar'} <ArrowRight aria-hidden='true' /></button></div>
      </section>

      {dialogMode !== 'closed' ? (
        <div className={styles.modalBackdrop} role='presentation' onMouseDown={(event) => { if (event.currentTarget === event.target) closeDialog() }}>
          <section className={`${styles.proofDialog} ${styles.calendarDialog}`} role='dialog' aria-modal='true' aria-labelledby='calendar-dialog-title'>
            <button type='button' className={styles.dialogClose} onClick={closeDialog} aria-label='Close calendar dialog'><X aria-hidden='true' /></button>
            <CalendarDays aria-hidden='true' className={styles.dialogIcon} />

            {dialogMode === 'sync' && dialogResult === 'idle' ? (
              <>
                <p>Calendar connection</p><h2 id='calendar-dialog-title'>Keep deadlines where you plan</h2><span>Choose how Missa should place approved deadlines and work sessions in your calendar.</span>
                <div className={styles.calendarProviderList} role='radiogroup' aria-label='Calendar connection method'>
                  <button type='button' role='radio' aria-checked={provider === 'google'} onClick={() => setProvider('google')}><span>Google Calendar<strong>Add and update approved Missa events</strong></span><small>Connected calendar</small></button>
                  <button type='button' role='radio' aria-checked={provider === 'outlook'} onClick={() => setProvider('outlook')}><span>Outlook Calendar<strong>Add and update approved Missa events</strong></span><small>Connected calendar</small></button>
                  <button type='button' role='radio' aria-checked={provider === 'feed'} onClick={() => setProvider('feed')}><span>Apple and other calendars<strong>Subscribe to the Missa Deadlines feed</strong></span><small>One-way feed</small></button>
                </div>
                {provider !== 'feed' ? <fieldset className={styles.calendarUpdatePolicy}><legend>When an official deadline changes</legend><label><input type='radio' name='update-policy' checked={updatePolicy === 'ask'} onChange={() => setUpdatePolicy('ask')} /><span><strong>Ask me before updating</strong>See the source change before Missa updates the calendar event.</span></label><label><input type='radio' name='update-policy' checked={updatePolicy === 'automatic'} onChange={() => setUpdatePolicy('automatic')} /><span><strong>Keep approved events updated</strong>Update only calendar events previously created by Missa.</span></label></fieldset> : <div className={styles.calendarLimit}><Info aria-hidden='true' /><span><strong>Your calendar app controls refresh timing.</strong>Feed changes may not appear immediately. Missa reminders remain available in Tracker.</span></div>}
                <div className={styles.calendarPrivacy}><ShieldCheck aria-hidden='true' /><span><strong>Missa requests the smallest useful access.</strong>{provider === 'feed' ? 'The feed is private and one-way. It does not let Missa read your calendar.' : 'Missa creates and updates only the events you approve. Reading private calendar events is a separate permission.'}</span></div>
                <div className={styles.dialogActions}><button type='button' className={styles.secondaryButton} onClick={closeDialog}>Not now</button><button type='button' className={styles.primaryButton} onClick={() => { setConnection(provider); setDialogResult(provider === 'feed' ? 'feed-ready' : 'connected') }}>{provider === 'feed' ? 'Set up calendar feed' : `Connect ${provider === 'google' ? 'Google Calendar' : 'Outlook Calendar'}`}</button></div>
              </>
            ) : null}

            {dialogMode === 'sync' && dialogResult === 'connected' ? <div className={styles.calendarDialogResult} aria-live='polite'><CheckCircle2 aria-hidden='true' /><p>Calendar connected</p><h2 id='calendar-dialog-title'>{provider === 'google' ? 'Google Calendar' : 'Outlook Calendar'} is ready</h2><span>Missa can add or update only the events you approve. No existing calendar events were imported.</span><div><button type='button' className={styles.primaryButton} onClick={() => openDialog('event')}>Add North River Review deadline</button><button type='button' className={styles.secondaryButton} onClick={closeDialog}>Done</button></div></div> : null}

            {dialogMode === 'sync' && dialogResult === 'feed-ready' ? <div className={styles.calendarDialogResult} aria-live='polite'><Link2 aria-hidden='true' /><p>Calendar feed ready</p><h2 id='calendar-dialog-title'>Subscribe to Missa Deadlines</h2><span>This private feed is one-way. Updates may not appear immediately because each calendar app controls its refresh timing.</span><div><button type='button' className={styles.primaryButton} onClick={closeDialog}>Copy calendar feed link</button><button type='button' className={styles.secondaryButton} onClick={closeDialog}>Done</button></div></div> : null}

            {dialogMode === 'event' && dialogResult === 'idle' ? (
              <>
                <p>{connection === 'feed' ? 'Calendar feed' : 'Add one deadline'}</p><h2 id='calendar-dialog-title'>{connection === 'feed' ? 'North River Review is in Missa Deadlines' : deadlineAdded ? 'North River Review calendar event' : 'Add North River Review to your calendar'}</h2><span>{connection === 'feed' ? 'This tracked deadline is included in your private one-way feed. Your calendar app decides when it appears.' : deadlineAdded ? `This event is recorded as added to ${providerName}.` : connection ? `Review the event below, then add it to ${providerName}.` : 'Connect a calendar for a one-click add, or prepare an individual calendar file.'}</span>
                <dl className={styles.calendarEventPreview}><div><dt>Event</dt><dd>North River Review deadline</dd></div><div><dt>Date</dt><dd>Aug 28, 2026 · All day</dd></div><div><dt>Reminder</dt><dd>7 days and 1 day before</dd></div><div><dt>Included</dt><dd>Opportunity and application links</dd></div></dl>
                <div className={styles.calendarLimit}><Info aria-hidden='true' /><span><strong>Why all day?</strong>North River Review did not provide a closing time. Missa keeps that uncertainty visible instead of inventing one.</span></div>
                {connection === 'feed' ? <div className={styles.dialogActions}><button type='button' className={styles.secondaryButton} onClick={() => openDialog('sync')}>Calendar feed settings</button><button type='button' className={styles.primaryButton} onClick={closeDialog}>Done</button></div> : hasDirectConnection ? <div className={styles.dialogActions}><button type='button' className={styles.secondaryButton} onClick={closeDialog}>Cancel</button><button type='button' className={styles.primaryButton} onClick={() => { setDeadlineAdded(true); setDialogResult('connected') }}>{deadlineAdded ? 'Done' : `Add to ${providerName}`}</button></div> : <div className={styles.dialogActions}><button type='button' className={styles.secondaryButton} onClick={() => setDialogResult('download-ready')}><Download aria-hidden='true' /> Prepare calendar file</button><button type='button' className={styles.primaryButton} onClick={() => openDialog('sync')}>Connect calendar</button></div>}
              </>
            ) : null}

            {dialogMode === 'event' && dialogResult === 'connected' ? <div className={styles.calendarDialogResult} aria-live='polite'><CheckCircle2 aria-hidden='true' /><p>Deadline added</p><h2 id='calendar-dialog-title'>Added to {providerName}</h2><span>North River Review is scheduled for Aug 28 as an all-day event. Tracker remains the source for the official opportunity date.</span><div><button type='button' className={styles.primaryButton} onClick={closeDialog}>Done</button></div></div> : null}
            {dialogMode === 'event' && dialogResult === 'download-ready' ? <div className={styles.calendarDialogResult} aria-live='polite'><Download aria-hidden='true' /><p>Calendar file ready</p><h2 id='calendar-dialog-title'>Open the file to add this deadline</h2><span>Your calendar app must confirm the event. Missa will continue to show it as not confirmed here.</span><div><button type='button' className={styles.primaryButton} onClick={closeDialog}>Download .ics file</button><button type='button' className={styles.secondaryButton} onClick={() => openDialog('sync')}>Connect instead</button></div></div> : null}
          </section>
        </div>
      ) : null}
    </div>
  )
}

function TrackerSubmissions() {
  return (
    <div className={styles.view} data-view='submissions'>
      <SectionHeading eyebrow='Submissions' title='Receipts, outcomes, and follow-up.' description='Every submission keeps the Work snapshot, receipt, messages, decisions, and status history that belonged to that moment.' action={<span className={styles.privateBadge}><LockKeyhole aria-hidden='true' /> Private</span>} />
      <div className={styles.submissionSummary}><div><span>Awaiting response</span><strong>3</strong></div><div><span>Decision received</span><strong>4</strong></div><div><span>Follow-up due</span><strong>1</strong></div><div><span>Receipts retained</span><strong>8</strong></div></div>
      <section className={styles.submissionHistory}><header><div><p>Recent records</p><h2>Submission history</h2></div><button type='button' className={styles.iconTextButton}><Search aria-hidden='true' /> Search</button></header>{[
        ['Listening Futures Fund', 'Submitted', 'Aug 02, 2026', 'LF-2026-4431', 'Saltwater Lessons'],
        ['Sound Art Development Lab', 'Shortlisted', 'Jun 18, 2026', 'SADL-8892', 'The Tidal Archive'],
        ['Coastal Culture Fund', 'Not selected', 'Mar 09, 2026', 'CCF-1047', 'Low Tide Choir'],
      ].map(([title, status, date, receipt, work]) => <button type='button' key={title}><span className={status === 'Shortlisted' ? styles.itemTone_ready : styles.itemTone_quiet}>{status}</span><div><strong>{title}</strong><small>{work}</small></div><time>{date}</time><code>{receipt}</code><ArrowRight aria-hidden='true' /></button>)}</section>
    </div>
  )
}

function TrackerWork({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  return (
    <div className={styles.view} data-view='work'>
      <SectionHeading eyebrow='Work connections' title='See where each Work is in use.' description='Library owns the Work and its files. Tracker owns each opportunity and submission connection, including the version used.' action={<button type='button' className={styles.secondaryButton}><Library aria-hidden='true' /> Open Library</button>} />
      <div className={styles.workConnections}>{[
        ['Saltwater Lessons', 'Essay + field recordings', '3 active · 1 submitted', 'Updated Aug 12'],
        ['The Tidal Archive', 'Audio installation', '2 active', 'Updated Jul 29'],
        ['Low Tide Choir', 'Performance work', '1 outcome', 'Updated Mar 02'],
      ].map(([title, form, use, updated], index) => <article key={title}>{index === 0 ? <Image src='/media/prototypes/saltwater-lessons.png' alt='A person looking across a grey-blue ocean' width={1448} height={1086} /> : <div className={styles.workMonogram}>{String(index + 1).padStart(2, '0')}</div>}<div><span>{form}</span><h2>{title}</h2><p>{use}</p><small>{updated}</small></div>{index === 0 ? <button type='button' onClick={() => onNavigate('workspace')}>Review application use <ArrowRight aria-hidden='true' /></button> : <button type='button'>View connections <ArrowRight aria-hidden='true' /></button>}</article>)}</div>
    </div>
  )
}

function TrackerArchive() {
  return (
    <div className={styles.view} data-view='archive'>
      <SectionHeading eyebrow='Archive' title='History retained, without crowding today.' description='Archived opportunities keep their notes, Work links, imports, conflicts, status events, and outcomes. Nothing is silently discarded.' action={<button type='button' className={styles.secondaryButton}><Search aria-hidden='true' /> Search archive</button>} />
      <section className={styles.archiveList}>{['New Geographies Grant · 2025', 'North Atlantic Sound Award · 2025', 'Public Memory Fellowship · 2024'].map((item, index) => <button type='button' key={item}><Archive aria-hidden='true' /><span><strong>{item}</strong><small>{index === 1 ? 'Withdrawn · 6 history events' : 'Closed · outcome recorded'}</small></span><time>{index === 2 ? '2024' : '2025'}</time><ArrowRight aria-hidden='true' /></button>)}</section>
    </div>
  )
}

function CompilePreview({ state, setState, onContinue }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; onContinue: () => void }) {
  const reusePercent = state.practice === 'Musician' ? 61 : state.practice === 'Writer' ? 76 : 72
  return (
    <div className={styles.view} data-view='compile'>
      <SectionHeading
        eyebrow='Compile preview'
        title='See the application before you start it.'
        description='Missa has translated the official call into reusable work, new work, unknowns, and protected steps. Nothing is created until you confirm the project and practice.'
        action={<button type='button' className={styles.sourceButton}><Globe2 aria-hidden='true' /> Official source <ExternalLink aria-hidden='true' /></button>}
      />

      <div className={styles.compileLayout}>
        <section className={styles.compileInputs} aria-labelledby='compile-inputs-title'>
          <div className={styles.subhead}><span>01</span><div><h2 id='compile-inputs-title'>Choose the application context</h2><p>These choices select the playbook and Discipline Packs. They do not change the public opportunity.</p></div></div>
          <label>
            <span>Project</span>
            <select value={state.project} onChange={(event) => setState((current) => ({ ...current, project: event.target.value as AppState['project'] }))}>
              <option>Saltwater Lessons</option>
              <option>The Tidal Archive</option>
            </select>
          </label>
          <fieldset>
            <legend>Practice used for this application</legend>
            <div className={styles.segmented}>
              {(['Writer', 'Musician', 'Writer + Musician'] as const).map((practice) => (
                <button key={practice} type='button' aria-pressed={state.practice === practice} onClick={() => setState((current) => ({ ...current, practice }))}>{practice}</button>
              ))}
            </div>
          </fieldset>
          <div className={styles.projectPreview}>
            <Image src='/media/prototypes/saltwater-lessons.png' alt='A person holding a notebook while looking across a grey-blue ocean' width={1448} height={1086} priority />
            <div><span>Selected project</span><strong>{state.project}</strong><p>Essay, field recordings, and a public listening installation about coastal memory.</p></div>
          </div>
        </section>

        <section className={styles.compileResult} aria-labelledby='compile-result-title'>
          <div className={styles.resultHeader}>
            <div><p>Projected reuse</p><strong id='compile-result-title'>{reusePercent}%</strong></div>
            <div className={styles.progressTrack} aria-label={`${reusePercent} percent of this application can reuse approved materials`}><i style={{ width: `${reusePercent}%` }} /></div>
            <span>Based on the selected project, current Library versions, and source constraints.</span>
          </div>
          <dl className={styles.compileStats}>
            <div><dt><CheckCircle2 aria-hidden='true' />Ready to reuse</dt><dd>7</dd><small>Identity, biography, timeline, credits</small></div>
            <div><dt><ListChecks aria-hidden='true' />New work</dt><dd>4</dd><small>Narrative, budget note, sample context</small></div>
            <div><dt><Info aria-hidden='true' />Unknown</dt><dd>2</dd><small>Residency and prior-publication rule</small></div>
            <div><dt><LockKeyhole aria-hidden='true' />Protected</dt><dd>3</dd><small>Fee, attestation, final submission</small></div>
          </dl>
          <div className={styles.compileEstimate}>
            <Clock3 aria-hidden='true' />
            <div><strong>Estimated preparation: 3–5 focused hours</strong><span>Derived from four unsatisfied components and your saved planning pace—not a prediction of acceptance.</span></div>
          </div>
          <div className={styles.compileActions}>
            <button type='button' className={styles.primaryButton} onClick={() => { setState((current) => ({ ...current, compiled: true })); onContinue() }}>Compile application <ArrowRight aria-hidden='true' /></button>
            <button type='button' className={styles.textButton}>Inspect all 16 components</button>
          </div>
        </section>
      </div>
    </div>
  )
}

function LivingGraph({ state, onNavigate }: { state: AppState; onNavigate: (view: ViewId) => void }) {
  return (
    <div className={styles.view} data-view='graph'>
      <SectionHeading
        eyebrow='Living application graph'
        title='The whole job, with its dependencies visible.'
        description='Every node carries its source, response, selected material, schedule, and destination. Tracker recommends a next action without changing state for you.'
        action={<button type='button' className={styles.secondaryButton} onClick={() => onNavigate('impact')}><GitCompareArrows aria-hidden='true' /> Review source change</button>}
      />
      <div className={styles.graphSummary}>
        <div><span>Readiness</span><strong>{state.workMatched ? '11' : '10'} of 16</strong><small>components satisfied</small></div>
        <div><span>Unknowns</span><strong>2</strong><small>facts require your answer</small></div>
        <div><span>Critical path</span><strong>3 steps</strong><small>sample → budget → review</small></div>
        <div><span>Source version</span><strong>v3</strong><small>published Aug 14</small></div>
      </div>

      <div className={styles.graphLayout}>
        <section className={styles.graphCanvas} aria-labelledby='graph-title'>
          <div className={styles.graphToolbar}>
            <div><h2 id='graph-title'>Application sequence</h2><span>Grant playbook · multidisciplinary pack</span></div>
            <div><button type='button' className={styles.iconTextButton}><Search aria-hidden='true' /> Find component</button><button type='button' className={styles.iconButton} aria-label='Graph display options'><PanelRightOpen aria-hidden='true' /></button></div>
          </div>
          <ol className={styles.graphNodes}>
            {graphNodes.map((node, index) => {
              const stateForNode = node.id === 'samples' && state.workMatched ? 'ready' : node.state
              return (
                <li key={node.id}>
                  <button type='button' onClick={() => node.id === 'samples' ? onNavigate('workspace') : undefined} className={styles[`node_${stateForNode}`]}>
                    <span className={styles.nodeNumber}>{node.number}</span>
                    <span className={styles.nodeStatus}><StatusMark state={stateForNode} /></span>
                    <span><strong>{node.label}</strong><small>{node.id === 'samples' && state.workMatched ? '2 of 2 matched' : node.detail}</small></span>
                    {node.id === 'samples' ? <ArrowRight aria-hidden='true' /> : null}
                  </button>
                  {index < graphNodes.length - 1 ? <ArrowRight className={styles.graphArrow} aria-hidden='true' /> : null}
                </li>
              )
            })}
          </ol>
          <div className={styles.graphLegend} aria-label='Graph state legend'>
            <span><CheckCircle2 aria-hidden='true' />Ready</span><span><CircleDot aria-hidden='true' />In progress</span><span><Info aria-hidden='true' />Unknown</span><span><LockKeyhole aria-hidden='true' />Blocked by dependency</span>
          </div>
        </section>

        <aside className={styles.nowPanel}>
          <p>Tracker now</p>
          <div className={styles.nowSignal}><span>Highest leverage</span><strong>Match the second work sample.</strong><p>It unblocks compliance review and the application package.</p></div>
          <button type='button' className={styles.primaryButton} onClick={() => onNavigate('workspace')}>Open Work samples <ArrowRight aria-hidden='true' /></button>
          <div className={styles.reuseSignal}>
            <RefreshCw aria-hidden='true' />
            <div><strong>One edit could help three applications</strong><span>Your 150-word biography is reused here and in two other active applications.</span><button type='button'>View reuse map</button></div>
          </div>
          <div className={styles.scheduleSignal}>
            <CalendarDays aria-hidden='true' />
            <div><strong>Critical path fits before Aug 28</strong><span>Three proposed work sessions; nothing has been added to your calendar.</span></div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function ComponentWorkspace({ state, setState }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }) {
  const [context, setContext] = useState('An essay and field-recording project about how coastal communities remember environmental change.')
  return (
    <div className={styles.workspaceView} data-view='workspace'>
      <aside className={styles.componentOutline}>
        <p>Application checklist</p>
        {[
          ['Eligibility', 'Complete', 'ready'],
          ['Project details', 'Complete', 'ready'],
          ['Work samples', '1 of 2 added', 'active'],
          ['Budget', 'Not started', 'unknown'],
          ['Review and submit', 'Not ready', 'blocked'],
        ].map(([label, detail, itemState]) => (
          <button type='button' key={label} className={itemState === 'active' ? styles.outlineActive : undefined}>
            <StatusMark state={itemState as 'ready' | 'unknown' | 'active' | 'blocked'} />
            <span><strong>{label}</strong><small>{detail}</small></span>
          </button>
        ))}
        <div className={styles.officeBoundary}><ShieldCheck aria-hidden='true' /><div><strong>Not submitted</strong><span>You’ll submit directly to North River Review.</span></div></div>
      </aside>

      <section className={styles.workspaceCanvas} aria-labelledby='workspace-title'>
        <div className={styles.workspaceTitle}><p>Work samples</p><h1 id='workspace-title' tabIndex={-1}>Choose your work samples</h1><span>Add the work you want North River Review to consider.</span></div>
        <div className={styles.requirementBox}>
          <div><FileText aria-hidden='true' /><strong>From the call</strong><button type='button'>View full guidelines <ExternalLink aria-hidden='true' /></button></div>
          <p>Provide up to two completed works that demonstrate narrative intent and a sustained relationship to place.</p>
          <div className={styles.callLimits}><span>Up to 2 works</span><span>PDF, audio, or video</span><span>6,000 words</span><span>5 minutes</span></div>
        </div>

        <div className={styles.sampleHeading}><div><span>Work sample 1</span><strong>From your Library</strong></div><em>Required</em></div>
        <div className={styles.selectedWork}>
          <Image src='/media/prototypes/saltwater-lessons.png' alt='A person holding a notebook while looking across a grey-blue ocean' width={1448} height={1086} priority />
          <div className={styles.workIdentity}><h2>Saltwater Lessons</h2><p>Essay and field recordings · 2023</p><p className={styles.workDescription}>A long-term project about coastal education programs and the communities they serve.</p><button type='button'><Library aria-hidden='true' /> View in Library</button><div className={styles.fileList}><span>Files</span><small>12 images</small><small>PDF statement · 1,240 words</small></div></div>
          <div className={styles.constraintResults}>
            <span>Checks</span>
            <p><Check aria-hidden='true' /><strong>Format</strong><small>Accepted</small></p>
            <p><Check aria-hidden='true' /><strong>Length</strong><small>Within limit</small></p>
            <p><Check aria-hidden='true' /><strong>Rights</strong><small>Confirmed</small></p>
          </div>
        </div>

        <label className={styles.contextField}>
          <span>About this work</span>
          <strong>Describe the work in 400 characters or fewer.</strong>
          <textarea value={context} onChange={(event) => setContext(event.target.value)} maxLength={400} />
          <small>{context.length} of 400 characters</small>
        </label>

        <label className={styles.roleField}><span>Your role</span><select defaultValue='Lead photographer and author'><option>Lead photographer and author</option><option>Author</option><option>Collaborator</option></select></label>

        <section className={styles.matchPanel} aria-labelledby='match-title'>
          <h2 id='match-title'>What matches</h2>
          <ul><li><Check aria-hidden='true' />Narrative photography and field recordings</li><li><Check aria-hidden='true' />A sustained focus on place</li><li><Check aria-hidden='true' />Completed in 2023</li><li><Check aria-hidden='true' />Accepted file types and length</li></ul>
          <p>You decide whether this work represents your project.</p>
        </section>

        <div className={styles.workspaceActions}>
          <button type='button' className={styles.primaryButton} onClick={() => setState((current) => ({ ...current, workMatched: true }))}>{state.workMatched ? <><Check aria-hidden='true' /> Saltwater Lessons added</> : <>Add Saltwater Lessons <ArrowRight aria-hidden='true' /></>}</button>
          <button type='button' className={styles.secondaryButton}>Choose another</button>
          <button type='button' className={styles.textButton}><Library aria-hidden='true' /> View in Library</button>
        </div>
        <p className={styles.saveStatus}><Check aria-hidden='true' /> Saved just now</p>
      </section>

      <aside className={styles.readinessRail}>
        <p>Application progress</p><strong>3 of 5 sections complete</strong>
        <div className={styles.progressTrack}><i style={{ width: '60%' }} /></div>
        <ul><li><CheckCircle2 aria-hidden='true' /><span>Eligibility<small>Complete</small></span></li><li><CheckCircle2 aria-hidden='true' /><span>Project details<small>Complete</small></span></li><li><StatusMark state='active' /><span>Work samples<small>In progress</small></span></li><li><Info aria-hidden='true' /><span>Budget<small>Not started</small></span></li><li><LockKeyhole aria-hidden='true' /><span>Review and submit<small>Not ready</small></span></li></ul>
        <div className={styles.nextAction}><span>Next</span><strong>{state.workMatched ? 'Saltwater Lessons is added.' : 'Add Saltwater Lessons.'}</strong><p>{state.workMatched ? 'You can choose another work sample or continue to Budget.' : 'After it’s added, you can choose another work sample or continue to Budget.'}</p></div>
        <div className={styles.applicationDetails}><span>Application details</span><strong>North River Review</strong><p>Call for submissions</p><dl><div><dt>Due</dt><dd>Aug 28, 2026<br />13 days left</dd></div><div><dt>Status</dt><dd>Draft</dd></div></dl><button type='button'>View opportunity <ExternalLink aria-hidden='true' /></button></div>
      </aside>
    </div>
  )
}

type BudgetPreviewState = 'default' | 'empty' | 'save-error' | 'complete' | 'changed' | 'expired'

function BudgetWorkspace({ state, setState, onNavigate }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; onNavigate: (view: ViewId) => void }) {
  const [previewState, setPreviewState] = useState<BudgetPreviewState>(() => {
    if (typeof window === 'undefined') return 'default'
    const value = new URLSearchParams(window.location.search).get('budgetState') as BudgetPreviewState | null
    return value && ['default', 'empty', 'save-error', 'complete', 'changed', 'expired'].includes(value) ? value : 'default'
  })
  const [requestAmount, setRequestAmount] = useState('6000')
  const [installationAmount, setInstallationAmount] = useState('')
  const [budgetNote, setBudgetNote] = useState('Community partner support covers the venue and installation staffing. Equipment costs are based on current rental rates.')
  const [extraFunding, setExtraFunding] = useState(false)
  const [extraCost, setExtraCost] = useState(false)

  const showState = (next: BudgetPreviewState) => {
    setPreviewState(next)
    const url = new URL(window.location.href)
    if (next === 'default') url.searchParams.delete('budgetState')
    else url.searchParams.set('budgetState', next)
    window.history.replaceState({}, '', url)
  }

  const parseAmount = (value: string) => Number(value.replace(/[^0-9.]/g, '')) || 0
  const fundingTotal = 8200
  const enteredCosts = 6700
  const installationValue = parseAmount(installationAmount)
  const costsTotal = enteredCosts + installationValue
  const remaining = fundingTotal - costsTotal
  const requestValue = parseAmount(requestAmount)
  const balanced = remaining === 0 && installationValue > 0 && requestValue > 0 && requestValue <= 6000 && budgetNote.trim().length > 0
  const formatMoney = (value: number) => `$${value.toLocaleString('en-US')}`

  const checklist = (
    <aside className={styles.componentOutline}>
      <p>Application checklist</p>
      {[
        ['Eligibility', 'Complete', 'ready'],
        ['Project details', 'Complete', 'ready'],
        ['Work samples', 'Complete', 'ready'],
        ['Budget', balanced || state.budgetComplete ? 'Complete' : '1 amount missing', balanced || state.budgetComplete ? 'ready' : 'active'],
        ['Review and submit', 'Not ready', 'blocked'],
      ].map(([label, detail, itemState]) => (
        <button type='button' key={label} className={itemState === 'active' ? styles.outlineActive : undefined}>
          <StatusMark state={itemState as 'ready' | 'unknown' | 'active' | 'blocked'} />
          <span><strong>{label}</strong><small>{detail}</small></span>
        </button>
      ))}
      <div className={styles.officeBoundary}><ShieldCheck aria-hidden='true' /><div><strong>Not submitted</strong><span>You’ll submit directly to North River Review.</span></div></div>
    </aside>
  )

  const progress = (
    <aside className={styles.readinessRail}>
      <p>Application progress</p><strong>{balanced || state.budgetComplete ? '4' : '3'} of 5 sections complete</strong>
      <div className={styles.progressTrack}><i style={{ width: balanced || state.budgetComplete ? '80%' : '60%' }} /></div>
      <ul><li><CheckCircle2 aria-hidden='true' /><span>Eligibility<small>Complete</small></span></li><li><CheckCircle2 aria-hidden='true' /><span>Project details<small>Complete</small></span></li><li><CheckCircle2 aria-hidden='true' /><span>Work samples<small>Complete</small></span></li><li><StatusMark state={balanced || state.budgetComplete ? 'ready' : 'active'} /><span>Budget<small>{balanced || state.budgetComplete ? 'Complete' : 'Needs attention'}</small></span></li><li><LockKeyhole aria-hidden='true' /><span>Review and submit<small>Not ready</small></span></li></ul>
      <div className={styles.nextAction}><span>Next</span><strong>{balanced ? 'Continue to Review.' : 'Add an amount for Installation materials.'}</strong><p>{balanced ? 'Your funding and costs match.' : 'Your funding and costs must match before you can continue.'}</p></div>
      <div className={styles.applicationDetails}><span>Application details</span><strong>North River Review</strong><p>Call for submissions</p><dl><div><dt>Due</dt><dd>Aug 28, 2026<br />13 days left</dd></div><div><dt>Status</dt><dd>Draft</dd></div></dl><button type='button'>View opportunity <ExternalLink aria-hidden='true' /></button></div>
    </aside>
  )

  const alternateState = previewState !== 'default' ? (
    <section className={`${styles.budgetStateCard} ${styles[`budgetState_${previewState.replace('-', '_')}`]}`} aria-live='polite'>
      {previewState === 'empty' ? <><Info aria-hidden='true' /><p>Empty state</p><h2>No costs added</h2><span>Add the first cost for Saltwater Lessons.</span><div><button type='button' className={styles.primaryButton} onClick={() => showState('default')}>Add a cost</button><button type='button' className={styles.secondaryButton} onClick={() => onNavigate('graph')}>Finish later</button></div></> : null}
      {previewState === 'save-error' ? <><AlertTriangle aria-hidden='true' /><p>Save error</p><h2>We couldn’t save your budget.</h2><span>Try again before leaving this page.</span><div><button type='button' className={styles.primaryButton} onClick={() => showState('default')}>Try again</button></div></> : null}
      {previewState === 'complete' ? <><CheckCircle2 aria-hidden='true' /><p>Complete state</p><h2>Budget complete</h2><span>Your funding and costs both total $8,200.</span><div><button type='button' className={styles.primaryButton} onClick={() => onNavigate('review')}>Continue to Review</button><button type='button' className={styles.secondaryButton} onClick={() => showState('default')}>Review budget</button></div></> : null}
      {previewState === 'changed' ? <><GitCompareArrows aria-hidden='true' /><p>Changed guidance</p><h2>Budget guidance changed</h2><span>North River Review reduced the maximum request from $6,000 to $5,000. Update your budget before continuing.</span><div><button type='button' className={styles.primaryButton} onClick={() => { setRequestAmount('5000'); showState('default') }}>Update budget</button><button type='button' className={styles.secondaryButton} onClick={() => onNavigate('impact')}>View what changed</button></div></> : null}
      {previewState === 'expired' ? <><CalendarDays aria-hidden='true' /><p>Expired state</p><h2>North River Review closed on Aug 28.</h2><span>Your budget is saved with the rest of your draft.</span><div><button type='button' className={styles.primaryButton} onClick={() => onNavigate('graph')}>View draft</button><button type='button' className={styles.secondaryButton} onClick={() => onNavigate('archive')}>Archive application</button></div></> : null}
    </section>
  ) : null

  return (
    <div className={styles.workspaceView} data-view='budget'>
      {checklist}
      <section className={styles.workspaceCanvas} aria-labelledby='budget-title'>
        <div className={styles.workspaceTitle}><p>Budget</p><h1 id='budget-title' tabIndex={-1}>Add your project budget</h1><span>Enter the costs for Saltwater Lessons and the amount you’re requesting.</span></div>
        <div className={styles.statePreview} aria-label='Budget state preview'><span>State preview</span>{(['default', 'empty', 'save-error', 'complete', 'changed', 'expired'] as BudgetPreviewState[]).map((item) => <button key={item} type='button' aria-pressed={previewState === item} onClick={() => showState(item)}>{item === 'default' ? 'Needs attention' : item.replace('-', ' ')}</button>)}</div>

        {alternateState ?? <>
          <div className={styles.requirementBox}>
            <div><FileText aria-hidden='true' /><strong>From the call</strong><button type='button'>View full guidelines <ExternalLink aria-hidden='true' /></button></div>
            <p>Submit a balanced budget for the full project. You may request up to $6,000. Include artist fees, production, travel, and access costs. Use USD.</p>
            <dl><div><dt>Maximum request</dt><dd>$6,000</dd></div><div><dt>Currency</dt><dd>USD</dd></div><div><dt>Budget note</dt><dd>Required</dd></div></dl>
          </div>

          <section className={styles.budgetSection} aria-labelledby='funding-title'>
            <div className={styles.budgetSectionHeading}><div><p>Funding</p><h2 id='funding-title'>Amount requested</h2><span>How much are you asking North River Review to fund?</span></div><strong>{formatMoney(requestValue)}</strong></div>
            <label className={styles.moneyField}><span>Amount requested</span><div><b>$</b><input inputMode='decimal' value={requestAmount} onChange={(event) => setRequestAmount(event.target.value)} aria-invalid={requestValue <= 0 || requestValue > 6000} /></div>{requestValue > 6000 ? <small className={styles.fieldError}>Over the request limit — Enter $6,000 or less.</small> : null}{requestValue <= 0 ? <small className={styles.fieldError}>Invalid amount — Enter an amount greater than $0.</small> : null}</label>

            <div className={styles.budgetSubheading}><p>Other funding</p><span>Add any confirmed or pending support.</span></div>
            <div className={styles.budgetRows}>
              <div className={styles.budgetRow}><label><span>Funding source</span><input defaultValue='Artist contribution' /></label><label><span>Status</span><select defaultValue='Confirmed'><option>Confirmed</option><option>Pending</option></select></label><label><span>Amount</span><input defaultValue='$1,200' inputMode='decimal' /></label></div>
              <div className={styles.budgetRow}><label><span>Funding source</span><input defaultValue='Community partner support' /></label><label><span>Status</span><select defaultValue='Pending'><option>Confirmed</option><option>Pending</option></select></label><label><span>Amount</span><input defaultValue='$1,000' inputMode='decimal' /></label></div>
              {extraFunding ? <div className={styles.budgetRow}><label><span>Funding source</span><input aria-invalid='true' /><small className={styles.fieldError}>Missing funding source — Add a name for this funding source.</small></label><label><span>Status</span><select defaultValue='Pending'><option>Confirmed</option><option>Pending</option></select></label><label><span>Amount</span><input inputMode='decimal' /></label></div> : null}
            </div>
            <button type='button' className={styles.addRowButton} onClick={() => setExtraFunding(true)}>Add funding source</button>
            <div className={styles.budgetTotal}><span>Total funding</span><strong>$8,200</strong></div>
          </section>

          <section className={styles.budgetSection} aria-labelledby='costs-title'>
            <div className={styles.budgetSectionHeading}><div><p>Project costs</p><h2 id='costs-title'>List what you expect to spend on Saltwater Lessons.</h2></div><strong>{formatMoney(costsTotal)}</strong></div>
            <div className={styles.costRows}>
              {[
                ['Cost 1', 'Artist fees', '$2,400'],
                ['Cost 2', 'Audio production', '$1,500'],
                ['Cost 3', 'Travel and field recording', '$1,100'],
                ['Cost 4', 'Equipment rental', '$1,000'],
                ['Cost 5', 'Access and transcription', '$700'],
              ].map(([number, label, amount]) => <div key={number} className={styles.costRow}><span>{number}</span><label><span>{label}</span><input defaultValue={amount} inputMode='decimal' /></label></div>)}
              <div className={styles.costRow}><span>Cost 6</span><label><span>Installation materials</span><input placeholder='Enter amount' inputMode='decimal' value={installationAmount} onChange={(event) => setInstallationAmount(event.target.value)} aria-invalid={!installationValue} /><small className={styles.fieldError}>Missing amount — Enter an amount for Installation materials.</small></label><label className={styles.optionalNote}><span>Add a note <small>Optional</small></span><input /></label></div>
              {extraCost ? <div className={styles.costRow}><span>Cost 7</span><label><span>Cost name</span><input /></label><label><span>Amount</span><input placeholder='Enter amount' inputMode='decimal' /></label></div> : null}
            </div>
            <button type='button' className={styles.addRowButton} onClick={() => setExtraCost(true)}>Add cost</button>
            <div className={styles.budgetTotal}><span>Total costs</span><strong>{formatMoney(costsTotal)}</strong><small>{remaining === 0 ? 'Funding and costs match' : `${formatMoney(Math.abs(remaining))} ${remaining > 0 ? 'left to assign' : 'over budget'}`}</small></div>
          </section>

          <label className={styles.contextField}><span>Budget note</span><strong>Explain any estimates, pending funding, or in-kind support.</strong><textarea value={budgetNote} onChange={(event) => setBudgetNote(event.target.value)} maxLength={500} aria-invalid={!budgetNote.trim()} /><small>{budgetNote.length} of 500 characters</small>{!budgetNote.trim() ? <small className={styles.fieldError}>Missing budget note — Add a budget note.</small> : null}</label>

          <section className={styles.budgetChecks} aria-labelledby='budget-checks-title'><h2 id='budget-checks-title'>Checks</h2><dl><div><dt>Request</dt><dd>{requestValue > 6000 ? 'Over the $6,000 limit' : 'Within the $6,000 limit'}</dd></div><div><dt>Artist fees</dt><dd>Included</dd></div><div><dt>Currency</dt><dd>USD</dd></div><div><dt>Balance</dt><dd>{remaining === 0 ? 'Balanced' : `${formatMoney(Math.abs(remaining))} ${remaining > 0 ? 'left to assign' : 'over budget'}`}</dd></div></dl></section>

          {!balanced ? <div className={styles.validationNotice}><AlertTriangle aria-hidden='true' /><div><strong>Budget does not balance</strong><span>Funding and costs must match. You still have {formatMoney(Math.abs(remaining))} to assign.</span></div></div> : null}
          <div className={styles.workspaceActions}><button type='button' className={styles.primaryButton} disabled={!balanced} onClick={() => { setState((current) => ({ ...current, budgetComplete: true })); showState('complete') }}>Continue to Review</button><button type='button' className={styles.secondaryButton} onClick={() => onNavigate('workspace')}>Back to Work samples</button></div>
          {!balanced ? <p className={styles.disabledReason}>Disabled until the budget balances.</p> : null}
          <p className={styles.saveStatus}><Check aria-hidden='true' /> Saved just now</p>
        </>}
      </section>
      {progress}
    </div>
  )
}

type ReviewPreviewState = 'review' | 'submitted' | 'unconfirmed'

function ReviewSubmitWorkspace({ state, setState, onNavigate }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; onNavigate: (view: ViewId) => void }) {
  const [previewState, setPreviewState] = useState<ReviewPreviewState>(() => {
    if (typeof window === 'undefined') return 'review'
    const value = new URLSearchParams(window.location.search).get('submissionState') as ReviewPreviewState | null
    return value && ['review', 'submitted', 'unconfirmed'].includes(value) ? value : 'review'
  })
  const [creatorConfirmed, setCreatorConfirmed] = useState(false)
  const [termsConfirmed, setTermsConfirmed] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [receiptValue, setReceiptValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [saveMessage, setSaveMessage] = useState('Saved just now')

  useEffect(() => {
    if (previewState !== 'submitted' || state.submitted) return
    setState((current) => ({ ...current, submitted: true, receipt: current.receipt || 'NRR-2026-1842' }))
  }, [previewState, setState, state.submitted])

  const showState = (next: ReviewPreviewState) => {
    setPreviewState(next)
    const url = new URL(window.location.href)
    if (next === 'review') url.searchParams.delete('submissionState')
    else url.searchParams.set('submissionState', next)
    window.history.replaceState({}, '', url)
    if (next === 'submitted') setState((current) => ({ ...current, submitted: true, receipt: current.receipt || 'NRR-2026-1842' }))
    if (next !== 'submitted') setState((current) => ({ ...current, submitted: false, receipt: '' }))
  }

  const confirmProviderReceipt = () => {
    setSubmitting(true)
    window.setTimeout(() => {
      setState((current) => ({ ...current, submitted: true, receipt: 'NRR-2026-1842' }))
      setSubmitting(false)
      setConfirmOpen(false)
      showState('submitted')
    }, 450)
  }

  const saveExternalReceipt = () => {
    const receipt = receiptValue.trim()
    if (!receipt) return
    setState((current) => ({ ...current, submitted: true, receipt }))
    showState('submitted')
  }

  const downloadReceipt = () => {
    const receipt = [
      'Missa submission receipt',
      'Submitted to North River Review',
      'Project: Saltwater Lessons',
      'Submitted: Aug 15, 2026 at 10:42 AM',
      `Submission reference: ${state.receipt || 'NRR-2026-1842'}`,
      'Submitted by: Nasreen Adeyemi',
    ].join('\n')
    const url = URL.createObjectURL(new Blob([receipt], { type: 'text/plain' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'north-river-review-receipt.txt'
    link.click()
    URL.revokeObjectURL(url)
  }

  const confirmed = state.submitted && Boolean(state.receipt)
  const checklistState = confirmed ? 'Complete' : previewState === 'unconfirmed' ? 'Confirmation needed' : 'In progress'
  const progressCopy = confirmed ? '5 of 5 sections complete' : '4 of 5 sections complete'

  const checklist = (
    <aside className={styles.componentOutline}>
      <p>Application checklist</p>
      {[
        ['Eligibility', 'Complete', 'ready'],
        ['Project details', 'Complete', 'ready'],
        ['Work samples', 'Complete', 'ready'],
        ['Budget', 'Complete', 'ready'],
        ['Review and submit', checklistState, confirmed ? 'ready' : 'active'],
      ].map(([label, detail, itemState]) => (
        <button type='button' key={label} className={itemState === 'active' ? styles.outlineActive : undefined} onClick={() => label === 'Budget' ? onNavigate('budget') : undefined}>
          <StatusMark state={itemState as 'ready' | 'unknown' | 'active' | 'blocked'} />
          <span><strong>{label}</strong><small>{detail}</small></span>
        </button>
      ))}
      <div className={styles.officeBoundary}><ShieldCheck aria-hidden='true' /><div><strong>{confirmed ? 'Receipt verified' : previewState === 'unconfirmed' ? 'Submission not yet confirmed' : 'Not submitted'}</strong><span>{confirmed ? 'Missa has provider confirmation.' : previewState === 'unconfirmed' ? 'Tracker is waiting for proof.' : 'You’ll submit directly to North River Review.'}</span></div></div>
    </aside>
  )

  const progress = (
    <aside className={styles.readinessRail}>
      <p>Application progress</p><strong>{progressCopy}</strong>
      <div className={styles.progressTrack}><i style={{ width: confirmed ? '100%' : '80%' }} /></div>
      <ul><li><CheckCircle2 aria-hidden='true' /><span>Eligibility<small>Complete</small></span></li><li><CheckCircle2 aria-hidden='true' /><span>Project details<small>Complete</small></span></li><li><CheckCircle2 aria-hidden='true' /><span>Work samples<small>Complete</small></span></li><li><CheckCircle2 aria-hidden='true' /><span>Budget<small>Complete</small></span></li><li><StatusMark state={confirmed ? 'ready' : 'active'} /><span>Review and submit<small>{checklistState}</small></span></li></ul>
      <div className={styles.nextAction}><span>Next</span><strong>{confirmed ? 'Track the response.' : previewState === 'unconfirmed' ? 'Add provider confirmation or a receipt.' : 'Complete the final confirmation.'}</strong><p>{confirmed ? 'North River Review has not provided a response date.' : previewState === 'unconfirmed' ? 'Missa will not mark this Submitted without proof.' : 'Both required confirmations must be accepted before submission.'}</p></div>
      <div className={styles.applicationDetails}><span>Application details</span><strong>North River Review</strong><p>Call for submissions</p><dl><div><dt>Due</dt><dd>Aug 28, 2026<br />13 days left</dd></div><div><dt>Status</dt><dd>{confirmed ? 'Submitted' : previewState === 'unconfirmed' ? 'Unconfirmed' : 'Draft'}</dd></div></dl><button type='button'>View opportunity <ExternalLink aria-hidden='true' /></button></div>
    </aside>
  )

  return (
    <div className={styles.workspaceView} data-view='review'>
      {checklist}
      <section className={styles.workspaceCanvas} aria-labelledby='review-title'>
        <div className={styles.workspaceTitle}><p>Review and submit</p><h1 id='review-title' tabIndex={-1}>{confirmed ? 'Submitted to North River Review' : previewState === 'unconfirmed' ? 'Submission not yet confirmed' : 'Review your application'}</h1><span>{confirmed ? 'North River Review received your application for Saltwater Lessons on Aug 15, 2026 at 10:42 AM.' : previewState === 'unconfirmed' ? 'Tell us whether you completed the submission on Submittable.' : 'Review the completed application, then make the final submission decision.'}</span></div>
        <div className={styles.statePreview} aria-label='Submission state preview'><span>State preview</span><button type='button' aria-pressed={previewState === 'review'} onClick={() => showState('review')}>Ready</button><button type='button' aria-pressed={previewState === 'submitted'} onClick={() => showState('submitted')}>Confirmed receipt</button><button type='button' aria-pressed={previewState === 'unconfirmed'} onClick={() => showState('unconfirmed')}>External handoff</button></div>

        {previewState === 'review' && !confirmed ? (
          <>
            <section className={styles.reviewSections} aria-labelledby='review-sections-title'>
              <div className={styles.reviewSectionsHeader}><p>Application review</p><h2 id='review-sections-title'>Everything North River Review will receive</h2></div>
              {[
                ['Eligibility', 'Complete', 'Location, age, practice, and submission eligibility', 'graph'],
                ['Project details', 'Complete', 'Saltwater Lessons · Essay and field recordings', 'graph'],
                ['Work samples', 'Complete', 'Saltwater Lessons · 12 images · PDF statement', 'workspace'],
                ['Budget', 'Complete', '$6,000 requested · $8,200 total project costs', 'budget'],
              ].map(([label, status, detail, destination]) => <article key={label}><CheckCircle2 aria-hidden='true' /><div><span>{status}</span><h3>{label}</h3><p>{detail}</p></div><button type='button' onClick={() => onNavigate(destination as ViewId)}>Review</button></article>)}
            </section>

            <section className={styles.finalConfirmation} aria-labelledby='confirmation-title'>
              <div><p>Final confirmation</p><h2 id='confirmation-title'>Before submitting, confirm that your application is accurate and that you have the right to submit the included work.</h2></div>
              <label className={styles.confirmationCheck}><input type='checkbox' checked={creatorConfirmed} onChange={(event) => setCreatorConfirmed(event.target.checked)} /><span><strong>Required checkbox</strong>I confirm that the information in this application is accurate and that I have permission to submit the included work and files.</span></label>
              <label className={styles.confirmationCheck}><input type='checkbox' checked={termsConfirmed} onChange={(event) => setTermsConfirmed(event.target.checked)} /><span><strong>Organization-specific checkbox</strong>I agree to North River Review’s submission terms and acknowledge its privacy notice.</span></label>
              <button type='button' className={styles.textButton}>View submission terms <ExternalLink aria-hidden='true' /></button>
              <p className={styles.cautionCopy}>After you submit, you may not be able to change your application.</p>
            </section>

            <section className={styles.readySubmit} aria-labelledby='ready-title'>
              <div><p>Ready to submit</p><h2 id='ready-title'>Your application is complete</h2><span>You’ll submit directly to North River Review.</span><span>After you submit, Missa will save a dated copy of the application and its receipt in Tracker. Messages and status updates received through your connected accounts will stay with this submission.</span></div>
              <div className={styles.workspaceActions}><button type='button' className={styles.primaryButton} disabled={!creatorConfirmed || !termsConfirmed} onClick={() => setConfirmOpen(true)}>Submit to North River Review <Send aria-hidden='true' /></button><button type='button' className={styles.secondaryButton} onClick={() => setPreviewOpen(true)}>Preview application</button><button type='button' className={styles.secondaryButton} onClick={() => setSaveMessage('Draft saved just now')}>Save draft</button><button type='button' className={styles.textButton} onClick={() => onNavigate('budget')}>Back to Budget</button></div>
              <p className={styles.saveStatus}><Check aria-hidden='true' /> {saveMessage}</p>
            </section>
          </>
        ) : null}

        {confirmed ? (
          <section className={styles.submissionOutcome} aria-live='polite'>
            <div className={styles.outcomeHeader}><CheckCircle2 aria-hidden='true' /><p>Submitted</p><h2>Submitted to North River Review</h2><span>North River Review received your application for Saltwater Lessons on Aug 15, 2026 at 10:42 AM.</span></div>
            <dl><div><dt>Submission reference</dt><dd>{state.receipt || 'NRR-2026-1842'}</dd></div><div><dt>Submitted by</dt><dd>Nasreen Adeyemi</dd></div><div><dt>Expected response</dt><dd>No response date provided</dd></div><div><dt>Status</dt><dd>Submitted · Awaiting response</dd></div></dl>
            <div className={styles.outcomeActions}><button type='button' className={styles.primaryButton} onClick={() => setPreviewOpen(true)}>View submission</button><button type='button' className={styles.secondaryButton} onClick={downloadReceipt}><Download aria-hidden='true' /> Download receipt</button><button type='button' className={styles.textButton} onClick={() => onNavigate('overview')}>Return to Tracker</button></div>
            <div className={styles.whatNext}><p>What happens next</p><span>Missa saved the submitted copy and receipt in Tracker. Messages and status updates received through your connected accounts will appear with this submission.</span></div>
          </section>
        ) : null}

        {previewState === 'unconfirmed' && !confirmed ? (
          <section className={styles.unconfirmedState} aria-live='polite'>
            <ReceiptText aria-hidden='true' /><p>Submission not yet confirmed</p><h2>Tell us whether you completed the submission on Submittable.</h2><span>Missa will keep this application as a draft until you provide a confirmation or receipt.</span>
            <label><span>Provider confirmation or receipt</span><input value={receiptValue} onChange={(event) => setReceiptValue(event.target.value)} placeholder='Add confirmation number' /></label>
            <div><button type='button' className={styles.primaryButton} disabled={!receiptValue.trim()} onClick={saveExternalReceipt}>Save receipt</button><button type='button' className={styles.secondaryButton} onClick={() => showState('review')}>I’m still working on it</button></div>
          </section>
        ) : null}
      </section>
      {progress}

      {confirmOpen ? (
        <div className={styles.modalBackdrop} role='presentation' onMouseDown={(event) => { if (event.currentTarget === event.target && !submitting) setConfirmOpen(false) }}>
          <section className={styles.proofDialog} role='dialog' aria-modal='true' aria-labelledby='submit-title'>
            <button type='button' className={styles.dialogClose} onClick={() => setConfirmOpen(false)} aria-label='Close submission confirmation' disabled={submitting}><X aria-hidden='true' /></button>
            <Send aria-hidden='true' className={styles.dialogIcon} />
            <p>Final action</p><h2 id='submit-title'>Submit to North River Review?</h2><span>This sends the application and included files to North River Review. Missa will only mark it Submitted after the provider returns confirmation.</span>
            <div className={styles.dialogActions}><button type='button' className={styles.secondaryButton} onClick={() => setConfirmOpen(false)} disabled={submitting}>Go back</button><button type='button' className={styles.primaryButton} onClick={confirmProviderReceipt} disabled={submitting}>{submitting ? 'Waiting for confirmation…' : 'Submit application'}</button></div>
          </section>
        </div>
      ) : null}

      {previewOpen ? (
        <div className={styles.modalBackdrop} role='presentation' onMouseDown={(event) => { if (event.currentTarget === event.target) setPreviewOpen(false) }}>
          <section className={`${styles.proofDialog} ${styles.applicationPreviewDialog}`} role='dialog' aria-modal='true' aria-labelledby='preview-title'>
            <button type='button' className={styles.dialogClose} onClick={() => setPreviewOpen(false)} aria-label='Close application preview'><X aria-hidden='true' /></button>
            <FileCheck2 aria-hidden='true' className={styles.dialogIcon} />
            <p>{confirmed ? 'Submitted copy' : 'Application preview'}</p><h2 id='preview-title'>Saltwater Lessons</h2><span>North River Review · Call for submissions</span>
            <dl><div><dt>Project</dt><dd>Essay and field recordings · 2023</dd></div><div><dt>Work samples</dt><dd>12 images · PDF statement</dd></div><div><dt>Amount requested</dt><dd>$6,000</dd></div><div><dt>Total project costs</dt><dd>$8,200</dd></div></dl>
            <div className={styles.dialogActions}><button type='button' className={styles.primaryButton} onClick={() => setPreviewOpen(false)}>Close preview</button></div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

function ChangeImpact({ state, setState, onContinue }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; onContinue: () => void }) {
  const [detail, setDetail] = useState<'summary' | 'source'>('summary')
  return (
    <div className={styles.view} data-view='impact'>
      <SectionHeading
        eyebrow='Opportunity version v3 → v4'
        title={state.versionAccepted ? 'The reviewed change is now part of this application.' : 'One source change affects two components.'}
        description={state.versionAccepted ? 'Tracker created a new application revision. Earlier responses and asset versions remain available in history.' : 'North River Review changed its file-size limit after you compiled. Nothing in your active application has been rewritten.'}
        action={<div className={styles.versionBadge}><GitCompareArrows aria-hidden='true' /><span>Detected Aug 15, 2026<strong>Official guidelines</strong></span></div>}
      />
      <div className={styles.impactLayout}>
        <section className={styles.diffPanel} aria-labelledby='change-title'>
          <div className={styles.diffHeader}><div><h2 id='change-title'>Exact source difference</h2><p>Section 4 · Work samples</p></div><div className={styles.segmented}><button type='button' aria-pressed={detail === 'summary'} onClick={() => setDetail('summary')}>Summary</button><button type='button' aria-pressed={detail === 'source'} onClick={() => setDetail('source')}>Source text</button></div></div>
          {detail === 'summary' ? (
            <div className={styles.diffColumns}>
              <div><span>Version 3 · compiled</span><p>Each uploaded file may be up to <del>25 MB</del>.</p><small>Published Aug 3, 2026</small></div>
              <ArrowRight aria-hidden='true' />
              <div><span>Version 4 · current</span><p>Each uploaded file may be up to <ins>10 MB</ins>.</p><small>Published Aug 15, 2026</small></div>
            </div>
          ) : (
            <blockquote>“Submit no more than two work samples. Written work must not exceed 6,000 words. Audio and video must not exceed five minutes. Each uploaded file may be up to 10 MB.”</blockquote>
          )}
          <div className={styles.sourceEvidence}><Globe2 aria-hidden='true' /><div><strong>Source captured from the official application guidelines.</strong><span>Tracker stores the source reference, capture time, and opportunity version with this application revision.</span></div><button type='button'>Open source <ExternalLink aria-hidden='true' /></button></div>
        </section>

        <section className={styles.affectedPanel} aria-labelledby='affected-title'>
          <div><p>Affected work</p><h2 id='affected-title'>What needs your review</h2></div>
          <article><div className={styles.impactIcon}><FileCheck2 aria-hidden='true' /></div><div><span>Work sample 1</span><strong>Saltwater Lessons — PDF</strong><p>Current export is 8.4 MB. It remains within the new limit.</p></div><span className={styles.safeState}><Check aria-hidden='true' />Still valid</span></article>
          <article><div className={styles.impactIcon}><Play aria-hidden='true' /></div><div><span>Work sample 2</span><strong>Saltwater Lessons — audio excerpt</strong><p>Current export is 14.2 MB. Create a new version at 10 MB or less.</p></div><button type='button' className={styles.secondaryButton}>Prepare smaller version</button></article>
          <article><div className={styles.impactIcon}><CalendarDays aria-hidden='true' /></div><div><span>Schedule</span><strong>Compliance review</strong><p>Adds one estimated 20-minute task. No calendar projection changes until you approve them.</p></div><span className={styles.reviewState}>Review</span></article>
        </section>
      </div>
      <div className={styles.impactDecision}>
        <div><ShieldCheck aria-hidden='true' /><span><strong>{state.versionAccepted ? 'Revision 2 active' : 'Your current application remains on version 3.'}</strong><small>{state.versionAccepted ? 'The new file limit and impact review are recorded.' : 'Accepting creates a new private application revision; it does not overwrite revision 1.'}</small></span></div>
        <div>{!state.versionAccepted ? <button type='button' className={styles.secondaryButton}>Keep version 3 for now</button> : null}<button type='button' className={styles.primaryButton} onClick={() => { if (!state.versionAccepted) setState((current) => ({ ...current, versionAccepted: true })); else onContinue() }}>{state.versionAccepted ? <>Continue to Apply Bridge <ArrowRight aria-hidden='true' /></> : <>Accept and create revision <Check aria-hidden='true' /></>}</button></div>
      </div>
    </div>
  )
}

function ApplyBridge({ state, setState }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }) {
  const [proofOpen, setProofOpen] = useState(false)
  const [receiptValue, setReceiptValue] = useState('')
  const readyFields = 12
  const finalActionLabel = getFinalActionLabel(northRiverFinalAction)
  return (
    <div className={styles.view} data-view='bridge'>
      <SectionHeading
        eyebrow='Apply Bridge · Universal package'
        title={state.submitted ? 'Submission proof recorded.' : 'Carry reviewed work to the destination.'}
        description={state.submitted ? 'The provider receipt and follow-up obligations now belong to this private application record.' : 'Tracker can prepare and fill supported fields. You handle protected steps and make the final submission decision.'}
        action={<div className={styles.bridgeMode}><PackageCheck aria-hidden='true' /><span>Destination<strong>North River Review portal</strong></span></div>}
      />

      {state.submitted ? (
        <section className={styles.receiptView}>
          <div className={styles.receiptHero}><CheckCircle2 aria-hidden='true' /><p>Submitted</p><h2>North River Review — Call for Submissions</h2><span>Proof recorded Aug 15, 2026 at 11:42 AM</span></div>
          <dl><div><dt>Receipt</dt><dd>{state.receipt}</dd></div><div><dt>Application revision</dt><dd>Revision 2 · opportunity v4</dd></div><div><dt>Package fingerprint</dt><dd>pkg-50c1-a38f</dd></div><div><dt>Destination</dt><dd>North River Review portal</dd></div></dl>
          <div className={styles.followUp}><CalendarDays aria-hidden='true' /><div><strong>Follow-up created in Missa</strong><span>Estimated response window: October 2026. This is a private reminder, not a provider commitment.</span></div><button type='button'>Review follow-up</button></div>
          <div className={styles.receiptActions}><button type='button' className={styles.primaryButton}><Download aria-hidden='true' /> Download receipt record</button><button type='button' className={styles.secondaryButton}>Open application history</button></div>
        </section>
      ) : (
        <div className={styles.bridgeLayout}>
          <section className={styles.bridgeTable} aria-labelledby='mapping-title'>
            <div className={styles.bridgeTableHeader}><div><h2 id='mapping-title'>Field mapping</h2><p>Application revision 2 · 16 components · package prepared</p></div><button type='button' className={styles.secondaryButton}><Download aria-hidden='true' /> Download package</button></div>
            <div className={styles.mappingSummary}><span><CheckCircle2 aria-hidden='true' />Ready <strong>12</strong></span><span><Info aria-hidden='true' />Review <strong>2</strong></span><span><AlertTriangle aria-hidden='true' />Missing <strong>1</strong></span><span><LockKeyhole aria-hidden='true' />Protected <strong>3</strong></span></div>
            <div className={styles.mappingRows} role='table' aria-label='External form mapping status'>
              {[
                ['Contact name', 'Profile · public name', 'Ready', 'ready'],
                ['Project title', 'Saltwater Lessons', 'Ready', 'ready'],
                ['Project statement', 'Narrative · revision 4', 'Review', 'review'],
                ['Work sample 1', 'Saltwater Lessons.pdf · 8.4 MB', 'Ready', 'ready'],
                ['Work sample 2', 'Saltwater Lessons-audio.mp3 · 9.8 MB', 'Ready', 'ready'],
                ['Prior publication', 'No confirmed answer', 'Missing', 'missing'],
                ['Application fee', 'Handled on destination', 'Protected', 'protected'],
                ['Eligibility attestation', 'User confirmation required', 'Protected', 'protected'],
                ['Submit application', 'User action required', 'Protected', 'protected'],
              ].map(([field, value, label, mappingState], index) => (
                <div role='row' key={field} className={styles[`mapping_${mappingState}`]}>
                  <span role='cell'>{String(index + 1).padStart(2, '0')}</span><strong role='cell'>{field}</strong><span role='cell'>{value}</span><span role='cell'>{index < state.filledFields ? 'Filled' : label}</span>
                </div>
              ))}
            </div>
          </section>

          <aside className={styles.bridgeControls}>
            <p>Controlled handoff</p>
            <div className={styles.destinationTicket}><Link2 aria-hidden='true' /><div><span>Short-lived destination ticket</span><strong>This application · this portal · approved fields only</strong></div></div>
            <div className={styles.fillProgress}><span>{state.filledFields} of {readyFields} supported fields filled</span><div className={styles.progressTrack}><i style={{ width: `${(state.filledFields / readyFields) * 100}%` }} /></div></div>
            <button type='button' className={styles.primaryButton} onClick={() => setState((current) => ({ ...current, filledFields: current.filledFields === readyFields ? 0 : readyFields }))}>{state.filledFields === readyFields ? <><RotateCcw aria-hidden='true' /> Reset fill simulation</> : <><Send aria-hidden='true' /> Fill verified fields</>}</button>
            <p className={styles.bridgeBoundary}><LockKeyhole aria-hidden='true' />Nothing is sent until you choose {finalActionLabel}.</p>
            <button type='button' className={styles.primaryButton} onClick={() => setState((current) => ({ ...current, submitted: true, receipt: 'NRR-2026-2714' }))}><Send aria-hidden='true' /> {finalActionLabel}</button>
            <button type='button' className={styles.secondaryButton} onClick={() => setProofOpen(true)}><ReceiptText aria-hidden='true' /> Record external proof instead</button>
          </aside>
        </div>
      )}

      {proofOpen ? (
        <div className={styles.modalBackdrop} role='presentation' onMouseDown={(event) => { if (event.currentTarget === event.target) setProofOpen(false) }}>
          <section className={styles.proofDialog} role='dialog' aria-modal='true' aria-labelledby='proof-title'>
            <button type='button' className={styles.dialogClose} onClick={() => setProofOpen(false)} aria-label='Close proof dialog'><X aria-hidden='true' /></button>
            <ReceiptText aria-hidden='true' className={styles.dialogIcon} />
            <p>Submission proof</p><h2 id='proof-title'>Record what the provider returned.</h2><span>This changes the application to Submitted. It does not submit anything to the provider.</span>
            <label><span>Receipt or confirmation number</span><input value={receiptValue} onChange={(event) => setReceiptValue(event.target.value)} placeholder='NRR-2026-0000' autoFocus /></label>
            <label className={styles.fileStub}><Upload aria-hidden='true' /><span><strong>Optional receipt file</strong><small>PDF, PNG, or email export · prototype only</small></span><button type='button'>Choose file</button></label>
            <div className={styles.dialogActions}><button type='button' className={styles.secondaryButton} onClick={() => setProofOpen(false)}>Cancel</button><button type='button' className={styles.primaryButton} disabled={!receiptValue.trim()} onClick={() => { setState((current) => ({ ...current, submitted: true, receipt: receiptValue.trim() })); setProofOpen(false) }}>Record proof <Check aria-hidden='true' /></button></div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

function PrototypeNavigator({ current, onNavigate }: { current: ViewId; onNavigate: (view: ViewId) => void }) {
  const prototypeCurrent = prototypeViews.some((view) => view.id === current) ? current : applicationViewIds.has(current) ? 'graph' : 'overview'
  const index = prototypeViews.findIndex((view) => view.id === prototypeCurrent)
  const move = (offset: number) => onNavigate(prototypeViews[(index + offset + prototypeViews.length) % prototypeViews.length].id)
  return (
    <div className={styles.prototypeNavigator} aria-label='Prototype view navigator'>
      <button type='button' onClick={() => move(-1)} aria-label='Previous prototype view'><ArrowLeft aria-hidden='true' /></button>
      <div><span>Tracker view {index + 1} / {prototypeViews.length}</span><strong>{prototypeViews[index].label}</strong></div>
      <button type='button' onClick={() => move(1)} aria-label='Next prototype view'><ArrowRight aria-hidden='true' /></button>
    </div>
  )
}

export function ApplicationOfficePrototype() {
  const [current, setCurrent] = useState<ViewId>('overview')
  const [state, setState] = useState<AppState>(initialState)
  const [railCollapsed, setRailCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const view = new URLSearchParams(window.location.search).get('view') as ViewId | null
    if (!view || !allViewIds.has(view)) return
    const frame = window.requestAnimationFrame(() => setCurrent(view))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  const navigate = useCallback((view: ViewId) => {
    setCurrent(view)
    const url = new URL(window.location.href)
    url.searchParams.set('view', view)
    window.history.replaceState({}, '', url)
    window.requestAnimationFrame(() => {
      const title = mainRef.current?.querySelector<HTMLElement>('h1')
      title?.focus()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return
      const prototypeCurrent = prototypeViews.some((view) => view.id === current) ? current : applicationViewIds.has(current) ? 'graph' : 'overview'
      const index = prototypeViews.findIndex((view) => view.id === prototypeCurrent)
      if (event.key === 'ArrowLeft') navigate(prototypeViews[(index - 1 + prototypeViews.length) % prototypeViews.length].id)
      if (event.key === 'ArrowRight') navigate(prototypeViews[(index + 1) % prototypeViews.length].id)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [current, navigate])

  const inspectState = useMemo(() => ({ view: current, ...state }), [current, state])

  return (
    <div className={styles.shell} data-density='comfortable'>
      <a href='#tracker-main' className={styles.skipLink}>Skip to Tracker</a>
      <AppHeader current={current} submitted={state.submitted} onNavigate={navigate} onMenu={() => setMobileMenuOpen(true)} />
      <div className={`${styles.officeShell} ${railCollapsed ? styles.officeShellCollapsed : ''}`}>
        <TrackerRail current={current} onNavigate={navigate} collapsed={railCollapsed} onToggle={() => setRailCollapsed((value) => !value)} mobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
        <main id='tracker-main' ref={mainRef} className={styles.main}>
          {current === 'overview' ? <TrackerOverview onNavigate={navigate} /> : null}
          {current === 'for-you' ? <PersonalizedOpportunities onNavigate={navigate} /> : null}
          {current === 'notifications' ? <TrackerNotifications onNavigate={navigate} /> : null}
          {current === 'pipeline' ? <TrackerPipeline onNavigate={navigate} /> : null}
          {current === 'calendar' ? <TrackerCalendar onNavigate={navigate} /> : null}
          {current === 'submissions' ? <TrackerSubmissions /> : null}
          {current === 'work' ? <TrackerWork onNavigate={navigate} /> : null}
          {current === 'messages' ? <TrackerMessages /> : null}
          {current === 'archive' ? <TrackerArchive /> : null}
          {current === 'map' ? <TrackerMap /> : null}
          {current === 'compile' ? <CompilePreview state={state} setState={setState} onContinue={() => navigate('graph')} /> : null}
          {current === 'graph' ? <LivingGraph state={state} onNavigate={navigate} /> : null}
          {current === 'workspace' ? <ComponentWorkspace state={state} setState={setState} /> : null}
          {current === 'budget' ? <BudgetWorkspace state={state} setState={setState} onNavigate={navigate} /> : null}
          {current === 'review' ? <ReviewSubmitWorkspace state={state} setState={setState} onNavigate={navigate} /> : null}
          {current === 'impact' ? <ChangeImpact state={state} setState={setState} onContinue={() => navigate('bridge')} /> : null}
          {current === 'bridge' ? <ApplyBridge state={state} setState={setState} /> : null}
          <details className={styles.stateInspector}>
            <summary><Fingerprint aria-hidden='true' /> Inspect prototype state</summary>
            <pre>{JSON.stringify(inspectState, null, 2)}</pre>
          </details>
        </main>
      </div>
      <PrototypeNavigator current={current} onNavigate={navigate} />
    </div>
  )
}
