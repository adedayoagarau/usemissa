'use client'

import {
  AlertCircle,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ExternalLink,
  Flag,
  Globe2,
  Languages,
  MapPin,
  Radio,
  Search,
  UsersRound,
} from 'lucide-react'
import Image from 'next/image'
import { useMemo, useRef, useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import { MissaWordmark } from '@/components/missa-wordmark'
import styles from './public-organization-profile-directions.module.css'

type Direction = 'editorial' | 'opportunity' | 'program'
type Fixture =
  | 'rich'
  | 'minimum'
  | 'empty'
  | 'single'
  | 'many'
  | 'rolling'
  | 'unknown-deadline'
  | 'conflict'
  | 'paid'
  | 'fee-unclear'
  | 'external'
  | 'mixed-route'
  | 'no-logo'
  | 'no-cover'
  | 'broken-image'
  | 'long-org'
  | 'long-call'
  | 'unicode'
  | 'unconfirmed'
  | 'renamed'
  | 'website-unavailable'
  | 'signed-out'
  | 'following'
  | 'follow-failed'
  | 'no-taxonomy'
  | 'many-programs'
  | 'loading'
  | 'partial'
  | 'error'
  | 'merged'

type Opportunity = {
  id: string
  title: string
  program: string
  deadline: string
  deadlineTone: 'normal' | 'warning' | 'danger'
  fee: string
  route: 'Hosted on Missa' | 'External application'
  image?: string
  alt?: string
  summary: string
  labels: string[]
}

type Scenario = {
  name: string
  formerName?: string
  monogram: string
  managed: boolean
  following: boolean
  signedIn: boolean
  followFailure?: boolean
  about?: string
  location?: string
  languages?: string
  website?: string
  websiteUnavailable?: boolean
  logo: boolean
  cover: boolean
  opportunities: Opportunity[]
  programs: Array<{ name: string; description?: string }>
  practiceLabels: string[]
  notice?: { tone: 'info' | 'warning' | 'danger'; title: string; body: string }
  loading?: boolean
  error?: boolean
  merged?: boolean
}

const directions = [
  { id: 'editorial' as const, number: '01', name: 'Editorial profile', description: 'Institutional story and source media lead before current Opportunities.' },
  { id: 'opportunity' as const, number: '02', name: 'Opportunity-first profile', description: 'Identity and official links lead directly into the creator’s current choices.' },
  { id: 'program' as const, number: '03', name: 'Program directory', description: 'Public Programs provide the hierarchy for a large institution’s Opportunities.' },
]

const fixtureOptions: Array<{ value: Fixture; label: string }> = [
  { value: 'rich', label: 'Rich profile with active Opportunities' },
  { value: 'minimum', label: 'Current implementation minimum' },
  { value: 'empty', label: 'No active Opportunities' },
  { value: 'single', label: 'One active Opportunity' },
  { value: 'many', label: '30+ active Opportunities' },
  { value: 'rolling', label: 'Rolling deadline' },
  { value: 'unknown-deadline', label: 'Deadline unknown' },
  { value: 'conflict', label: 'Conflicting deadline' },
  { value: 'paid', label: 'Known application fee' },
  { value: 'fee-unclear', label: 'Fee unclear' },
  { value: 'external', label: 'External application' },
  { value: 'mixed-route', label: 'Hosted and external applications' },
  { value: 'no-logo', label: 'No logo' },
  { value: 'no-cover', label: 'No cover image' },
  { value: 'broken-image', label: 'Broken Opportunity image' },
  { value: 'long-org', label: 'Long Organization name' },
  { value: 'long-call', label: 'Long Opportunity title' },
  { value: 'unicode', label: 'Unicode Organization and Program names' },
  { value: 'unconfirmed', label: 'Unconfirmed Organization identity' },
  { value: 'renamed', label: 'Renamed Organization' },
  { value: 'website-unavailable', label: 'Official website unavailable' },
  { value: 'signed-out', label: 'Signed out' },
  { value: 'following', label: 'Following' },
  { value: 'follow-failed', label: 'Follow failed and rolled back' },
  { value: 'no-taxonomy', label: 'No taxonomy on active Opportunities' },
  { value: 'many-programs', label: 'Many public Programs' },
  { value: 'loading', label: 'Loading' },
  { value: 'partial', label: 'Partial Opportunity data' },
  { value: 'error', label: 'Recoverable load failure' },
  { value: 'merged', label: 'Organization merged' },
]

const baseOpportunities: Opportunity[] = [
  {
    id: 'studio',
    title: 'Open Studio Fellowship 2027',
    program: 'Artist development',
    deadline: '14 September 2026 · 11:59 PM PT',
    deadlineTone: 'normal',
    fee: 'No application fee',
    route: 'Hosted on Missa',
    image: '/media/home/artist-at-work.webp',
    alt: 'An artist working at a table in a sunlit studio',
    summary: 'Six months of studio access, mentorship, and a public presentation for emerging and mid-career artists.',
    labels: ['Visual arts', 'Interdisciplinary', 'Installation'],
  },
  {
    id: 'moving-image',
    title: 'New Voices Moving Image Commission',
    program: 'Commissions',
    deadline: '2 October 2026 · 5:00 PM PT',
    deadlineTone: 'normal',
    fee: 'No application fee',
    route: 'External application',
    image: '/media/home/gallery-interior.webp',
    alt: 'A contemporary gallery interior with projected moving image work',
    summary: 'A production commission and exhibition opportunity for short-form experimental moving-image work.',
    labels: ['Film', 'Moving image', 'Experimental'],
  },
  {
    id: 'sound',
    title: 'Field Notes: Sound and Place Residency',
    program: 'Residencies',
    deadline: 'Rolling · reviewed monthly',
    deadlineTone: 'warning',
    fee: '$20 application fee',
    route: 'Hosted on Missa',
    image: '/media/home/opportunity-mountains.webp',
    alt: 'A mountain landscape associated with the residency site',
    summary: 'A four-week residency for artists working with sound, listening, landscape, and public space.',
    labels: ['Sound art', 'Field recording', 'Public practice'],
  },
]

function scenarioFor(fixture: Fixture): Scenario {
  const base: Scenario = {
    name: 'Missa Arts Foundation',
    monogram: 'MAF',
    managed: true,
    following: false,
    signedIn: true,
    about: 'Missa Arts Foundation supports artists developing ambitious work across visual art, moving image, sound, writing, and public practice. Its Programs combine time, space, production support, and considered public presentation.',
    location: 'Los Angeles, California · works internationally',
    languages: 'English · Spanish support by request',
    website: 'missaarts.example',
    logo: true,
    cover: true,
    opportunities: baseOpportunities,
    programs: [
      { name: 'Artist development', description: 'Fellowships, mentoring, and long-form project support.' },
      { name: 'Commissions', description: 'Production support for new work and public presentation.' },
      { name: 'Residencies', description: 'Time, space, and place-based research.' },
    ],
    practiceLabels: ['Visual arts', 'Film', 'Moving image', 'Sound art', 'Public practice'],
  }
  if (fixture === 'minimum') return { ...base, about: undefined, location: undefined, languages: undefined, website: 'missaarts.example', logo: false, cover: false, programs: [], practiceLabels: [], opportunities: baseOpportunities.slice(0, 2), notice: { tone: 'info', title: 'Limited public profile', body: 'Only the Organization name and its published Opportunities are available today.' } }
  if (fixture === 'empty') return { ...base, opportunities: [], practiceLabels: [], notice: { tone: 'info', title: 'No active Opportunities', body: 'Follow this Organization to see future Opportunities when they are published.' } }
  if (fixture === 'single') return { ...base, opportunities: baseOpportunities.slice(0, 1), practiceLabels: baseOpportunities[0].labels }
  if (fixture === 'many') return { ...base, opportunities: Array.from({ length: 33 }, (_, index) => ({ ...baseOpportunities[index % 3], id: `opportunity-${index}`, title: `${baseOpportunities[index % 3].title} ${index + 1}` })), notice: { tone: 'info', title: '33 active Opportunities', body: 'Search and filters preserve their state in the target public route.' } }
  if (fixture === 'rolling') return { ...base, opportunities: [{ ...baseOpportunities[2] }] }
  if (fixture === 'unknown-deadline') return { ...base, opportunities: [{ ...baseOpportunities[0], deadline: 'Deadline not published', deadlineTone: 'warning' }] }
  if (fixture === 'conflict') return { ...base, opportunities: [{ ...baseOpportunities[0], deadline: 'Deadline needs confirmation', deadlineTone: 'danger' }], notice: { tone: 'warning', title: 'Deadline needs confirmation', body: 'The published sources do not agree. Read the official guidelines before preparing a submission.' } }
  if (fixture === 'paid') return { ...base, opportunities: [{ ...baseOpportunities[2], deadline: '14 September 2026 · 11:59 PM PT' }] }
  if (fixture === 'fee-unclear') return { ...base, opportunities: [{ ...baseOpportunities[0], fee: 'Application fee not stated' }] }
  if (fixture === 'external') return { ...base, opportunities: [{ ...baseOpportunities[1] }] }
  if (fixture === 'mixed-route') return base
  if (fixture === 'no-logo') return { ...base, logo: false }
  if (fixture === 'no-cover') return { ...base, cover: false }
  if (fixture === 'broken-image') return { ...base, opportunities: [{ ...baseOpportunities[0], image: undefined, alt: undefined }] }
  if (fixture === 'long-org') return { ...base, name: 'The International Foundation for Experimental Literature, Moving Image, Sound, and Collaborative Public Practice', monogram: 'IF' }
  if (fixture === 'long-call') return { ...base, opportunities: [{ ...baseOpportunities[0], title: 'International Open Call for Collaborative, Interdisciplinary, Site-Responsive, Community-Led Research and New Artistic Production Across Multiple Public Sites' }] }
  if (fixture === 'unicode') return { ...base, name: 'Àjọṣe Arts · مؤسسة الفنون المشتركة', monogram: 'ÀA', programs: [{ name: 'Ìdàgbàsókè àwọn òǹkọ̀wé', description: 'Long-form support for writers and translators.' }], opportunities: [{ ...baseOpportunities[0], program: 'Ìdàgbàsókè àwọn òǹkọ̀wé' }] }
  if (fixture === 'unconfirmed') return { ...base, managed: false, notice: { tone: 'warning', title: 'This page is not yet Organization-managed', body: 'Missa assembled these published Opportunities from public sources. Confirm details on the official website.' } }
  if (fixture === 'renamed') return { ...base, formerName: 'Formerly North River Arts Trust', notice: { tone: 'info', title: 'Organization name changed', body: 'This is the same public Organization record under its current name.' } }
  if (fixture === 'website-unavailable') return { ...base, websiteUnavailable: true, notice: { tone: 'warning', title: 'Official website unavailable', body: 'The external website could not be opened. Use the published Opportunity details and try again later.' } }
  if (fixture === 'signed-out') return { ...base, signedIn: false }
  if (fixture === 'following') return { ...base, following: true }
  if (fixture === 'follow-failed') return { ...base, followFailure: true, notice: { tone: 'danger', title: 'Could not follow this Organization', body: 'Your previous state was restored. Try again when your connection is stable.' } }
  if (fixture === 'no-taxonomy') return { ...base, practiceLabels: [], opportunities: baseOpportunities.map((item) => ({ ...item, labels: [] })) }
  if (fixture === 'many-programs') return { ...base, programs: Array.from({ length: 18 }, (_, index) => ({ name: `Public Program ${index + 1}`, description: index % 2 ? 'Opportunity and project support.' : 'Research, production, and presentation.' })) }
  if (fixture === 'loading') return { ...base, loading: true }
  if (fixture === 'partial') return { ...base, opportunities: [{ ...baseOpportunities[0], deadline: 'Deadline not published', deadlineTone: 'warning', fee: 'Fee not stated', summary: 'Details are limited. Read the official guidelines before applying.', labels: [] }] }
  if (fixture === 'error') return { ...base, error: true }
  if (fixture === 'merged') return { ...base, merged: true, notice: { tone: 'info', title: 'This Organization has moved', body: 'Its public record is now part of Aurora Arts Collaborative.' } }
  return base
}

function Notice({ notice }: { notice?: Scenario['notice'] }) {
  if (!notice) return null
  const Icon = notice.tone === 'info' ? CheckCircle2 : AlertCircle
  return <Alert className={`${styles.notice} ${styles[notice.tone]}`}><Icon /><AlertTitle>{notice.title}</AlertTitle><AlertDescription>{notice.body}</AlertDescription></Alert>
}

function Identity({ scenario, compact = false }: { scenario: Scenario; compact?: boolean }) {
  const [following, setFollowing] = useState(scenario.following)
  const [pending, setPending] = useState(false)
  const toggle = () => {
    if (!scenario.signedIn) return
    setPending(true)
    const next = !following
    setFollowing(next)
    window.setTimeout(() => {
      if (scenario.followFailure) setFollowing(!next)
      setPending(false)
    }, 450)
  }
  return (
    <section className={`${styles.identity} ${compact ? styles.compactIdentity : ''}`} aria-labelledby="organization-name">
      <div className={styles.logo} aria-hidden="true">{scenario.logo ? scenario.monogram : <Building2 />}</div>
      <div className={styles.identityCopy}>
        <div className={styles.identityTitleRow}><h2 id="organization-name">{scenario.name}</h2>{scenario.managed && <Badge variant="outline"><CheckCircle2 />Organization-managed</Badge>}</div>
        {scenario.formerName && <p className={styles.formerName}>{scenario.formerName}</p>}
        {!compact && scenario.about && <p className={styles.identityAbout}>{scenario.about}</p>}
        <div className={styles.identityFacts}>
          {scenario.location && <span><MapPin />{scenario.location}</span>}
          {scenario.languages && <span><Languages />{scenario.languages}</span>}
        </div>
      </div>
      <div className={styles.identityActions}>
        <Button onClick={toggle} disabled={pending || scenario.merged} variant={following ? 'outline' : 'default'}>{pending ? 'Saving…' : scenario.signedIn ? following ? 'Following' : 'Follow' : 'Log in to follow'}</Button>
        {scenario.websiteUnavailable ? <Button variant="outline" disabled>Website unavailable</Button> : scenario.website && <Button variant="outline">Official website <ExternalLink /></Button>}
      </div>
    </section>
  )
}

function OpportunityCard({ item, feature = false }: { item: Opportunity; feature?: boolean }) {
  return (
    <article className={`${styles.opportunityCard} ${feature ? styles.featureCard : ''}`}>
      <div className={styles.opportunityMedia}>
        {item.image ? <Image src={item.image} alt={item.alt ?? ''} fill sizes={feature ? '(max-width: 800px) 100vw, 50vw' : '(max-width: 800px) 100vw, 280px'} /> : <div className={styles.mediaFallback} aria-hidden="true"><Building2 /><span>Media not provided</span></div>}
      </div>
      <div className={styles.opportunityBody}>
        <div className={styles.opportunityMeta}><span>{item.program}</span><Badge variant="outline">{item.route}</Badge></div>
        <h3>{item.title}</h3>
        <p>{item.summary}</p>
        <dl className={styles.decisiveFacts}>
          <div><dt><CalendarDays />Deadline</dt><dd className={item.deadlineTone === 'danger' ? styles.dangerText : item.deadlineTone === 'warning' ? styles.warningText : undefined}>{item.deadline}</dd></div>
          <div><dt><CircleDollarSign />Fee</dt><dd>{item.fee}</dd></div>
        </dl>
        {item.labels.length > 0 && <div className={styles.labelRow} aria-label="Fields included">{item.labels.slice(0, 4).map((label) => <Badge key={label} variant="outline">{label}</Badge>)}</div>}
        <Button className={styles.openButton}>Open Opportunity <ArrowRight /></Button>
      </div>
    </article>
  )
}

function OpportunityCollection({ scenario, featured = false }: { scenario: Scenario; featured?: boolean }) {
  const [query, setQuery] = useState('')
  const visible = useMemo(() => scenario.opportunities.filter((item) => `${item.title} ${item.program} ${item.labels.join(' ')}`.toLowerCase().includes(query.toLowerCase())).slice(0, 9), [query, scenario.opportunities])
  if (scenario.opportunities.length === 0) return <div className={styles.emptyState}><Radio /><h2>No active Opportunities</h2><p>This Organization has not published an active Opportunity. Following is the simplest way to return when one appears.</p></div>
  return (
    <section className={styles.opportunitySection} aria-labelledby="active-opportunities-heading">
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Current choices</p><h2 id="active-opportunities-heading">Active Opportunities</h2><p>{scenario.opportunities.length} published {scenario.opportunities.length === 1 ? 'Opportunity' : 'Opportunities'}</p></div>{scenario.opportunities.length > 8 && <label className={styles.searchField}><span>Search this Organization’s Opportunities</span><div><Search /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, Program, or field" /></div></label>}</div>
      <div className={`${styles.opportunityGrid} ${featured ? styles.featuredGrid : ''}`}>{visible.map((item, index) => <OpportunityCard key={item.id} item={item} feature={featured && index === 0} />)}</div>
      {scenario.opportunities.length > visible.length && <div className={styles.paginationNote}><span>Showing {visible.length} of {scenario.opportunities.length}</span><Button variant="outline">View all Opportunities <ChevronRight /></Button></div>}
    </section>
  )
}

function SupportingProfile({ scenario }: { scenario: Scenario }) {
  return (
    <div className={styles.supportingGrid}>
      <section aria-labelledby="about-heading"><p className={styles.eyebrow}>Organization</p><h2 id="about-heading">About</h2><p>{scenario.about ?? 'This Organization has not added a public description yet.'}</p><dl className={styles.publicFacts}>{scenario.website && <div><dt><Globe2 />Website</dt><dd>{scenario.website}</dd></div>}{scenario.location && <div><dt><MapPin />Location</dt><dd>{scenario.location}</dd></div>}{scenario.languages && <div><dt><Languages />Languages</dt><dd>{scenario.languages}</dd></div>}</dl></section>
      <section aria-labelledby="practice-heading"><p className={styles.eyebrow}>Derived from Opportunities shown</p><h2 id="practice-heading">Opportunities have included</h2>{scenario.practiceLabels.length ? <div className={styles.practiceCloud}>{scenario.practiceLabels.map((label) => <Badge variant="outline" key={label}>{label}</Badge>)}</div> : <p>No field labels are available for the Opportunities shown.</p>}<small>These labels describe published Opportunities. They do not rate or define the Organization.</small></section>
    </div>
  )
}

function ReportIssue() {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="ghost" size="sm" />}><Flag />Report an issue</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Report an issue with this Organization</DialogTitle><DialogDescription>Tell Missa what appears incorrect or unsafe. Do not include confidential submission information.</DialogDescription></DialogHeader>
        <div className={styles.reportForm}><Label htmlFor="issue-category">Issue</Label><select id="issue-category"><option>Incorrect Organization information</option><option>Unsafe or unavailable website</option><option>Duplicate or renamed Organization</option><option>Other</option></select><Label htmlFor="issue-details">Details</Label><Textarea id="issue-details" placeholder="Describe what needs review" /></div>
        <DialogFooter><DialogClose render={<Button variant="outline" />}>Cancel</DialogClose><Button>Send report</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function OpportunityFirst({ scenario }: { scenario: Scenario }) {
  return <main><Identity scenario={scenario} compact /><Notice notice={scenario.notice} /><OpportunityCollection scenario={scenario} /><SupportingProfile scenario={scenario} /><footer className={styles.profileFooter}><p>Public Organization profile · Details should be confirmed on the official website.</p><ReportIssue /></footer></main>
}

function EditorialProfile({ scenario }: { scenario: Scenario }) {
  return (
    <main>
      <div className={`${styles.editorialHero} ${!scenario.cover ? styles.withoutCover : ''}`}>
        {scenario.cover && <Image src="/media/missa-org-gallery.png" alt="A gallery installation presented by Missa Arts Foundation" fill priority sizes="100vw" />}
        <div className={styles.editorialIdentity}><Identity scenario={scenario} /></div>
      </div>
      <Notice notice={scenario.notice} />
      <SupportingProfile scenario={scenario} />
      <OpportunityCollection scenario={scenario} featured />
      <footer className={styles.profileFooter}><p>Public Organization profile · Details should be confirmed on the official website.</p><ReportIssue /></footer>
    </main>
  )
}

function ProgramDirectory({ scenario }: { scenario: Scenario }) {
  return (
    <main><Identity scenario={scenario} compact /><Notice notice={scenario.notice} /><section className={styles.programSection} aria-labelledby="program-heading"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Public structure · contract target</p><h2 id="program-heading">Programs</h2><p>Only Programs explicitly made public belong here.</p></div></div><div className={styles.programGrid}>{scenario.programs.length ? scenario.programs.slice(0, 12).map((program, index) => { const opportunities = scenario.opportunities.filter((item) => item.program === program.name || index === 0); return <Card key={program.name} className={styles.programCard}><CardHeader><CardTitle>{program.name}</CardTitle><CardDescription>{program.description ?? 'No public Program description.'}</CardDescription></CardHeader><CardContent><div className={styles.programCount}><UsersRound />{opportunities.length} active {opportunities.length === 1 ? 'Opportunity' : 'Opportunities'}</div>{opportunities.slice(0, 2).map((item) => <button type="button" key={item.id} className={styles.programOpportunity}><span>{item.title}</span><ChevronRight /></button>)}</CardContent></Card> }) : <Alert className={styles.notice}><AlertCircle /><AlertTitle>Public Programs unavailable</AlertTitle><AlertDescription>The current product stores internal Program names but does not have an explicit public visibility contract.</AlertDescription></Alert>}</div></section><OpportunityCollection scenario={scenario} /><footer className={styles.profileFooter}><p>Public Organization profile · Program visibility remains a target contract.</p><ReportIssue /></footer></main>
  )
}

function LoadingState() {
  return <div className={styles.loadingState} aria-label="Loading Organization profile"><span /><span /><div><span /><span /><span /></div></div>
}

function PublicOrganizationProfileExperience({ selectedOnly }: { selectedOnly: boolean }) {
  const [direction, setDirection] = useState<Direction>('opportunity')
  const [fixture, setFixture] = useState<Fixture>('rich')
  const scenario = scenarioFor(fixture)
  const screenRef = useRef<HTMLDivElement>(null)
  const activeDirection: Direction = selectedOnly ? 'opportunity' : direction
  return (
    <div className={styles.page}>
      <header className={styles.reviewHeader}><div><p className={styles.eyebrow}>Local component library · product untouched</p><h1>{selectedOnly ? 'Public Organization · Opportunity-first profile' : 'Public Organization profile'}</h1><p>{selectedOnly ? 'The selected creator-first composition, retained locally for page-by-page review.' : 'Three premium-component directions designed around a creator’s decision, optional media, narrow identity evidence, published Opportunities, and restrained taxonomy.'}</p></div><Badge variant="outline">Option 02 selected</Badge></header>
      <section className={styles.directionChooser} aria-labelledby="direction-heading"><div className={styles.chooserHeading}><div><p className={styles.eyebrow}>{selectedOnly ? 'Selected composition' : 'Visual direction'}</p><h2 id="direction-heading">{selectedOnly ? '02 · Opportunity-first profile' : 'Compare the same public contract'}</h2></div><label className={styles.fixtureControl}>Edge-case fixture<select value={fixture} onChange={(event) => setFixture(event.target.value as Fixture)}>{fixtureOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label></div>{selectedOnly ? null : <div className={styles.directionOptions}>{directions.map((option) => <button type="button" key={option.id} className={styles.directionOption} data-selected={activeDirection === option.id} aria-pressed={activeDirection === option.id} onClick={() => { setDirection(option.id); window.setTimeout(() => screenRef.current?.focus(), 0) }}><span>{option.number}</span><div><b>{option.name}</b><p>{option.description}</p></div>{activeDirection === option.id && <Check />}</button>)}</div>}</section>
      <div className={styles.screen} ref={screenRef} tabIndex={-1}>
        <header className={styles.productBar}><MissaWordmark href="#public-organization" size="app" className={styles.wordmark} /><nav aria-label="Main"><a href="#opportunities">Opportunities</a><a href="#about">About</a><a href="#organizations" aria-current="page">Organizations</a></nav><div><Button variant="ghost">Log in</Button><Button>Join Missa</Button></div></header>
        <div id="public-organization">{scenario.loading ? <LoadingState /> : scenario.error ? <div className={styles.errorState}><AlertCircle /><h2>Organization profile unavailable</h2><p>Try again. You can still browse other public Opportunities.</p><Button>Try again</Button></div> : scenario.merged ? <div className={styles.mergedState}><Notice notice={scenario.notice} /><h2>{scenario.name}</h2><p>This page is retained so saved links continue to work.</p><Button>Open Aurora Arts Collaborative <ArrowRight /></Button></div> : activeDirection === 'editorial' ? <EditorialProfile key={fixture} scenario={scenario} /> : activeDirection === 'program' ? <ProgramDirectory key={fixture} scenario={scenario} /> : <OpportunityFirst key={fixture} scenario={scenario} />}</div>
      </div>
    </div>
  )
}

export function PublicOrganizationProfileDirections() {
  return <PublicOrganizationProfileExperience selectedOnly={false} />
}

export function PublicOrganizationProfileSelected() {
  return <PublicOrganizationProfileExperience selectedOnly />
}
