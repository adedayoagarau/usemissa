'use client'

import {
  AlertCircle,
  ArrowRight,
  Banknote,
  Bell,
  Building2,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  FileCheck2,
  FileText,
  Gavel,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

import { MissaWordmark } from '@/components/missa-wordmark'
import styles from './organization-directions.module.css'

type Direction = 'rail' | 'ledger' | 'desk'
type Surface = 'chooser' | 'overview'
type Role = 'Owner' | 'Admin' | 'Program manager' | 'Reviewer' | 'Finance' | 'Viewer'
type Fixture =
  | 'active'
  | 'none'
  | 'one'
  | 'many'
  | 'invite'
  | 'suspended'
  | 'new'
  | 'reviewer'
  | 'program'
  | 'finance'
  | 'viewer'
  | 'long'
  | 'large'
  | 'taxonomy-conflict'
  | 'triage'
  | 'reviews'
  | 'mixed-decisions'
  | 'message-failure'
  | 'delivery'
  | 'billing'
  | 'unavailable'
  | 'switch-interrupted'
  | 'foreign'
  | 'command-empty'
  | 'mobile-urgent'

type Organization = { id: string; name: string; role: Role; available: boolean; note?: string }
type AttentionItem = { id: string; title: string; detail: string; scope: string; action: string; tone: 'danger' | 'warning' | 'info'; icon: typeof AlertCircle }

const directions = [
  { id: 'rail' as const, number: '01', name: 'Context rail', description: 'A stable Organization rail keeps context, role, and operational destinations visible.' },
  { id: 'ledger' as const, number: '02', name: 'Operations ledger', description: 'An editorial context header and horizontal index make the whole operation readable.' },
  { id: 'desk' as const, number: '03', name: 'Attention desk', description: 'A consequence-first task index leads into the selected operational overview.' },
]

const fixtureOptions: Array<{ value: Fixture; label: string }> = [
  { value: 'active', label: 'Active Organization' },
  { value: 'none', label: 'No memberships' },
  { value: 'one', label: 'One Organization' },
  { value: 'many', label: 'Several Organizations' },
  { value: 'invite', label: 'Pending invitation' },
  { value: 'suspended', label: 'Organization unavailable' },
  { value: 'new', label: 'New Organization' },
  { value: 'reviewer', label: 'Reviewer role' },
  { value: 'program', label: 'Program manager role' },
  { value: 'finance', label: 'Finance role' },
  { value: 'viewer', label: 'Read-only viewer' },
  { value: 'long', label: 'Long names' },
  { value: 'large', label: 'Large portfolio and queue' },
  { value: 'taxonomy-conflict', label: 'Blocked taxonomy rules' },
  { value: 'triage', label: 'Submissions need triage' },
  { value: 'reviews', label: 'Overdue reviews' },
  { value: 'mixed-decisions', label: 'Mixed Work decisions' },
  { value: 'message-failure', label: 'Message preparation failed' },
  { value: 'delivery', label: 'Delivery needs attention' },
  { value: 'billing', label: 'Billing and seats' },
  { value: 'unavailable', label: 'Overview unavailable' },
  { value: 'switch-interrupted', label: 'Switch interrupted' },
  { value: 'foreign', label: 'Access no longer available' },
  { value: 'command-empty', label: 'Command has no results' },
  { value: 'mobile-urgent', label: 'Urgent mobile action' },
]

const organizations: Organization[] = [
  { id: 'north-river', name: 'North River Review', role: 'Owner', available: true },
  { id: 'common-ground', name: 'Common Ground Arts', role: 'Program manager', available: true },
  { id: 'meridian', name: 'Meridian Foundation', role: 'Reviewer', available: true },
  { id: 'atlas', name: 'Atlas Arts Council', role: 'Finance', available: false, note: 'Access is temporarily unavailable' },
]

const navItems = [
  { label: 'Overview', icon: LayoutDashboard, roles: ['Owner', 'Admin', 'Program manager', 'Reviewer', 'Finance', 'Viewer'] },
  { label: 'Opportunities', icon: Sparkles, roles: ['Owner', 'Admin', 'Program manager', 'Viewer'] },
  { label: 'Submissions', icon: Inbox, roles: ['Owner', 'Admin', 'Program manager', 'Viewer'] },
  { label: 'Reviews', icon: FileCheck2, roles: ['Owner', 'Admin', 'Program manager', 'Reviewer', 'Viewer'] },
  { label: 'Decisions', icon: Gavel, roles: ['Owner', 'Admin', 'Program manager', 'Viewer'] },
  { label: 'Messages', icon: MessageSquare, roles: ['Owner', 'Admin', 'Program manager'] },
  { label: 'Delivery', icon: CalendarClock, roles: ['Owner', 'Admin', 'Program manager', 'Viewer'] },
  { label: 'Insights', icon: FileText, roles: ['Owner', 'Admin', 'Program manager', 'Finance', 'Viewer'] },
  { label: 'People', icon: Users, roles: ['Owner', 'Admin'] },
  { label: 'Settings', icon: Settings, roles: ['Owner', 'Admin', 'Finance'] },
] as const

const activeOpportunities = [
  { title: '2027 Poetry and Essay Prize', program: 'Annual Awards', state: 'Published', submissions: 184, action: 'Open submissions' },
  { title: 'New Voices Residency', program: 'Residencies', state: 'Draft blocked', submissions: null, action: 'Review draft' },
  { title: 'Emerging Editors Fellowship', program: 'Fellowships', state: 'Closed', submissions: 72, action: 'Open reviews' },
]

function roleFor(fixture: Fixture): Role {
  if (fixture === 'reviewer') return 'Reviewer'
  if (fixture === 'program') return 'Program manager'
  if (fixture === 'finance' || fixture === 'billing') return 'Finance'
  if (fixture === 'viewer') return 'Viewer'
  return 'Owner'
}

function fixtureSurface(fixture: Fixture): Surface {
  return ['none', 'one', 'many', 'invite', 'suspended', 'switch-interrupted', 'foreign'].includes(fixture) ? 'chooser' : 'overview'
}

function attentionFor(fixture: Fixture, role: Role): AttentionItem[] {
  if (fixture === 'new' || role === 'Viewer') return []
  if (role === 'Reviewer') return [
    { id: 'review-1', title: '3 reviews are due tomorrow', detail: 'Your assigned reviews for Emerging Editors Fellowship are incomplete.', scope: 'Emerging Editors Fellowship', action: 'Open my reviews', tone: 'warning', icon: CalendarClock },
  ]
  if (role === 'Finance') return [
    { id: 'payout-1', title: 'Payout details need review', detail: 'New application fees cannot be paid out until an owner or finance member completes setup.', scope: 'Organization billing', action: 'Review payouts', tone: 'warning', icon: CircleDollarSign },
  ]
  const base: AttentionItem[] = [
    { id: 'decision-1', title: '12 decisions are ready to communicate', detail: 'Every Work has an outcome. Review recipient scope and message copy before sending.', scope: '2027 Poetry and Essay Prize', action: 'Review decisions', tone: 'warning', icon: Gavel },
    { id: 'triage-1', title: '28 submissions need triage', detail: 'These submissions have not been assigned to a review round.', scope: 'New Voices Residency', action: 'Open unassigned', tone: 'info', icon: Inbox },
    { id: 'delivery-1', title: '2 accepted Works have overdue tasks', detail: 'The tasks remain incomplete in Missa; external delivery is not inferred.', scope: 'Emerging Editors Fellowship', action: 'Open delivery', tone: 'danger', icon: CalendarClock },
  ]
  if (fixture === 'taxonomy-conflict') return [{ id: 'taxonomy', title: 'A draft cannot be published yet', detail: 'One field rule conflicts with a more specific choice. Eligibility and form questions are unaffected.', scope: 'New Voices Residency', action: 'Review field rules', tone: 'danger', icon: AlertCircle }]
  if (fixture === 'triage') return [base[1]!]
  if (fixture === 'reviews') return [{ id: 'reviews', title: '7 assigned reviews are overdue', detail: 'Two reviewers have not completed their assignments. Review state remains separate from decisions.', scope: 'Emerging Editors Fellowship', action: 'Review assignments', tone: 'danger', icon: FileCheck2 }]
  if (fixture === 'mixed-decisions') return [{ id: 'mixed', title: '4 Submissions contain mixed Work outcomes', detail: 'Each Work has its own decision. Confirm the combined applicant message before sending.', scope: '2027 Poetry and Essay Prize', action: 'Review mixed outcomes', tone: 'warning', icon: Gavel }]
  if (fixture === 'message-failure') return [{ id: 'message', title: 'Decision messages were not prepared', detail: 'No message was sent. Decisions are unchanged and can be prepared again.', scope: '2027 Poetry and Essay Prize', action: 'Try preparing again', tone: 'danger', icon: MessageSquare }]
  if (fixture === 'delivery') return [base[2]!, { id: 'no-date', title: '3 delivery tasks have no due date', detail: 'Assign a due date or explicitly keep them undated.', scope: 'Accepted Works', action: 'Review undated tasks', tone: 'info', icon: CalendarClock }]
  if (fixture === 'billing') return [{ id: 'billing', title: 'The Organization has reached its seat limit', detail: 'Existing access continues. An owner must remove a seat or change the plan before inviting another person.', scope: 'People and billing', action: 'Review seats', tone: 'warning', icon: Users }]
  if (fixture === 'mobile-urgent') return [{ id: 'urgent', title: 'Decision messages need confirmation today', detail: 'Review recipient scope and the mixed Work outcomes before sending.', scope: '2027 Poetry and Essay Prize', action: 'Review now', tone: 'danger', icon: Bell }]
  return fixture === 'large' ? [...base, ...base.map((item, index) => ({ ...item, id: `${item.id}-${index}`, title: `${item.title} · Program ${index + 2}` }))] : base
}

function AppHeader({ onOpenCommand }: { onOpenCommand: () => void }) {
  return <header className={styles.appHeader}><MissaWordmark href='#organization-content' size='app' className={styles.wordmark} /><nav aria-label='Product navigation'><a href='#'>Profile</a><a href='#' aria-current='page'>Organization</a></nav><div className={styles.headerActions}><Button type='button' variant='outline' size='sm' onClick={onOpenCommand}><Search aria-hidden='true' />Search<span className={styles.shortcut}>⌘K</span></Button><Button type='button' variant='ghost' size='icon' aria-label='Open Inbox'><Bell aria-hidden='true' /></Button><button type='button' className={styles.avatar} aria-label='Open Profile'>AO</button></div></header>
}

function ReviewBar({ direction, selectedOnly, setDirection, fixture, setFixture, surface, setSurface }: { direction: Direction; selectedOnly: boolean; setDirection: (value: Direction) => void; fixture: Fixture; setFixture: (value: Fixture) => void; surface: Surface; setSurface: (value: Surface) => void }) {
  return <div className={styles.reviewBar} aria-label='Design review controls'>{selectedOnly ? null : <div className={styles.directionButtons} role='group' aria-label='Organization visual direction'>{directions.map((item) => <button type='button' key={item.id} data-active={direction === item.id} aria-pressed={direction === item.id} onClick={() => setDirection(item.id)}><span>{item.number}</span>{item.name}</button>)}</div>}<div className={styles.surfaceButtons} role='group' aria-label='Organization surface'><button type='button' data-active={surface === 'chooser'} aria-pressed={surface === 'chooser'} onClick={() => setSurface('chooser')}>Chooser</button><button type='button' data-active={surface === 'overview'} aria-pressed={surface === 'overview'} onClick={() => setSurface('overview')}>Overview</button></div><label><span>Edge state</span><select aria-label='Organization edge state' value={fixture} onChange={(event) => setFixture(event.target.value as Fixture)}>{fixtureOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>
}

function OrganizationMark({ name }: { name: string }) {
  return <span className={styles.organizationMark} aria-hidden='true'>{name.split(/\s+/).slice(0, 2).map((word) => word[0]).join('')}</span>
}

function Chooser({ fixture, onEnter, onStatus }: { fixture: Fixture; onEnter: (organization: Organization) => void; onStatus: (message: string) => void }) {
  const [query, setQuery] = useState('')
  const all = fixture === 'one' ? organizations.slice(0, 1) : fixture === 'suspended' ? organizations.filter((item) => !item.available) : organizations
  const filtered = all.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()))
  const none = fixture === 'none' || fixture === 'foreign'
  return <main id='organization-content' className={styles.chooserMain}><header><p className={styles.eyebrow}>Organization</p><h1>{none ? 'Connect an Organization' : 'Choose an Organization'}</h1><p>{none ? 'Create an Organization, ask to join one, or accept an invitation when you receive it.' : 'Your role and access are shown before you enter. You can return here whenever you need to switch.'}</p></header>{fixture === 'switch-interrupted' ? <Alert variant='destructive'><AlertCircle aria-hidden='true' /><AlertTitle>We could not switch Organization</AlertTitle><AlertDescription>North River Review is still selected. No Common Ground Arts information was loaded.</AlertDescription></Alert> : null}{fixture === 'foreign' ? <Alert><ShieldCheck aria-hidden='true' /><AlertTitle>This Organization is not available to your account</AlertTitle><AlertDescription>Ask an owner to invite you, or return to an Organization you can access. Missa will not reveal private Organization details.</AlertDescription></Alert> : null}{fixture === 'invite' ? <section className={styles.invitation}><div><p className={styles.eyebrow}>Invitation</p><h2>Join Field Notes Foundation</h2><p>Mara Okafor invited you as a Program manager. Accepting gives you access to assigned Programs, Opportunities, submissions, reviews, and decisions.</p></div><div><Button type='button' onClick={() => onStatus('Invitation accepted. Field Notes Foundation is ready to enter.')}>Accept invitation</Button><Button type='button' variant='outline' onClick={() => onStatus('Invitation left pending.')}>Not now</Button></div></section> : null}{none ? <section className={styles.noMembership}><Building2 aria-hidden='true' /><h2>No Organization is connected yet</h2><p>Your creator Profile and Tracker are unchanged. Organization access is only for teams running opportunities and reviewing submissions.</p><div><Button type='button' onClick={() => onStatus('Create Organization flow opened.')}>Create Organization</Button><Button type='button' variant='outline' onClick={() => onStatus('Join request flow opened.')}>Ask to join</Button></div></section> : <section className={styles.chooserList} aria-labelledby='available-organizations'><div className={styles.chooserToolbar}><div><h2 id='available-organizations'>Available Organizations</h2><p>{all.length} membership{all.length === 1 ? '' : 's'}</p></div>{all.length > 2 ? <label><span className='sr-only'>Search Organizations</span><Search aria-hidden='true' /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder='Search Organizations' /></label> : null}</div><div>{filtered.map((organization) => <article key={organization.id} className={styles.organizationRow} data-unavailable={!organization.available}><OrganizationMark name={organization.name} /><div><h3>{organization.name}</h3><p>{organization.available ? `${organization.role} · Access available` : organization.note}</p></div><Badge variant='outline'>{organization.role}</Badge>{organization.available ? <Button type='button' variant='outline' onClick={() => onEnter(organization)}>Enter<ArrowRight aria-hidden='true' /></Button> : <span className={styles.unavailable}>Unavailable</span>}</article>)}{filtered.length === 0 ? <div className={styles.emptyResult}><Search aria-hidden='true' /><h3>No Organizations match “{query}”</h3><p>Clear the search or ask an owner for an invitation.</p><Button type='button' variant='outline' onClick={() => setQuery('')}>Clear search</Button></div> : null}</div><footer><Button type='button' variant='outline' onClick={() => onStatus('Create Organization flow opened.')}><Plus aria-hidden='true' />Create Organization</Button><Button type='button' variant='ghost' onClick={() => onStatus('Join request flow opened.')}>Ask to join</Button></footer></section>}</main>
}

