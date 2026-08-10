'use client'

import {
  ArrowRight,
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  CircleDollarSign,
  ExternalLink,
  FileText,
  Globe2,
  ImageOff,
  Library,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

import styles from './public-acquisition-directions.module.css'

type Direction = 'utility' | 'editorial' | 'pathways'
type Surface = 'home' | 'about' | 'organizations' | 'guides' | 'article' | 'methodology' | 'collection' | 'profile' | 'access'
type Fixture =
  | 'ready'
  | 'signed-in'
  | 'no-media'
  | 'no-records'
  | 'unavailable'
  | 'principles'
  | 'capability-mix'
  | 'guide-index'
  | 'guide-no-related'
  | 'evidence'
  | 'collection-active'
  | 'collection-thin'
  | 'collection-zero'
  | 'collection-stale'
  | 'profile-public'
  | 'profile-private'
  | 'profile-empty'
  | 'profile-not-found'
  | 'signup-open'
  | 'waitlist-only'
  | 'waitlist-duplicate'
  | 'waitlist-invalid'
  | 'waitlist-unavailable'

const directions: Array<{ id: Direction; number: string; name: string; description: string }> = [
  { id: 'utility', number: '01', name: 'Immediate usefulness', description: 'The next credible Opportunity or action appears first, with supporting explanation kept close.' },
  { id: 'editorial', number: '02', name: 'Editorial evidence', description: 'A calmer reading hierarchy explains scope and source boundaries before the next action.' },
  { id: 'pathways', number: '03', name: 'Guided pathways', description: 'Creator, Organization, and reader paths stay explicit as people move across the public site.' },
]

const surfaces: Array<{ id: Surface; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'organizations', label: 'For organizations' },
  { id: 'guides', label: 'Guides' },
  { id: 'article', label: 'Guide article' },
  { id: 'methodology', label: 'Methodology' },
  { id: 'collection', label: 'Curated collection' },
  { id: 'profile', label: 'Public Profile' },
  { id: 'access', label: 'Signup / waitlist' },
]

const fixtures: Record<Surface, Array<{ id: Fixture; label: string }>> = {
  home: [
    { id: 'ready', label: 'Three published Opportunities' },
    { id: 'signed-in', label: 'Signed-in return' },
    { id: 'no-media', label: 'No source-provided media' },
    { id: 'no-records', label: 'No published records' },
    { id: 'unavailable', label: 'Repository unavailable' },
  ],
  about: [{ id: 'principles', label: 'Product principles' }],
  organizations: [{ id: 'capability-mix', label: 'Available, limited, and planned' }],
  guides: [{ id: 'guide-index', label: 'Guide index' }],
  article: [{ id: 'guide-no-related', label: 'Article without related records' }],
  methodology: [{ id: 'evidence', label: 'Evidence and responsibility' }],
  collection: [
    { id: 'collection-active', label: 'Active collection' },
    { id: 'collection-thin', label: 'Thin coverage' },
    { id: 'collection-zero', label: 'Zero matching records' },
    { id: 'collection-stale', label: 'Stale collection mapping' },
  ],
  profile: [
    { id: 'profile-public', label: 'Selected public Works' },
    { id: 'profile-private', label: 'Private Profile' },
    { id: 'profile-empty', label: 'No public content' },
    { id: 'profile-not-found', label: 'Profile not found' },
  ],
  access: [
    { id: 'signup-open', label: 'Open signup policy' },
    { id: 'waitlist-only', label: 'Waitlist-only policy' },
    { id: 'waitlist-duplicate', label: 'Already on waitlist' },
    { id: 'waitlist-invalid', label: 'Invalid email' },
    { id: 'waitlist-unavailable', label: 'Service unavailable' },
  ],
}

type Opportunity = {
  title: string
  organization: string
  deadline: string
  fee: string
  type: string
  practices: string[]
  image?: string
  alt?: string
}

