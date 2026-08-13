'use client'

import Image from 'next/image'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  ExternalLink,
  FileText,
  Flag,
  Globe2,
  MapPin,
  Menu,
  Tag,
} from 'lucide-react'
import { useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

import { MissaWordmark } from '@/components/missa-wordmark'
import styles from './opportunity-detail-directions.module.css'

type Direction = 'brief' | 'ledger' | 'guided'
type ReviewState = 'complete' | 'partial' | 'conflict' | 'closed'

const directions: Array<{ id: Direction; number: string; title: string; description: string }> = [
  {
    id: 'brief',
    number: '01',
    title: 'Decision brief',
    description: 'Editorial reading with the decisive facts and source action held close.',
  },
  {
    id: 'ledger',
    number: '02',
    title: 'Evidence ledger',
    description: 'A structured fact record for calls with complex rules and exceptions.',
  },
  {
    id: 'guided',
    number: '03',
    title: 'Guided pursuit',
    description: 'A staged Decide → Prepare → Apply path for first-time and mobile users.',
  },
]

const stateCopy: Record<ReviewState, {
  deadline: string
  fee: string
  status: string
  notice?: { title: string; body: string; tone: 'warning' | 'neutral' }
}> = {
  complete: {
    deadline: '31 October 2026',
    fee: 'No fee',
    status: 'Open',
  },
  partial: {
    deadline: '31 October 2026',
    fee: 'Fee not listed',
    status: 'Open · some requirements unknown',
    notice: {
      title: 'Some application details are not listed',
      body: 'The source names the deadline and eligibility, but does not list a fee or complete file requirements. Confirm these on the official page before preparing work.',
      tone: 'neutral',
    },
  },
  conflict: {
    deadline: 'Deadline needs confirmation',
    fee: 'No fee',
    status: 'Open · deadline conflict',
    notice: {
      title: 'The deadline differs across the source pages',
      body: 'The call page says 31 October while the linked guidelines say 1 November. Use the official source and confirm before submitting.',
      tone: 'warning',
    },
  },
  closed: {
    deadline: 'Closed 31 July 2026',
    fee: 'No fee',
    status: 'Closed',
    notice: {
      title: 'This call is closed',
      body: 'The record remains available for reference. The Organization may publish a future edition on its official website.',
      tone: 'neutral',
    },
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

function ReviewBar({ direction, onDirection, state, onState }: {
  direction: Direction
  onDirection: (direction: Direction) => void
  state: ReviewState
  onState: (state: ReviewState) => void
}) {
  return (
    <div className={styles.reviewBar} aria-label='Design review controls'>
      <div className={styles.directionChoices}>
        {directions.map((item) => (
          <button key={item.id} type='button' data-active={direction === item.id} onClick={() => onDirection(item.id)}>
            <span>{item.number}</span>
            {item.title}
          </button>
        ))}
      </div>
      <label>
        <span>Edge state</span>
        <select value={state} onChange={(event) => onState(event.target.value as ReviewState)}>
          <option value='complete'>Complete record</option>
          <option value='partial'>Partial record</option>
          <option value='conflict'>Conflicting facts</option>
          <option value='closed'>Closed call</option>
        </select>
      </label>
    </div>
  )
}

function AppHeader() {
  return (
    <header className={styles.appHeader}>
      <MissaWordmark href='#main-content' size='app' className={styles.wordmark} />
      <nav aria-label='Primary navigation'>
        <a href='#'>Opportunities</a>
        <a href='#'>Tracker</a>
        <a href='#'>Library</a>
        <a href='#'>Guides</a>
        <a href='#'>Organization</a>
      </nav>
      <Button type='button' variant='ghost' size='icon' className={styles.mobileMenu} aria-label='Open navigation'>
        <Menu aria-hidden='true' />
      </Button>
      <span className={styles.avatar} aria-label='Profile'>A</span>
    </header>
  )
}

function BackLink() {
  return (
    <a className={styles.backLink} href='#'>
      <ArrowLeft aria-hidden='true' />
      Back to 4 opportunities
    </a>
  )
}

function Notice({ state }: { state: ReviewState }) {
  const notice = stateCopy[state].notice
  if (!notice) return null

  return (
    <Alert variant={notice.tone === 'warning' ? 'destructive' : 'default'} className={styles.notice}>
      {notice.tone === 'warning' ? <AlertTriangle aria-hidden='true' /> : <CircleHelp aria-hidden='true' />}
      <AlertTitle>{notice.title}</AlertTitle>
      <AlertDescription>{notice.body}</AlertDescription>
    </Alert>
  )
}

function FactSummary({ state, compact = false }: { state: ReviewState; compact?: boolean }) {
  const copy = stateCopy[state]
  const facts = [
    { label: 'Deadline', value: copy.deadline, icon: CalendarDays },
    { label: 'Fee', value: copy.fee, icon: Tag },
    { label: 'Reach', value: 'Worldwide · Online', icon: Globe2 },
    { label: 'Status', value: copy.status, icon: MapPin },
  ]

  return (
    <dl className={compact ? styles.factSummaryCompact : styles.factSummary}>
      {facts.map(({ label, value, icon: Icon }) => (
        <div key={label}>
          <dt><Icon aria-hidden='true' />{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function SaveAction({ state, saved, onSave }: { state: ReviewState; saved: boolean; onSave: () => void }) {
  return (
    <Button type='button' onClick={onSave} variant={saved ? 'secondary' : 'default'} className={styles.saveAction}>
      {saved ? <Check aria-hidden='true' /> : <Bookmark aria-hidden='true' />}
      {saved ? 'In Tracker' : state === 'closed' ? 'Save for reference' : 'Save to Tracker'}
    </Button>
  )
}

function SourceActions() {
  return (
    <div className={styles.sourceActions}>
      <Button nativeButton={false} render={<a href='#official-source' />}>
        Read official guidelines <ArrowUpRight aria-hidden='true' />
      </Button>
      <button type='button'><Flag aria-hidden='true' />Report an issue</button>
    </div>
  )
}

function HeroIdentity({ large = false }: { large?: boolean }) {
  return (
    <div className={large ? styles.heroImageLarge : styles.heroImage}>
      <Image
        src='/media/home/artist-at-work.webp'
        alt='A writer working at a desk'
        fill
        sizes={large ? '(min-width: 1024px) 42vw, 100vw' : '(min-width: 1024px) 360px, 100vw'}
        className={styles.image}
        priority
      />
    </div>
  )
}

function OpportunityHeading({ level = 'h1' }: { level?: 'h1' | 'h2' }) {
  const Heading = level
  return (
    <div className={styles.headingBlock}>
      <Badge variant='outline'>Open call</Badge>
      <Heading>PEN America Open Call — Writing for Change</Heading>
      <p>PEN America</p>
    </div>
  )
}

function EditorialSections({ state }: { state: ReviewState }) {
  return (
    <div className={styles.editorialSections}>
      <section>
        <p className={styles.kicker}>The opportunity</p>
        <h2>Work that asks what writing can change</h2>
        <p className={styles.lede}>PEN America is inviting poetry and short fiction that examines civic life, freedom of expression, and the conditions that shape whose stories are heard.</p>
      </section>
      <Notice state={state} />
      <section>
        <h2>Eligibility</h2>
        <ul>{eligibility.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
      <section>
        <h2>What to prepare</h2>
        <div className={styles.requirementList}>
          {requirements.map((item) => (
            <div key={item.label}>
              <FileText aria-hidden='true' />
              <span><strong>{item.label}</strong><small>{item.detail}</small></span>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2>Fields named in this call</h2>
        <div className={styles.practiceList}>{practices.map((practice) => <Badge key={practice} variant='secondary'>{practice}</Badge>)}</div>
      </section>
    </div>
  )
}

function DecisionBrief({ state, saved, onSave }: { state: ReviewState; saved: boolean; onSave: () => void }) {
  return (
    <main id='main-content' className={styles.briefPage}>
      <BackLink />
      <div className={styles.briefHero}>
        <HeroIdentity large />
        <div className={styles.briefIntro}>
          <OpportunityHeading />
          <FactSummary state={state} compact />
          <div className={styles.heroActions}>
            <SaveAction state={state} saved={saved} onSave={onSave} />
            <a href='#official-source'>Official source <ExternalLink aria-hidden='true' /></a>
          </div>
        </div>
      </div>
      <div className={styles.readingGrid}>
        <EditorialSections state={state} />
        <aside className={styles.decisionRail}>
          <p className={styles.kicker}>Decide with</p>
          <FactSummary state={state} />
          <SourceActions />
        </aside>
      </div>
    </main>
  )
}

function LedgerRow({ label, value, note, warning = false }: { label: string; value: string; note?: string; warning?: boolean }) {
  return (
    <div className={styles.ledgerRow} data-warning={warning || undefined}>
      <dt>{label}</dt>
      <dd>
        <strong>{value}</strong>
        {note ? <small>{note}</small> : null}
      </dd>
    </div>
  )
}

function EvidenceLedger({ state, saved, onSave }: { state: ReviewState; saved: boolean; onSave: () => void }) {
  const copy = stateCopy[state]
  return (
    <main id='main-content' className={styles.ledgerPage}>
      <BackLink />
      <div className={styles.ledgerHeader}>
        <div>
          <OpportunityHeading />
          <p className={styles.ledgerSummary}>A source-linked record of the call’s decisive rules, requirements, and open questions.</p>
        </div>
        <HeroIdentity />
      </div>
      <Notice state={state} />
      <div className={styles.ledgerGrid}>
        <div className={styles.ledgerMain}>
          <section>
            <div className={styles.sectionHeading}><span>01</span><h2>Decision facts</h2></div>
            <dl className={styles.ledgerList}>
              <LedgerRow label='Deadline' value={copy.deadline} warning={state === 'conflict'} note={state === 'conflict' ? 'Confirm on the official page before submitting.' : undefined} />
              <LedgerRow label='Application fee' value={copy.fee} warning={state === 'partial'} />
              <LedgerRow label='Eligible reach' value='Worldwide' note='Applications are submitted online.' />
              <LedgerRow label='Opportunity status' value={copy.status} />
            </dl>
          </section>
          <section>
            <div className={styles.sectionHeading}><span>02</span><h2>Eligibility</h2></div>
            <dl className={styles.ledgerList}>
              {eligibility.map((item, index) => <LedgerRow key={item} label={`Rule ${index + 1}`} value={item} />)}
            </dl>
          </section>
          <section>
            <div className={styles.sectionHeading}><span>03</span><h2>Required materials</h2></div>
            <dl className={styles.ledgerList}>
              {requirements.map((item) => <LedgerRow key={item.label} label={item.label} value={item.detail} />)}
            </dl>
          </section>
        </div>
        <aside className={styles.ledgerRail}>
          <Card className={styles.actionCard}>
            <p className={styles.kicker}>Your next action</p>
            <SaveAction state={state} saved={saved} onSave={onSave} />
            <SourceActions />
          </Card>
          <Card className={styles.taxonomyCard}>
            <p className={styles.kicker}>Named fields</p>
            <div className={styles.practiceList}>{practices.map((practice) => <Badge key={practice} variant='outline'>{practice}</Badge>)}</div>
            <p>Field labels describe the work. They do not imply eligibility.</p>
          </Card>
        </aside>
      </div>
    </main>
  )
}

function GuidedSection({ number, title, description, children }: { number: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className={styles.guidedSection}>
      <div className={styles.guidedNumber}>{number}</div>
      <div className={styles.guidedContent}>
        <div className={styles.guidedHeading}>
          <div><p className={styles.kicker}>{title}</p><h2>{description}</h2></div>
        </div>
        {children}
      </div>
    </section>
  )
}

function GuidedPursuit({ state, saved, onSave }: { state: ReviewState; saved: boolean; onSave: () => void }) {
  return (
    <main id='main-content' className={styles.guidedPage}>
      <BackLink />
      <div className={styles.guidedHero}>
        <div>
          <OpportunityHeading />
          <p className={styles.guidedIntro}>Move through the decision in order. Nothing below claims that you qualify; the official source remains the final reference.</p>
        </div>
        <HeroIdentity />
      </div>
      <Notice state={state} />
      <nav className={styles.chapterNav} aria-label='Opportunity sections'>
        <a href='#decide'><span>01</span>Decide</a>
        <a href='#prepare'><span>02</span>Prepare</a>
        <a href='#apply'><span>03</span>Apply</a>
      </nav>
      <div id='decide'>
        <GuidedSection number='01' title='Decide' description='Is this call worth your time?'>
          <FactSummary state={state} />
          <div className={styles.guidedEligibility}>
            <h3>Eligibility stated by the Organization</h3>
            <ul>{eligibility.map((item) => <li key={item}><Check aria-hidden='true' />{item}</li>)}</ul>
          </div>
        </GuidedSection>
      </div>
      <div id='prepare'>
        <GuidedSection number='02' title='Prepare' description='What will you need to assemble?'>
          <div className={styles.prepareCards}>
            {requirements.map((item, index) => (
              <Card key={item.label} className={styles.prepareCard}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div><h3>{item.label}</h3><p>{item.detail}</p></div>
                <ChevronRight aria-hidden='true' />
              </Card>
            ))}
          </div>
        </GuidedSection>
      </div>
      <div id='apply'>
        <GuidedSection number='03' title='Apply' description='Keep Missa and the official source in their proper roles.'>
          <div className={styles.applyPanel}>
            <div>
              <h3>Save the call before you leave Missa</h3>
              <p>Tracker keeps your preparation state. The Organization’s official page carries the final rules and submission destination.</p>
            </div>
            <div className={styles.applyActions}>
              <SaveAction state={state} saved={saved} onSave={onSave} />
              <Button nativeButton={false} variant='outline' render={<a href='#official-source' />}>
                Official source <ExternalLink aria-hidden='true' />
              </Button>
            </div>
          </div>
        </GuidedSection>
      </div>
      <button type='button' className={styles.reportButton}><Flag aria-hidden='true' />Report an issue with this record</button>
    </main>
  )
}

export function OpportunityDetailDirections() {
  const [direction, setDirection] = useState<Direction>('brief')
  const [state, setState] = useState<ReviewState>('complete')
  const [saved, setSaved] = useState(false)

  return (
    <div className={styles.pageShell}>
      <ReviewBar direction={direction} onDirection={setDirection} state={state} onState={setState} />
      <AppHeader />
      <section className={styles.directionIntro} aria-live='polite'>
        <span>{directions.find((item) => item.id === direction)?.number}</span>
        <div>
          <p>Opportunity detail direction</p>
          <h1>{directions.find((item) => item.id === direction)?.title}</h1>
          <p>{directions.find((item) => item.id === direction)?.description}</p>
        </div>
      </section>
      {direction === 'brief' ? <DecisionBrief state={state} saved={saved} onSave={() => setSaved((value) => !value)} /> : null}
      {direction === 'ledger' ? <EvidenceLedger state={state} saved={saved} onSave={() => setSaved((value) => !value)} /> : null}
      {direction === 'guided' ? <GuidedPursuit state={state} saved={saved} onSave={() => setSaved((value) => !value)} /> : null}
    </div>
  )
}
