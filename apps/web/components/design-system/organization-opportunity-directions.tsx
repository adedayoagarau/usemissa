'use client'

import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Banknote,
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ExternalLink,
  Eye,
  FileInput,
  Filter,
  Globe2,
  ImageIcon,
  Import,
  Info,
  Link2,
  ListFilter,
  MapPin,
  Menu,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import { MissaWordmark } from '@/components/missa-wordmark'
import styles from './organization-opportunity-directions.module.css'

type Direction = 'index' | 'ledger' | 'desk'
type Surface = 'list' | 'builder'
type BuilderSection = 'basics' | 'guidelines' | 'practice' | 'eligibility' | 'place' | 'dates' | 'fees' | 'form' | 'review'
type Fixture =
  | 'mixed-list' | 'no-program' | 'empty-list' | 'one-draft' | 'large-list' | 'no-results' | 'viewer' | 'program-manager' | 'finance' | 'legal' | 'long-names' | 'no-image' | 'extreme-image'
  | 'incomplete-basics' | 'unknown-type' | 'deadlines' | 'fee-unknown' | 'fee-free' | 'multi-currency' | 'practice-rules' | 'taxonomy-conflict' | 'deprecated-term' | 'large-rules' | 'eligibility-conflict' | 'geography-conflict'
  | 'no-fields' | 'long-form' | 'invalid-branch' | 'guideline-success' | 'guideline-pdf' | 'guideline-blocked' | 'csv-preview' | 'csv-limit' | 'save-failure' | 'concurrent' | 'recovered' | 'publish-ready' | 'publish-blocked' | 'readiness-unavailable' | 'publish-replay' | 'published-change' | 'connected-conflict' | 'close-impact' | 'foreign' | 'mobile-urgent'

type OpportunityRow = { id: string; title: string; program: string; team: string; type: string; state: 'Draft' | 'Published' | 'Closed'; attention?: string; deadline: string; submissions: number | null }
type FormField = { id: string; label: string; type: string; required: boolean }

const directions = [
  { id: 'index' as const, number: '01', name: 'Operational index', description: 'A stable section rail and compact inventory keep every editing domain independently recoverable.' },
  { id: 'ledger' as const, number: '02', name: 'Program ledger', description: 'A wide editorial ledger groups Opportunities by Program and keeps builder sections in a horizontal index.' },
  { id: 'desk' as const, number: '03', name: 'Preview desk', description: 'A focused editor keeps the public or applicant preview visible beside the current section.' },
]

const fixtureOptions: Array<{ value: Fixture; label: string }> = [
  { value: 'mixed-list', label: 'Mixed Opportunity list' }, { value: 'no-program', label: 'No Team or Program' }, { value: 'empty-list', label: 'No Opportunities' }, { value: 'one-draft', label: 'One draft' }, { value: 'large-list', label: 'Large portfolio' }, { value: 'no-results', label: 'No filter results' }, { value: 'viewer', label: 'Read-only Viewer' }, { value: 'program-manager', label: 'Scoped Program manager' }, { value: 'finance', label: 'Finance section only' }, { value: 'legal', label: 'Legal section only' }, { value: 'long-names', label: 'Long names' }, { value: 'no-image', label: 'No optional image' }, { value: 'extreme-image', label: 'Extreme image crop' },
  { value: 'incomplete-basics', label: 'Incomplete Basics' }, { value: 'unknown-type', label: 'Unknown imported type' }, { value: 'deadlines', label: 'Deadline modes' }, { value: 'fee-unknown', label: 'Fee unknown' }, { value: 'fee-free', label: 'Explicitly free' }, { value: 'multi-currency', label: 'Multiple currencies' }, { value: 'practice-rules', label: 'Field rules' }, { value: 'taxonomy-conflict', label: 'Taxonomy conflict' }, { value: 'deprecated-term', label: 'Deprecated taxonomy term' }, { value: 'large-rules', label: 'Large rule selection' }, { value: 'eligibility-conflict', label: 'Eligibility conflict' }, { value: 'geography-conflict', label: 'Geography conflict' },
  { value: 'no-fields', label: 'No form fields' }, { value: 'long-form', label: 'Long submission form' }, { value: 'invalid-branch', label: 'Invalid category branch' }, { value: 'guideline-success', label: 'Guideline import draft' }, { value: 'guideline-pdf', label: 'Incomplete PDF warning' }, { value: 'guideline-blocked', label: 'Blocked guideline URL' }, { value: 'csv-preview', label: 'CSV import preview' }, { value: 'csv-limit', label: 'CSV limit exceeded' }, { value: 'save-failure', label: 'Section save failed' }, { value: 'concurrent', label: 'Changed elsewhere' }, { value: 'recovered', label: 'Recovered draft' }, { value: 'publish-ready', label: 'Ready to publish' }, { value: 'publish-blocked', label: 'Publish blocked' }, { value: 'readiness-unavailable', label: 'Readiness unavailable' }, { value: 'publish-replay', label: 'Publish interrupted' }, { value: 'published-change', label: 'Published consequential edit' }, { value: 'connected-conflict', label: 'Connected listing conflict' }, { value: 'close-impact', label: 'Close with active drafts' }, { value: 'foreign', label: 'Foreign Opportunity' }, { value: 'mobile-urgent', label: 'Urgent mobile correction' },
]

const builderSections: Array<{ id: BuilderSection; label: string; description: string; icon: typeof Sparkles }> = [
  { id: 'basics', label: 'Basics', description: 'Identity, type, Team, Program, summary, and image', icon: Sparkles },
  { id: 'guidelines', label: 'Guidelines', description: 'Official URL and reviewed public guidance', icon: BookOpen },
  { id: 'practice', label: 'Field rules', description: 'What creative work is accepted', icon: ListFilter },
  { id: 'eligibility', label: 'Eligibility', description: 'Who may apply', icon: Users },
  { id: 'place', label: 'Place', description: 'Application reach and participation location', icon: MapPin },
  { id: 'dates', label: 'Dates', description: 'Opening, deadline, schedule, and timezone', icon: CalendarDays },
  { id: 'fees', label: 'Fees and terms', description: 'Fee, currency, award, expenses, rights, and refunds', icon: Banknote },
  { id: 'form', label: 'Submission form', description: 'Categories, questions, Works, and files', icon: FileInput },
  { id: 'review', label: 'Review and publish', description: 'Readiness, public preview, and applicant flow', icon: ClipboardCheck },
]

const baseRows: OpportunityRow[] = [
  { id: 'opp-prize', title: '2027 Poetry and Essay Prize', program: 'Annual Awards', team: 'Editorial', type: 'Award', state: 'Published', deadline: '12 Oct 2026', submissions: 184 },
  { id: 'opp-residency', title: 'New Voices Residency', program: 'Residencies', team: 'Programs', type: 'Residency', state: 'Draft', attention: 'Field rules need review', deadline: 'Not decided', submissions: null },
  { id: 'opp-fellowship', title: 'Emerging Editors Fellowship', program: 'Fellowships', team: 'Learning', type: 'Fellowship', state: 'Closed', deadline: 'Closed 14 Jul', submissions: 72 },
  { id: 'opp-commission', title: 'Public Art Writing Commission', program: 'Commissions', team: 'Editorial', type: 'Commission', state: 'Published', attention: '28 submissions need triage', deadline: '30 Sep 2026', submissions: 63 },
]