function OrganizationSwitcher({ organization, role, onChoose }: { organization: Organization; role: Role; onChoose: () => void }) {
  return <button type='button' className={styles.organizationSwitcher} onClick={onChoose} aria-label={`Switch Organization. Current: ${organization.name}, ${role}`}><OrganizationMark name={organization.name} /><span><strong>{organization.name}</strong><small>{role}</small></span><ChevronDown aria-hidden='true' /></button>
}

function Navigation({ role, active, onNavigate, compact = false }: { role: Role; active: string; onNavigate: (label: string) => void; compact?: boolean }) {
  const visible = navItems.filter((item) => item.roles.includes(role as never))
  return <nav className={compact ? styles.horizontalNav : styles.sideNav} aria-label='Organization navigation'>{visible.map((item) => { const Icon = item.icon; return <a href={`#organization-${item.label.toLowerCase()}`} key={item.label} aria-current={active === item.label ? 'page' : undefined} onClick={(event) => { event.preventDefault(); onNavigate(item.label) }}><Icon aria-hidden='true' /><span>{item.label}</span></a> })}</nav>
}

function AttentionQueue({ items, onStatus, compact = false }: { items: AttentionItem[]; onStatus: (message: string) => void; compact?: boolean }) {
  return <section className={compact ? styles.attentionCompact : styles.attentionQueue} aria-labelledby={compact ? 'attention-compact-title' : 'attention-title'}><header><div><p className={styles.eyebrow}>Consequence first</p><h2 id={compact ? 'attention-compact-title' : 'attention-title'}>Needs attention</h2></div><span>{items.length || 'None'}</span></header>{items.length ? <div>{items.map((item) => { const Icon = item.icon; return <article key={item.id} data-tone={item.tone}><Icon aria-hidden='true' /><div><h3>{item.title}</h3><p>{item.detail}</p><small>{item.scope}</small></div><Button type='button' variant='ghost' onClick={() => onStatus(`${item.action} opened with the Organization and filter preserved.`)}>{item.action}<ChevronRight aria-hidden='true' /></Button></article> })}</div> : <div className={styles.emptyAttention}><Check aria-hidden='true' /><div><h3>No operational work needs attention</h3><p>New submissions, review deadlines, decisions, messages, and delivery tasks will appear here when you can act on them.</p></div></div>}</section>
}

