'use client'

import {
  AlertCircle,
  ArrowRight,
  Bell,
  BookOpen,
  CalendarSync,
  Check,
  ChevronRight,
  CircleUserRound,
  Database,
  Download,
  ExternalLink,
  Eye,
  FileSearch,
  Inbox,
  Link2,
  Mail,
  Menu,
  MoreHorizontal,
  RefreshCw,
  Search,
  Shield,
  SlidersHorizontal,
  Unplug,
  Upload,
  UserRoundCheck,
  UsersRound,
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import { MissaWordmark } from '@/components/missa-wordmark'
import styles from './profile-directions.module.css'

type Direction = 'rail' | 'ledger' | 'index'
type ProfileSection = 'overview' | 'identity' | 'preferences' | 'privacy' | 'integrations' | 'searches' | 'following' | 'data'
type Fixture = 'active' | 'new' | 'partial' | 'multi' | 'preference-conflict' | 'deprecated' | 'private' | 'privacy-conflict' | 'integration-attention' | 'integration-error' | 'empty-collections' | 'large' | 'mutation-error' | 'concurrent' | 'export-error'

type SectionDefinition = { id: ProfileSection; label: string; description: string; icon: typeof CircleUserRound }

const directions: Array<{ id: Direction; number: string; title: string; description: string }> = [
  { id: 'rail', number: '01', title: 'Focused sections', description: 'A quiet route rail keeps each Profile job stable, scoped, and easy to revisit.' },
  { id: 'ledger', number: '02', title: 'Profile ledger', description: 'An editorial identity header and horizontal index turn settings into a readable personal record.' },
  { id: 'index', number: '03', title: 'Action index', description: 'A task-first master-detail index makes state and the next safe action visible together.' },
]

const sectionDefinitions: SectionDefinition[] = [
  { id: 'overview', label: 'Overview', description: 'Understand what is public and what needs attention', icon: CircleUserRound },
  { id: 'identity', label: 'Identity', description: 'Name, bio, image, links, and public Works', icon: UserRoundCheck },
  { id: 'preferences', label: 'Preferences', description: 'Private field and opportunity choices', icon: SlidersHorizontal },
  { id: 'privacy', label: 'Privacy', description: 'Choose what visitors can see', icon: Shield },
  { id: 'integrations', label: 'Integrations', description: 'Email and calendar connections', icon: Link2 },
  { id: 'searches', label: 'Saved searches', description: 'Named repeatable opportunity searches', icon: FileSearch },
  { id: 'following', label: 'Following', description: 'Organizations you chose to follow', icon: UsersRound },
  { id: 'data', label: 'Data', description: 'Export and import your private records', icon: Database },
]

const fixtureOptions: Array<{ value: Fixture; label: string }> = [
  { value: 'active', label: 'Active Profile' },
  { value: 'new', label: 'New creator' },
  { value: 'partial', label: 'Partially configured' },
  { value: 'multi', label: 'Multidisciplinary creator' },
  { value: 'preference-conflict', label: 'Preference conflict' },
  { value: 'deprecated', label: 'Deprecated field term' },
  { value: 'private', label: 'Private identity' },
  { value: 'privacy-conflict', label: 'Public Work became private' },
  { value: 'integration-attention', label: 'Connections need attention' },
  { value: 'integration-error', label: 'Connections unavailable' },
  { value: 'empty-collections', label: 'No searches or follows' },
  { value: 'large', label: 'Large Profile collections' },
  { value: 'mutation-error', label: 'Save failed' },
  { value: 'concurrent', label: 'Changed elsewhere' },
  { value: 'export-error', label: 'Export unavailable' },
]

const baseTerms = [
  { id: 'writing', label: 'Writing and literature', facet: 'Field', preference: 'Show me opportunities like this' },
  { id: 'poetry', label: 'Poetry', facet: 'Genre', preference: 'Especially interested' },
  { id: 'spoken-word', label: 'Spoken word', facet: 'Form', preference: 'Show me opportunities like this' },
  { id: 'english', label: 'English', facet: 'Language', preference: 'Show me opportunities like this' },
]

const multiTerms = [
  ...baseTerms,
  { id: 'film', label: 'Film and moving image', facet: 'Field', preference: 'Show me opportunities like this' },
  { id: 'screenwriting', label: 'Screenwriting', facet: 'Discipline', preference: 'Especially interested' },
  { id: 'installation', label: 'Installation', facet: 'Medium', preference: 'Show me opportunities like this' },
  { id: 'producer', label: 'Producer', facet: 'Role', preference: 'Show me opportunities like this' },
  { id: 'yoruba', label: 'Yorùbá', facet: 'Language', preference: 'Especially interested' },
]

const savedSearchNames = ['Poetry · no fee', 'West African residencies', 'Writing grants · 90 days', 'Remote editorial commissions']
const followedNames = ['North River Review', 'Field Notes Foundation', 'Common Ground Arts', 'Meridian Press']

function fixtureSection(fixture: Fixture): ProfileSection {
  if (fixture === 'preference-conflict' || fixture === 'deprecated' || fixture === 'multi' || fixture === 'partial') return 'preferences'
  if (fixture === 'private' || fixture === 'privacy-conflict') return 'privacy'
  if (fixture === 'integration-attention' || fixture === 'integration-error') return 'integrations'
  if (fixture === 'empty-collections' || fixture === 'large') return 'searches'
  if (fixture === 'export-error') return 'data'
  if (fixture === 'mutation-error' || fixture === 'concurrent') return 'identity'
  return 'overview'
}

function AppHeader() {
  return <header className={styles.appHeader}><MissaWordmark href='#profile-content' size='app' className={styles.wordmark} /><nav aria-label='Primary navigation'><a href='#'>Opportunities</a><a href='#'>Tracker</a><a href='#'>Library</a></nav><div className={styles.headerActions}><Button type='button' variant='ghost' size='icon' aria-label='Open Inbox'><Inbox aria-hidden='true' /></Button><Button type='button' variant='ghost' size='icon' className={styles.mobileMenu} aria-label='Open navigation'><Menu aria-hidden='true' /></Button><button type='button' className={styles.avatar} aria-label='Open Profile' aria-current='page'>AO</button></div></header>
}

function ReviewBar({ direction, setDirection, fixture, setFixture }: { direction: Direction; setDirection: (direction: Direction) => void; fixture: Fixture; setFixture: (fixture: Fixture) => void }) {
  return <div className={styles.reviewBar} aria-label='Design review controls'><div className={styles.directionButtons}>{directions.map((item) => <button key={item.id} type='button' data-active={direction === item.id} aria-pressed={direction === item.id} onClick={() => setDirection(item.id)}><span>{item.number}</span>{item.title}</button>)}</div><label><span>Edge state</span><select value={fixture} onChange={(event) => setFixture(event.target.value as Fixture)}>{fixtureOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>
}

function SelectedReviewBar({ fixture, setFixture }: { fixture: Fixture; setFixture: (fixture: Fixture) => void }) {
  return <div className={styles.selectedReviewBar} aria-label='Design review controls'><div><strong>Selected Profile composition</strong><span>Profile ledger · editorial identity index</span></div><label><span>Edge state</span><select value={fixture} onChange={(event) => setFixture(event.target.value as Fixture)}>{fixtureOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>
}

function DirectionIntro({ direction }: { direction: Direction }) {
  const item = directions.find((entry) => entry.id === direction)!
  return <section className={styles.directionIntro}><span>{item.number}</span><div><p>Profile direction</p><h1>{item.title}</h1><p>{item.description}</p></div></section>
}

function ProfileHeading({ fixture }: { fixture: Fixture }) {
  const privateIdentity = fixture === 'private'
  return <div className={styles.profileHeading}><div className={styles.profileIdentity}><span className={styles.profileAvatar} aria-hidden='true'>{privateIdentity ? '—' : 'AO'}</span><div><p className={styles.eyebrow}>Your Profile</p><h2>{privateIdentity ? 'Private identity' : fixture === 'new' ? 'Welcome to your Profile' : 'Adedayo Ogarau'}</h2><p>{privateIdentity ? 'Visitors cannot see your name, bio, image, or private activity.' : 'Public identity and private opportunity preferences stay separate.'}</p></div></div><Button type='button' variant='outline'><Eye aria-hidden='true' />Preview public Profile</Button></div>
}

function SelectedProfileHeading({ fixture }: { fixture: Fixture }) {
  return <div className={styles.profileHeading}><div className={styles.profileIdentity}><span className={styles.profileAvatar} aria-hidden='true'>{fixture === 'private' ? '—' : 'AO'}</span><div><p className={styles.eyebrow}>Your account</p><h1>Profile</h1><p>{fixture === 'private' ? 'Your public identity is private. Preferences and account activity remain private in every state.' : 'Control your public identity, private opportunity preferences, privacy, connections, and data.'}</p></div></div><Button type='button' variant='outline'><Eye aria-hidden='true' />Preview public Profile</Button></div>
}

function statusFor(section: ProfileSection, fixture: Fixture): { label: string; tone?: 'attention' | 'success' | 'private' } {
  if (fixture === 'new') {
    if (section === 'identity') return { label: 'Name only', tone: 'attention' }
    if (section === 'privacy') return { label: 'Private defaults', tone: 'private' }
    if (section === 'overview') return { label: 'Start here', tone: 'attention' }
    return { label: 'Not set' }
  }
  if (fixture === 'partial' && section === 'preferences') return { label: 'Needs review', tone: 'attention' }
  if ((fixture === 'preference-conflict' || fixture === 'deprecated') && section === 'preferences') return { label: 'Needs review', tone: 'attention' }
  if ((fixture === 'private' || fixture === 'privacy-conflict') && section === 'privacy') return { label: fixture === 'private' ? 'Everything private' : 'Needs review', tone: fixture === 'private' ? 'private' : 'attention' }
  if ((fixture === 'integration-attention' || fixture === 'integration-error') && section === 'integrations') return { label: 'Needs attention', tone: 'attention' }
  if (fixture === 'empty-collections' && (section === 'searches' || section === 'following')) return { label: 'Empty' }
  if (fixture === 'export-error' && section === 'data') return { label: 'Try again', tone: 'attention' }
  if (section === 'identity') return { label: 'Public', tone: 'success' }
  if (section === 'preferences') return { label: 'Private', tone: 'private' }
  if (section === 'privacy') return { label: 'Reviewed', tone: 'success' }
  if (section === 'integrations') return { label: '2 connected', tone: 'success' }
  if (section === 'searches') return { label: fixture === 'large' ? '24 searches' : '4 searches' }
  if (section === 'following') return { label: fixture === 'large' ? '40 Organizations' : '4 Organizations' }
  if (section === 'data') return { label: 'Owner only', tone: 'private' }
  return { label: 'Current' }
}

function SectionNav({ active, fixture, onNavigate, compact = false }: { active: ProfileSection; fixture: Fixture; onNavigate: (section: ProfileSection) => void; compact?: boolean }) {
  return <nav className={compact ? styles.compactNav : styles.sectionNav} aria-label='Profile sections'>{sectionDefinitions.map((item) => { const Icon = item.icon; const status = statusFor(item.id, fixture); return <a key={item.id} href={`#profile-${item.id}`} aria-current={active === item.id ? 'page' : undefined} onClick={(event) => { event.preventDefault(); onNavigate(item.id) }}><Icon aria-hidden='true' /><span><strong>{item.label}</strong>{compact ? null : <small>{item.description}</small>}</span>{compact ? null : <Badge variant='outline' data-tone={status.tone}>{status.label}</Badge>}</a> })}</nav>
}

function SectionHeader({ section }: { section: ProfileSection }) {
  const item = sectionDefinitions.find((entry) => entry.id === section)!
  return <header className={styles.sectionHeader}><p className={styles.eyebrow}>Profile · {item.label}</p><h2 id={`profile-${section}`} tabIndex={-1}>{item.label}</h2><p>{item.description}.</p></header>
}

function Overview({ fixture, onNavigate }: { fixture: Fixture; onNavigate: (section: ProfileSection) => void }) {
  const next = fixture === 'new' ? { title: 'Add private opportunity preferences', copy: 'Choose a broad field and the opportunity types you want to see. You can refine them later.', section: 'preferences' as const } : fixture === 'partial' ? { title: 'Finish geography and opportunity types', copy: 'These private settings help explain why an opportunity appears without deciding eligibility for you.', section: 'preferences' as const } : fixture === 'integration-attention' ? { title: 'Repair your Gmail connection', copy: 'Missa stopped reading new submission updates. Your confirmed Tracker history is unchanged.', section: 'integrations' as const } : { title: 'Review your public Profile', copy: 'Your name, short bio, and one selected Work are visible. Private preferences and Tracker history are not.', section: 'privacy' as const }
  return <div className={styles.overview}><Alert><CircleUserRound aria-hidden='true' /><AlertTitle>{next.title}</AlertTitle><AlertDescription>{next.copy}</AlertDescription><Button type='button' variant='outline' onClick={() => onNavigate(next.section)}>Review {sectionDefinitions.find((item) => item.id === next.section)!.label}<ArrowRight aria-hidden='true' /></Button></Alert><section className={styles.publicSummary}><div><p className={styles.eyebrow}>Public preview</p><h3>{fixture === 'private' ? 'Nothing is public' : 'Adedayo Ogarau'}</h3><p>{fixture === 'private' ? 'Your public link does not reveal a hidden name, bio, user ID, or private field.' : 'Writer, filmmaker, and researcher working across poetry, screenwriting, and moving image.'}</p></div><dl><div><dt>Public fields</dt><dd>{fixture === 'private' ? 'None' : 'Name · Bio · 1 Work'}</dd></div><div><dt>Always private</dt><dd>Preferences · Eligibility · Tracker · Connections</dd></div></dl></section><section className={styles.overviewRows} aria-labelledby='section-state-title'><header><h3 id='section-state-title'>Profile sections</h3><p>Each section saves and recovers independently.</p></header>{sectionDefinitions.filter((item) => item.id !== 'overview').map((item) => { const Icon = item.icon; const status = statusFor(item.id, fixture); return <button key={item.id} type='button' onClick={() => onNavigate(item.id)}><Icon aria-hidden='true' /><span><strong>{item.label}</strong><small>{item.description}</small></span><Badge variant='outline' data-tone={status.tone}>{status.label}</Badge><ChevronRight aria-hidden='true' /></button> })}</section></div>
}

function Identity({ fixture, dirty, setDirty, onSave, onStatus }: { fixture: Fixture; dirty: boolean; setDirty: (dirty: boolean) => void; onSave: () => void; onStatus: (message: string) => void }) {
  const hasError = fixture === 'mutation-error'
  return <div className={styles.formSurface}>{fixture === 'concurrent' ? <Alert><RefreshCw aria-hidden='true' /><AlertTitle>This Profile changed in another session</AlertTitle><AlertDescription>Review the newer public bio before replacing it. Your local edits are still here.</AlertDescription><Button type='button' variant='outline' onClick={() => onStatus('Newer Profile details opened for comparison.')}>Compare changes</Button></Alert> : null}<section className={styles.imageEditor}><span className={styles.largeAvatar}>AO</span><div><h3>Profile image</h3><p>Optional. If published, visitors see it with your public identity.</p><div><Button type='button' variant='outline' onClick={() => onStatus('Image chooser opened.')}><Upload aria-hidden='true' />Choose image</Button><Button type='button' variant='ghost' onClick={() => onStatus('Profile image removed from this draft.')}>Remove</Button></div></div><Badge variant='outline'>Public</Badge></section><form onSubmit={(event) => { event.preventDefault(); onSave() }} className={styles.profileForm} noValidate><div><Label htmlFor='profile-name'>Display name</Label><Input id='profile-name' defaultValue={fixture === 'new' ? 'Adedayo' : 'Adedayo Ogarau'} onChange={() => setDirty(true)} aria-describedby='profile-name-help' /><p id='profile-name-help'>Visitors see this only while the field is public.</p></div><div><Label htmlFor='profile-bio'>Short bio</Label><Textarea id='profile-bio' defaultValue={fixture === 'new' ? '' : 'Writer, filmmaker, and researcher working across poetry, screenwriting, and moving image.'} rows={6} onChange={() => setDirty(true)} aria-describedby={hasError ? 'profile-bio-help profile-bio-error' : 'profile-bio-help'} aria-errormessage={hasError ? 'profile-bio-error' : undefined} aria-invalid={hasError} /><p id='profile-bio-help'>Describe your field in your own words. Up to 1,000 characters.</p>{hasError ? <p id='profile-bio-error' role='alert' className={styles.fieldError}>We could not save this bio. Your edits remain here; check your connection and try again.</p> : null}</div><div><Label htmlFor='profile-link'>Public link</Label><Input id='profile-link' type='url' placeholder='https://your-site.example' onChange={() => setDirty(true)} aria-describedby='profile-link-help' /><p id='profile-link-help'>Optional. Missa checks the URL before adding it to your public Profile.</p></div><div className={styles.saveRow}><Button type='submit'>{hasError ? 'Try saving again' : 'Save identity'}</Button><span>{dirty ? 'Unsaved identity changes' : 'Identity changes save separately'}</span></div></form></div>
}

function Preferences({ fixture, onStatus }: { fixture: Fixture; onStatus: (message: string) => void }) {
  const terms = fixture === 'multi' ? multiTerms : fixture === 'deprecated' ? [...baseTerms, { id: 'deprecated', label: 'Interdisciplinary arts', facet: 'Previous label', preference: 'Review replacement' }] : baseTerms
  const [query, setQuery] = useState('')
  const visibleTerms = terms.filter((term) => `${term.label} ${term.facet}`.toLowerCase().includes(query.toLowerCase()))
  return <div className={styles.preferenceSurface}><Alert><Shield aria-hidden='true' /><AlertTitle>These preferences are private</AlertTitle><AlertDescription>They help Missa explain and filter opportunities. They never appear on your public Profile or decide eligibility.</AlertDescription></Alert>{fixture === 'preference-conflict' ? <Alert variant='destructive'><AlertCircle aria-hidden='true' /><AlertTitle>Two field choices conflict</AlertTitle><AlertDescription>Writing and literature is set to “Do not show,” while Poetry beneath it is “Especially interested.” Choose which consequence you intend before saving.</AlertDescription><Button type='button' variant='outline' onClick={() => onStatus('Preference conflict opened for resolution.')}>Resolve conflict</Button></Alert> : null}{fixture === 'deprecated' ? <Alert><RefreshCw aria-hidden='true' /><AlertTitle>One field label has a clearer replacement</AlertTitle><AlertDescription>Your saved ID is still intact. Review “Cross-disciplinary work” before replacing the previous label.</AlertDescription><Button type='button' variant='outline' onClick={() => onStatus('Replacement term selected for review.')}>Review replacement</Button></Alert> : null}<section className={styles.preferenceGroup}><header><div><p className={styles.eyebrow}>12 independent facets</p><h3>Field and role</h3><p>Begin broadly, then refine only the branches that describe what you want to find.</p></div><span>{terms.length} selected</span></header><label className={styles.searchField}><span>Search field terms</span><div><Search aria-hidden='true' /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder='Search poetry, screenwriting, installation…' /></div></label><div className={styles.termList} aria-label='Selected private field preferences'>{visibleTerms.map((term) => <article key={term.id}><Badge variant='outline'>{term.facet}</Badge><div><strong>{term.label}</strong><small>Stored privately with a stable term ID</small></div><select aria-label={`Preference for ${term.label}`} defaultValue={term.preference}><option>Show me opportunities like this</option><option>Especially interested</option><option>Do not show this field</option>{term.id === 'deprecated' ? <option>Review replacement</option> : null}</select><Button type='button' variant='ghost' size='icon' aria-label={`More actions for ${term.label}`}><MoreHorizontal aria-hidden='true' /></Button></article>)}</div>{!visibleTerms.length ? <p className={styles.quietEmpty}>No selected term matches this search. Search the wider taxonomy to add another ordinary-language label.</p> : null}<Button type='button' variant='outline' onClick={() => onStatus('Progressive field picker opened.')}><Search aria-hidden='true' />Add field or role</Button></section><section className={styles.preferenceGrid}><fieldset><legend>Opportunity types</legend><p>Separate from field.</p>{['Grant', 'Residency', 'Commission', 'Journal or magazine', 'Exhibition', 'Contest'].map((label, index) => <label key={label}><input type='checkbox' defaultChecked={fixture !== 'partial' && index < 3} />{label}</label>)}</fieldset><div><Label htmlFor='preference-region'>Regions and participation</Label><Input id='preference-region' defaultValue={fixture === 'partial' ? '' : 'Nigeria · West Africa · Remote'} placeholder='Add a region or remote preference' /><p>Location preferences do not confirm eligibility when an opportunity has not stated its rule.</p><Label htmlFor='preference-fee'>Maximum application fee</Label><select id='preference-fee' defaultValue='no-fee'><option value='any'>Any disclosed fee</option><option value='no-fee'>No fee only</option><option value='custom'>Set a maximum</option></select></div></section><div className={styles.saveRow}><Button type='button' onClick={() => onStatus(fixture === 'preference-conflict' ? 'Resolve the field conflict before saving.' : 'Private preferences saved.')}>Save preferences</Button><span>Does not change Identity or Privacy</span></div></div>
}

function Privacy({ fixture, onStatus }: { fixture: Fixture; onStatus: (message: string) => void }) {
  const privateAll = fixture === 'private'
  const rows = [{ id: 'name', label: 'Display name', copy: 'Your chosen public identity.' }, { id: 'bio', label: 'Short bio', copy: 'Context about your field.' }, { id: 'image', label: 'Profile image', copy: 'The image beside your public name.' }, { id: 'work', label: 'Selected Work · Saltwater Lessons', copy: 'A Library Work you explicitly published.' }]
  const [visibility, setVisibility] = useState<Record<string, 'public' | 'private'>>(() => Object.fromEntries(rows.map((row) => [row.id, privateAll || (fixture === 'privacy-conflict' && row.id === 'work') ? 'private' : 'public'])))
  const hasPublicIdentity = Object.entries(visibility).some(([id, value]) => id !== 'work' && value === 'public')
  return <div className={styles.privacyLayout}>{fixture === 'privacy-conflict' ? <Alert variant='destructive'><AlertCircle aria-hidden='true' /><AlertTitle>A selected public Work is private in Library</AlertTitle><AlertDescription>It has been removed from the public preview. The private Work and its submission history are unchanged.</AlertDescription><Button type='button' variant='outline' onClick={() => onStatus('Library privacy opened for Saltwater Lessons.')}>Review Work privacy</Button></Alert> : null}<section className={styles.visibilityList}><header><h3>Public identity fields</h3><p>Private matching, eligibility, Tracker, searches, follows, and connections never appear here.</p></header>{rows.map((row) => <article key={row.id}><div><strong>{row.label}</strong><p>{row.copy}</p></div><div role='group' aria-label={`Visibility for ${row.label}`}><button type='button' data-active={visibility[row.id] === 'public'} onClick={() => { setVisibility((current) => ({ ...current, [row.id]: 'public' })); onStatus(`${row.label} set to public in this draft.`) }}>Public</button><button type='button' data-active={visibility[row.id] === 'private'} onClick={() => { setVisibility((current) => ({ ...current, [row.id]: 'private' })); onStatus(`${row.label} set to private in this draft.`) }}>Private</button></div></article>)}<div className={styles.saveRow}><Button type='button' onClick={() => onStatus('Privacy settings saved.')}>Save privacy</Button><span>Public preview updates only after save</span></div></section><aside className={styles.publicPreview}><p className={styles.eyebrow}>Public preview</p>{!hasPublicIdentity ? <><Shield aria-hidden='true' /><h3>This Profile is private</h3><p>Visitors are not shown a hidden name, bio, user ID, or previous content.</p></> : <><span className={styles.largeAvatar}>{visibility.image === 'public' ? 'AO' : '—'}</span><h3>{visibility.name === 'public' ? 'Adedayo Ogarau' : 'Public Profile'}</h3>{visibility.bio === 'public' ? <p>Writer, filmmaker, and researcher working across poetry, screenwriting, and moving image.</p> : null}{visibility.work === 'public' ? <div><BookOpen aria-hidden='true' /><span><strong>Saltwater Lessons</strong><small>Essay · Work published by its owner</small></span></div> : null}<a href='#'>Open public Profile <ExternalLink aria-hidden='true' /></a></>}</aside></div>
}

function Integrations({ fixture, onStatus }: { fixture: Fixture; onStatus: (message: string) => void }) {
  const unavailable = fixture === 'integration-error'
  const attention = fixture === 'integration-attention'
  const rows = [{ id: 'gmail', icon: Mail, name: 'Gmail', status: attention ? 'Needs attention' : 'Connected', copy: attention ? 'Reconnect before Missa can find new submission updates.' : 'Review-first access to likely submission updates. 2 updates are waiting in Inbox.', action: attention ? 'Reconnect' : 'Manage' }, { id: 'forwarding', icon: Bell, name: 'Email forwarding', status: 'Connected', copy: 'Only messages you forward are reviewed. Attachments are not imported.', action: 'Manage' }, { id: 'calendar', icon: CalendarSync, name: 'Calendar subscription', status: attention ? 'Rotate link' : 'Connected', copy: 'Private exact deadlines are available to your calendar app.', action: attention ? 'Rotate private link' : 'Manage' }]
  if (unavailable) return <div className={styles.integrationSurface}><Alert variant='destructive'><Unplug aria-hidden='true' /><AlertTitle>Connections could not be loaded</AlertTitle><AlertDescription>Your existing permissions have not been changed. Try again without reconnecting or disconnecting anything.</AlertDescription><Button type='button' variant='outline' onClick={() => onStatus('Connections requested again.')}>Try again</Button></Alert></div>
  return <div className={styles.integrationSurface}><Alert><Shield aria-hidden='true' /><AlertTitle>Connections are private and reversible</AlertTitle><AlertDescription>Organizations never see your email history, forwarding address, calendar link, or connection status.</AlertDescription></Alert><section className={styles.connectionList}>{rows.map((row) => { const Icon = row.icon; return <article key={row.id}><span><Icon aria-hidden='true' /></span><div><div><h3>{row.name}</h3><Badge variant='outline' data-tone={row.status === 'Connected' ? 'success' : 'attention'}>{row.status}</Badge></div><p>{row.copy}</p></div><Button type='button' variant='outline' onClick={() => onStatus(`${row.action} opened for ${row.name}.`)}>{row.action}</Button></article> })}</section><p className={styles.boundaryNote}>Missa does not show provider codes, background job names, confidence thresholds, or sync timestamps here.</p></div>
}

function SavedSearches({ fixture, onStatus }: { fixture: Fixture; onStatus: (message: string) => void }) {
  const empty = fixture === 'empty-collections' || fixture === 'new'
  const names = fixture === 'large' ? Array.from({ length: 24 }, (_, index) => `${savedSearchNames[index % savedSearchNames.length]} · ${index + 1}`) : savedSearchNames
  return <div className={styles.collectionSurface}><div className={styles.collectionToolbar}><div><h3>Your saved searches</h3><p>Repeatable queries are separate from broad Profile preferences.</p></div><Button type='button' onClick={() => onStatus('New saved search editor opened.')}>New saved search</Button></div>{empty ? <section className={styles.emptyState}><FileSearch aria-hidden='true' /><h3>No saved searches yet</h3><p>Save a useful Opportunities query to run it again without changing your broad Profile preferences.</p><Button type='button' variant='outline'>Browse Opportunities</Button></section> : <><div className={styles.collectionList}>{names.slice(0, fixture === 'large' ? 8 : names.length).map((name, index) => <article key={name}><FileSearch aria-hidden='true' /><div><strong>{name}</strong><p>{index % 2 ? 'Residency · West Africa · Remote allowed' : 'Poetry · No fee · Within 90 days'}</p></div><Badge variant='outline'>{index % 3 ? 'Notifications on' : 'Run manually'}</Badge><Button type='button' variant='ghost' size='icon' aria-label={`More actions for ${name}`}><MoreHorizontal aria-hidden='true' /></Button></article>)}</div>{fixture === 'large' ? <nav className={styles.pagination} aria-label='Saved searches pages'><Button type='button' variant='outline' disabled>Previous</Button><span>Page 1 of 3</span><Button type='button' variant='outline' onClick={() => onStatus('Saved searches page 2 opened.')}>Next</Button></nav> : null}</>}</div>
}

function Following({ fixture, onStatus }: { fixture: Fixture; onStatus: (message: string) => void }) {
  const empty = fixture === 'empty-collections' || fixture === 'new'
  const names = fixture === 'large' ? Array.from({ length: 40 }, (_, index) => `${followedNames[index % followedNames.length]} · ${index + 1}`) : followedNames
  return <div className={styles.collectionSurface}><div className={styles.collectionToolbar}><div><h3>Organizations you follow</h3><p>Following can place Organization updates in Inbox. It is not an endorsement.</p></div><Button type='button' variant='outline'>Find Organizations</Button></div>{empty ? <section className={styles.emptyState}><UsersRound aria-hidden='true' /><h3>You are not following any Organizations</h3><p>Follow an Organization from its public page when you want updates about its opportunities.</p><Button type='button' variant='outline'>Browse Organizations</Button></section> : <div className={styles.collectionList}>{names.slice(0, fixture === 'large' ? 10 : names.length).map((name, index) => <article key={name}><span className={styles.orgMark}>{name.slice(0, 2).toUpperCase()}</span><div><strong>{name}</strong><p>{index % 2 ? '1 open opportunity' : 'No open opportunities right now'}</p></div><Button type='button' variant='outline' onClick={() => onStatus(`${name} opened.`)}>View</Button><Button type='button' variant='ghost' onClick={() => onStatus(`Unfollow confirmation opened for ${name}.`)}>Unfollow</Button></article>)}</div>}</div>
}

function DataSection({ fixture, onStatus }: { fixture: Fixture; onStatus: (message: string) => void }) {
  const failed = fixture === 'export-error'
  return <div className={styles.dataSurface}>{failed ? <Alert variant='destructive'><AlertCircle aria-hidden='true' /><AlertTitle>Your export could not be prepared</AlertTitle><AlertDescription>Your Profile and private records are unchanged. If you recently downloaded an export, wait a moment before trying again.</AlertDescription></Alert> : null}<section><header><Download aria-hidden='true' /><div><h3>Download your data</h3><p>Owner-scoped exports include the selected private areas and never place export contents in this page.</p></div></header><fieldset><legend>Export scope</legend><label><input type='radio' name='export-scope' defaultChecked />Everything in Tracker and Library</label><label><input type='radio' name='export-scope' />Tracker only</label><label><input type='radio' name='export-scope' />Library only</label></fieldset><div><Button type='button' onClick={() => onStatus(failed ? 'Export is still unavailable. Your records remain unchanged.' : 'Private JSON export prepared for download.')}><Download aria-hidden='true' />Download JSON</Button><Button type='button' variant='outline' onClick={() => onStatus(failed ? 'Export is still unavailable. Your records remain unchanged.' : 'Private CSV export prepared for download.')}>Download CSV</Button></div></section><section><header><Upload aria-hidden='true' /><div><h3>Import Tracker records</h3><p>Preview mapping and duplicates before anything is written.</p></div></header><Button type='button' variant='outline'>Open import</Button></section></div>
}

function SectionContent({ section, fixture, dirty, setDirty, onSave, onStatus, onNavigate }: { section: ProfileSection; fixture: Fixture; dirty: boolean; setDirty: (dirty: boolean) => void; onSave: () => void; onStatus: (message: string) => void; onNavigate: (section: ProfileSection) => void }) {
  return <section className={styles.sectionContent} aria-labelledby={`profile-${section}`}><SectionHeader section={section} />{section === 'overview' ? <Overview fixture={fixture} onNavigate={onNavigate} /> : null}{section === 'identity' ? <Identity key={fixture} fixture={fixture} dirty={dirty} setDirty={setDirty} onSave={onSave} onStatus={onStatus} /> : null}{section === 'preferences' ? <Preferences key={fixture} fixture={fixture} onStatus={onStatus} /> : null}{section === 'privacy' ? <Privacy key={fixture} fixture={fixture} onStatus={onStatus} /> : null}{section === 'integrations' ? <Integrations fixture={fixture} onStatus={onStatus} /> : null}{section === 'searches' ? <SavedSearches fixture={fixture} onStatus={onStatus} /> : null}{section === 'following' ? <Following fixture={fixture} onStatus={onStatus} /> : null}{section === 'data' ? <DataSection fixture={fixture} onStatus={onStatus} /> : null}</section>
}

function RailDirection(props: SharedDirectionProps) {
  return <div className={styles.railLayout}><SectionNav active={props.section} fixture={props.fixture} onNavigate={props.onNavigate} /><SectionContent {...props} /></div>
}

function LedgerDirection(props: SharedDirectionProps) {
  return <div className={styles.ledgerLayout}><section className={styles.ledgerIdentity}><div><span className={styles.largeAvatar}>AO</span><div><p className={styles.eyebrow}>Public identity</p><h2>Adedayo Ogarau</h2><p>Writer, filmmaker, and researcher.</p></div></div><dl><div><dt>Public</dt><dd>{props.fixture === 'private' ? 'Nothing' : 'Name · Bio · 1 Work'}</dd></div><div><dt>Private</dt><dd>Preferences · Eligibility · Tracker</dd></div></dl></section><SectionNav active={props.section} fixture={props.fixture} onNavigate={props.onNavigate} compact /><SectionContent {...props} /></div>
}

function IndexDirection(props: SharedDirectionProps) {
  return <div className={styles.indexLayout}><section className={styles.actionIndex}><header><p className={styles.eyebrow}>Profile index</p><h2>Choose what to review</h2><p>Every action states whether it changes public identity, private matching, or a connection.</p></header><SectionNav active={props.section} fixture={props.fixture} onNavigate={props.onNavigate} /></section><SectionContent {...props} /></div>
}

type SharedDirectionProps = { section: ProfileSection; fixture: Fixture; dirty: boolean; setDirty: (dirty: boolean) => void; onSave: () => void; onStatus: (message: string) => void; onNavigate: (section: ProfileSection) => void }

export function ProfileDirections() {
  const [direction, setDirection] = useState<Direction>('ledger')
  const [fixture, setFixture] = useState<Fixture>('active')
  const [section, setSection] = useState<ProfileSection>('overview')
  const [dirty, setDirty] = useState(false)
  const [pendingSection, setPendingSection] = useState<ProfileSection>()
  const [status, setStatus] = useState('')
  const activeDirection = useMemo(() => directions.find((item) => item.id === direction)!, [direction])

  function changeFixture(next: Fixture) { setFixture(next); setSection(fixtureSection(next)); setDirty(false); setPendingSection(undefined); setStatus('') }
  function focusSection(next: ProfileSection) { window.setTimeout(() => document.getElementById(`profile-${next}`)?.focus(), 0) }
  function navigate(next: ProfileSection) { if (dirty && next !== section) { setPendingSection(next); return } setSection(next); focusSection(next) }
  function discardAndNavigate() { setDirty(false); if (pendingSection) { setSection(pendingSection); focusSection(pendingSection) } setPendingSection(undefined) }
  function saveIdentity() { if (fixture === 'mutation-error') { setStatus('Identity could not be saved. Your edits are still here.'); return } setDirty(false); setStatus('Identity saved separately from preferences and privacy.') }
  const shared: SharedDirectionProps = { section, fixture, dirty, setDirty, onSave: saveIdentity, onStatus: setStatus, onNavigate: navigate }

  return <div className={styles.pageShell} data-density='comfortable'><ReviewBar direction={direction} setDirection={setDirection} fixture={fixture} setFixture={changeFixture} /><AppHeader /><DirectionIntro direction={direction} /><main id='profile-content' className={styles.main}><ProfileHeading fixture={fixture} /><p className={styles.directionNote}><span>{activeDirection.number}</span>{activeDirection.description}</p>{direction === 'rail' ? <RailDirection {...shared} /> : null}{direction === 'ledger' ? <LedgerDirection {...shared} /> : null}{direction === 'index' ? <IndexDirection {...shared} /> : null}<p className={styles.liveStatus} role='status' aria-live='polite'>{status}{status ? <Check aria-hidden='true' /> : null}</p></main><AlertDialog open={Boolean(pendingSection)} onOpenChange={(open) => { if (!open) setPendingSection(undefined) }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Leave unsaved identity changes?</AlertDialogTitle><AlertDialogDescription>Your edits have not been saved. Keep editing, or discard only this identity draft and continue to {pendingSection ? sectionDefinitions.find((item) => item.id === pendingSection)?.label : 'the next section'}.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep editing</AlertDialogCancel><AlertDialogAction onClick={discardAndNavigate}>Discard and continue</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>
}

export function ProfileSelected() {
  const [fixture, setFixture] = useState<Fixture>('active')
  const [section, setSection] = useState<ProfileSection>('overview')
  const [dirty, setDirty] = useState(false)
  const [pendingSection, setPendingSection] = useState<ProfileSection>()
  const [status, setStatus] = useState('')

  function changeFixture(next: Fixture) { setFixture(next); setSection(fixtureSection(next)); setDirty(false); setPendingSection(undefined); setStatus('') }
  function focusSection(next: ProfileSection) { window.setTimeout(() => document.getElementById(`profile-${next}`)?.focus(), 0) }
  function navigate(next: ProfileSection) { if (dirty && next !== section) { setPendingSection(next); return } setSection(next); focusSection(next) }
  function discardAndNavigate() { setDirty(false); if (pendingSection) { setSection(pendingSection); focusSection(pendingSection) } setPendingSection(undefined) }
  function saveIdentity() { if (fixture === 'mutation-error') { setStatus('Identity could not be saved. Your edits are still here.'); return } setDirty(false); setStatus('Identity saved separately from preferences and privacy.') }
  const shared: SharedDirectionProps = { section, fixture, dirty, setDirty, onSave: saveIdentity, onStatus: setStatus, onNavigate: navigate }

  return <div className={styles.pageShell} data-density='comfortable'><SelectedReviewBar fixture={fixture} setFixture={changeFixture} /><AppHeader /><main id='profile-content' className={styles.main}><SelectedProfileHeading fixture={fixture} /><LedgerDirection {...shared} /><p className={styles.liveStatus} role='status' aria-live='polite'>{status}{status ? <Check aria-hidden='true' /> : null}</p></main><AlertDialog open={Boolean(pendingSection)} onOpenChange={(open) => { if (!open) setPendingSection(undefined) }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Leave unsaved identity changes?</AlertDialogTitle><AlertDialogDescription>Your edits have not been saved. Keep editing, or discard only this identity draft and continue to {pendingSection ? sectionDefinitions.find((item) => item.id === pendingSection)?.label : 'the next section'}.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep editing</AlertDialogCancel><AlertDialogAction onClick={discardAndNavigate}>Discard and continue</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>
}