function sectionForFixture(fixture: Fixture): BuilderSection {
  if (['incomplete-basics', 'unknown-type', 'no-image', 'extreme-image', 'save-failure', 'concurrent', 'recovered'].includes(fixture)) return 'basics'
  if (['guideline-success', 'guideline-pdf', 'guideline-blocked', 'legal'].includes(fixture)) return 'guidelines'
  if (['practice-rules', 'taxonomy-conflict', 'deprecated-term', 'large-rules'].includes(fixture)) return 'practice'
  if (fixture === 'eligibility-conflict') return 'eligibility'
  if (fixture === 'geography-conflict') return 'place'
  if (fixture === 'deadlines') return 'dates'
  if (['fee-unknown', 'fee-free', 'multi-currency', 'finance'].includes(fixture)) return 'fees'
  if (['no-fields', 'long-form', 'invalid-branch'].includes(fixture)) return 'form'
  return 'review'
}

function surfaceForFixture(fixture: Fixture): Surface {
  return ['mixed-list', 'no-program', 'empty-list', 'one-draft', 'large-list', 'no-results', 'viewer', 'program-manager', 'long-names', 'csv-preview', 'csv-limit', 'foreign'].includes(fixture) ? 'list' : 'builder'
}

function roleForFixture(fixture: Fixture) {
  if (fixture === 'viewer') return 'Viewer'
  if (fixture === 'program-manager') return 'Program manager'
  if (fixture === 'finance') return 'Finance'
  if (fixture === 'legal') return 'Legal'
  return 'Owner'
}

function AppHeader() {
  return <header className={styles.appHeader}><a href='#opportunity-content' className={styles.skipLink}>Skip to content</a><MissaWordmark href='#' size='app' className={styles.wordmark} /><nav aria-label='Product navigation'><a href='#'>Profile</a><a href='#' aria-current='page'>Organization</a></nav><div className={styles.headerActions}><Button type='button' variant='outline' size='sm'><Search aria-hidden='true' />Search<span>⌘K</span></Button><button type='button' className={styles.avatar} aria-label='Open Profile'>AO</button></div></header>
}

function ReviewBar({ direction, selectedOnly, setDirection, surface, setSurface, fixture, setFixture }: { direction: Direction; selectedOnly: boolean; setDirection: (value: Direction) => void; surface: Surface; setSurface: (value: Surface) => void; fixture: Fixture; setFixture: (value: Fixture) => void }) {
  return <div className={styles.reviewBar} aria-label='Design review controls'>{selectedOnly ? null : <div className={styles.directionButtons} role='group' aria-label='Opportunity visual direction'>{directions.map((item) => <button type='button' key={item.id} data-active={direction === item.id} aria-pressed={direction === item.id} onClick={() => setDirection(item.id)}><span>{item.number}</span>{item.name}</button>)}</div>}<div className={styles.surfaceButtons} role='group' aria-label='Opportunity surface'><button type='button' data-active={surface === 'list'} aria-pressed={surface === 'list'} onClick={() => setSurface('list')}>List</button><button type='button' data-active={surface === 'builder'} aria-pressed={surface === 'builder'} onClick={() => setSurface('builder')}>Builder</button></div><label><span>Edge state</span><select aria-label='Organization Opportunity edge state' value={fixture} onChange={(event) => setFixture(event.target.value as Fixture)}>{fixtureOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>
}

function DirectionIntro({ direction, selectedOnly }: { direction: Direction; selectedOnly: boolean }) {
  const selected = directions.find((item) => item.id === direction)!
  return <section className={styles.directionIntro} aria-label={`${selected.name} visual direction`}><span>{selected.number}</span><div><p>{selectedOnly ? 'Selected Organization Opportunities composition' : 'Organization Opportunities direction'}</p><strong>{selected.name}</strong><p>{selected.description}</p></div>{selectedOnly ? <Badge variant='outline'>Selected · local only</Badge> : null}</section>
}

function ContextBar({ title = 'Opportunities', role }: { title?: string; role: string }) {
  const limited = role === 'Finance' || role === 'Legal' || role === 'Viewer'
  return <div className={styles.contextBar}><button type='button' aria-label={`Switch Organization. Current: North River Review, ${role}`}><span className={styles.organizationMark}>NR</span><span><strong>North River Review</strong><small>{role}</small></span><ChevronDown aria-hidden='true' /></button><nav aria-label='Organization navigation'><a href='#'>Overview</a><a href='#' aria-current='page'>{title}</a>{limited ? null : <><a href='#'>Submissions</a><a href='#'>Reviews</a><a href='#'>Decisions</a></>}</nav><Button type='button' variant='ghost' size='icon' aria-label='Open Organization navigation'><Menu aria-hidden='true' /></Button></div>
}

function listRows(fixture: Fixture): OpportunityRow[] {
  if (fixture === 'no-program' || fixture === 'empty-list' || fixture === 'foreign') return []
  if (fixture === 'one-draft') return [baseRows[1]!]
  if (fixture === 'program-manager') return baseRows.filter((row) => row.team === 'Programs')
  if (fixture === 'long-names') return [{ ...baseRows[0]!, title: 'The International Programme for Experimental Literature, Moving Image, and Cross-Disciplinary Public Culture', program: 'International Partnership Development and Long-form Public Programmes', team: 'Editorial Strategy and International Programmes' }, ...baseRows.slice(1)]
  if (fixture === 'large-list') return Array.from({ length: 24 }, (_, index) => ({ ...baseRows[index % baseRows.length]!, id: `large-${index}`, title: `${baseRows[index % baseRows.length]!.title} · ${index + 1}` }))
  return baseRows
}

function OpportunityFilters({ query, setQuery, fixture, onStatus }: { query: string; setQuery: (value: string) => void; fixture: Fixture; onStatus: (message: string) => void }) {
  return <form className={styles.filters} role='search' onSubmit={(event) => { event.preventDefault(); onStatus(`Opportunity results updated for “${query}”.`) }}><label className={styles.searchField}><span>Search Opportunities</span><div><Search aria-hidden='true' /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder='Search title, Team, or Program' /></div></label><label><span>Lifecycle</span><select defaultValue='all'><option value='all'>All states</option><option>Draft</option><option>Published</option><option>Closed</option></select></label><label><span>Program</span><select defaultValue='all'><option value='all'>All Programs</option><option>Annual Awards</option><option>Residencies</option><option>Fellowships</option></select></label><Button type='submit' variant='outline'><Filter aria-hidden='true' />Apply</Button>{query ? <Button type='button' variant='ghost' onClick={() => setQuery('')}>Clear</Button> : null}{fixture === 'no-results' ? <span className={styles.fixtureHint}>Fixture query is intentionally unmatched.</span> : null}</form>
}

function ListEmpty({ fixture, onStatus }: { fixture: Fixture; onStatus: (message: string) => void }) {
  if (fixture === 'foreign') return <Alert><ShieldCheck aria-hidden='true' /><AlertTitle>This Opportunity is not available</AlertTitle><AlertDescription>Return to an Organization and Opportunity you can access. Missa will not reveal whether a foreign record exists.</AlertDescription></Alert>
  if (fixture === 'no-program') return <section className={styles.emptyState}><Building2 aria-hidden='true' /><h2>Create a Team and Program first</h2><p>Every Opportunity belongs to a Program inside a Team. This keeps submissions, reviews, decisions, and reporting in the right scope.</p><Button type='button' onClick={() => onStatus('Create Team and Program flow opened.')}>Create Team and Program</Button></section>
  return <section className={styles.emptyState}><Sparkles aria-hidden='true' /><h2>Create the first Opportunity</h2><p>Start with the public facts, then review field rules, eligibility, place, dates, fees, terms, and the submission form separately.</p><Button type='button' onClick={() => onStatus('New Opportunity builder opened in Basics.')}>Create Opportunity</Button></section>
}

function OpportunityTable({ rows, viewer, selected, setSelected, onStatus }: { rows: OpportunityRow[]; viewer: boolean; selected?: string; setSelected?: (id: string) => void; onStatus: (message: string) => void }) {
  return <div className={styles.tableWrap}><table><caption className='sr-only'>Organization Opportunities</caption><thead><tr><th scope='col'>Opportunity</th><th scope='col'>Program</th><th scope='col'>Type</th><th scope='col'>Lifecycle</th><th scope='col'>Deadline</th><th scope='col'>Submissions</th><th scope='col'><span className='sr-only'>Action</span></th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} data-selected={selected === row.id}><th scope='row'><button type='button' aria-label={setSelected ? `Select ${row.title}` : undefined} onClick={() => { if (setSelected) { setSelected(row.id); onStatus(`${row.title} selected for preview.`) } else onStatus(`${row.title} opened.`) }}>{row.title}</button><small>{row.team}</small>{row.attention ? <span><AlertCircle aria-hidden='true' />{row.attention}</span> : null}</th><td>{row.program}</td><td>{row.type}</td><td><Badge variant='outline'>{row.state}</Badge></td><td>{row.deadline}</td><td>{row.submissions ?? '—'}</td><td>{viewer ? <Button type='button' variant='ghost' onClick={() => onStatus(`${row.title} opened read-only.`)}>View<ChevronRight aria-hidden='true' /></Button> : <Button type='button' variant='ghost' size='icon' aria-label={`More actions for ${row.title}`}><MoreHorizontal aria-hidden='true' /></Button>}</td></tr>)}</tbody></table></div>
}