function LifecycleSummary({ role, fixture, onStatus }: { role: Role; fixture: Fixture; onStatus: (message: string) => void }) {
  const values = fixture === 'new' ? [0, 0, 0, 0] : fixture === 'large' ? [18, 1248, 216, 42] : [3, 284, 46, 12]
  const rows = [
    { label: 'Active Opportunities', value: values[0], note: 'Published and accepting work', roles: ['Owner', 'Admin', 'Program manager', 'Viewer'] },
    { label: 'Submissions', value: values[1], note: 'Across current Programs', roles: ['Owner', 'Admin', 'Program manager', 'Viewer'] },
    { label: 'In review', value: values[2], note: role === 'Reviewer' ? 'Assigned to you' : 'Across visible review rounds', roles: ['Owner', 'Admin', 'Program manager', 'Reviewer', 'Viewer'] },
    { label: 'Decisions ready', value: values[3], note: 'Outcomes not yet communicated', roles: ['Owner', 'Admin', 'Program manager', 'Viewer'] },
    { label: 'Fees received', value: '₦3.8m', note: 'Current reporting period', roles: ['Owner', 'Admin', 'Finance'] },
  ].filter((row) => row.roles.includes(role))
  return <section className={styles.lifecycle} aria-labelledby='lifecycle-title'><header><div><p className={styles.eyebrow}>Current operation</p><h2 id='lifecycle-title'>Lifecycle summary</h2></div><p>Only information available to your role is shown.</p></header><div>{rows.map((row) => <button type='button' key={row.label} onClick={() => onStatus(`${row.label} opened with this Organization selected.`)}><span>{row.label}</span><strong>{row.value}</strong><small>{row.note}</small><ChevronRight aria-hidden='true' /></button>)}</div></section>
}

