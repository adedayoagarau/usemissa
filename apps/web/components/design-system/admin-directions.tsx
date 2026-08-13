'use client'

import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Bot,
  Building2,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Copy,
  Database,
  ExternalLink,
  FileClock,
  FileSearch,
  Gauge,
  History,
  Inbox,
  LifeBuoy,
  LockKeyhole,
  Mail,
  Menu,
  Network,
  PanelLeftClose,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Tag,
  UserRoundCog,
  Users,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'

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
import { Textarea } from '@/components/ui/textarea'

import { MissaWordmark } from '@/components/missa-wordmark'
import styles from './admin-directions.module.css'

type Direction = 'ledger' | 'control' | 'index'
type Domain = 'Operate' | 'Review' | 'Serve' | 'Business'
type Severity = 'high' | 'medium' | 'low'
type Maturity = 'Live' | 'Durable' | 'Derived' | 'Latest run only' | 'Target schema' | 'Partial' | 'Unavailable'

const fixtureOptions = [
  ['active', 'Active control room'],
  ['no-attention', 'No attention items'],
  ['mixed', 'Mixed severity'],
  ['large', '500+ queue rows'],
  ['no-results', 'No matching filters'],
  ['latest-run-only', 'Latest-run-only evidence'],
  ['partial', 'Partial read model'],
  ['unavailable', 'Dependency unavailable'],
  ['worker-unknown', 'Worker unknown'],
  ['worker-stale', 'Worker stale'],
  ['worker-running', 'Worker running'],
  ['worker-failed', 'Worker failed'],
  ['source-fetch-failed', 'Source fetch failed'],
  ['source-process-failed', 'Source processing failed'],
  ['source-conflict', 'Conflicting source evidence'],
  ['content-review', 'Content review'],
  ['content-missing-source', 'Content source missing'],
  ['content-concurrent', 'Content decided elsewhere'],
  ['content-failed', 'Content decision failed'],
  ['taxonomy-proposal', 'Taxonomy proposal'],
  ['taxonomy-sensitive', 'Culturally sensitive term'],
  ['taxonomy-deprecated', 'Deprecated term in use'],
  ['taxonomy-unavailable', 'Taxonomy graph unavailable'],
  ['customer-inactive', 'Inactive customer account'],
  ['organization-no-owner', 'Organization without owner'],
  ['support-sensitive', 'Sensitive support case'],
  ['messaging-partial', 'Partially delivered message'],
  ['billing-past-due', 'Billing past due'],
  ['billing-mismatch', 'Provider mismatch'],
  ['analytics-zero', 'Zero denominator'],
  ['read-only', 'Read-only operator'],
  ['missing-capability', 'Missing capability'],
  ['step-up', 'Step-up required'],
  ['two-person', 'Two-person approval'],
  ['capability-removed', 'Capability removed mid-session'],
  ['session-expired', 'Session expired'],
  ['forbidden', 'Forbidden direct URL'],
  ['action-working', 'Action requested'],
  ['action-failed', 'Action failed'],
  ['action-conflict', 'Concurrent state conflict'],
  ['action-ambiguous', 'Checking action outcome'],
  ['duplicate-protected', 'Duplicate request protected'],
  ['audit-unavailable', 'Audit unavailable'],
  ['long-content', 'Long names and IDs'],
  ['rtl', 'RTL source content'],
] as const

type Fixture = (typeof fixtureOptions)[number][0]

type WorkItem = {
  id: string
  domain: Domain
  kind: string
  title: string
  subject: string
  reason: string
  severity: Severity
  state: string
  age: string
  maturity: Maturity
  source: string
  owner?: string
}

const directions: Array<{ id: Direction; number: string; title: string; description: string }> = [
  { id: 'ledger', number: '01', title: 'Command ledger', description: 'A calm, consequence-first ledger leads from grouped navigation into route-backed evidence.' },
  { id: 'control', number: '02', title: 'Evidence control room', description: 'A searchable worklist and persistent inspector keep source, state, and bounded action together.' },
  { id: 'index', number: '03', title: 'Domain index', description: 'Operate, Review, Serve, and Business orient occasional operators before focused work.' },
]

const domainRoutes: Array<{ domain: Domain; routes: Array<{ label: string; icon: typeof Activity }> }> = [
  { domain: 'Operate', routes: [{ label: 'Control Room', icon: Gauge }, { label: 'Operations', icon: Activity }, { label: 'Agent controls', icon: Bot }, { label: 'Radar & sources', icon: Network }, { label: 'System', icon: Database }] },
  { domain: 'Review', routes: [{ label: 'Content', icon: BookOpenCheck }, { label: 'Taxonomy', icon: Tag }, { label: 'Governance', icon: Shield }, { label: 'Audit', icon: FileClock }] },
  { domain: 'Serve', routes: [{ label: 'Customers', icon: Users }, { label: 'Organizations', icon: Building2 }, { label: 'CRM', icon: UserRoundCog }, { label: 'Support', icon: LifeBuoy }, { label: 'Messaging', icon: Mail }] },
  { domain: 'Business', routes: [{ label: 'Billing', icon: CircleDollarSign }, { label: 'Analytics', icon: BarChart3 }] },
]