function GroupedLedger({ rows, viewer, onStatus }: { rows: OpportunityRow[]; viewer: boolean; onStatus: (message: string) => void }) {
  const programs = [...new Set(rows.map((row) => row.program))]
  return <div className={styles.programLedger}>{programs.map((program) => <section key={program}><header><div><p className={styles.eyebrow}>Program</p><h2>{program}</h2></div><span>{rows.filter((row) => row.program === program).length} Opportunities</span></header>{rows.filter((row) => row.program === program).map((row) => <article key={row.id}><div><h3>{row.title}</h3><p>{row.team} · {row.type}</p>{row.attention ? <small><AlertCircle aria-hidden='true' />{row.attention}</small> : null}</div><dl><div><dt>Lifecycle</dt><dd>{row.state}</dd></div><div><dt>Deadline</dt><dd>{row.deadline}</dd></div><div><dt>Submissions</dt><dd>{row.submissions ?? '—'}</dd></div></dl><Button type='button' variant='ghost' onClick={() => onStatus(`${row.title} opened${viewer ? ' read-only' : ''}.`)}>{viewer ? 'View' : 'Open'}<ChevronRight aria-hidden='true' /></Button></article>)}</section>)}</div>
}

function OpportunityList({ direction, fixture, onOpenBuilder, onStatus }: { direction: Direction; fixture: Fixture; onOpenBuilder: () => void; onStatus: (message: string) => void }) {
  const viewer = fixture === 'viewer'
  const role = roleForFixture(fixture)
  const initialQuery = fixture === 'no-results' ? 'ceramic opera for mars' : ''
  const [query, setQuery] = useState(initialQuery)
  const [selected, setSelected] = useState(baseRows[0]!.id)
  const rows = listRows(fixture).filter((row) => !query || `${row.title} ${row.program} ${row.team}`.toLowerCase().includes(query.toLowerCase()))
  const selectedRow = listRows(fixture).find((row) => row.id === selected) ?? rows[0]
  return <main id='opportunity-content' className={styles.listMain}><header className={styles.pageHeader}><div><p className={styles.eyebrow}>North River Review · {role}</p><h1>Opportunities</h1><p>Find and operate the calls this Organization runs.</p></div>{viewer ? <Badge variant='outline'>Read only</Badge> : <div><Button type='button' variant='outline' onClick={() => onStatus('Opportunity import preview opened.')}><Import aria-hidden='true' />Import</Button><Button type='button' onClick={onOpenBuilder}><Plus aria-hidden='true' />Create Opportunity</Button></div>}</header>{fixture === 'csv-preview' ? <Alert><Import aria-hidden='true' /><AlertTitle>Import preview: 18 ready, 2 invalid, 3 matching existing Opportunities</AlertTitle><AlertDescription>Fix invalid rows before importing. Missa will create two Teams and four Programs if you continue; imported published rows still require readiness review.</AlertDescription><Button type='button' variant='outline'>Review import rows</Button></Alert> : null}{fixture === 'csv-limit' ? <Alert variant='destructive'><AlertCircle aria-hidden='true' /><AlertTitle>This file exceeds the import limit</AlertTitle><AlertDescription>Use a CSV no larger than 2 MB and 1,000 Opportunity rows, then preview it again.</AlertDescription></Alert> : null}<OpportunityFilters query={query} setQuery={setQuery} fixture={fixture} onStatus={onStatus} /><div className={styles.resultSummary}><span>{rows.length} result{rows.length === 1 ? '' : 's'}</span><span>Sorted by attention, then title</span></div>{fixture === 'no-program' || fixture === 'empty-list' || fixture === 'foreign' ? <ListEmpty fixture={fixture} onStatus={onStatus} /> : rows.length === 0 ? <section className={styles.noResults}><Search aria-hidden='true' /><h2>No Opportunities match these filters</h2><p>Clear the query or adjust lifecycle and Program filters. Nothing was removed.</p><Button type='button' variant='outline' onClick={() => setQuery('')}>Clear filters</Button></section> : direction === 'ledger' ? <GroupedLedger rows={rows} viewer={viewer} onStatus={onStatus} /> : direction === 'desk' ? <div className={styles.listDesk}><OpportunityTable rows={rows} viewer={viewer} selected={selected} setSelected={setSelected} onStatus={onStatus} /><aside aria-label='Selected Opportunity summary'>{selectedRow ? <><p className={styles.eyebrow}>Selected Opportunity</p><h2>{selectedRow.title}</h2><p>{selectedRow.program} · {selectedRow.type}</p><dl><div><dt>Lifecycle</dt><dd>{selectedRow.state}</dd></div><div><dt>Deadline</dt><dd>{selectedRow.deadline}</dd></div><div><dt>Submissions</dt><dd>{selectedRow.submissions ?? 'Not applicable'}</dd></div></dl>{selectedRow.attention ? <Alert><AlertCircle aria-hidden='true' /><AlertTitle>Needs attention</AlertTitle><AlertDescription>{selectedRow.attention}</AlertDescription></Alert> : null}<Button type='button' onClick={() => onStatus(`${selectedRow.title} opened.`)}>Open Opportunity</Button></> : null}</aside></div> : <OpportunityTable rows={rows} viewer={viewer} onStatus={onStatus} />}{fixture === 'large-list' ? <nav className={styles.pagination} aria-label='Opportunity pages'><Button type='button' variant='outline' disabled>Previous</Button><span>Page 1 of 6</span><Button type='button' variant='outline'>Next</Button></nav> : null}</main>
}