function OpportunitiesTable({ fixture, onStatus }: { fixture: Fixture; onStatus: (message: string) => void }) {
  const rows = fixture === 'new' ? [] : fixture === 'long' ? [{ ...activeOpportunities[0]!, title: 'The International Programme for Experimental Literature, Moving Image, and Cross-Disciplinary Public Culture', program: 'Long-form Program and International Partnership Development' }, ...activeOpportunities.slice(1)] : activeOpportunities
  return <section className={styles.opportunitiesTable} aria-labelledby='active-opportunities-title'><header><div><p className={styles.eyebrow}>Programs and calls</p><h2 id='active-opportunities-title'>Active Opportunities</h2></div><Button type='button' variant='outline' onClick={() => onStatus('All Opportunities opened for this Organization.')}>View all</Button></header>{rows.length ? <div className={styles.tableScroll}><table><thead><tr><th scope='col'>Opportunity</th><th scope='col'>Program</th><th scope='col'>State</th><th scope='col'>Submissions</th><th scope='col'><span className='sr-only'>Action</span></th></tr></thead><tbody>{rows.map((row) => <tr key={row.title}><th scope='row'>{row.title}</th><td>{row.program}</td><td><Badge variant='outline'>{fixture === 'taxonomy-conflict' && row.state.includes('Draft') ? 'Needs rule review' : row.state}</Badge></td><td>{row.submissions ?? '—'}</td><td><Button type='button' variant='ghost' onClick={() => onStatus(`${row.action} opened.`)}>{row.action}<ChevronRight aria-hidden='true' /></Button></td></tr>)}</tbody></table></div> : <div className={styles.emptyOpportunity}><Sparkles aria-hidden='true' /><div><h3>Create the first Opportunity</h3><p>Begin with the call facts, then add field rules, eligibility, geography, dates, fees, and the submission form as separate sections.</p></div><Button type='button' onClick={() => onStatus('New Opportunity builder opened.')}>Create Opportunity</Button></div>}</section>
}