const baseRows: WorkItem[] = [
  { id: 'verification:vtask_0001', domain: 'Operate', kind: 'Verification task', title: 'Conflicting deadline evidence', subject: 'Hilltop Foundation Arts Grant', reason: 'The source page and directory record disagree by fifteen days.', severity: 'high', state: 'Open', age: '18 min', maturity: 'Live', source: 'Source verification tasks' },
  { id: 'source:african-writers-trust', domain: 'Operate', kind: 'Source health', title: 'Fetch succeeded; processing failed', subject: 'African Writers Trust', reason: 'The latest snapshot exists, but canonical extraction did not complete.', severity: 'high', state: 'Failed', age: '42 min', maturity: 'Durable', source: 'Source runs + processing attempts', owner: 'Content worker' },
  { id: 'content:review_1042', domain: 'Review', kind: 'Content review', title: 'Generated fee statement needs evidence', subject: 'New Voices Poetry Prize', reason: 'The brief says no fee while the source leaves the fee unknown.', severity: 'medium', state: 'Needs human', age: '1 hr', maturity: 'Durable', source: 'Content review jobs' },
  { id: 'support:case_0281', domain: 'Serve', kind: 'Support case', title: 'Deadline changed after submission', subject: 'Account AO · Emerging Writers Award', reason: 'The user reports that the official deadline changed after they submitted.', severity: 'medium', state: 'Open', age: '2 hr', maturity: 'Live', source: 'Platform support cases' },
  { id: 'taxonomy:proposal_214', domain: 'Review', kind: 'Taxonomy proposal', title: 'Review Yorùbá language alias', subject: 'Language facet · canonical term lang_yoruba', reason: 'A source-backed orthographic alias needs steward review and impact preview.', severity: 'medium', state: 'Researching', age: '5 hr', maturity: 'Target schema', source: 'Canonical taxonomy proposals' },
  { id: 'billing:event_evt_8942', domain: 'Business', kind: 'Billing exception', title: 'Invoice event is not matched', subject: 'North River Review · USD 149.00', reason: 'The provider event has no confirmed Organization ledger match.', severity: 'medium', state: 'Received', age: '7 hr', maturity: 'Durable', source: 'Platform billing ledger' },
  { id: 'message:effect_773', domain: 'Serve', kind: 'Message effect', title: 'Decision delivery partly failed', subject: 'Common Ground Arts · 12 recipients', reason: 'Nine effects were accepted by the provider; three failed before acceptance.', severity: 'high', state: 'Partly delivered', age: '9 hr', maturity: 'Durable', source: 'Message effects + attempts' },
  { id: 'analytics:event-gap', domain: 'Business', kind: 'Analytics quality', title: 'Submission denominator is unavailable', subject: 'Application completion report', reason: 'The selected period contains starts but no durable submitted-event denominator.', severity: 'low', state: 'Definition blocked', age: '1 day', maturity: 'Derived', source: 'Platform analytics events' },
]

function isFixture(value: string): value is Fixture {
  return fixtureOptions.some(([id]) => id === value)
}