function BuilderNav({ active, fixture, role, onNavigate, horizontal = false }: { active: BuilderSection; fixture: Fixture; role: string; onNavigate: (section: BuilderSection) => void; horizontal?: boolean }) {
  const issueSections = new Set<BuilderSection>()
  if (['incomplete-basics', 'unknown-type'].includes(fixture)) issueSections.add('basics')
  if (['guideline-pdf', 'guideline-blocked'].includes(fixture)) issueSections.add('guidelines')
  if (['taxonomy-conflict', 'deprecated-term'].includes(fixture)) issueSections.add('practice')
  if (fixture === 'eligibility-conflict') issueSections.add('eligibility')
  if (fixture === 'geography-conflict') issueSections.add('place')
  if (['no-fields', 'invalid-branch'].includes(fixture)) issueSections.add('form')
  if (['publish-blocked', 'readiness-unavailable'].includes(fixture)) issueSections.add('review')
  const visibleSections = role === 'Finance' ? builderSections.filter((item) => item.id === 'fees') : role === 'Legal' ? builderSections.filter((item) => item.id === 'guidelines' || item.id === 'fees') : builderSections
  return <nav className={horizontal ? styles.builderNavHorizontal : styles.builderNav} aria-label='Opportunity builder sections'>{visibleSections.map((item) => { const Icon = item.icon; const issue = issueSections.has(item.id); return <a key={item.id} href={`#builder-${item.id}`} aria-current={active === item.id ? 'step' : undefined} onClick={(event) => { event.preventDefault(); onNavigate(item.id) }}><Icon aria-hidden='true' /><span><strong>{item.label}</strong>{horizontal ? null : <small>{item.description}</small>}</span>{issue ? <Badge variant='outline'>Review</Badge> : active === item.id ? <span className={styles.currentDot}>Current</span> : <Check aria-hidden='true' />}</a> })}</nav>
}

function SectionHeader({ section }: { section: BuilderSection }) {
  const item = builderSections.find((candidate) => candidate.id === section)!
  return <header className={styles.sectionHeader}><p className={styles.eyebrow}>Opportunity builder · {item.label}</p><h2 id={`builder-${section}`}>{item.label}</h2><p>{item.description}.</p></header>
}

function BasicsSection({ fixture, dirty, setDirty }: { fixture: Fixture; dirty: boolean; setDirty: (value: boolean) => void }) {
  const incomplete = fixture === 'incomplete-basics'
  return <div className={styles.formSection}>{fixture === 'concurrent' ? <Alert><RefreshCw aria-hidden='true' /><AlertTitle>This Opportunity changed elsewhere</AlertTitle><AlertDescription>Compare the newer Basics before replacing them. Your local edits remain in this section.</AlertDescription><Button type='button' variant='outline'>Compare changes</Button></Alert> : null}{fixture === 'recovered' ? <Alert><Save aria-hidden='true' /><AlertTitle>Recovered your unsaved Basics draft</AlertTitle><AlertDescription>Confirm the Organization and Opportunity before saving these fields.</AlertDescription></Alert> : null}<div className={styles.fieldGrid}><div><Label htmlFor='opportunity-title'>Public title</Label><Input id='opportunity-title' defaultValue={incomplete ? '' : 'New Voices Residency'} onChange={() => setDirty(true)} aria-invalid={incomplete} aria-describedby='opportunity-title-help opportunity-title-error' /><p id='opportunity-title-help'>Use the title applicants will recognize.</p>{incomplete ? <p id='opportunity-title-error' role='alert'>Add a public title.</p> : null}</div><div><Label htmlFor='opportunity-type'>Opportunity type</Label><select id='opportunity-type' defaultValue={fixture === 'unknown-type' ? '' : 'residency'} onChange={() => setDirty(true)} aria-invalid={fixture === 'unknown-type'}><option value=''>Choose a type</option><option value='residency'>Residency</option><option value='grant'>Grant</option><option value='award'>Award</option><option value='magazine'>Magazine call</option><option value='commission'>Commission</option></select>{fixture === 'unknown-type' ? <p role='alert'>“Creative programme” from the import is not a recognized type. Choose the closest intended type before publishing.</p> : <p>Type is separate from field and eligibility.</p>}</div><div><Label htmlFor='opportunity-team'>Team</Label><select id='opportunity-team' defaultValue='programs' onChange={() => setDirty(true)}><option value='programs'>Programs</option><option value='editorial'>Editorial</option></select></div><div><Label htmlFor='opportunity-program'>Program</Label><select id='opportunity-program' defaultValue='residencies' onChange={() => setDirty(true)}><option value='residencies'>Residencies</option><option value='annual'>Annual Awards</option></select></div></div><div><Label htmlFor='opportunity-summary'>Public summary</Label><Textarea id='opportunity-summary' rows={5} defaultValue='A six-week residency for writers developing ambitious work across poetry, essays, and hybrid forms.' onChange={() => setDirty(true)} /><p>Describe the opportunity, not the ideal applicant.</p></div><section className={styles.imageField}><div className={styles.imagePreview} data-extreme={fixture === 'extreme-image'}>{fixture === 'no-image' ? <ImageIcon aria-hidden='true' /> : <span>Residency studio</span>}</div><div><h3>Public image</h3><p>Optional. Use an Organization-owned image only when it adds useful context.</p><Button type='button' variant='outline'><Upload aria-hidden='true' />{fixture === 'no-image' ? 'Choose image' : 'Replace image'}</Button></div></section><p className={styles.unsaved}>{dirty ? 'Unsaved changes in Basics' : 'Basics saves independently'}</p></div>
}

