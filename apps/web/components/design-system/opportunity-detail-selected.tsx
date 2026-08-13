'use client'

import Image from 'next/image'
import {
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  CalendarDays,
  Check,
  CircleHelp,
  ExternalLink,
  FileText,
  Flag,
  Globe2,
  MapPin,
  Menu,
  Tag,
} from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

import { MissaWordmark } from '@/components/missa-wordmark'
import styles from '../opportunity-detail.module.css'

type RecordFixture =
  | 'complete'
  | 'partial'
  | 'conflict'
  | 'closed'
  | 'no-image'
  | 'broken-image'
  | 'source-unavailable'
  | 'merged'
  | 'long-content'

type PersonState = 'visitor' | 'creator' | 'saved' | 'preparing' | 'submitted'

type FixtureContent = {
  title: string
  organization: string
  deadline: string
  fee: string
  reach: string
  status: string
  image: 'available' | 'none' | 'broken'
  notice?: {
    title: string
    body: string
    tone: 'neutral' | 'warning'
  }
  sourceAvailable: boolean
}

const baseFixture: FixtureContent = {
  title: 'PEN America Open Call — Writing for Change',
  organization: 'PEN America',
  deadline: '31 October 2026',
  fee: 'No fee',
  reach: 'Worldwide · Online',
  status: 'Open',
  image: 'available',
  sourceAvailable: true,
}

const fixtures: Record<RecordFixture, FixtureContent> = {
  complete: baseFixture,
  partial: {
    ...baseFixture,
    fee: 'Fee not listed',
    status: 'Open · some details unknown',
    notice: {
      title: 'Some application details are not listed',
      body: 'The source names the deadline and eligibility, but does not list a fee or complete file requirements. Confirm these on the official page before preparing work.',
      tone: 'neutral',
    },
  },
  conflict: {
    ...baseFixture,
    deadline: 'Deadline needs confirmation',
    status: 'Open · deadline conflict',
    notice: {
      title: 'The deadline differs across the source pages',
      body: 'The call page says 31 October while the linked guidelines say 1 November. Confirm the deadline on the official source before submitting.',
      tone: 'warning',
    },
  },
  closed: {
    ...baseFixture,
    deadline: 'Closed 31 July 2026',
    status: 'Closed',
    notice: {
      title: 'This call is closed',
      body: 'The record remains available for reference. The Organization may publish a future edition on its official website.',
      tone: 'neutral',
    },
  },
  'no-image': {
    ...baseFixture,
    image: 'none',
  },
  'broken-image': {
    ...baseFixture,
    image: 'broken',
  },
  'source-unavailable': {
    ...baseFixture,
    sourceAvailable: false,
    status: 'Open · source unavailable',
    notice: {
      title: 'The official source is unavailable',
      body: 'Do not rely on this record alone. Try the Organization website later or report the issue so Missa can investigate.',
      tone: 'warning',
    },
  },
  merged: {
    ...baseFixture,
    notice: {
      title: 'This record now uses the Organization’s canonical call page',
      body: 'A duplicate was merged into this record. Saved Tracker history remains attached to the canonical opportunity.',
      tone: 'neutral',
    },
  },
  'long-content': {
    ...baseFixture,
    title: 'International Open Call for Writers and Interdisciplinary Artists Working Across Poetry, Moving Image, Performance, Public Space and Community Publishing',
    organization: 'The International Centre for Collaborative Writing and Public Culture',
    reach: 'Worldwide · Online selection · In-person programme in Accra',
  },
}

const eligibility = [
  'Open to writers worldwide',
  'Original, unpublished poetry and short fiction',
  'Simultaneous submissions are allowed with prompt withdrawal',
]

const requirements = [
  { label: 'Writing sample', detail: 'Up to 5 poems or one story under 6,000 words' },
  { label: 'Short biography', detail: 'Up to 100 words' },
  { label: 'Cover note', detail: 'Include genre and contact details' },
]

const practices = ['Poetry', 'Short fiction', 'Literary writing']

