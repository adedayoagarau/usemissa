'use client'

import {
  Activity,
  ArrowRight,
  BookOpen,
  Building2,
  CalendarDays,
  ChevronDown,
  CircleUserRound,
  FileCheck2,
  FolderOpen,
  Inbox,
  LayoutDashboard,
  Library,
  ListChecks,
  Menu,
  Radar,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { useId, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import { MissaWordmark } from '@/components/missa-wordmark'
import styles from './shell-directions.module.css'

type Direction = 'masthead' | 'switcher' | 'rail'
type Shell = 'public' | 'profile' | 'organization' | 'reviewer' | 'admin'

const directions: Array<{ id: Direction; number: string; title: string; description: string }> = [
  { id: 'masthead', number: '01', title: 'Editorial masthead', description: 'A calm horizontal identity leads public and Profile pages; operational products add a grouped task rail.' },
  { id: 'switcher', number: '02', title: 'Product switcher', description: 'Profile and Organization are explicit contexts above a compact task navigation, with focused reviewer and Admin variants.' },
  { id: 'rail', number: '03', title: 'Context rail', description: 'A slim product rail and adjacent contextual navigation keep dense signed-in work stable while public pages retain an editorial header.' },
]

const fixtures = [
  ['normal', 'Ready state'],
  ['signed-out', 'Signed out'],
  ['no-org', 'No Organization'],
  ['multi-org', 'Several Organizations'],
  ['role-limited', 'Role-limited member'],
  ['removed', 'Membership removed'],
  ['session-expired', 'Session expired'],
  ['unavailable', 'Destination unavailable'],
  ['long-content', 'Long identity and labels'],
  ['rtl', 'Mixed RTL and Latin'],
] as const

type Fixture = (typeof fixtures)[number][0]

type NavItem = { label: string; icon: typeof Activity; group?: string }

const shellLabels: Record<Shell, string> = {
  public: 'Public',
  profile: 'Profile',
  organization: 'Organization',
  reviewer: 'Reviewer',
  admin: 'Platform Admin',
}

const navigation: Record<Shell, NavItem[]> = {
  public: [
    { label: 'Home', icon: LayoutDashboard },
    { label: 'Opportunities', icon: Search },
    { label: 'Guides', icon: BookOpen },
    { label: 'For organizations', icon: Building2 },
  ],
  profile: [
    { label: 'Opportunities', icon: Search, group: 'Create' },
    { label: 'Tracker', icon: ListChecks, group: 'Create' },
    { label: 'Library', icon: Library, group: 'Create' },
    { label: 'Inbox', icon: Inbox, group: 'Account' },
    { label: 'Profile', icon: CircleUserRound, group: 'Account' },
  ],
  organization: [
    { label: 'Overview', icon: LayoutDashboard, group: 'Run' },
    { label: 'Opportunities', icon: Search, group: 'Run' },
    { label: 'Submissions', icon: FolderOpen, group: 'Run' },
    { label: 'Reviews', icon: FileCheck2, group: 'Run' },
    { label: 'Decisions', icon: ShieldCheck, group: 'Run' },
    { label: 'Messages', icon: Inbox, group: 'Manage' },
    { label: 'Delivery', icon: CalendarDays, group: 'Manage' },
    { label: 'Insights', icon: Activity, group: 'Manage' },
    { label: 'People', icon: Users, group: 'Manage' },
    { label: 'Settings', icon: Settings2, group: 'Manage' },
  ],
  reviewer: [
    { label: 'Reviews', icon: FileCheck2, group: 'Review' },
    { label: 'Help', icon: BookOpen, group: 'Support' },
    { label: 'Inbox', icon: Inbox, group: 'Account' },
    { label: 'Profile', icon: CircleUserRound, group: 'Account' },
  ],
  admin: [
    { label: 'Control Room', icon: LayoutDashboard, group: 'Operate' },
    { label: 'Operations', icon: ListChecks, group: 'Operate' },
    { label: 'Agents', icon: Sparkles, group: 'Operate' },
    { label: 'Radar', icon: Radar, group: 'Operate' },
    { label: 'System', icon: Settings2, group: 'Operate' },
    { label: 'Content', icon: FileCheck2, group: 'Review' },
    { label: 'Taxonomy', icon: BookOpen, group: 'Review' },
    { label: 'Governance', icon: ShieldCheck, group: 'Review' },
    { label: 'Audit', icon: Activity, group: 'Review' },
    { label: 'Customers', icon: Users, group: 'Serve' },
    { label: 'Organizations', icon: Building2, group: 'Serve' },
    { label: 'Support', icon: Inbox, group: 'Serve' },
    { label: 'Billing', icon: FolderOpen, group: 'Business' },
    { label: 'Analytics', icon: Activity, group: 'Business' },
  ],
}

function isShell(value: string): value is Shell {
  return value in shellLabels
}

function isFixture(value: string): value is Fixture {
  return fixtures.some(([fixture]) => fixture === value)
}

function activeLabel(shell: Shell) {
  if (shell === 'public') return 'Opportunities'
  if (shell === 'profile') return 'Tracker'
  if (shell === 'organization') return 'Submissions'
  if (shell === 'reviewer') return 'Reviews'
  return 'Control Room'
}

function organizationName(fixture: Fixture) {
  if (fixture === 'long-content') return 'The International Center for Experimental Literature and Cross-Disciplinary Arts'
  if (fixture === 'rtl') return 'مؤسسة الفنون المعاصرة · Contemporary Arts Foundation'
  return 'North River Review'
}

function visibleItems(shell: Shell, fixture: Fixture) {
  if (shell === 'organization' && fixture === 'role-limited') return navigation.organization.filter((item) => !['People', 'Settings', 'Insights'].includes(item.label))
  if (shell === 'admin' && fixture === 'role-limited') return navigation.admin.filter((item) => ['Control Room', 'Content', 'Taxonomy', 'Audit'].includes(item.label))
  return navigation[shell]
}

function ReviewControls({ direction, shell, fixture, selectedOnly, onDirection, onShell, onFixture }: { direction: Direction; shell: Shell; fixture: Fixture; selectedOnly: boolean; onDirection: (value: Direction) => void; onShell: (value: Shell) => void; onFixture: (value: Fixture) => void }) {
  return <div className={styles.reviewControls} aria-label='Design review controls'>{selectedOnly ? <div className={styles.selectedLabel}><strong>Selected shared shell</strong><span>02 · Product switcher</span></div> : <div className={styles.directionButtons}>{directions.map((item) => <button key={item.id} type='button' aria-pressed={direction === item.id} data-active={direction === item.id} onClick={() => onDirection(item.id)}><span>{item.number}</span>{item.title}</button>)}</div>}<div className={styles.selectors}><label><span>Shell</span><select aria-label='Shell' value={shell} onChange={(event) => { if (isShell(event.target.value)) onShell(event.target.value) }}>{Object.entries(shellLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span>Edge state</span><select aria-label='Edge state' value={fixture} onChange={(event) => { if (isFixture(event.target.value)) onFixture(event.target.value) }}>{fixtures.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div></div>
}

function DirectionIntro({ direction, selectedOnly }: { direction: Direction; selectedOnly: boolean }) {
  const active = directions.find((item) => item.id === direction)!
  return <section className={styles.directionIntro}><span>{active.number}</span><div><p>{selectedOnly ? 'Selected shared shell' : 'Shared shell direction'}</p><h1>{active.title}</h1><p>{active.description}</p></div><Badge variant='outline'>{selectedOnly ? 'Selected locally' : 'Direction comparison'}</Badge></section>
}

function ProductIdentity({ shell, fixture, compact = false }: { shell: Shell; fixture: Fixture; compact?: boolean }) {
  const name = shell === 'organization' ? organizationName(fixture) : shellLabels[shell]
  return <div className={styles.productIdentity} data-compact={compact}><MissaWordmark href={null} size={compact ? 'compact' : 'app'} />{shell === 'public' ? null : <><span aria-hidden='true'>/</span><em dir='auto'>{name}</em></>}</div>
}

function ProductSwitch({ shell, fixture }: { shell: Shell; fixture: Fixture }) {
  if (shell === 'public' || shell === 'reviewer' || shell === 'admin') return <Badge variant='outline'>{shellLabels[shell]}</Badge>
  const hasOrganization = fixture !== 'no-org' && fixture !== 'removed'
  return <div className={styles.productSwitch} aria-label='Current product'><button type='button' aria-pressed={shell === 'profile'}>Profile</button>{hasOrganization ? <button type='button' aria-pressed={shell === 'organization'}>Organization</button> : null}</div>
}

function OrganizationSwitcher({ fixture }: { fixture: Fixture }) {
  if (fixture === 'no-org' || fixture === 'removed') return null
  return <button type='button' className={styles.organizationSwitch} aria-label='Switch Organization'><Building2 aria-hidden='true' /><span dir='auto'>{organizationName(fixture)}</span>{fixture === 'multi-org' ? <Badge variant='outline'>3</Badge> : null}<ChevronDown aria-hidden='true' /></button>
}

function Account({ fixture }: { fixture: Fixture }) {
  const label = fixture === 'long-content' ? 'Alexandria Okafor-Chukwuemeka' : 'Ayo'
  return <button type='button' className={styles.account} aria-label={`Open ${label} Profile`}><span>AO</span><em>{label}</em></button>
}

function NavItems({ shell, fixture, mode = 'horizontal', onNavigate }: { shell: Shell; fixture: Fixture; mode?: 'horizontal' | 'grouped'; onNavigate?: () => void }) {
  const items = visibleItems(shell, fixture)
  if (mode === 'horizontal') return <nav className={styles.horizontalNav} aria-label={`${shellLabels[shell]} navigation`}>{items.map((item) => <a key={item.label} href={`#shell-${item.label.toLowerCase().replaceAll(' ', '-')}`} aria-current={item.label === activeLabel(shell) ? 'page' : undefined} onClick={onNavigate}>{item.label}</a>)}</nav>
  const groups = [...new Set(items.map((item) => item.group ?? shellLabels[shell]))]
  return <nav className={styles.groupedNav} aria-label={`${shellLabels[shell]} navigation`}>{groups.map((group) => <section key={group}><h2>{group}</h2><div>{items.filter((item) => (item.group ?? shellLabels[shell]) === group).map((item) => { const Icon = item.icon; return <a key={item.label} href={`#shell-${item.label.toLowerCase().replaceAll(' ', '-')}`} aria-current={item.label === activeLabel(shell) ? 'page' : undefined} onClick={onNavigate}><Icon aria-hidden='true' /><span>{item.label}</span></a> })}</div></section>)}</nav>
}

function ShellHeader({ direction, shell, fixture, navOpen, menuId, onToggle }: { direction: Direction; shell: Shell; fixture: Fixture; navOpen: boolean; menuId: string; onToggle: () => void }) {
  const signedOut = fixture === 'signed-out'
  return <header className={styles.shellHeader}><ProductIdentity shell={shell} fixture={fixture} compact={direction === 'switcher'} />{direction === 'switcher' ? <ProductSwitch shell={shell} fixture={fixture} /> : null}{direction === 'masthead' && shell !== 'organization' && shell !== 'admin' && shell !== 'reviewer' ? <NavItems shell={shell} fixture={fixture} /> : null}<div className={styles.headerActions}>{shell === 'organization' ? <OrganizationSwitcher fixture={fixture} /> : null}{signedOut ? <><a href='#login'>Log in</a><Button type='button' size='sm'>Create account</Button></> : <Account fixture={fixture} />}</div><button type='button' className={styles.menuButton} aria-label={navOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={navOpen} aria-controls={menuId} onClick={onToggle}>{navOpen ? <X aria-hidden='true' /> : <Menu aria-hidden='true' />}</button></header>
}

function MobileMenu({ id, shell, fixture, onNavigate }: { id: string; shell: Shell; fixture: Fixture; onNavigate: () => void }) {
  return <div id={id} className={styles.mobileMenu}><div><p>Current space</p><ProductSwitch shell={shell} fixture={fixture} /></div>{shell === 'organization' ? <OrganizationSwitcher fixture={fixture} /> : null}<NavItems shell={shell} fixture={fixture} mode='grouped' onNavigate={onNavigate} /></div>
}

function StateNotice({ shell, fixture }: { shell: Shell; fixture: Fixture }) {
  if (fixture === 'session-expired') return <div className={styles.notice} data-tone='attention' role='alert'><ShieldCheck aria-hidden='true' /><div><strong>Your session ended</strong><span>Sign in again to return to this {shellLabels[shell]} page. The destination is preserved.</span></div><Button type='button' size='sm'>Sign in</Button></div>
  if (fixture === 'removed') return <div className={styles.notice} data-tone='danger' role='alert'><Building2 aria-hidden='true' /><div><strong>Organization access changed</strong><span>This Organization is no longer available to this account. No tenant data is shown.</span></div><Button type='button' variant='outline' size='sm'>Open Profile</Button></div>
  if (fixture === 'unavailable') return <div className={styles.notice} data-tone='attention' role='status'><Activity aria-hidden='true' /><div><strong>This destination is temporarily unavailable</strong><span>Other navigation remains available. Retry this page without losing your current context.</span></div><Button type='button' variant='outline' size='sm'>Try again</Button></div>
  if (fixture === 'role-limited') return <div className={styles.notice} role='status'><ShieldCheck aria-hidden='true' /><div><strong>Review-only access</strong><span>The navigation shows only the records and actions available to this role.</span></div></div>
  if (fixture === 'no-org' && shell === 'profile') return <div className={styles.notice} role='status'><Building2 aria-hidden='true' /><div><strong>No Organization membership</strong><span>Your Profile work remains available. Join or create an Organization only when you need to run an Opportunity.</span></div><Button type='button' variant='outline' size='sm'>Explore Organizations</Button></div>
  return null
}

function WorkSurface({ shell, fixture }: { shell: Shell; fixture: Fixture }) {
  const title = shell === 'public' ? 'Opportunities' : shell === 'profile' ? 'Tracker' : shell === 'organization' ? 'Submissions' : shell === 'reviewer' ? 'Reviews' : 'Control Room'
  const copy = shell === 'public' ? 'Find calls, grants, residencies, commissions, and other opportunities worth your time.' : shell === 'profile' ? 'Move each opportunity through a clear personal state without losing the source or deadline.' : shell === 'organization' ? 'Triage submitted packets, preserve each Work, and move review and decisions independently.' : shell === 'reviewer' ? 'Read only the Work assigned to you and complete the Organization rubric.' : 'Start with the consequence, inspect the evidence, and request one bounded action.'
  const rows = shell === 'public' ? ['International Writing Fellowship', 'New Media Commission', 'Emerging Curators Fund'] : shell === 'profile' ? ['Public Memory Commission', 'New Voices Poetry Prize', 'Research Fellowship'] : shell === 'organization' ? ['Submission 1042 · 2 Works', 'Submission 1039 · 1 Work', 'Submission 1027 · 3 Works'] : shell === 'reviewer' ? ['Emerging Writers Award · Assignment 042', 'Public Memory Commission · Assignment 039'] : ['Conflicting deadline evidence', 'Fetch succeeded; processing failed', 'Taxonomy mapping requires review']
  return <main id='shell-main' className={styles.workSurface}><div className={styles.pageHeading}><div><p>{shell === 'organization' ? organizationName(fixture) : shellLabels[shell]}</p><h2>{fixture === 'long-content' ? `${title} requiring careful review across several connected records` : title}</h2><span>{copy}</span></div><Button type='button'>{shell === 'public' ? 'Search' : shell === 'profile' ? 'Add to Tracker' : shell === 'organization' ? 'Open queue' : shell === 'reviewer' ? 'Continue review' : 'Review attention'}</Button></div><StateNotice shell={shell} fixture={fixture} /><section className={styles.scopeStrip} aria-label='Current scope'><div><span>Current view</span><strong>{activeLabel(shell)}</strong></div><div><span>Context</span><strong>{shell === 'organization' ? organizationName(fixture) : shellLabels[shell]}</strong></div><div><span>Route state</span><strong>Preserved</strong></div></section><div className={styles.surfaceGrid}><section className={styles.workList}><header><div><p>Current work</p><h3>{shell === 'admin' ? 'Needs attention' : title}</h3></div><Badge variant='outline'>{rows.length} items</Badge></header>{rows.map((row, index) => <a key={row} href={`#work-${index}`} aria-current={index === 0 ? 'true' : undefined}><span>{String(index + 1).padStart(2, '0')}</span><div><strong dir='auto'>{fixture === 'rtl' && index === 0 ? 'فرصة للكتابة الدولية · International writing opportunity' : row}</strong><small>{index === 0 ? 'Selected context remains visible' : 'Open without losing the originating state'}</small></div><ArrowRight aria-hidden='true' /></a>)}</section><aside className={styles.detail} aria-label='Selected item context'><p>Selected item</p><h3 dir='auto'>{fixture === 'rtl' ? 'فرصة للكتابة الدولية' : rows[0]}</h3><span>The shell keeps location, identity, product context, and the return path stable while this work changes.</span><dl><div><dt>Product</dt><dd>{shellLabels[shell]}</dd></div><div><dt>Access</dt><dd>{fixture === 'role-limited' ? 'Review only' : 'Available'}</dd></div><div><dt>Return state</dt><dd>Queue and focus</dd></div></dl><Button type='button' variant='outline'>Open detail</Button></aside></div></main>
}

function ShellPreview({ direction, shell, fixture }: { direction: Direction; shell: Shell; fixture: Fixture }) {
  const [navOpen, setNavOpen] = useState(false)
  const menuId = useId()
  const hasRail = direction === 'rail' && shell !== 'public' || direction === 'masthead' && ['organization', 'reviewer', 'admin'].includes(shell)
  return <div className={styles.preview} data-direction={direction} data-shell={shell}><ShellHeader direction={direction} shell={shell} fixture={fixture} navOpen={navOpen} menuId={menuId} onToggle={() => setNavOpen((open) => !open)} />{navOpen ? <MobileMenu id={menuId} shell={shell} fixture={fixture} onNavigate={() => setNavOpen(false)} /> : null}{direction === 'switcher' ? <div className={styles.contextBar}>{shell === 'organization' ? <OrganizationSwitcher fixture={fixture} /> : <span>{shellLabels[shell]} tasks</span>}<NavItems shell={shell} fixture={fixture} /></div> : null}<div className={styles.previewBody}>{hasRail ? <aside className={styles.sideRail}><ProductSwitch shell={shell} fixture={fixture} />{shell === 'organization' ? <OrganizationSwitcher fixture={fixture} /> : null}<NavItems shell={shell} fixture={fixture} mode='grouped' /></aside> : null}<WorkSurface shell={shell} fixture={fixture} /></div></div>
}

function ShellExperience({ selectedOnly }: { selectedOnly: boolean }) {
  const [direction, setDirection] = useState<Direction>('switcher')
  const [shell, setShell] = useState<Shell>('profile')
  const [fixture, setFixture] = useState<Fixture>('normal')
  const activeDirection: Direction = selectedOnly ? 'switcher' : direction
  return <div className={styles.page}><ReviewControls direction={activeDirection} shell={shell} fixture={fixture} selectedOnly={selectedOnly} onDirection={setDirection} onShell={setShell} onFixture={setFixture} /><DirectionIntro direction={activeDirection} selectedOnly={selectedOnly} /><ShellPreview key={`${activeDirection}-${shell}-${fixture}`} direction={activeDirection} shell={shell} fixture={fixture} /></div>
}

export function ShellDirections() {
  return <ShellExperience selectedOnly={false} />
}

export function ShellSelected() {
  return <ShellExperience selectedOnly />
}