function GuidelinesSection({ fixture, setDirty, onStatus }: { fixture: Fixture; setDirty: (value: boolean) => void; onStatus: (message: string) => void }) {
  return <div className={styles.formSection}>{fixture === 'guideline-pdf' ? <Alert><AlertCircle aria-hidden='true' /><AlertTitle>Review the imported PDF carefully</AlertTitle><AlertDescription>Some text may be incomplete or out of reading order. Compare this draft with the public PDF before saving.</AlertDescription></Alert> : null}{fixture === 'guideline-blocked' ? <Alert variant='destructive'><ShieldCheck aria-hidden='true' /><AlertTitle>This URL cannot be imported</AlertTitle><AlertDescription>Use a public Organization website or PDF. Local, private-network, and unsafe redirect destinations are blocked.</AlertDescription></Alert> : null}<div><Label htmlFor='guideline-url'>Official guidelines URL</Label><div className={styles.inlineField}><Link2 aria-hidden='true' /><Input id='guideline-url' type='url' defaultValue={fixture === 'guideline-blocked' ? 'http://127.0.0.1/guidelines.pdf' : 'https://northriverreview.org/residency/guidelines'} onChange={() => setDirty(true)} /><Button type='button' variant='outline' onClick={() => onStatus(fixture === 'guideline-blocked' ? 'Import blocked. The saved guideline draft is unchanged.' : 'Guidelines imported as an unsaved draft for review.')}><Import aria-hidden='true' />Import draft</Button></div><p>Imported text never replaces saved guidelines until you review and save it.</p></div><div><Label htmlFor='guideline-text'>Public guidelines</Label><Textarea id='guideline-text' rows={14} defaultValue={fixture === 'guideline-success' || fixture === 'guideline-pdf' ? 'Imported draft — review every requirement, date, fee, and rights clause against the official source before saving.' : 'The residency supports writers developing a substantial new project. Applicants submit a project statement, selected Work, and a short biography.'} onChange={() => setDirty(true)} /><p>Applicants see this text with the official URL after you save it.</p></div></div>
}

const practiceTerms = [
  { id: 'taxterm_practice-writing', label: 'Writing and literature', facet: 'Field', rule: 'Accepted' },
  { id: 'taxterm_disc-poetry', label: 'Poetry', facet: 'Discipline', rule: 'Preferred' },
  { id: 'taxterm_form-essay', label: 'Essay', facet: 'Form', rule: 'Accepted' },
  { id: 'taxterm_mode-hybrid', label: 'Hybrid', facet: 'Mode / approach', rule: 'Accepted' },
]

function PracticeSection({ fixture, onStatus }: { fixture: Fixture; onStatus: (message: string) => void }) {
  const terms = fixture === 'large-rules' ? Array.from({ length: 32 }, (_, index) => ({ ...practiceTerms[index % practiceTerms.length]!, id: `rule-${index}`, label: `${practiceTerms[index % practiceTerms.length]!.label} ${index + 1}` })) : fixture === 'deprecated-term' ? [...practiceTerms, { id: 'legacy', label: 'Interdisciplinary arts', facet: 'Previous label', rule: 'Review' }] : practiceTerms
  return <div className={styles.practiceSection}><Alert><Info aria-hidden='true' /><AlertTitle>Field rules describe accepted creative work</AlertTitle><AlertDescription>Opportunity type, eligibility, place, fees, and application materials are edited in their own sections.</AlertDescription></Alert>{fixture === 'taxonomy-conflict' ? <Alert variant='destructive'><AlertCircle aria-hidden='true' /><AlertTitle>Two field rules conflict</AlertTitle><AlertDescription>Writing and literature is excluded while Poetry beneath it is preferred. Resolve the intended consequence before publishing.</AlertDescription><Button type='button' variant='outline' onClick={() => onStatus('Field-rule conflict opened for resolution.')}>Resolve conflict</Button></Alert> : null}{fixture === 'deprecated-term' ? <Alert><RefreshCw aria-hidden='true' /><AlertTitle>One saved term needs review</AlertTitle><AlertDescription>The stable saved value is preserved. Choose the intended current term; Missa will not silently replace it.</AlertDescription></Alert> : null}<label className={styles.taxonomySearch}><span>Find a field term</span><div><Search aria-hidden='true' /><Input placeholder='Search all relevant facets and aliases' /></div></label><section className={styles.ruleList}><header><div><h3>Selected field rules</h3><p>{terms.length} rules across independent facets</p></div>{fixture === 'large-rules' ? <Button type='button' variant='outline'>Find conflicts</Button> : null}</header>{terms.map((term) => <article key={term.id}><div><strong>{term.label}</strong><span>{term.facet}</span></div><select aria-label={`Rule for ${term.label}`} defaultValue={term.rule}><option>Accepted</option><option>Preferred</option><option>Required</option><option>Excluded</option>{term.rule === 'Review' ? <option>Review</option> : null}</select><Button type='button' variant='ghost' size='icon' aria-label={`Remove ${term.label}`}><Trash2 aria-hidden='true' /></Button></article>)}</section></div>
}

function EligibilitySection({ fixture, setDirty }: { fixture: Fixture; setDirty: (value: boolean) => void }) {
  return <div className={styles.formSection}>{fixture === 'eligibility-conflict' ? <Alert variant='destructive'><AlertCircle aria-hidden='true' /><AlertTitle>Eligibility statements conflict</AlertTitle><AlertDescription>The public text says writers at any career stage may apply, while the structured rule requires an emerging writer. Choose the intended rule before publishing.</AlertDescription></Alert> : null}<fieldset className={styles.choiceGroup}><legend>Career stage</legend><p>Choose only what the Organization’s rules state.</p><label><input type='radio' name='career' defaultChecked onChange={() => setDirty(true)} /> Any career stage</label><label><input type='radio' name='career' onChange={() => setDirty(true)} /> Emerging</label><label><input type='radio' name='career' onChange={() => setDirty(true)} /> Established</label></fieldset><div><Label htmlFor='eligibility-public'>Public eligibility statement</Label><Textarea id='eligibility-public' rows={6} defaultValue='Writers aged 18 or older may apply at any career stage. Collaborative applications are welcome.' onChange={() => setDirty(true)} /><p>Do not infer identity, nationality, disability, education, income, or membership requirements.</p></div></div>
}

function PlaceSection({ fixture, setDirty }: { fixture: Fixture; setDirty: (value: boolean) => void }) {
  return <div className={styles.formSection}>{fixture === 'geography-conflict' ? <Alert variant='destructive'><Globe2 aria-hidden='true' /><AlertTitle>Application reach and participation location conflict</AlertTitle><AlertDescription>The call is set to worldwide applications, but the public text says applicants must live in Nigeria. Participation in Lagos is a separate requirement. Review all three statements.</AlertDescription></Alert> : null}<fieldset className={styles.choiceGroup}><legend>Who may apply by location?</legend><label><input type='radio' name='reach' defaultChecked onChange={() => setDirty(true)} /> Worldwide</label><label><input type='radio' name='reach' onChange={() => setDirty(true)} /> Selected countries or regions</label><label><input type='radio' name='reach' onChange={() => setDirty(true)} /> One country</label></fieldset><fieldset className={styles.choiceGroup}><legend>How does participation happen?</legend><label><input type='checkbox' defaultChecked onChange={() => setDirty(true)} /> In person</label><label><input type='checkbox' onChange={() => setDirty(true)} /> Remote</label><label><input type='checkbox' onChange={() => setDirty(true)} /> Hybrid</label></fieldset><div><Label htmlFor='participation-place'>Participation location</Label><Input id='participation-place' defaultValue='Lagos, Nigeria' onChange={() => setDirty(true)} /><p>This does not automatically restrict where applicants may live.</p></div></div>
}