const opportunities: Opportunity[] = [
  {
    title: 'International Writing Fellowship',
    organization: 'North River Review',
    deadline: '18 September 2026',
    fee: 'No application fee',
    type: 'Fellowship',
    practices: ['Fiction', 'Poetry'],
    image: '/media/home/artist-at-work.webp',
    alt: 'A writer working at a desk beside a window',
  },
  {
    title: 'New Media Production Commission',
    organization: 'Aurora Arts Collaborative',
    deadline: 'Rolling deadline',
    fee: '$15 application fee',
    type: 'Commission',
    practices: ['Film', 'Moving image'],
    image: '/media/home/gallery-interior.webp',
    alt: 'A contemporary gallery interior with a projected moving-image installation',
  },
  {
    title: 'Mountain Research Residency for Interdisciplinary Artists',
    organization: 'Organization not listed',
    deadline: 'Deadline not published',
    fee: 'Fee not published',
    type: 'Residency',
    practices: ['Research', 'Interdisciplinary'],
    image: '/media/home/opportunity-mountains.webp',
    alt: 'A mountain landscape associated with the residency location',
  },
]

function isDirection(value: string): value is Direction {
  return directions.some((item) => item.id === value)
}

function isSurface(value: string): value is Surface {
  return surfaces.some((item) => item.id === value)
}