function fixtureRows(fixture: Fixture): WorkItem[] {
  if (['no-attention', 'unavailable', 'session-expired', 'forbidden', 'taxonomy-unavailable'].includes(fixture)) return []
  if (fixture === 'large') return Array.from({ length: 36 }, (_, index) => ({ ...baseRows[index % baseRows.length], id: `${baseRows[index % baseRows.length].id}:${String(index + 1).padStart(3, '0')}`, age: `${index + 1} hr` }))
  if (fixture.startsWith('content-') || fixture === 'content-review') return [
    { ...baseRows[2], title: fixture === 'content-missing-source' ? 'Canonical source snapshot is missing' : fixture === 'content-concurrent' ? 'Review was decided in another session' : fixture === 'content-failed' ? 'Content decision could not be recorded' : baseRows[2].title },
    baseRows[0],
  ]
  if (fixture.startsWith('taxonomy-')) return [{ ...baseRows[4], title: fixture === 'taxonomy-sensitive' ? 'Review culturally sensitive language mapping' : fixture === 'taxonomy-deprecated' ? 'Deprecated term is used by 384 records' : baseRows[4].title }, baseRows[2]]
  if (fixture === 'customer-inactive') return [{ ...baseRows[3], kind: 'Customer account', title: 'Account is inactive after unresolved access issue', subject: 'Account AO · North River Review', reason: 'Support evidence is available, but the account cannot authenticate.', state: 'Inactive' }]
  if (fixture === 'organization-no-owner') return [{ ...baseRows[3], kind: 'Organization access', title: 'Organization has no active owner', subject: 'Field Notes Foundation', reason: 'The last owner account is inactive; member access and billing responsibility need governed recovery.', severity: 'high', state: 'Owner missing' }]
  if (fixture === 'support-sensitive') return [{ ...baseRows[3], title: 'Sensitive support evidence requires restricted view', reason: 'The report may contain personal information. Only the minimum redacted projection is available.' }]
  if (fixture === 'messaging-partial') return [baseRows[6], baseRows[3]]
  if (fixture === 'billing-past-due') return [{ ...baseRows[5], title: 'Subscription is past due', subject: 'North River Review · Pro plan', reason: 'A provider invoice remains unpaid; no entitlement change has been inferred.', state: 'Past due', severity: 'high' }]
  if (fixture === 'billing-mismatch') return [{ ...baseRows[5], title: 'Provider currency does not match ledger expectation', subject: 'Common Ground Arts · NGN / USD', reason: 'The event currency and Organization billing configuration differ.', state: 'Mismatch', severity: 'high' }]
  if (fixture === 'analytics-zero') return [baseRows[7]]
  if (fixture === 'source-fetch-failed') return [{ ...baseRows[1], title: 'Source could not be fetched', reason: 'The network request failed before a snapshot was produced.', state: 'Fetch failed' }]
  if (fixture === 'source-process-failed') return [baseRows[1]]
  if (fixture === 'source-conflict') return [baseRows[0]]
  if (fixture === 'long-content') return [{ ...baseRows[0], id: 'verification:source:opportunity:01J7R86ZSXME0YV6JN1KQPX2B7:revision:00000000000000000047', title: 'Conflicting eligibility, fee, publication, and deadline evidence requires a deliberate source-by-source comparison', subject: 'The International Foundation for Experimental, Interdisciplinary, and Cross-Cultural Creative Practice', reason: 'Several canonical and secondary sources disagree; the longest source name and identifiers must wrap without hiding the consequence.' }]
  if (fixture === 'rtl') return [{ ...baseRows[2], title: 'Arabic source excerpt requires directional isolation', subject: 'برنامج الكتابة الدولية · International Writing Programme', reason: 'The source title and generated Latin-script brief must retain their own reading directions.' }]
  return fixture === 'mixed' ? baseRows : baseRows.slice(0, 5)
}

function fixtureMaturity(fixture: Fixture): Maturity {
  if (fixture === 'latest-run-only') return 'Latest run only'
  if (fixture === 'partial') return 'Partial'
  if (fixture === 'unavailable' || fixture === 'taxonomy-unavailable') return 'Unavailable'
  return 'Live'
}

function fixtureWarning(fixture: Fixture): { title: string; copy: string; tone?: 'danger' | 'attention' | 'info' } | null {
  if (fixture === 'partial') return { title: 'Some Admin evidence is unavailable', copy: 'Opportunity records loaded, but Organization workflow and durable queue tables did not. Missing values are not shown as zero.', tone: 'attention' }
  if (fixture === 'unavailable') return { title: 'The Admin read model is unavailable', copy: 'No operational data is shown. Retry the read without running a worker or changing configuration.', tone: 'danger' }
  if (fixture === 'taxonomy-unavailable') return { title: 'The canonical taxonomy graph is unavailable', copy: 'Compatibility labels remain readable, but proposals, relations, mappings, coverage, and activation controls stay closed.', tone: 'attention' }
  if (fixture === 'session-expired') return { title: 'Your Admin session expired', copy: 'Sign in again to return to this filtered worklist. No action was requested.', tone: 'danger' }
  if (fixture === 'forbidden') return { title: 'You do not have access to this Admin area', copy: 'The route may require a capability that is not assigned to your operator role.', tone: 'danger' }
  if (fixture === 'missing-capability') return { title: 'Investigate access only', copy: 'You can read this evidence, but cannot request recovery for this domain.', tone: 'attention' }
  if (fixture === 'capability-removed') return { title: 'Your capability changed', copy: 'Recovery access was removed while this record was open. Reload permissions before continuing.', tone: 'attention' }
  if (fixture === 'audit-unavailable') return { title: 'Required audit evidence is unavailable', copy: 'Consequential actions are paused. Missa will not claim success without an auditable receipt.', tone: 'danger' }
  if (fixture === 'worker-failed') return { title: 'A worker lane failed', copy: 'The failed run is evidence of execution state, not permission to replay it automatically.', tone: 'danger' }
  return null
}