function DatesSection({ fixture, setDirty }: { fixture: Fixture; setDirty: (value: boolean) => void }) {
  return <div className={styles.formSection}>{fixture === 'deadlines' ? <Alert variant='destructive'><AlertCircle aria-hidden='true' /><AlertTitle>The imported deadline states conflict</AlertTitle><AlertDescription>The official page names 12 October, while another section says applications are rolling. Choose exact, rolling, until filled, or not decided before publishing; only one state can be public.</AlertDescription></Alert> : null}<fieldset className={styles.choiceGroup}><legend>Deadline kind</legend><label><input type='radio' name='deadline-kind' defaultChecked onChange={() => setDirty(true)} /> Exact date</label><label><input type='radio' name='deadline-kind' onChange={() => setDirty(true)} /> Rolling</label><label><input type='radio' name='deadline-kind' onChange={() => setDirty(true)} /> Until filled</label><label><input type='radio' name='deadline-kind' onChange={() => setDirty(true)} /> Not decided yet</label></fieldset><div className={styles.fieldGrid}><div><Label htmlFor='open-date'>Opens</Label><Input id='open-date' type='date' defaultValue='2026-08-20' onChange={() => setDirty(true)} /></div><div><Label htmlFor='deadline-date'>Deadline</Label><Input id='deadline-date' type='date' defaultValue='2026-10-12' onChange={() => setDirty(true)} /></div><div><Label htmlFor='deadline-time'>Closing time</Label><Input id='deadline-time' type='time' defaultValue='23:59' onChange={() => setDirty(true)} /></div><div><Label htmlFor='deadline-zone'>Timezone</Label><select id='deadline-zone' defaultValue='africa-lagos' onChange={() => setDirty(true)}><option value='africa-lagos'>West Africa Time · Lagos</option><option value='utc'>UTC</option></select></div></div><Alert><CalendarDays aria-hidden='true' /><AlertTitle>Applicant display</AlertTitle><AlertDescription>Applications close 12 October 2026 at 11:59 PM West Africa Time. Exact and rolling states are never shown at the same time.</AlertDescription></Alert></div>
}

function FeesSection({ fixture, setDirty }: { fixture: Fixture; setDirty: (value: boolean) => void }) {
  const free = fixture === 'fee-free'
  const unknown = fixture === 'fee-unknown'
  return <div className={styles.formSection}><fieldset className={styles.choiceGroup}><legend>Application fee disclosure</legend><label><input type='radio' name='fee-disclosure' defaultChecked={free} onChange={() => setDirty(true)} /> Explicitly free</label><label><input type='radio' name='fee-disclosure' defaultChecked={!free && !unknown} onChange={() => setDirty(true)} /> A fee applies</label><label><input type='radio' name='fee-disclosure' defaultChecked={unknown} onChange={() => setDirty(true)} /> Not decided yet</label></fieldset>{unknown ? <Alert><Info aria-hidden='true' /><AlertTitle>Fee is not decided</AlertTitle><AlertDescription>The public preview will not say “No fee.” Publication remains blocked until the Organization confirms the commercial terms.</AlertDescription></Alert> : null}<div className={styles.moneyField}><div><Label htmlFor='fee-currency'>Currency</Label><select id='fee-currency' defaultValue={fixture === 'multi-currency' ? 'ngn' : 'usd'} onChange={() => setDirty(true)}><option value='usd'>USD</option><option value='ngn'>NGN</option><option value='gbp'>GBP</option><option value='eur'>EUR</option></select></div><div><Label htmlFor='fee-amount'>Application fee</Label><Input id='fee-amount' type='number' min='0' defaultValue={free ? '0' : fixture === 'multi-currency' ? '15000' : '25'} onChange={() => setDirty(true)} /></div></div><div className={styles.fieldGrid}><div><Label htmlFor='award-value'>Prize, stipend, or commission</Label><Input id='award-value' defaultValue='$4,000 stipend plus travel and accommodation' onChange={() => setDirty(true)} /></div><div><Label htmlFor='rights'>Rights requested</Label><Input id='rights' defaultValue='First publication right; rights revert after publication' onChange={() => setDirty(true)} /></div></div><div><Label htmlFor='refund-policy'>Payment and refund policy</Label><Textarea id='refund-policy' rows={5} defaultValue='Fees are charged only after the applicant reviews the final submission. Failed or duplicate charges are refunded.' onChange={() => setDirty(true)} /></div></div>
}

const initialFields: FormField[] = [
  { id: 'field-work', label: 'Writing sample', type: 'Work or file upload', required: true },
  { id: 'field-statement', label: 'Project statement', type: 'Long answer', required: true },
  { id: 'field-bio', label: 'Short biography', type: 'Long answer', required: true },
  { id: 'field-access', label: 'Access requirements', type: 'Long answer', required: false },
]