function OverviewBody({ fixture, role, direction, onStatus }: { fixture: Fixture; role: Role; direction: Direction; onStatus: (message: string) => void }) {
  const attention = attentionFor(fixture, role)
  if (fixture === 'unavailable') return <main id='organization-content' className={styles.overviewMain}><header className={styles.pageHeader}><div><p className={styles.eyebrow}>North River Review · {role}</p><h1>Overview</h1><p>Know what needs attention across the operation.</p></div></header><Alert variant='destructive'><AlertCircle aria-hidden='true' /><AlertTitle>The Organization overview is unavailable</AlertTitle><AlertDescription>No counts or records are shown because Missa could not confirm this Organization-scoped projection. Try again without changing Organization.</AlertDescription><Button type='button' variant='outline' onClick={() => onStatus('Overview retry started for North River Review.')}>Try again</Button></Alert></main>
  return <main id='organization-content' className={styles.overviewMain}><header className={styles.pageHeader}><div><p className={styles.eyebrow}>North River Review · {role}</p><h1>Overview</h1><p>{role === 'Reviewer' ? 'Your assigned review work, without owner and administration clutter.' : role === 'Finance' ? 'Fees, payouts, and operational reporting available to Finance.' : role === 'Viewer' ? 'A read-only view of the Organization operation.' : 'Know what needs attention and move into the exact queue.'}</p></div>{role === 'Owner' || role === 'Admin' || role === 'Program manager' ? <Button type='button' onClick={() => onStatus('New Opportunity builder opened.')}><Plus aria-hidden='true' />Create Opportunity</Button> : null}</header>{fixture === 'billing' ? <Alert><Banknote aria-hidden='true' /><AlertTitle>Seat limit reached</AlertTitle><AlertDescription>Existing access continues. An owner must remove a seat or change the plan before another person can join.</AlertDescription></Alert> : null}{direction === 'desk' ? <div className={styles.deskGrid}><AttentionQueue items={attention} onStatus={onStatus} compact /><div><LifecycleSummary role={role} fixture={fixture} onStatus={onStatus} />{role !== 'Reviewer' && role !== 'Finance' ? <OpportunitiesTable fixture={fixture} onStatus={onStatus} /> : null}</div></div> : <><AttentionQueue items={attention} onStatus={onStatus} /><LifecycleSummary role={role} fixture={fixture} onStatus={onStatus} />{role !== 'Reviewer' && role !== 'Finance' ? <OpportunitiesTable fixture={fixture} onStatus={onStatus} /> : null}</>}</main>
}