function actionState(fixture: Fixture) {
  if (fixture === 'action-working') return { title: 'Request accepted; awaiting worker acknowledgement', copy: 'The operation has not been applied yet.', tone: 'info' as const }
  if (fixture === 'action-failed') return { title: 'The recovery request failed', copy: 'The queue item remains unchanged. Review the sanitized error and try an eligible action.', tone: 'danger' as const }
  if (fixture === 'action-conflict') return { title: 'The item changed before confirmation', copy: 'Reload the new state before deciding whether recovery is still appropriate.', tone: 'attention' as const }
  if (fixture === 'action-ambiguous') return { title: 'Checking the request outcome', copy: 'Do not request it again while Missa confirms the first idempotency key.', tone: 'info' as const }
  if (fixture === 'duplicate-protected') return { title: 'Duplicate request returned the original receipt', copy: 'No second operation was created.', tone: 'info' as const }
  if (fixture === 'content-concurrent') return { title: 'This content review was decided elsewhere', copy: 'Compare the recorded decision before attempting another review.', tone: 'attention' as const }
  if (fixture === 'content-failed') return { title: 'Content decision could not be recorded', copy: 'The generated projection and canonical facts remain unchanged.', tone: 'danger' as const }
  return null
}

function DirectionControls({ direction, fixture, selectedOnly, onDirection, onFixture }: { direction: Direction; fixture: Fixture; selectedOnly: boolean; onDirection: (direction: Direction) => void; onFixture: (fixture: Fixture) => void }) {
  return <div className={styles.reviewControls} aria-label='Design review controls'>{selectedOnly ? <div className={styles.selectedLabel}><strong>Selected Platform Admin composition</strong><span>02 · Evidence control room</span></div> : <div className={styles.directionButtons}>{directions.map((item) => <button key={item.id} type='button' aria-pressed={direction === item.id} data-active={direction === item.id} onClick={() => onDirection(item.id)}><span>{item.number}</span>{item.title}</button>)}</div>}<label><span>Edge state</span><select aria-label='Edge state' value={fixture} onChange={(event) => { if (isFixture(event.target.value)) onFixture(event.target.value) }}>{fixtureOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
}

function DirectionIntro({ direction, selectedOnly }: { direction: Direction; selectedOnly: boolean }) {
  const active = directions.find((item) => item.id === direction)!
  return <section className={styles.directionIntro}><span>{active.number}</span><div><p>{selectedOnly ? 'Selected Platform Admin workspace' : 'Platform Admin direction'}</p><h1>{active.title}</h1><p>{active.description}</p></div><Badge variant='outline'>{selectedOnly ? 'Selected locally' : 'Selection comparison'}</Badge></section>
}

function AdminNavigation({ compact = false, mobile = false }: { compact?: boolean; mobile?: boolean }) {
  return <nav className={styles.navigation} data-compact={compact} data-mobile={mobile} aria-label='Platform Admin navigation'>{domainRoutes.map((group) => <section key={group.domain}><h2>{group.domain}</h2><div>{group.routes.map((route) => { const Icon = route.icon; return <a key={route.label} href={`#admin-${route.label.toLowerCase().replaceAll(' ', '-')}`} aria-current={route.label === 'Control Room' ? 'page' : undefined}><Icon aria-hidden='true' /><span>{route.label}</span>{compact ? null : <ChevronRight aria-hidden='true' />}</a> })}</div></section>)}</nav>
}

function AdminHeader({ navOpen, onNavOpen }: { navOpen: boolean; onNavOpen: () => void }) {
  return <header className={styles.adminHeader}><div><button type='button' className={styles.navButton} aria-expanded={navOpen} aria-controls='admin-mobile-navigation' onClick={onNavOpen}><Menu aria-hidden='true' /><span className='sr-only'>Toggle Admin navigation</span></button><a href='#admin-main'><MissaWordmark href={null} size='compact' /><span>Platform Admin</span></a></div><div className={styles.headerSearch}><Search aria-hidden='true' /><span>Search Admin</span><kbd>⌘ K</kbd></div><div><Button type='button' variant='ghost' size='icon' aria-label='Open Admin alerts'><Inbox aria-hidden='true' /></Button><button type='button' className={styles.operator} aria-label='Open operator account'>PA</button></div></header>
}

function PlatformStrip({ fixture }: { fixture: Fixture }) {
  const worker = fixture === 'worker-running' ? ['Running', 'Worker-confirmed heartbeat'] : fixture === 'worker-stale' ? ['Stale', 'Heartbeat outside policy'] : fixture === 'worker-failed' ? ['Failed', 'Latest durable run failed'] : fixture === 'worker-unknown' || fixture === 'latest-run-only' ? ['Unknown', 'No current heartbeat'] : ['Running', '2 lanes acknowledged']
  const source = fixture === 'source-fetch-failed' ? ['Fetch failed', '0 snapshots produced'] : fixture === 'source-process-failed' ? ['Processing failed', 'Snapshot retained'] : fixture === 'partial' ? ['Partial', 'One source store loaded'] : ['6 / 6 processed', '1 conflict to review']
  const messages = fixture === 'messaging-partial' ? ['Partly delivered', '3 failed effects'] : ['12 accepted', '0 pending effects']
  const billing = fixture === 'billing-past-due' || fixture === 'billing-mismatch' ? ['Attention', '1 reconciliation item'] : ['Observed', 'No inferred revenue']
  const entries = [{ icon: Activity, label: 'Worker', value: worker[0], detail: worker[1] }, { icon: Network, label: 'Sources', value: source[0], detail: source[1] }, { icon: Mail, label: 'Messaging', value: messages[0], detail: messages[1] }, { icon: CircleDollarSign, label: 'Billing', value: billing[0], detail: billing[1] }]
  return <section className={styles.platformStrip} aria-labelledby='platform-state-title'><header><div><p className={styles.eyebrow}>Observed platform state</p><h2 id='platform-state-title'>Current signals</h2></div><span>Read 8 Aug · 6:42 PM</span></header><div>{entries.map((entry) => { const Icon = entry.icon; return <article key={entry.label}><Icon aria-hidden='true' /><span><small>{entry.label}</small><strong>{entry.value}</strong><em>{entry.detail}</em></span></article> })}</div></section>
}

function Warning({ fixture }: { fixture: Fixture }) {
  const warning = fixtureWarning(fixture)
  if (!warning) return null
  const Icon = warning.tone === 'danger' ? AlertCircle : warning.tone === 'attention' ? ShieldAlert : Activity
  return <Alert variant={warning.tone === 'danger' ? 'destructive' : 'default'} data-tone={warning.tone}><Icon aria-hidden='true' /><AlertTitle>{warning.title}</AlertTitle><AlertDescription>{warning.copy}</AlertDescription></Alert>
}

function PageHeading({ fixture, rowCount }: { fixture: Fixture; rowCount: number }) {
  const maturity = fixtureMaturity(fixture)
  return <header className={styles.pageHeading}><div><p className={styles.eyebrow}>Platform scope</p><h2>Control Room</h2><p>Start with what needs a decision, then inspect the evidence and request the smallest safe action.</p></div><div><Badge variant='outline' data-maturity={maturity}>{maturity}</Badge><span>{rowCount} attention item{rowCount === 1 ? '' : 's'} · read at 6:42 PM</span><Button type='button' variant='outline'><RefreshCw aria-hidden='true' />Refresh read</Button></div></header>
}

function SeverityMark({ severity }: { severity: Severity }) {
  return <span className={styles.severityMark} data-severity={severity}><AlertCircle aria-hidden='true' /><span className='sr-only'>{severity} severity</span></span>
}

function Worklist({ rows, query, severity, selectedId, compact = false, inlineDetail, onQuery, onSeverity, onSelect, onClear }: { rows: WorkItem[]; query: string; severity: 'all' | Severity; selectedId?: string; compact?: boolean; inlineDetail?: (row: WorkItem) => React.ReactNode; onQuery: (value: string) => void; onSeverity: (value: 'all' | Severity) => void; onSelect: (row: WorkItem) => void; onClear: () => void }) {
  const filtered = rows.filter((row) => (severity === 'all' || row.severity === severity) && `${row.id} ${row.title} ${row.subject} ${row.reason} ${row.domain}`.toLowerCase().includes(query.toLowerCase()))
  return <section className={styles.worklist} data-compact={compact} aria-labelledby='admin-worklist-title'><header><div><p className={styles.eyebrow}>Operator queue</p><h2 id='admin-worklist-title'>Needs attention</h2><p>{rows.length > 30 ? 'Showing a bounded page of more than 500 records.' : 'Ordered by consequence, then age.'}</p></div><Badge variant='outline'>{filtered.length} shown</Badge></header><div className={styles.filters}><label><span>Search work</span><div><Search aria-hidden='true' /><Input aria-label='Search Admin worklist' value={query} onChange={(event) => onQuery(event.target.value)} placeholder='ID, title, reason, Organization…' /></div></label><label><span>Severity</span><select aria-label='Filter by severity' value={severity} onChange={(event) => onSeverity(event.target.value as 'all' | Severity)}><option value='all'>All severity</option><option value='high'>High</option><option value='medium'>Medium</option><option value='low'>Low</option></select></label></div>{filtered.length === 0 ? <div className={styles.noResults}><FileSearch aria-hidden='true' /><h3>{rows.length === 0 ? 'No actionable rows observed' : 'No work matches these filters'}</h3><p>{rows.length === 0 ? 'This does not prove every worker, provider, or dependency is healthy.' : 'Clear the query or severity filter. No record has been changed.'}</p>{rows.length ? <Button type='button' variant='outline' onClick={onClear}>Clear filters</Button> : null}</div> : <div className={styles.workRows}>{filtered.slice(0, compact ? 8 : 12).map((row) => <div key={row.id} className={styles.rowWrap}><button type='button' data-work-row data-active={selectedId === row.id} onClick={() => onSelect(row)}><SeverityMark severity={row.severity} /><span className={styles.rowMain}><small>{row.domain} · {row.kind}</small><strong>{row.title}</strong><em>{row.subject}</em><span>{row.reason}</span></span><span className={styles.rowMeta}><Badge variant='outline'>{row.state}</Badge><small>{row.age}</small><em>{row.maturity}</em><ChevronRight aria-hidden='true' /></span></button>{inlineDetail && selectedId === row.id ? inlineDetail(row) : null}</div>)}</div>}<footer><span>Rows are bounded by the current page and capability scope.</span>{rows.length > 12 ? <nav aria-label='Admin worklist pages'><Button type='button' variant='outline' disabled>Previous</Button><span>Page 1 of 43</span><Button type='button' variant='outline'>Next</Button></nav> : null}</footer></section>
}

function EvidenceFacts({ row, fixture }: { row: WorkItem; fixture: Fixture }) {
  const taxonomy = row.kind === 'Taxonomy proposal'
  return <div className={styles.evidenceFacts}><section><h3>Why this is here</h3><p>{row.reason}</p></section><section><h3>Evidence</h3><dl><div><dt>Current state</dt><dd>{row.state}</dd></div><div><dt>Source</dt><dd>{row.source}</dd></div><div><dt>Maturity</dt><dd>{row.maturity}</dd></div><div><dt>Observed</dt><dd>8 Aug · 6:24 PM</dd></div><div><dt>Owner</dt><dd>{row.owner ?? 'Unclaimed'}</dd></div></dl></section>{taxonomy ? <section><h3>Taxonomy impact</h3><dl><div><dt>Facet</dt><dd>Language</dd></div><div><dt>Canonical ID</dt><dd><code>lang_yoruba</code></dd></div><div><dt>Relations</dt><dd>2 aliases · 1 mapping</dd></div><div><dt>Records affected</dt><dd>{fixture === 'taxonomy-deprecated' ? '384' : '18'}</dd></div><div><dt>Scheme</dt><dd>Creative practice v2</dd></div></dl><p>Opportunity type, eligibility, career stage, geography, fee, and deadline are not part of this term change.</p></section> : <section><h3>Related evidence</h3><ul><li><a href='#source'>Canonical source snapshot <ExternalLink aria-hidden='true' /></a></li><li><a href='#history'>Attempt and audit history <History aria-hidden='true' /></a></li><li><a href='#record'>Owning record <ArrowRight aria-hidden='true' /></a></li></ul></section>}</div>
}

function ActionGuard({ fixture }: { fixture: Fixture }) {
  if (fixture === 'read-only') return <p className={styles.accessNote}><LockKeyhole aria-hidden='true' />Read-only operator · actions are not included in this capability.</p>
  if (fixture === 'missing-capability' || fixture === 'capability-removed') return <p className={styles.accessNote}><ShieldAlert aria-hidden='true' />Recovery request unavailable for your current capability.</p>
  if (fixture === 'step-up') return <p className={styles.accessNote}><LockKeyhole aria-hidden='true' />Step-up authentication is required before this request.</p>
  if (fixture === 'two-person') return <p className={styles.accessNote}><Users aria-hidden='true' />A second authorized operator must approve execution.</p>
  if (fixture === 'audit-unavailable') return <p className={styles.accessNote}><FileClock aria-hidden='true' />Action paused until the required audit store returns.</p>
  return null
}

function EvidenceDetail({ row, fixture, mobile, onBack, onStatus }: { row?: WorkItem; fixture: Fixture; mobile?: boolean; onBack?: () => void; onStatus: (message: string) => void }) {
  const [actionOpen, setActionOpen] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const result = actionState(fixture)
  const blocked = ['read-only', 'missing-capability', 'capability-removed', 'audit-unavailable'].includes(fixture)

  if (!row) return <aside className={styles.detailEmpty}><PanelLeftClose aria-hidden='true' /><h2>Select an attention item</h2><p>Inspect reason, evidence, maturity, related records, history, and the safest eligible action.</p></aside>

  return <aside className={styles.evidenceDetail} aria-labelledby='admin-detail-title'>{mobile ? <Button type='button' variant='ghost' onClick={onBack}><ArrowLeft aria-hidden='true' />Back to worklist</Button> : null}<header><div><SeverityMark severity={row.severity} /><span><p className={styles.eyebrow}>{row.domain} · {row.kind}</p><h2 id='admin-detail-title' ref={headingRef} tabIndex={-1}>{row.title}</h2><p>{row.subject}</p></span></div><Button type='button' variant='ghost' size='icon' aria-label='Copy Admin item ID' onClick={() => onStatus(`Copied ${row.id}`)}><Copy aria-hidden='true' /></Button><code>{row.id}</code></header>{result ? <Alert variant={result.tone === 'danger' ? 'destructive' : 'default'} data-tone={result.tone}><ResultIcon tone={result.tone} /><AlertTitle>{result.title}</AlertTitle><AlertDescription>{result.copy}</AlertDescription></Alert> : null}{fixture === 'support-sensitive' ? <Alert><ShieldAlert aria-hidden='true' /><AlertTitle>Restricted support projection</AlertTitle><AlertDescription>Personal details and message body are redacted. Request only the minimum additional evidence needed.</AlertDescription></Alert> : null}{fixture === 'content-missing-source' ? <Alert variant='destructive'><AlertCircle aria-hidden='true' /><AlertTitle>Canonical source snapshot missing</AlertTitle><AlertDescription>Content review cannot proceed from a generated summary alone.</AlertDescription></Alert> : null}<EvidenceFacts row={row} fixture={fixture} /><section className={styles.recovery}><h3>Safe recovery guidance</h3><p>{row.domain === 'Operate' ? 'Request one eligible retry. The worker still owns execution, and the item remains open until acknowledgement.' : row.domain === 'Review' ? 'Compare source and impact before recording a governed review. Review is not publication.' : row.domain === 'Serve' ? 'Use the minimum customer evidence and keep every status change in append-only history.' : 'Reconcile the exact provider event and currency; do not infer revenue or entitlement state.'}</p></section><ActionGuard fixture={fixture} /><div className={styles.detailActions}><Button type='button' variant='outline'>Open history</Button><Button type='button' disabled={blocked} onClick={() => setActionOpen(true)}>Preview bounded action</Button></div><AlertDialog open={actionOpen} onOpenChange={setActionOpen}><AlertDialogContent className={styles.actionDialog}><AlertDialogHeader><AlertDialogTitle>Request the bounded action?</AlertDialogTitle><AlertDialogDescription>This preview does not call a worker directly. Review the target, expected state, scope, and consequence before recording the request.</AlertDialogDescription></AlertDialogHeader><dl><div><dt>Target</dt><dd>{row.kind} · {row.id}</dd></div><div><dt>Current state</dt><dd>{row.state}</dd></div><div><dt>Expected state</dt><dd>{row.state}</dd></div><div><dt>Scope</dt><dd>One item only</dd></div><div><dt>Result</dt><dd>Request queued; worker acknowledgement separate</dd></div><div><dt>Audit</dt><dd>Required for success</dd></div></dl><label><span>Reason</span><Textarea aria-label='Reason for Admin action' placeholder='Why is this action necessary?' rows={3} /></label>{fixture === 'step-up' ? <Alert><LockKeyhole aria-hidden='true' /><AlertTitle>Confirm your identity first</AlertTitle><AlertDescription>Step-up expires after this high-impact request.</AlertDescription></Alert> : null}{fixture === 'two-person' ? <Alert><Users aria-hidden='true' /><AlertTitle>Second approval required</AlertTitle><AlertDescription>The request can be recorded now, but cannot execute until another authorized operator approves it.</AlertDescription></Alert> : null}<AlertDialogFooter><AlertDialogCancel>Return to evidence</AlertDialogCancel><AlertDialogAction onClick={() => { setActionOpen(false); onStatus(fixture === 'two-person' ? 'Request recorded and awaiting second approval.' : 'Bounded request recorded. Awaiting acknowledgement.') }}>Request action</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></aside>
}

function ResultIcon({ tone }: { tone: 'info' | 'attention' | 'danger' }) {
  if (tone === 'danger') return <AlertCircle aria-hidden='true' />
  if (tone === 'attention') return <ShieldAlert aria-hidden='true' />
  return <Clock3 aria-hidden='true' />
}

function CommandLedger({ rows, fixture, shared }: { rows: WorkItem[]; fixture: Fixture; shared: SharedProps }) {
  return <div className={styles.ledgerDirection}><PlatformStrip fixture={fixture} /><Worklist rows={rows} query={shared.query} severity={shared.severity} selectedId={shared.selected?.id} onQuery={shared.onQuery} onSeverity={shared.onSeverity} onSelect={shared.onSelect} onClear={shared.onClear} inlineDetail={(row) => <EvidenceDetail row={row} fixture={fixture} onStatus={shared.onStatus} />} /></div>
}

function EvidenceControlRoom({ rows, fixture, shared }: { rows: WorkItem[]; fixture: Fixture; shared: SharedProps }) {
  if (shared.mobileDetail && shared.selected) return <div className={styles.mobileDetail}><EvidenceDetail row={shared.selected} fixture={fixture} mobile onBack={shared.onBack} onStatus={shared.onStatus} /></div>
  return <div className={styles.controlDirection}><PlatformStrip fixture={fixture} /><div className={styles.controlGrid}><Worklist rows={rows} query={shared.query} severity={shared.severity} selectedId={shared.selected?.id} compact onQuery={shared.onQuery} onSeverity={shared.onSeverity} onSelect={shared.onSelect} onClear={shared.onClear} /><EvidenceDetail row={shared.selected} fixture={fixture} onStatus={shared.onStatus} /></div></div>
}

function DomainIndex({ rows, fixture, shared }: { rows: WorkItem[]; fixture: Fixture; shared: SharedProps }) {
  const counts = domainRoutes.map((group) => ({ domain: group.domain, count: rows.filter((row) => row.domain === group.domain).length }))
  return <div className={styles.indexDirection}><nav className={styles.domainIndex} aria-label='Admin domains'>{counts.map((entry) => <a key={entry.domain} href={`#domain-${entry.domain.toLowerCase()}`}><span>{entry.domain}</span><strong>{entry.count}</strong><small>{entry.domain === 'Operate' ? 'Queues, agents, sources, system' : entry.domain === 'Review' ? 'Content, taxonomy, governance, audit' : entry.domain === 'Serve' ? 'Customers, Organizations, CRM, support' : 'Billing and analytics'}</small></a>)}</nav><PlatformStrip fixture={fixture} />{shared.mobileDetail && shared.selected ? <EvidenceDetail row={shared.selected} fixture={fixture} mobile onBack={shared.onBack} onStatus={shared.onStatus} /> : <><Worklist rows={rows} query={shared.query} severity={shared.severity} selectedId={shared.selected?.id} onQuery={shared.onQuery} onSeverity={shared.onSeverity} onSelect={shared.onSelect} onClear={shared.onClear} /><EvidenceDetail row={shared.selected} fixture={fixture} onStatus={shared.onStatus} /></>}</div>
}

type SharedProps = { query: string; severity: 'all' | Severity; selected?: WorkItem; mobileDetail: boolean; onQuery: (value: string) => void; onSeverity: (value: 'all' | Severity) => void; onSelect: (row: WorkItem) => void; onBack: () => void; onClear: () => void; onStatus: (message: string) => void }

function AdminExperience({ selectedOnly }: { selectedOnly: boolean }) {
  const [direction, setDirection] = useState<Direction>('control')
  const [fixture, setFixture] = useState<Fixture>('active')
  const [query, setQuery] = useState('')
  const [severity, setSeverity] = useState<'all' | Severity>('all')
  const [selectedId, setSelectedId] = useState<string>()
  const [mobileDetail, setMobileDetail] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [status, setStatus] = useState('')
  const rows = useMemo(() => fixtureRows(fixture), [fixture])
  const selected = rows.find((row) => row.id === selectedId) ?? rows[0]
  const activeDirection: Direction = selectedOnly ? 'control' : direction

  function changeFixture(value: Fixture) {
    const nextRows = fixtureRows(value)
    setFixture(value)
    setSelectedId(nextRows[0]?.id)
    setQuery(value === 'no-results' ? 'definitely-no-match' : '')
    setSeverity('all')
    setMobileDetail(false)
    setStatus('')
  }

  function selectRow(row: WorkItem) {
    setSelectedId(row.id)
    setMobileDetail(window.matchMedia('(max-width: 900px)').matches)
    window.setTimeout(() => document.getElementById('admin-detail-title')?.focus(), 0)
  }

  function backToList() {
    setMobileDetail(false)
    window.setTimeout(() => document.querySelector<HTMLElement>("button[data-work-row][data-active='true']")?.focus(), 0)
  }

  const shared: SharedProps = { query, severity, selected, mobileDetail, onQuery: setQuery, onSeverity: setSeverity, onSelect: selectRow, onBack: backToList, onClear: () => { setQuery(''); setSeverity('all') }, onStatus: setStatus }

  return <div className={styles.page}><DirectionControls direction={activeDirection} fixture={fixture} selectedOnly={selectedOnly} onDirection={(value) => { setDirection(value); setMobileDetail(false); setStatus('') }} onFixture={changeFixture} /><DirectionIntro direction={activeDirection} selectedOnly={selectedOnly} /><div className={styles.adminShell} data-direction={activeDirection}><aside className={styles.sidebar}><div className={styles.brand}><MissaWordmark href={null} size='compact' /><span>Platform Admin</span></div><AdminNavigation compact={activeDirection === 'index'} /><footer><span>PA</span><div><strong>Platform operator</strong><small>Read + request access</small></div></footer></aside><section className={styles.shellBody}><AdminHeader navOpen={navOpen} onNavOpen={() => setNavOpen((open) => !open)} />{navOpen ? <div id='admin-mobile-navigation' className={styles.mobileNavigation}><AdminNavigation mobile /></div> : null}<main id='admin-main' className={styles.main}><PageHeading fixture={fixture} rowCount={rows.length} /><Warning fixture={fixture} />{activeDirection === 'ledger' ? <CommandLedger rows={rows} fixture={fixture} shared={shared} /> : activeDirection === 'control' ? <EvidenceControlRoom rows={rows} fixture={fixture} shared={shared} /> : <DomainIndex rows={rows} fixture={fixture} shared={shared} />}</main></section></div><p className={styles.liveStatus} role='status' aria-live='polite'>{status}{status ? <Check aria-hidden='true' /> : null}</p></div>
}

export function AdminDirections() {
  return <AdminExperience selectedOnly={false} />
}

export function AdminSelected() {
  return <AdminExperience selectedOnly />
}