function ReviewToolbar({
  fixture,
  personState,
  onFixture,
  onPersonState,
}: {
  fixture: RecordFixture
  personState: PersonState
  onFixture: (fixture: RecordFixture) => void
  onPersonState: (state: PersonState) => void
}) {
  return (
    <aside className={styles.reviewToolbar} aria-label='Design review controls'>
      <div>
        <strong>Selected Opportunity Detail</strong>
        <span>Local library preview</span>
      </div>
      <label>
        <span>Record fixture</span>
        <select value={fixture} onChange={(event) => onFixture(event.target.value as RecordFixture)}>
          <option value='complete'>Complete record</option>
          <option value='partial'>Partial record</option>
          <option value='conflict'>Conflicting facts</option>
          <option value='closed'>Closed call</option>
          <option value='no-image'>No image</option>
          <option value='broken-image'>Broken image</option>
          <option value='source-unavailable'>Source unavailable</option>
          <option value='merged'>Merged duplicate</option>
          <option value='long-content'>Long content</option>
        </select>
      </label>
      <label>
        <span>Person state</span>
        <select value={personState} onChange={(event) => onPersonState(event.target.value as PersonState)}>
          <option value='visitor'>Signed out</option>
          <option value='creator'>Signed in</option>
          <option value='saved'>In Tracker</option>
          <option value='preparing'>Preparing</option>
          <option value='submitted'>Submitted</option>
        </select>
      </label>
    </aside>
  )
}

function AppHeader() {
  return (
    <header className={styles.appHeader}>
      <MissaWordmark href='#main-content' size='app' className={styles.wordmark} />
      <nav aria-label='Primary navigation'>
        <a href='#' aria-current='page'>Opportunities</a>
        <a href='#'>Tracker</a>
        <a href='#'>Library</a>
        <a href='#'>Guides</a>
      </nav>
      <div className={styles.headerActions}>
        <Button type='button' variant='ghost' size='icon' className={styles.mobileMenu} aria-label='Open navigation'>
          <Menu aria-hidden='true' />
        </Button>
        <button type='button' className={styles.avatar} aria-label='Open Profile'>A</button>
      </div>
    </header>
  )
}