function FormSection({ fixture, onStatus }: { fixture: Fixture; onStatus: (message: string) => void }) {
  const seed = fixture === 'no-fields' ? [] : fixture === 'long-form' ? Array.from({ length: 18 }, (_, index) => ({ ...initialFields[index % initialFields.length]!, id: `field-${index}`, label: `${initialFields[index % initialFields.length]!.label} ${index + 1}` })) : initialFields
  const [fields, setFields] = useState(seed)
  function move(index: number, direction: -1 | 1) { setFields((current) => { const next = [...current]; const target = index + direction; if (target < 0 || target >= next.length) return current; [next[index], next[target]] = [next[target]!, next[index]!]; return next }) }
  return <div className={styles.formBuilder}>{fixture === 'invalid-branch' ? <Alert variant='destructive'><AlertCircle aria-hidden='true' /><AlertTitle>A category branch has no valid destination</AlertTitle><AlertDescription>“Poetry in translation” points to a removed field group. Repair the branch or remove the category before publishing.</AlertDescription></Alert> : null}<section className={styles.categoryRows}><header><div><h3>Submission categories</h3><p>Applicant routes such as Poetry or Essay. Categories do not replace field rules.</p></div><Button type='button' variant='outline'><Plus aria-hidden='true' />Add category</Button></header><div><span>Poetry</span><span>Uses all shared questions</span><Button type='button' variant='ghost'>Edit</Button></div><div><span>Essay</span><span>Uses all shared questions</span><Button type='button' variant='ghost'>Edit</Button></div></section><section className={styles.fieldRows}><header><div><h3>Questions, Works, and files</h3><p>Stable field identity preserves applicant drafts when safe.</p></div><Button type='button' variant='outline' onClick={() => setFields((current) => [...current, { id: `field-new-${current.length}`, label: 'New question', type: 'Short answer', required: false }])}><Plus aria-hidden='true' />Add field</Button></header>{fields.map((field, index) => <article key={field.id}><span className={styles.order}>{index + 1}</span><div><strong>{field.label}</strong><p>{field.type} · {field.required ? 'Required' : 'Optional'}</p></div><div className={styles.reorder}><Button type='button' variant='ghost' size='icon' aria-label={`Move ${field.label} up`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp aria-hidden='true' /></Button><Button type='button' variant='ghost' size='icon' aria-label={`Move ${field.label} down`} disabled={index === fields.length - 1} onClick={() => move(index, 1)}><ArrowDown aria-hidden='true' /></Button><Button type='button' variant='ghost' size='icon' aria-label={`Remove ${field.label}`}><Trash2 aria-hidden='true' /></Button></div></article>)}{fields.length === 0 ? <div className={styles.noFields}><FileInput aria-hidden='true' /><h3>Add the first applicant field</h3><p>Publication needs a valid way to submit at least one Work or required file where the call requires creative material.</p><Button type='button' onClick={() => setFields([{ id: 'field-work-new', label: 'Work or file upload', type: 'Work or file upload', required: true }])}>Add Work field</Button></div> : null}</section><Button type='button' variant='outline' onClick={() => onStatus('Applicant-flow preview opened with the current unsaved form draft.')}><Eye aria-hidden='true' />Preview applicant flow</Button></div>
}

function readinessIssues(fixture: Fixture): string[] {
  if (fixture === 'publish-ready') return []
  if (fixture === 'readiness-unavailable') return ['Readiness could not be confirmed. Publication fails closed.']
  if (fixture === 'taxonomy-conflict') return ['Resolve the conflicting Writing and Poetry field rules.']
  if (fixture === 'no-fields') return ['Add a required Work or file field to the submission form.']
  if (fixture === 'incomplete-basics') return ['Add a public title and choose an Opportunity type.']
  if (fixture === 'fee-unknown') return ['Confirm whether an application fee applies.']
  if (fixture === 'publish-blocked') return ['Choose an Opportunity type.', 'Resolve one field-rule conflict.', 'Confirm the application fee.', 'Add a required Work field.']
  if (fixture === 'mobile-urgent') return ['Correct the public deadline before applications close.']
  return ['Review the public preview before publishing.']
}

function ReviewSection({ fixture, onPublish }: { fixture: Fixture; onPublish: () => void }) {
  const issues = readinessIssues(fixture)
  const unavailable = fixture === 'readiness-unavailable'
  return <div className={styles.reviewSection}>{fixture === 'mobile-urgent' ? <Alert variant='destructive'><CalendarDays aria-hidden='true' /><AlertTitle>Correct the public deadline now</AlertTitle><AlertDescription>The published page says 12 October, but the latest approved correction says 10 October at 11:59 PM West Africa Time. Existing applicant drafts remain open while you review and publish the correction.</AlertDescription><Button type='button' variant='outline'>Open Dates</Button></Alert> : null}{fixture === 'publish-replay' ? <Alert><RefreshCw aria-hidden='true' /><AlertTitle>Publication status is being confirmed</AlertTitle><AlertDescription>Do not publish again yet. Missa is checking whether the previous request completed. Wait for confirmation before trying again.</AlertDescription></Alert> : null}{fixture === 'connected-conflict' ? <Alert variant='destructive'><Link2 aria-hidden='true' /><AlertTitle>The connected public listing has a different deadline</AlertTitle><AlertDescription>This draft says 12 October; the Organization’s connected listing says 19 October. Choose the intended public date before publishing.</AlertDescription></Alert> : null}{fixture === 'published-change' ? <Alert><Users aria-hidden='true' /><AlertTitle>This edit affects 14 applicant drafts</AlertTitle><AlertDescription>Changing the required Work field applies to new drafts only unless the Organization explicitly migrates existing drafts and informs affected applicants.</AlertDescription></Alert> : null}{fixture === 'close-impact' ? <Alert variant='destructive'><AlertCircle aria-hidden='true' /><AlertTitle>Closing stops new submissions immediately</AlertTitle><AlertDescription>Eleven applicant drafts and two pending payments exist. Reviews and decisions for submitted Work continue; no history is deleted.</AlertDescription></Alert> : null}<section className={styles.readiness} data-ready={issues.length === 0}><header><div><p className={styles.eyebrow}>Publication readiness</p><h3>{issues.length === 0 ? 'Ready to publish' : unavailable ? 'Readiness unavailable' : `${issues.length} issue${issues.length === 1 ? '' : 's'} to review`}</h3></div><Badge variant='outline'>{issues.length === 0 ? 'Ready' : unavailable ? 'Unavailable' : 'Blocked'}</Badge></header>{issues.length ? <ol>{issues.map((issue, index) => <li key={issue}><span>{index + 1}</span><p>{issue}</p><Button type='button' variant='ghost'>Open section<ArrowRight aria-hidden='true' /></Button></li>)}</ol> : <p>Basics, guidelines, field rules, eligibility, place, dates, fees and terms, and the submission form passed the local readiness fixture.</p>}</section><div className={styles.previewActions}><Button type='button' variant='outline'><Eye aria-hidden='true' />Preview public page</Button><Button type='button' variant='outline'><FileInput aria-hidden='true' />Preview submission form</Button></div><section className={styles.publishScope}><h3>When published</h3><ul><li>The public page opens 20 August 2026.</li><li>Applications close 12 October 2026 at 11:59 PM West Africa Time.</li><li>A $25 USD application fee is collected after final review.</li><li>Existing drafts are unaffected by this first publication.</li></ul><Button type='button' disabled={issues.length > 0 || fixture === 'publish-replay'} onClick={onPublish}>Publish Opportunity</Button></section></div>
}

function BuilderContent({ section, fixture, dirty, setDirty, onStatus, onPublish }: { section: BuilderSection; fixture: Fixture; dirty: boolean; setDirty: (value: boolean) => void; onStatus: (message: string) => void; onPublish: () => void }) {
  return <section className={styles.builderContent} aria-labelledby={`builder-${section}`}><SectionHeader section={section} />{section === 'basics' ? <BasicsSection fixture={fixture} dirty={dirty} setDirty={setDirty} /> : null}{section === 'guidelines' ? <GuidelinesSection fixture={fixture} setDirty={setDirty} onStatus={onStatus} /> : null}{section === 'practice' ? <PracticeSection fixture={fixture} onStatus={onStatus} /> : null}{section === 'eligibility' ? <EligibilitySection fixture={fixture} setDirty={setDirty} /> : null}{section === 'place' ? <PlaceSection fixture={fixture} setDirty={setDirty} /> : null}{section === 'dates' ? <DatesSection fixture={fixture} setDirty={setDirty} /> : null}{section === 'fees' ? <FeesSection fixture={fixture} setDirty={setDirty} /> : null}{section === 'form' ? <FormSection key={fixture} fixture={fixture} onStatus={onStatus} /> : null}{section === 'review' ? <ReviewSection fixture={fixture} onPublish={onPublish} /> : null}{section !== 'review' ? <footer className={styles.saveBar}><div><strong>{dirty ? 'Unsaved changes' : 'Section saved'}</strong><span>{dirty ? 'Only this section is affected.' : 'Other builder sections were not changed.'}</span></div><Button type='button' onClick={() => onStatus('save-section')}><Save aria-hidden='true' />{fixture === 'save-failure' ? 'Try saving again' : 'Save section'}</Button></footer> : null}</section>
}

function PreviewPanel({ section, fixture }: { section: BuilderSection; fixture: Fixture }) {
  return <aside className={styles.previewPanel} aria-label='Opportunity preview'><header><div><p className={styles.eyebrow}>Public preview</p><h2>New Voices Residency</h2></div><Badge variant='outline'>Draft</Badge></header>{fixture === 'no-image' ? <div className={styles.previewMedia}><ImageIcon aria-hidden='true' /></div> : <div className={styles.previewMedia} data-extreme={fixture === 'extreme-image'}><span>Residency studio</span></div>}<p>A six-week residency for writers developing ambitious work across poetry, essays, and hybrid forms.</p><dl><div><dt>Type</dt><dd>Residency</dd></div><div><dt>Deadline</dt><dd>12 Oct 2026</dd></div><div><dt>Reach</dt><dd>Worldwide applications</dd></div><div><dt>Participation</dt><dd>In person · Lagos</dd></div><div><dt>Fee</dt><dd>{fixture === 'fee-free' ? 'No application fee' : fixture === 'fee-unknown' ? 'Not confirmed' : '$25 USD'}</dd></div></dl><footer><span>Previewing {builderSections.find((item) => item.id === section)?.label}</span><Button type='button' variant='outline' size='sm'><ExternalLink aria-hidden='true' />Full preview</Button></footer></aside>
}

function OpportunityBuilder({ direction, fixture, onBack, onStatus }: { direction: Direction; fixture: Fixture; onBack: () => void; onStatus: (message: string) => void }) {
  const [section, setSection] = useState<BuilderSection>(sectionForFixture(fixture))
  const [dirty, setDirty] = useState(false)
  const [pendingSection, setPendingSection] = useState<BuilderSection>()
  const [publishOpen, setPublishOpen] = useState(false)
  const [published, setPublished] = useState(false)
  const role = roleForFixture(fixture)

  function navigate(next: BuilderSection) { if (dirty && next !== section) { setPendingSection(next); return } setSection(next) }
  function discardAndContinue() { setDirty(false); if (pendingSection) setSection(pendingSection); setPendingSection(undefined) }
  function handleStatus(message: string) { if (message === 'save-section') { if (fixture === 'save-failure') { onStatus('This section could not be saved. Your edits remain here.'); return } setDirty(false); onStatus(`${builderSections.find((item) => item.id === section)?.label} saved independently.`); return } onStatus(message) }
  const horizontal = direction === 'ledger'
  return <main id='opportunity-content' className={styles.builderMain}><header className={styles.builderHeader}><Button type='button' variant='ghost' onClick={onBack}><ArrowLeft aria-hidden='true' />Opportunities</Button><div><p className={styles.eyebrow}>North River Review · {role} · Draft Opportunity</p><h1>New Voices Residency</h1><p>{published ? 'Published' : 'Draft'} · Residencies · Programs</p></div><div><Badge variant='outline'>{published ? 'Published' : 'Draft'}</Badge><Button type='button' variant='outline'><Eye aria-hidden='true' />Preview</Button></div></header>{horizontal ? <BuilderNav active={section} fixture={fixture} role={role} onNavigate={navigate} horizontal /> : null}<div className={direction === 'desk' ? styles.builderDesk : direction === 'ledger' ? styles.builderLedger : styles.builderIndex}>{horizontal ? null : <BuilderNav active={section} fixture={fixture} role={role} onNavigate={navigate} />}<BuilderContent section={section} fixture={fixture} dirty={dirty} setDirty={setDirty} onStatus={handleStatus} onPublish={() => setPublishOpen(true)} />{direction === 'desk' ? <PreviewPanel section={section} fixture={fixture} /> : null}</div><AlertDialog open={Boolean(pendingSection)} onOpenChange={(open) => { if (!open) setPendingSection(undefined) }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Leave unsaved {builderSections.find((item) => item.id === section)?.label} changes?</AlertDialogTitle><AlertDialogDescription>Your edits have not been saved. Keep editing, or discard only this section draft and continue to {pendingSection ? builderSections.find((item) => item.id === pendingSection)?.label : 'the next section'}.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep editing</AlertDialogCancel><AlertDialogAction onClick={discardAndContinue}>Discard and continue</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog><AlertDialog open={publishOpen} onOpenChange={setPublishOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Publish New Voices Residency?</AlertDialogTitle><AlertDialogDescription>The public Opportunity opens 20 August 2026. Applications close 12 October at 11:59 PM West Africa Time and require a $25 USD fee after final review.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Review again</AlertDialogCancel><AlertDialogAction onClick={() => { setPublished(true); setPublishOpen(false); onStatus('Opportunity published. The public page and applicant flow are now available.') }}>Publish Opportunity</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></main>
}

function OrganizationOpportunityExperience({ selectedOnly }: { selectedOnly: boolean }) {
  const [direction, setDirection] = useState<Direction>('ledger')
  const [surface, setSurface] = useState<Surface>('list')
  const [fixture, setFixture] = useState<Fixture>('mixed-list')
  const [status, setStatus] = useState('')
  const activeDirection: Direction = selectedOnly ? 'ledger' : direction
  const directionInfo = useMemo(() => directions.find((item) => item.id === activeDirection)!, [activeDirection])

  function changeFixture(next: Fixture) { setFixture(next); setSurface(surfaceForFixture(next)); setStatus('') }
  return <div className={styles.pageShell}><ReviewBar direction={activeDirection} selectedOnly={selectedOnly} setDirection={setDirection} surface={surface} setSurface={setSurface} fixture={fixture} setFixture={changeFixture} /><AppHeader /><DirectionIntro direction={directionInfo.id} selectedOnly={selectedOnly} /><ContextBar title='Opportunities' role={roleForFixture(fixture)} />{surface === 'list' ? <OpportunityList key={fixture} direction={activeDirection} fixture={fixture} onOpenBuilder={() => { setSurface('builder'); setFixture('incomplete-basics') }} onStatus={setStatus} /> : <OpportunityBuilder key={`${fixture}-${activeDirection}`} direction={activeDirection} fixture={fixture} onBack={() => setSurface('list')} onStatus={setStatus} />}<p className={styles.liveStatus} role='status' aria-live='polite'>{status}{status ? <Check aria-hidden='true' /> : null}</p></div>
}

export function OrganizationOpportunityDirections() {
  return <OrganizationOpportunityExperience selectedOnly={false} />
}

export function OrganizationOpportunitySelected() {
  return <OrganizationOpportunityExperience selectedOnly />
}