function ReviewControls({ direction, surface, fixture, selectedOnly, onDirection, onSurface, onFixture }: { direction: Direction; surface: Surface; fixture: Fixture; selectedOnly: boolean; onDirection: (value: Direction) => void; onSurface: (value: Surface) => void; onFixture: (value: Fixture) => void }) {
  return (
    <div className={styles.reviewControls} aria-label='Design review controls'>
      {selectedOnly ? null : <div className={styles.directionButtons} role='group' aria-label='Public visual direction'>
        {directions.map((item) => <button key={item.id} type='button' data-active={direction === item.id} aria-pressed={direction === item.id} onClick={() => onDirection(item.id)}><span>{item.number}</span>{item.name}</button>)}
      </div>}
      <div className={styles.reviewSelectors}>
        <label><span>Page</span><select aria-label='Public page' value={surface} onChange={(event) => { if (isSurface(event.target.value)) onSurface(event.target.value) }}>{surfaces.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label><span>Edge state</span><select aria-label='Public edge state' value={fixture} onChange={(event) => onFixture(event.target.value as Fixture)}>{fixtures[surface].map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      </div>
    </div>
  )
}

function DirectionIntro({ direction, selectedOnly }: { direction: Direction; selectedOnly: boolean }) {
  const item = directions.find((candidate) => candidate.id === direction)!
  return <section className={styles.directionIntro}><span>{item.number}</span><div><p>{selectedOnly ? 'Selected public composition for this page' : 'Public and acquisition direction'}</p><h1>{item.name}</h1><p>{item.description}</p></div><Badge variant='outline'>{selectedOnly ? 'Selected · local only' : 'Selection pending'}</Badge></section>
}

function PublicHeader({ surface, fixture }: { surface: Surface; fixture: Fixture }) {
  const signedIn = fixture === 'signed-in'
  const waitlistPolicy = surface === 'access' && fixture !== 'signup-open'
  return (
    <header className={styles.publicHeader}>
      <a href='#public-main' className={styles.skipLink}>Skip to content</a>
      <a href='#home' className={styles.wordmark}>Missa</a>
      <nav aria-label='Main navigation'>
        <a href='#home' aria-current={surface === 'home' ? 'page' : undefined}>Home</a>
        <a href='#opportunities'>Opportunities</a>
        <a href='#guides' aria-current={surface === 'guides' || surface === 'article' ? 'page' : undefined}>Guides</a>
        <a href='#organizations' aria-current={surface === 'organizations' ? 'page' : undefined}>For organizations</a>
      </nav>
      <div className={styles.accountActions}>{signedIn ? <Button size='sm'>Open Missa</Button> : <><Button variant='ghost' size='sm'>Log in</Button><Button size='sm'>{waitlistPolicy ? 'Join waitlist' : 'Create account'}</Button></>}</div>
      <Button type='button' variant='outline' size='icon' className={styles.menuButton} aria-label='Open navigation'><Menu aria-hidden='true' /></Button>
    </header>
  )
}

function PathRail({ surface }: { surface: Surface }) {
  return <aside className={styles.pathRail} aria-label='Public pathway'><p>Your path</p><a href='#creator' aria-current={['home', 'guides', 'article', 'collection', 'profile'].includes(surface) ? 'step' : undefined}><UserRound aria-hidden='true' />Creator</a><a href='#organization' aria-current={surface === 'organizations' ? 'step' : undefined}><Building2 aria-hidden='true' />Organization</a><a href='#reader' aria-current={['about', 'methodology'].includes(surface) ? 'step' : undefined}><BookOpen aria-hidden='true' />Reader</a></aside>
}

function OpportunityCard({ item, noMedia = false, featured = false }: { item: Opportunity; noMedia?: boolean; featured?: boolean }) {
  return (
    <article className={styles.opportunityCard} data-featured={featured}>
      <div className={styles.opportunityMedia}>
        {!noMedia && item.image ? <Image src={item.image} alt={item.alt ?? ''} fill sizes={featured ? '(max-width: 760px) 100vw, 48vw' : '(max-width: 760px) 100vw, 30vw'} /> : <div className={styles.mediaFallback} aria-hidden='true'><ImageOff /><span>Media not provided</span></div>}
      </div>
      <div className={styles.opportunityBody}>
        <div className={styles.cardLabels}><Badge variant='outline'>{item.type}</Badge>{item.practices.slice(0, 2).map((practice) => <Badge key={practice} variant='secondary'>{practice}</Badge>)}</div>
        <h3>{item.title}</h3><p>{item.organization}</p>
        <dl><div><CalendarDays aria-hidden='true' /><dt>Deadline</dt><dd>{item.deadline}</dd></div><div><CircleDollarSign aria-hidden='true' /><dt>Fee</dt><dd>{item.fee}</dd></div></dl>
        <div className={styles.cardActions}><a href='#open-opportunity'>Open Opportunity <ArrowRight aria-hidden='true' /></a><a href='#official-source'>Official source <ExternalLink aria-hidden='true' /></a></div>
      </div>
    </article>
  )
}

function EmptySection({ unavailable = false }: { unavailable?: boolean }) {
  return <Alert className={styles.statePanel}><Search aria-hidden='true' /><AlertTitle>{unavailable ? 'Opportunities are temporarily unavailable' : 'No published Opportunities to show here'}</AlertTitle><AlertDescription>{unavailable ? 'You can still read Guides or learn how Missa works. Try this section again later.' : 'Missa is not substituting sample records. Browse Guides or return when published records are available.'}</AlertDescription>{unavailable ? <Button variant='outline'>Try again</Button> : null}</Alert>
}

function HomePage({ direction, fixture }: { direction: Direction; fixture: Fixture }) {
  const empty = fixture === 'no-records' || fixture === 'unavailable'
  const noMedia = fixture === 'no-media'
  return (
    <main id='public-main' className={styles.pageContent}>
      <section className={styles.homeHero}>
        <div><p className={styles.eyebrow}>Creative opportunities, kept understandable</p><h2>Find the call worth your time. Keep the decision and deadline with you.</h2><p>Missa helps creators read the facts, open the official source, save a decision, and keep track of what comes next.</p><div className={styles.heroActions}><Button>Browse Opportunities <ArrowRight /></Button><Button variant='outline'>How Missa works</Button></div></div>
        {direction === 'pathways' ? <div className={styles.pathCards}><Card><CardHeader><UserRound /><CardTitle>I create Work</CardTitle><CardDescription>Find, assess, save, and track Opportunities.</CardDescription></CardHeader><CardContent><a href='#creator'>Start with Opportunities <ArrowRight /></a></CardContent></Card><Card><CardHeader><Building2 /><CardTitle>I run Opportunities</CardTitle><CardDescription>Publish calls and manage per-Work outcomes.</CardDescription></CardHeader><CardContent><a href='#organization'>See the Organization workflow <ArrowRight /></a></CardContent></Card></div> : <aside className={styles.heroProof}><Sparkles aria-hidden='true' /><strong>{fixture === 'signed-in' ? 'Welcome back' : 'Start with the source'}</strong><p>{fixture === 'signed-in' ? 'Resume your Tracker or open a published Opportunity.' : 'Missa keeps unknown and conflicting facts visible and leaves the official call in authority.'}</p><a href='#proof'>{fixture === 'signed-in' ? 'Open Tracker' : 'Read the methodology'} <ArrowRight /></a></aside>}
      </section>
      <section className={styles.opportunitySection} aria-labelledby='home-opportunities'><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Published Opportunities</p><h2 id='home-opportunities'>Open something useful now</h2><p>A small current set—not fabricated demo records and not a popularity ranking.</p></div><a href='#all'>Browse all <ArrowRight /></a></div>{empty ? <EmptySection unavailable={fixture === 'unavailable'} /> : <div className={styles.opportunityGrid}>{opportunities.map((item, index) => <OpportunityCard key={item.title} item={item} noMedia={noMedia} featured={direction === 'editorial' && index === 0} />)}</div>}</section>
      <section className={styles.storySteps} aria-labelledby='missa-path'><div><p className={styles.eyebrow}>One connected path</p><h2 id='missa-path'>Decide, prepare, and remember</h2></div>{['Read the independent facts', 'Save your decision to Tracker', 'Prepare from the official requirements', 'Keep the receipt and next obligation'].map((item, index) => <article key={item}><span>{String(index + 1).padStart(2, '0')}</span><strong>{item}</strong></article>)}</section>
    </main>
  )
}

function AboutPage() {
  const principles = [
    ['Source first', 'The official Organization or source remains authoritative.'],
    ['Unknown stays unknown', 'Missing facts do not become reassuring guesses.'],
    ['Private by default', 'Preferences, eligibility details, and Tracker activity are not public proof.'],
    ['Per-Work truth', 'A Submission can contain several Works with different outcomes.'],
  ]
  return <main id='public-main' className={styles.pageContent}><section className={styles.editorialHero}><p className={styles.eyebrow}>About Missa</p><h2>Creative opportunity infrastructure for clearer decisions.</h2><p>Missa helps creators understand and track Opportunities, and helps Organizations operate the path from a published call to review, decisions, communication, and delivery.</p></section><section className={styles.principleGrid}>{principles.map(([title, body], index) => <Card key={title}><CardHeader><span>{String(index + 1).padStart(2, '0')}</span><CardTitle>{title}</CardTitle><CardDescription>{body}</CardDescription></CardHeader></Card>)}</section><div className={styles.nextLinks}><a href='#opportunities'>Browse Opportunities <ArrowRight /></a><a href='#methodology'>Read Methodology <ArrowRight /></a><a href='#organizations'>For organizations <ArrowRight /></a></div></main>
}

function OrganizationsPage() {
  const capabilities = [
    ['Publish a clear Opportunity', 'Available', 'Type, practice, eligibility, geography, dates, fee, and form remain separate.'],
    ['Receive multi-Work Submissions', 'Available', 'One packet can contain several independently reviewable Works.'],
    ['Assign scoped reviews', 'Limited', 'Assignment-only access is represented; complete typed capability projection remains a promotion gate.'],
    ['Record per-Work decisions', 'Available', 'Submission summaries are derived rather than manually flattened.'],
    ['Recipient-level communication', 'Planned', 'Local evidence and recovery states exist; durable production contracts remain gated.'],
    ['Coordinate accepted-Work delivery', 'Planned', 'Obligations and evidence are designed locally but not claimed as live product behavior.'],
  ]
  return <main id='public-main' className={styles.pageContent}><section className={styles.editorialHero}><p className={styles.eyebrow}>For organizations</p><h2>Run the whole Opportunity without losing the individual Work.</h2><p>Publish clearly, receive coherent packets, assign focused reviews, decide each Work, communicate accurately, and coordinate what happens after acceptance.</p><Button>Discuss your program <ArrowRight /></Button></section><section className={styles.capabilityList} aria-label='Capability map'>{capabilities.map(([title, state, body]) => <article key={title}><div><strong>{title}</strong><p>{body}</p></div><Badge variant='outline' data-state={state.toLowerCase()}>{state}</Badge></article>)}</section><Alert className={styles.boundaryAlert}><ShieldCheck /><AlertTitle>Capability labels are part of the claim</AlertTitle><AlertDescription>Planned work is not presented as a live screenshot, customer proof, or guaranteed delivery date.</AlertDescription></Alert></main>
}

function GuidesPage() {
  const guides = [
    ['Decide whether an Opportunity is worth your time', 'Before you apply', 'Compare the official requirements, fee, deadline, and what remains unknown.'],
    ['Prepare a coherent portfolio packet', 'Preparing Work', 'Choose Works deliberately and preserve the exact submitted versions.'],
    ['Track a rolling or unclear deadline', 'Keeping track', 'Record what the source says without inventing a fixed date.'],
    ['Design a fair review process', 'Running a call', 'Separate assignment, evidence, recommendation, and final decision.'],
  ]
  return <main id='public-main' className={styles.pageContent}><section className={styles.pageHeading}><div><p className={styles.eyebrow}>Guides</p><h2>Start with the decision you are making.</h2><p>Practical reading for creators and Organizations, grouped by job rather than a wall of taxonomy terms.</p></div><div className={styles.searchField}><Search /><Input aria-label='Search Guides' placeholder='Search Guides' /></div></section><section className={styles.guideList}>{guides.map(([title, group, body], index) => <a href='#guide' key={title}><span>{String(index + 1).padStart(2, '0')}</span><div><small>{group}</small><h3>{title}</h3><p>{body}</p></div><ArrowRight /></a>)}</section></main>
}

function ArticlePage() {
  return <main id='public-main' className={styles.articleLayout}><article><p className={styles.eyebrow}>Guide · Before you apply</p><h2>How to read an Opportunity before you commit your time</h2><p className={styles.lede}>A clear first pass separates what the Organization states, what remains unknown, and what you need to decide for yourself.</p><h3>Begin with the official source</h3><p>Confirm the deadline, fee, route, required Works, eligibility, and any terms that could change the cost of applying. Missa can organize those facts, but the official call remains authoritative.</p><h3>Keep different questions separate</h3><p>Creative practice, Opportunity type, geography, career stage, identity eligibility, fee, and deadline are different facts. One familiar label does not answer the others.</p><h3>Record your own decision</h3><p>Save why you are interested, what you need to confirm, and the next action. That private context belongs in your Profile and Tracker—not on the public record.</p><footer><span>Guide updated 8 August 2026</span><a href='#source'>Editorial sources <ExternalLink /></a></footer></article><aside><h3>Related Opportunities</h3><p>Missa has no matching published records in this collection right now. That does not mean no such Opportunities exist.</p><Button variant='outline'>Browse all Opportunities</Button></aside></main>
}

function MethodologyPage() {
  const steps = [
    ['Collect the public claim', 'Missa records what a public Organization or source actually states.'],
    ['Separate facts and sources', 'Deadline, fee, type, geography, eligibility, and practice remain independent.'],
    ['Preserve unknowns and conflicts', 'Missing or contradictory information remains visible instead of being resolved by guesswork.'],
    ['Publish a customer-safe record', 'Only facts that meet the public evidence contract appear; internal operations stay in Platform Admin.'],
  ]
  return <main id='public-main' className={styles.pageContent}><section className={styles.editorialHero}><p className={styles.eyebrow}>Methodology</p><h2>Public evidence, with clear limits.</h2><p>Missa helps people inspect Opportunity facts and return to the official source. It does not guarantee eligibility, acceptance, safety, availability, or that a third-party page has remained unchanged.</p></section><section className={styles.methodSteps}>{steps.map(([title, body], index) => <article key={title}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{title}</h3><p>{body}</p></div></article>)}</section><Alert className={styles.boundaryAlert}><Globe2 /><AlertTitle>The official source remains authoritative</AlertTitle><AlertDescription>Open it before acting, especially when a deadline, fee, eligibility rule, or application route matters.</AlertDescription><Button variant='outline'>Report an issue</Button></Alert></main>
}

function CollectionPage({ fixture }: { fixture: Fixture }) {
  if (fixture === 'collection-stale') return <main id='public-main' className={styles.pageContent}><Alert className={styles.statePanel}><Library /><AlertTitle>This collection has moved</AlertTitle><AlertDescription>The previous term now maps to Writing residencies. Continue to the canonical collection or browse all Opportunities.</AlertDescription><Button>Open Writing residencies</Button></Alert></main>
  const count = fixture === 'collection-active' ? 3 : fixture === 'collection-thin' ? 1 : 0
  return <main id='public-main' className={styles.pageContent}><section className={styles.pageHeading}><div><p className={styles.eyebrow}>Curated collection</p><h2>Writing residencies</h2><p>Published residencies whose stated creative-practice requirements include writing. Geography, eligibility, fee, and deadline are not part of this inclusion rule.</p></div><Badge variant='outline'>{count} published {count === 1 ? 'record' : 'records'}</Badge></section>{fixture === 'collection-thin' ? <Alert className={styles.boundaryAlert}><BookOpen /><AlertTitle>This is a small collection</AlertTitle><AlertDescription>Only one published record currently meets this collection’s inclusion rule. It is not a claim about the wider field.</AlertDescription></Alert> : null}{count === 0 ? <EmptySection /> : <div className={styles.opportunityGrid}>{opportunities.slice(0, count).map((item) => <OpportunityCard key={item.title} item={item} />)}</div>}</main>
}

function ProfilePage({ fixture }: { fixture: Fixture }) {
  if (fixture === 'profile-not-found') return <main id='public-main' className={styles.pageContent}><Alert className={styles.statePanel}><UserRound /><AlertTitle>Profile not found</AlertTitle><AlertDescription>The address may have changed, or this Profile may no longer be available.</AlertDescription><Button variant='outline'>Browse Opportunities</Button></Alert></main>
  if (fixture === 'profile-private') return <main id='public-main' className={styles.pageContent}><section className={styles.privateProfile}><UserRound /><h2>This Profile is private</h2><p>Nothing about this person’s preferences, eligibility, Tracker, applications, or Organization memberships is public.</p><Button variant='outline'>Browse Opportunities</Button></section></main>
  const empty = fixture === 'profile-empty'
  return <main id='public-main' className={styles.pageContent}><section className={styles.profileHero}><div className={styles.profileMark}>AN</div><div><p className={styles.eyebrow}>Public Profile</p><h2>Amaka Nwosu</h2><p>Writer and interdisciplinary artist working across poetry, sound, and public memory.</p><div className={styles.publicLinks}><a href='#website'>Website <ExternalLink /></a><a href='#portfolio'>Portfolio <ExternalLink /></a></div></div></section><section className={styles.publicWorks}><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Selected by Amaka</p><h2>Public Works</h2></div></div>{empty ? <p className={styles.emptyCopy}>Amaka has not published any Works or links here yet.</p> : <div className={styles.workGrid}><Card><CardContent><div className={styles.workMedia}><Image src='/media/home/portfolio-still-life.webp' alt='Printed pages and recording equipment from the Work River Maps' fill /></div><h3>River Maps</h3><p>Poetry and field recordings · 2026</p></CardContent></Card><Card><CardContent><div className={styles.workFallback}><FileText /></div><h3>Notes for a Returning City</h3><p>Essay · 2025</p></CardContent></Card></div>}</section></main>
}

function AccessPage({ fixture }: { fixture: Fixture }) {
  const waitlist = fixture !== 'signup-open'
  const error = fixture === 'waitlist-invalid' || fixture === 'waitlist-unavailable'
  const confirmed = fixture === 'waitlist-duplicate'
  return <main id='public-main' className={styles.accessPage}><section><p className={styles.eyebrow}>{waitlist ? 'Join the waitlist' : 'Create your Profile'}</p><h2>{waitlist ? 'Get access when the next group opens.' : 'Create an account and begin with Opportunities.'}</h2><p>{waitlist ? 'We will use your email only to contact you about Missa access. Existing invitees can still log in.' : 'Signup is open. You do not need to join a separate waitlist.'}</p>{confirmed ? <Alert className={styles.successPanel}><Check /><AlertTitle>You are already on the list</AlertTitle><AlertDescription>There is nothing else to submit. We will use the email already received.</AlertDescription></Alert> : <form onSubmit={(event) => event.preventDefault()} noValidate><label htmlFor='public-email'>Email address</label><Input id='public-email' type='email' aria-invalid={error || undefined} aria-describedby={error ? 'public-email-error' : undefined} placeholder='you@example.com' />{error ? <p id='public-email-error' className={styles.fieldError}>{fixture === 'waitlist-invalid' ? 'Enter a complete email address.' : 'We could not save your request. Nothing was submitted; try again later.'}</p> : null}<Button type='submit'>{waitlist ? 'Join waitlist' : 'Create account'} <ArrowRight /></Button></form>}</section><aside><ShieldCheck /><h3>What happens next</h3><p>{waitlist ? 'Confirmation does not promise an access date. If access policy changes, this page and signup will change together.' : 'Your private Profile begins empty. You choose what to add and what, if anything, to publish.'}</p><a href='#privacy'>Read the privacy approach <ArrowRight /></a></aside></main>
}

function PublicSurface({ direction, surface, fixture }: { direction: Direction; surface: Surface; fixture: Fixture }) {
  return (
    <div className={styles.preview} data-direction={direction} data-surface={surface}>
      <PublicHeader surface={surface} fixture={fixture} />
      <div className={styles.previewBody}>{direction === 'pathways' ? <PathRail surface={surface} /> : null}{surface === 'home' ? <HomePage direction={direction} fixture={fixture} /> : surface === 'about' ? <AboutPage /> : surface === 'organizations' ? <OrganizationsPage /> : surface === 'guides' ? <GuidesPage /> : surface === 'article' ? <ArticlePage /> : surface === 'methodology' ? <MethodologyPage /> : surface === 'collection' ? <CollectionPage fixture={fixture} /> : surface === 'profile' ? <ProfilePage fixture={fixture} /> : <AccessPage fixture={fixture} />}</div>
      <footer className={styles.publicFooter}><strong>Missa</strong><p>Opportunities for creative work, with the source and limits kept visible.</p><nav aria-label='Footer'><a href='#about'>About</a><a href='#methodology'>Methodology</a><a href='#privacy'>Privacy</a><a href='#contact'>Contact</a></nav></footer>
    </div>
  )
}

function selectedDirectionForSurface(surface: Surface): Direction {
  return ['home', 'collection', 'access'].includes(surface) ? 'utility' : 'editorial'
}

function PublicAcquisitionExperience({ selectedOnly }: { selectedOnly: boolean }) {
  const [direction, setDirection] = useState<Direction>('utility')
  const [surface, setSurface] = useState<Surface>('home')
  const [fixture, setFixture] = useState<Fixture>('ready')

  function changeSurface(nextSurface: Surface) {
    setSurface(nextSurface)
    setFixture(fixtures[nextSurface][0]!.id)
  }

  const activeDirection = selectedOnly ? selectedDirectionForSurface(surface) : direction
  return <div className={styles.page}><ReviewControls direction={activeDirection} surface={surface} fixture={fixture} selectedOnly={selectedOnly} onDirection={(value) => { if (isDirection(value)) setDirection(value) }} onSurface={changeSurface} onFixture={setFixture} /><DirectionIntro direction={activeDirection} selectedOnly={selectedOnly} /><PublicSurface key={`${activeDirection}-${surface}-${fixture}`} direction={activeDirection} surface={surface} fixture={fixture} /></div>
}

export function PublicAcquisitionDirections() {
  return <PublicAcquisitionExperience selectedOnly={false} />
}

export function PublicAcquisitionSelected() {
  return <PublicAcquisitionExperience selectedOnly />
}