function IdentityMedia({ fixture }: {
  fixture: FixtureContent
}) {
  const [failed, setFailed] = useState(false)
  const showFallback = fixture.image === 'none' || failed

  return (
    <div className={styles.identityMedia} data-fallback={showFallback || undefined}>
      {showFallback ? (
        <span aria-hidden='true'>PEN</span>
      ) : (
        <Image
          src={fixture.image === 'broken' ? '/media/missing-opportunity-source.webp' : '/media/home/artist-at-work.webp'}
          alt='A writer working at a desk'
          fill
          priority
          sizes='(min-width: 900px) 42vw, 100vw'
          className={styles.identityImage}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}

function Notice({ fixture }: { fixture: FixtureContent }) {
  if (!fixture.notice) return null

  return (
    <Alert className={styles.notice} variant={fixture.notice.tone === 'warning' ? 'destructive' : 'default'}>
      {fixture.notice.tone === 'warning' ? <AlertTriangle aria-hidden='true' /> : <CircleHelp aria-hidden='true' />}
      <AlertTitle>{fixture.notice.title}</AlertTitle>
      <AlertDescription>{fixture.notice.body}</AlertDescription>
    </Alert>
  )
}

function FactList({ fixture }: { fixture: FixtureContent }) {
  const facts = [
    { label: 'Deadline', value: fixture.deadline, icon: CalendarDays },
    { label: 'Fee', value: fixture.fee, icon: Tag },
    { label: 'Reach', value: fixture.reach, icon: Globe2 },
    { label: 'Status', value: fixture.status, icon: MapPin },
  ]

  return (
    <dl className={styles.factList}>
      {facts.map(({ label, value, icon: Icon }) => (
        <div key={label} data-warning={(label === 'Deadline' && fixture.status.includes('conflict')) || undefined}>
          <dt><Icon aria-hidden='true' />{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function PrimaryAction({
  personState,
  fixture,
  onAction,
}: {
  personState: PersonState
  fixture: RecordFixture
  onAction: () => void
}) {
  const labels: Record<PersonState, string> = {
    visitor: fixture === 'closed' ? 'Sign in to save' : 'Sign in to save',
    creator: fixture === 'closed' ? 'Save for reference' : 'Save to Tracker',
    saved: 'In Tracker',
    preparing: 'Continue preparing',
    submitted: 'View submission',
  }

  return (
    <Button type='button' variant={personState === 'saved' ? 'secondary' : 'default'} className={styles.primaryAction} onClick={onAction}>
      {personState === 'saved' ? <Check aria-hidden='true' /> : <Bookmark aria-hidden='true' />}
      {labels[personState]}
    </Button>
  )
}

function SourceAction({ available }: { available: boolean }) {
  if (!available) {
    return <p className={styles.sourceUnavailable}><AlertTriangle aria-hidden='true' />Official source unavailable</p>
  }

  return (
    <a className={styles.sourceButton} href='https://pen.org/' target='_blank' rel='noreferrer'>
      Official source <ExternalLink aria-hidden='true' />
    </a>
  )
}

function IssueDialog() {
  const [submitted, setSubmitted] = useState(false)

  function submitIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <Dialog onOpenChange={(open) => { if (!open) setSubmitted(false) }}>
      <DialogTrigger className={styles.reportTrigger}>
        <Flag aria-hidden='true' />Report an issue
      </DialogTrigger>
      <DialogContent className={styles.issueDialog}>
        {submitted ? (
          <>
            <DialogHeader>
              <DialogTitle>Thank you — the issue is ready for review</DialogTitle>
              <DialogDescription>Your report would be attached to this opportunity without exposing backend review details.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button type='button' />}>Done</DialogClose>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submitIssue}>
            <DialogHeader>
              <DialogTitle>Report an issue</DialogTitle>
              <DialogDescription>Tell Missa what could affect someone’s decision or submission.</DialogDescription>
            </DialogHeader>
            <label className={styles.dialogField}>
              <span>What is wrong?</span>
              <select name='issueType' defaultValue='deadline'>
                <option value='deadline'>Deadline</option>
                <option value='fee'>Fee</option>
                <option value='eligibility'>Eligibility</option>
                <option value='source'>Official source</option>
                <option value='other'>Something else</option>
              </select>
            </label>
            <label className={styles.dialogField}>
              <span>Details</span>
              <textarea name='details' rows={4} required placeholder='Describe the issue' />
            </label>
            <DialogFooter>
              <DialogClose render={<Button type='button' variant='outline' />}>Cancel</DialogClose>
              <Button type='submit'>Send report</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function RequirementList() {
  return (
    <dl className={styles.requirementList}>
      {requirements.map((item) => (
        <div key={item.label}>
          <dt><FileText aria-hidden='true' />{item.label}</dt>
          <dd>{item.detail}</dd>
        </div>
      ))}
    </dl>
  )
}

export function OpportunityDetailSelected() {
  const [recordFixture, setRecordFixture] = useState<RecordFixture>('complete')
  const [personState, setPersonState] = useState<PersonState>('creator')
  const [announcement, setAnnouncement] = useState('')
  const fixture = fixtures[recordFixture]

  const actionMessage = useMemo(() => {
    if (personState === 'visitor') return 'Sign-in would open and return you to this opportunity.'
    if (personState === 'creator') return recordFixture === 'closed' ? 'Saved for reference.' : 'Saved to Tracker.'
    if (personState === 'saved') return 'The Tracker record would open.'
    if (personState === 'preparing') return 'Preparation would continue in Tracker.'
    return 'The submitted record would open.'
  }, [personState, recordFixture])

  function handlePrimaryAction() {
    setAnnouncement(actionMessage)
    if (personState === 'creator') setPersonState('saved')
  }

  return (
    <div className={styles.pageShell}>
      <ReviewToolbar
        fixture={recordFixture}
        personState={personState}
        onFixture={(nextFixture) => {
          setRecordFixture(nextFixture)
          setAnnouncement('')
        }}
        onPersonState={(nextState) => {
          setPersonState(nextState)
          setAnnouncement('')
        }}
      />
      <AppHeader />
      <main id='main-content' className={styles.main}>
        <a className={styles.backLink} href='#'>
          <ArrowLeft aria-hidden='true' />Back to 128 opportunities
        </a>

        <article aria-labelledby='opportunity-title'>
          <header className={styles.hero}>
            <IdentityMedia key={recordFixture} fixture={fixture} />
            <div className={styles.heroCopy}>
              <Badge variant='outline'>Open call</Badge>
              <h1 id='opportunity-title'>{fixture.title}</h1>
              <p className={styles.organization}>{fixture.organization}</p>
              <p className={styles.heroSummary}>A source-linked call for poetry and short fiction examining civic life, freedom of expression, and whose stories are heard.</p>
              <div className={styles.heroActions}>
                <PrimaryAction personState={personState} fixture={recordFixture} onAction={handlePrimaryAction} />
                <SourceAction available={fixture.sourceAvailable} />
              </div>
              <p className={styles.announcement} role='status' aria-live='polite'>{announcement}</p>
            </div>
          </header>

          <Notice fixture={fixture} />

          <div className={styles.contentGrid}>
            <aside className={styles.decisionRail} aria-labelledby='decision-facts-title'>
              <p className={styles.kicker}>Decide with</p>
              <h2 id='decision-facts-title'>Key facts</h2>
              <FactList fixture={fixture} />
              <div className={styles.railActions}>
                <SourceAction available={fixture.sourceAvailable} />
              </div>
            </aside>

            <div className={styles.readingColumn}>
              <section aria-labelledby='about-title'>
                <p className={styles.kicker}>The opportunity</p>
                <h2 id='about-title'>Work that asks what writing can change</h2>
                <p className={styles.lede}>PEN America is inviting poetry and short fiction that considers civic life, freedom of expression, and the conditions shaping whose stories are heard.</p>
                <p>Read this summary as orientation, then use the official source for the final rules and submission destination.</p>
              </section>

              <section aria-labelledby='eligibility-title'>
                <p className={styles.sectionNumber}>01 · Decide</p>
                <h2 id='eligibility-title'>Eligibility stated by the Organization</h2>
                <ul className={styles.eligibilityList}>
                  {eligibility.map((item) => <li key={item}><Check aria-hidden='true' />{item}</li>)}
                </ul>
                <p className={styles.boundaryNote}>These are source-backed rules, not a promise that an applicant qualifies.</p>
              </section>

              <section aria-labelledby='prepare-title'>
                <p className={styles.sectionNumber}>02 · Prepare</p>
                <h2 id='prepare-title'>What to prepare</h2>
                <RequirementList />
              </section>

              <section aria-labelledby='practices-title'>
                <p className={styles.sectionNumber}>03 · Understand the call</p>
                <h2 id='practices-title'>Fields named in this call</h2>
                <div className={styles.practiceList}>{practices.map((practice) => <Badge key={practice} variant='secondary'>{practice}</Badge>)}</div>
                <p className={styles.boundaryNote}>Field labels describe the work. They do not decide eligibility.</p>
              </section>

              <section id='official-source' className={styles.sourceSection} aria-labelledby='source-title'>
                <p className={styles.sectionNumber}>04 · Apply</p>
                <h2 id='source-title'>Finish on the official source</h2>
                <p>Missa helps you understand and track the call. The Organization’s page carries the final rules and application destination.</p>
                <div className={styles.sourceSectionActions}>
                  <SourceAction available={fixture.sourceAvailable} />
                  <IssueDialog />
                </div>
              </section>
            </div>
          </div>
        </article>
      </main>
    </div>
  )
}