function OverviewShell({ direction, fixture, onChoose, onCommand, onStatus }: { direction: Direction; fixture: Fixture; onChoose: () => void; onCommand: () => void; onStatus: (message: string) => void }) {
  const role = roleFor(fixture)
  const [active, setActive] = useState('Overview')
  const organization: Organization = { ...organizations[0]!, name: fixture === 'long' ? 'The International Foundation for Collaborative Literature and Public Culture' : organizations[0]!.name, role }
  function navigate(label: string) { setActive(label); onStatus(`${label} selected. This local direction keeps the Organization context.`) }
  const nav = <Navigation role={role} active={active} onNavigate={navigate} compact={direction === 'ledger'} />
  if (direction === 'ledger') return <div className={styles.organizationShell}><section className={styles.ledgerContext}><OrganizationSwitcher organization={organization} role={role} onChoose={onChoose} /><div><span>Current product</span><strong>Organization</strong></div><Button type='button' variant='outline' onClick={onCommand}><Search aria-hidden='true' />Search Organization</Button></section>{nav}<OverviewBody fixture={fixture} role={role} direction={direction} onStatus={onStatus} /></div>
  return <div className={styles.organizationShell}><aside className={styles.organizationRail}><OrganizationSwitcher organization={organization} role={role} onChoose={onChoose} />{nav}<div className={styles.railFooter}><Button type='button' variant='outline' onClick={onCommand}><Search aria-hidden='true' />Search<span>⌘K</span></Button><p>Actions and counts are limited to your role.</p></div></aside><OverviewBody fixture={fixture} role={role} direction={direction} onStatus={onStatus} /></div>
}

function CommandSearch({ open, setOpen, fixture, onStatus }: { open: boolean; setOpen: (open: boolean) => void; fixture: Fixture; onStatus: (message: string) => void }) {
  const [query, setQuery] = useState(fixture === 'command-empty' ? 'nonexistent operation' : '')
  const commands = ['Create Opportunity', 'Open unassigned submissions', 'Review decisions', 'Open my reviews', 'Switch Organization', 'People and access', 'Settings and billing']
  const visible = commands.filter((command) => command.toLowerCase().includes(query.toLowerCase()))
  return <Dialog open={open} onOpenChange={setOpen}><DialogContent className={styles.commandDialog}><DialogHeader><DialogTitle>Search Organization</DialogTitle><DialogDescription>Find a destination or action available in your current role.</DialogDescription></DialogHeader><label><span className='sr-only'>Search Organization commands</span><Search aria-hidden='true' /><Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder='Search destinations and actions' /></label><div className={styles.commandResults}>{visible.map((command) => <button key={command} type='button' onClick={() => { onStatus(`${command} opened with North River Review selected.`); setOpen(false) }}><span>{command}</span><span>Enter</span></button>)}{visible.length === 0 ? <div><Search aria-hidden='true' /><h3>No matching action</h3><p>Try an Organization destination such as Submissions, Reviews, or People.</p></div> : null}</div><footer><span>↑↓ Navigate</span><span>Enter Open</span><span>Esc Close</span></footer></DialogContent></Dialog>
}

function OrganizationExperience({ selectedOnly }: { selectedOnly: boolean }) {
  const [direction, setDirection] = useState<Direction>('rail')
  const [fixture, setFixture] = useState<Fixture>('active')
  const [surface, setSurface] = useState<Surface>('overview')
  const [commandOpen, setCommandOpen] = useState(false)
  const [status, setStatus] = useState('')
  const activeDirection: Direction = selectedOnly ? 'rail' : direction
  const currentDirection = useMemo(() => directions.find((item) => item.id === activeDirection)!, [activeDirection])

  function changeFixture(next: Fixture) { setFixture(next); setSurface(fixtureSurface(next)); setStatus('') }
  function enter(organization: Organization) { setSurface('overview'); setStatus(`${organization.name} selected. Previous Organization data was cleared before this overview opened.`) }

  return <div className={styles.pageShell}><ReviewBar direction={activeDirection} selectedOnly={selectedOnly} setDirection={setDirection} fixture={fixture} setFixture={changeFixture} surface={surface} setSurface={setSurface} /><AppHeader onOpenCommand={() => setCommandOpen(true)} /><section className={styles.directionIntro}><span>{currentDirection.number}</span><div><p>{selectedOnly ? 'Selected Organization composition' : 'Organization direction'}</p><h2>{currentDirection.name}</h2><p>{currentDirection.description}</p></div>{selectedOnly ? <Badge variant='outline'>Selected · local only</Badge> : null}</section>{surface === 'chooser' ? <Chooser fixture={fixture} onEnter={enter} onStatus={setStatus} /> : <OverviewShell direction={activeDirection} fixture={fixture} onChoose={() => setSurface('chooser')} onCommand={() => setCommandOpen(true)} onStatus={setStatus} />}<p className={styles.liveStatus} role='status' aria-live='polite'>{status}{status ? <Check aria-hidden='true' /> : null}</p><CommandSearch key={`${fixture}-${commandOpen ? 'open' : 'closed'}`} open={commandOpen} setOpen={setCommandOpen} fixture={fixture} onStatus={setStatus} /></div>
}

export function OrganizationDirections() {
  return <OrganizationExperience selectedOnly={false} />
}

export function OrganizationSelected() {
  return <OrganizationExperience selectedOnly />
}
