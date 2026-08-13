'use client'

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  FileCheck2,
  FileText,
  FolderOpen,
  Info,
  LoaderCircle,
  LockKeyhole,
  MoreHorizontal,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  WifiOff,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'

import { MissaWordmark } from '@/components/missa-wordmark'
import styles from './hosted-application-directions.module.css'

type Direction = 'guided' | 'desk' | 'packet'
type Section = 'readiness' | 'works' | 'questions' | 'review'
type Fixture =
  | 'new'
  | 'signed-out'
  | 'resumed'
  | 'offline'
  | 'conflict'
  | 'expiring'
  | 'expired'
  | 'form-changed'
  | 'rolling'
  | 'unknown-deadline'
  | 'deadline-conflict'
  | 'closed'
  | 'no-fee'
  | 'paid'
  | 'payment-cancelled'
  | 'payment-processing'
  | 'paid-pending'
  | 'waiver'
  | 'unsupported-currency'
  | 'one-work'
  | 'multiple-works'
  | 'work-limit'
  | 'uploading'
  | 'file-rejected'
  | 'scan-unavailable'
  | 'field-error'
  | 'long-form'
  | 'no-questions'
  | 'required-practice'
  | 'preferred-practice'
  | 'excluded-practice'
  | 'taxonomy-unresolved'
  | 'duplicate-submit'
  | 'ambiguous-submit'
  | 'submitted'
  | 'load-error'
  | 'unicode'

type DraftTone = 'saved' | 'saving' | 'offline' | 'attention' | 'danger'
type Scenario = {
  title: string
  organization: string
  deadline: string
  fee: string
  actionFee?: string
  signedIn: boolean
  workCount: number
  questionCount: number
  draftLabel: string
  draftTone: DraftTone
  notice?: { tone: 'info' | 'warning' | 'danger'; title: string; body: string }
  practiceRule: { kind: 'accepted' | 'preferred' | 'required' | 'excluded' | 'unresolved'; label: string; detail: string }
  upload: 'ready' | 'uploading' | 'rejected' | 'checking' | 'failed'
  closed?: boolean
  submitted?: boolean
  paymentState?: 'cancelled' | 'processing' | 'paid-pending' | 'waiver' | 'unsupported'
  loadError?: boolean
}

const directions = [
  { id: 'guided' as const, number: '01', name: 'Guided steps', description: 'One calm section at a time with prominent progress.' },
  { id: 'desk' as const, number: '02', name: 'Application desk', description: 'Section ledger, focused editor, and live Opportunity context.' },
  { id: 'packet' as const, number: '03', name: 'Packet builder', description: 'Works and requirements lead as one visible submission packet.' },
]

const sections: Array<{ id: Section; label: string; helper: string }> = [
  { id: 'readiness', label: 'Readiness', helper: 'Requirements and eligibility' },
  { id: 'works', label: 'Works', helper: 'Portfolio and files' },
  { id: 'questions', label: 'Questions', helper: 'Organization questions' },
  { id: 'review', label: 'Review', helper: 'Check and submit' },
]

const fixtureOptions: Array<{ value: Fixture; label: string }> = [
  { value: 'new', label: 'New application' },
  { value: 'signed-out', label: 'Signed out with return path' },
  { value: 'resumed', label: 'Resumed saved draft' },
  { value: 'offline', label: 'Offline changes waiting' },
  { value: 'conflict', label: 'Draft conflict between devices' },
  { value: 'expiring', label: 'Draft expires soon' },
  { value: 'expired', label: 'Draft expired' },
  { value: 'form-changed', label: 'Published form changed' },
  { value: 'rolling', label: 'Rolling deadline' },
  { value: 'unknown-deadline', label: 'Deadline not published' },
  { value: 'deadline-conflict', label: 'Deadline needs confirmation' },
  { value: 'closed', label: 'Opportunity closed while editing' },
  { value: 'no-fee', label: 'No application fee' },
  { value: 'paid', label: '$25 application fee' },
  { value: 'payment-cancelled', label: 'Payment cancelled' },
  { value: 'payment-processing', label: 'Payment processing' },
  { value: 'paid-pending', label: 'Paid, submission pending' },
  { value: 'waiver', label: 'Fee waiver applied' },
  { value: 'unsupported-currency', label: 'Unsupported currency' },
  { value: 'one-work', label: 'One Work required' },
  { value: 'multiple-works', label: 'Three Works included' },
  { value: 'work-limit', label: 'Maximum Work count reached' },
  { value: 'uploading', label: 'File uploading' },
  { value: 'file-rejected', label: 'File rejected' },
  { value: 'scan-unavailable', label: 'File check unavailable' },
  { value: 'field-error', label: 'Question validation errors' },
  { value: 'long-form', label: 'Long application form' },
  { value: 'no-questions', label: 'No Organization questions' },
  { value: 'required-practice', label: 'Required field rule' },
  { value: 'preferred-practice', label: 'Preferred field rule' },
  { value: 'excluded-practice', label: 'Excluded field rule' },
  { value: 'taxonomy-unresolved', label: 'Field label unresolved' },
  { value: 'duplicate-submit', label: 'Duplicate submit protected' },
  { value: 'ambiguous-submit', label: 'Submission result being checked' },
  { value: 'submitted', label: 'Successful receipt' },
  { value: 'load-error', label: 'Recoverable page failure' },
  { value: 'unicode', label: 'Unicode names and answers' },
]

function scenarioFor(fixture: Fixture): Scenario {
  const base: Scenario = {
    title: 'Open Studio Fellowship 2027',
    organization: 'Missa Arts Foundation',
    deadline: '14 September 2026 · 11:59 PM PT',
    fee: '$25 application fee',
    actionFee: '$25',
    signedIn: true,
    workCount: 1,
    questionCount: 4,
    draftLabel: 'Saved to Missa · just now',
    draftTone: 'saved',
    practiceRule: { kind: 'accepted', label: 'Visual arts and installation', detail: 'Accepted fields for this Opportunity.' },
    upload: 'ready',
  }
  if (fixture === 'signed-out') return { ...base, signedIn: false, draftLabel: 'Sign in to begin', draftTone: 'attention', notice: { tone: 'info', title: 'Your place will be preserved', body: 'After signing in, you will return to this Opportunity. A private draft starts only when you begin.' } }
  if (fixture === 'resumed') return { ...base, workCount: 2, draftLabel: 'Saved to Missa · 7 August at 9:42 PM', draftTone: 'saved', notice: { tone: 'info', title: 'Welcome back', body: 'Your private draft and two Works were restored from Missa.' } }
  if (fixture === 'offline') return { ...base, draftLabel: 'Offline changes waiting', draftTone: 'offline', notice: { tone: 'warning', title: 'You are offline', body: 'Keep this tab open. Your changes will be saved to Missa when your connection returns.' } }
  if (fixture === 'conflict') return { ...base, draftLabel: 'Draft conflict needs review', draftTone: 'attention', notice: { tone: 'warning', title: 'This draft changed on another device', body: 'Compare both versions before continuing. Neither recoverable version has been discarded.' } }
  if (fixture === 'expiring') return { ...base, draftLabel: 'Saved · expires 12 August 2026', draftTone: 'attention', notice: { tone: 'warning', title: 'This draft expires in four days', body: 'Open and save it before 12 August to preserve your work.' } }
  if (fixture === 'expired') return { ...base, workCount: 0, draftLabel: 'Draft expired 7 August 2026', draftTone: 'danger', notice: { tone: 'danger', title: 'This draft has expired', body: 'The Organization form is still open. Start a new draft or contact support if you need help recovering your answers.' } }
  if (fixture === 'form-changed') return { ...base, draftLabel: 'Review form changes', draftTone: 'attention', notice: { tone: 'warning', title: 'The Organization changed this form', body: 'One question was added and one file requirement changed. Review the differences before accepting the new version.' } }
  if (fixture === 'rolling') return { ...base, deadline: 'Rolling · reviewed monthly' }
  if (fixture === 'unknown-deadline') return { ...base, deadline: 'Deadline not published', notice: { tone: 'warning', title: 'Deadline not published', body: 'Confirm timing in the official guidelines before preparing a submission.' } }
  if (fixture === 'deadline-conflict') return { ...base, deadline: 'Deadline needs confirmation', notice: { tone: 'warning', title: 'Deadline needs confirmation', body: 'The published details do not agree. Read the Organization guidelines before continuing.' } }
  if (fixture === 'closed') return { ...base, closed: true, draftLabel: 'Draft retained', draftTone: 'attention', notice: { tone: 'danger', title: 'This Opportunity has closed', body: 'You can review your retained draft, but Missa cannot accept a new submission.' } }
  if (fixture === 'no-fee') return { ...base, fee: 'No application fee', actionFee: undefined }
  if (fixture === 'payment-cancelled') return { ...base, paymentState: 'cancelled', notice: { tone: 'warning', title: 'Payment was cancelled', body: 'Your draft is intact. Review the fee and try again when you are ready.' } }
  if (fixture === 'payment-processing') return { ...base, paymentState: 'processing', draftLabel: 'Payment is processing', draftTone: 'attention', notice: { tone: 'info', title: 'Payment is processing', body: 'Do not pay again. We will continue once the payment provider confirms the result.' } }
  if (fixture === 'paid-pending') return { ...base, paymentState: 'paid-pending', draftLabel: 'Payment received · creating receipt', draftTone: 'attention', notice: { tone: 'info', title: 'Payment received', body: 'We are confirming the durable submission. Do not submit or pay again.' } }
  if (fixture === 'waiver') return { ...base, fee: 'Fee waived', actionFee: undefined, paymentState: 'waiver' }
  if (fixture === 'unsupported-currency') return { ...base, fee: '€25 application fee', actionFee: '€25', paymentState: 'unsupported', notice: { tone: 'danger', title: 'This currency is not supported yet', body: 'The application remains a draft. Contact the Organization before the deadline.' } }
  if (fixture === 'multiple-works') return { ...base, workCount: 3 }
  if (fixture === 'work-limit') return { ...base, workCount: 5, notice: { tone: 'info', title: 'Maximum reached', body: 'This Opportunity accepts up to five Works. Remove one before adding another.' } }
  if (fixture === 'uploading') return { ...base, upload: 'uploading', draftLabel: 'Uploading before save', draftTone: 'saving' }
  if (fixture === 'file-rejected') return { ...base, upload: 'rejected', notice: { tone: 'danger', title: 'One file was not accepted', body: 'project-source.exe is not an accepted format. Your ready files are unchanged.' } }
  if (fixture === 'scan-unavailable') return { ...base, upload: 'failed', notice: { tone: 'warning', title: 'File check unavailable', body: 'The file was not attached. Retry when the checking service is available.' } }
  if (fixture === 'field-error') return { ...base, notice: { tone: 'danger', title: 'Two answers need attention', body: 'Use the links in Review to return to each question.' } }
  if (fixture === 'long-form') return { ...base, questionCount: 18 }
  if (fixture === 'no-questions') return { ...base, questionCount: 0 }
  if (fixture === 'required-practice') return { ...base, practiceRule: { kind: 'required', label: 'Installation', detail: 'At least one submitted Work must use this field.' } }
  if (fixture === 'preferred-practice') return { ...base, practiceRule: { kind: 'preferred', label: 'Public work', detail: 'Preferred, but not required for eligibility.' } }
  if (fixture === 'excluded-practice') return { ...base, practiceRule: { kind: 'excluded', label: 'Commercial advertising', detail: 'The Organization says this program cannot support commercial advertising projects.' }, notice: { tone: 'warning', title: 'Review an excluded field', body: 'Missa will not decide eligibility for you. Read the Organization explanation and confirm your submission does not rely on the excluded field.' } }
  if (fixture === 'taxonomy-unresolved') return { ...base, practiceRule: { kind: 'unresolved', label: 'Organization label not mapped', detail: 'Read the original wording in the guidelines; Missa has not silently assigned a field.' } }
  if (fixture === 'duplicate-submit') return { ...base, draftLabel: 'Submission already received', draftTone: 'saved', notice: { tone: 'info', title: 'We already received this application', body: 'The repeated action was safely ignored. Open the existing receipt in Tracker.' } }
  if (fixture === 'ambiguous-submit') return { ...base, draftLabel: 'Checking submission', draftTone: 'attention', notice: { tone: 'info', title: 'Checking whether your submission was received', body: 'Do not submit or pay again. This page will open the receipt when confirmation arrives.' } }
  if (fixture === 'submitted') return { ...base, submitted: true, draftLabel: 'Submitted', draftTone: 'saved' }
  if (fixture === 'load-error') return { ...base, loadError: true }
  if (fixture === 'unicode') return { ...base, title: 'Àjọṣe Studio Fellowship — برنامج الفنانين 2027', organization: 'Àjọṣe Arts · مؤسسة الفنون المشتركة', practiceRule: { kind: 'accepted', label: 'Ìṣẹ̀dá àwòrán · الفنون البصرية', detail: 'Accepted fields for this Opportunity.' } }
  return base
}

function StatusIcon({ tone }: { tone: DraftTone }) {
  if (tone === 'saving') return <LoaderCircle className={styles.spin} aria-hidden='true' />
  if (tone === 'offline') return <WifiOff aria-hidden='true' />
  if (tone === 'attention') return <AlertCircle aria-hidden='true' />
  if (tone === 'danger') return <AlertCircle aria-hidden='true' />
  return <CheckCircle2 aria-hidden='true' />
}

function Notice({ notice }: { notice: Scenario['notice'] }) {
  if (!notice) return null
  return (
    <Alert className={`${styles.notice} ${styles[notice.tone]}`} variant={notice.tone === 'danger' ? 'destructive' : 'default'}>
      {notice.tone === 'info' ? <Info /> : <AlertCircle />}
      <AlertTitle>{notice.title}</AlertTitle>
      <AlertDescription>{notice.body}</AlertDescription>
    </Alert>
  )
}

function WorkCard({ index, upload, removable }: { index: number; upload: Scenario['upload']; removable: boolean }) {
  const filename = index === 0 ? 'river-forms-portfolio.pdf' : `study-${String(index + 1).padStart(2, '0')}.pdf`
  return (
    <article className={styles.workCard}>
      <div className={styles.workHeading}>
        <span className={styles.workIndex}>{String(index + 1).padStart(2, '0')}</span>
        <div>
          <h4>{index === 0 ? 'River Forms' : `Studio Study ${index + 1}`}</h4>
          <p>Submission snapshot · Library source</p>
        </div>
        <Button variant='ghost' size='icon' aria-label={`More actions for Work ${index + 1}`}><MoreHorizontal /></Button>
      </div>
      <div className={`${styles.fileRow} ${upload === 'rejected' || upload === 'failed' ? styles.fileError : ''}`}>
        {upload === 'uploading' ? <LoaderCircle className={styles.spin} /> : upload === 'ready' ? <FileCheck2 /> : <AlertCircle />}
        <div>
          <strong>{upload === 'rejected' ? 'project-source.exe' : filename}</strong>
          <span>{upload === 'uploading' ? 'Uploading · 61%' : upload === 'checking' ? 'Checking file' : upload === 'failed' ? 'Could not check file' : upload === 'rejected' ? 'Format not accepted' : 'PDF · 8.4 MB · Ready'}</span>
        </div>
        {upload === 'uploading' ? <Button variant='ghost' size='sm'>Cancel</Button> : upload === 'rejected' || upload === 'failed' ? <Button variant='outline' size='sm'><RefreshCw /> Retry</Button> : <Button variant='ghost' size='sm'>Replace</Button>}
      </div>
      {upload === 'uploading' ? <Progress value={61} aria-label={`${filename} upload progress, 61 percent`} /> : null}
      <div className={styles.workActions}>
        <Button variant='outline' size='sm'>Edit Work</Button>
        <Button variant='ghost' size='sm' disabled={!removable}><Trash2 /> Remove</Button>
      </div>
    </article>
  )
}

function HostedApplicationExperience({ selectedOnly }: { selectedOnly: boolean }) {
  const [direction, setDirection] = useState<Direction>('desk')
  const [fixture, setFixture] = useState<Fixture>('new')
  const [section, setSection] = useState<Section>('readiness')
  const [saved, setSaved] = useState(true)
  const [uploadOverride, setUploadOverride] = useState<Scenario['upload'] | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const screenRef = useRef<HTMLDivElement>(null)
  const scenario = useMemo(() => scenarioFor(fixture), [fixture])
  const activeDirection: Direction = selectedOnly ? 'desk' : direction
  const currentUpload = uploadOverride ?? scenario.upload
  const activeIndex = sections.findIndex(item => item.id === section)
  const effectiveSubmitted = submitted || scenario.submitted

  function chooseFixture(value: Fixture) {
    setFixture(value)
    setSection(value === 'submitted' ? 'review' : 'readiness')
    setSaved(true)
    setUploadOverride(null)
    setSubmitted(false)
  }

  function navigate(next: Section) {
    setSection(next)
    requestAnimationFrame(() => screenRef.current?.focus())
  }

  function continueSection() {
    const next = sections[Math.min(activeIndex + 1, sections.length - 1)]
    navigate(next.id)
  }

  function simulateUpload() {
    setUploadOverride('uploading')
    window.setTimeout(() => {
      setUploadOverride('ready')
      setSaved(false)
    }, 700)
  }

  if (effectiveSubmitted) {
    return (
      <main className={styles.page}>
        <div className={styles.receipt}>
          <div className={styles.receiptMark}><Check /></div>
          <p className={styles.eyebrow}>Submission receipt</p>
          <h1>Application received</h1>
          <p>Your application to <strong>{scenario.title}</strong> was received by {scenario.organization} on 8 August 2026 at 7:18 PM PT.</p>
          <dl>
            <div><dt>Receipt</dt><dd>MSA-2704-0186</dd></div>
            <div><dt>Works</dt><dd>{scenario.workCount || 1}</dd></div>
            <div><dt>Application fee</dt><dd>{scenario.fee}</dd></div>
            <div><dt>Status</dt><dd><Badge variant='outline'>Submitted</Badge></dd></div>
          </dl>
          <Alert className={`${styles.notice} ${styles.info}`}>
            <LockKeyhole />
            <AlertTitle>This receipt reflects the submitted packet</AlertTitle>
            <AlertDescription>Later changes to a Library Work will not change what the Organization received.</AlertDescription>
          </Alert>
          <div className={styles.receiptActions}>
            <Button>Open in Tracker <ArrowRight /></Button>
            <Button variant='outline' onClick={() => { setSubmitted(false); chooseFixture('new') }}>Return to Opportunity</Button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <header className={styles.reviewHeader}>
        <div>
          <p className={styles.eyebrow}>Local component library · product untouched</p>
          <h1>{selectedOnly ? 'Hosted application · Application desk' : 'Hosted application directions'}</h1>
          <p>{selectedOnly ? 'The selected application composition, retained locally for page-by-page review.' : 'Three responsive web compositions for reading requirements, building a private packet, reviewing, paying, and receiving a durable submission receipt.'}</p>
        </div>
        <Badge variant='outline'>Selected · 02</Badge>
      </header>

      <section className={styles.directionChooser} aria-labelledby='direction-heading'>
        <div className={styles.chooserHeading}>
          <div>
            <p className={styles.eyebrow}>{selectedOnly ? 'Selected composition' : 'Visual system'}</p>
            <h2 id='direction-heading'>{selectedOnly ? '02 · Application desk' : 'Compare the same application weather'}</h2>
          </div>
          <label className={styles.fixtureControl}>
            Test fixture
            <select value={fixture} onChange={event => chooseFixture(event.target.value as Fixture)}>
              {fixtureOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
        {selectedOnly ? null : <div className={styles.directionOptions}>
          {directions.map(option => (
            <button key={option.id} type='button' className={styles.directionOption} data-selected={activeDirection === option.id} onClick={() => setDirection(option.id)} aria-pressed={activeDirection === option.id}>
              <span>{option.number}</span>
              <div><b>{option.name}</b><p>{option.description}</p></div>
              {activeDirection === option.id ? <CheckCircle2 /> : <ChevronRight />}
            </button>
          ))}
        </div>}
      </section>

      <div ref={screenRef} className={`${styles.screen} ${styles[activeDirection]}`} tabIndex={-1}>
        <div className={styles.productBar}>
          <MissaWordmark href='#missa' size='app' className={styles.wordmark} />
          <nav aria-label='Primary'><a href='#opportunities'>Opportunities</a><a href='#tracker'>Tracker</a><a href='#library'>Library</a></nav>
          <Button variant='outline' size='sm'>Profile</Button>
        </div>

        {scenario.loadError ? (
          <section className={styles.loadError}>
            <AlertCircle />
            <p className={styles.eyebrow}>Application unavailable</p>
            <h2>We could not open this application</h2>
            <p>Your saved draft was not changed. Check your connection and try again.</p>
            <Button><RefreshCw /> Try again</Button>
          </section>
        ) : (
          <>
            <header className={styles.opportunityHeader}>
              <Button variant='ghost' size='sm'><ArrowLeft /> Opportunity</Button>
              <div>
                <p>{scenario.organization}</p>
                <h2>{scenario.title}</h2>
              </div>
              <div className={`${styles.draftStatus} ${styles[scenario.draftTone]}`} role='status' aria-live='polite'>
                <StatusIcon tone={saved ? scenario.draftTone : 'saving'} />
                <span>{saved ? scenario.draftLabel : 'Changes not yet saved'}</span>
              </div>
            </header>

            {scenario.notice ? <div className={styles.noticeWrap}><Notice notice={scenario.notice} /></div> : null}

            {!scenario.signedIn ? (
              <section className={styles.authGate}>
                <LockKeyhole />
                <p className={styles.eyebrow}>Private application</p>
                <h3>Sign in to begin</h3>
                <p>Reading this Opportunity is public. Your answers and files become a private Missa draft only after you start.</p>
                <Button>Sign in and return here <ArrowRight /></Button>
                <Button variant='ghost'>Create a Profile</Button>
              </section>
            ) : (
              <div className={styles.applicationGrid}>
                <aside className={styles.sectionRail} aria-label='Application sections'>
                  <p className={styles.railLabel}>Application</p>
                  {sections.map((item, index) => {
                    const complete = index < activeIndex
                    return (
                      <button key={item.id} type='button' onClick={() => navigate(item.id)} data-current={section === item.id}>
                        <span className={styles.stepMark}>{complete ? <Check /> : index + 1}</span>
                        <span><strong>{item.label}</strong><small>{item.helper}</small></span>
                      </button>
                    )
                  })}
                  <Button variant='ghost' size='sm' onClick={() => setSaved(true)}><Save /> Save now</Button>
                </aside>

                <section className={styles.editor} aria-labelledby='section-title'>
                  <div className={styles.mobileSectionControl}>
                    <Label htmlFor='application-section'>Application section</Label>
                    <select id='application-section' value={section} onChange={event => navigate(event.target.value as Section)}>
                      {sections.map((item, index) => <option key={item.id} value={item.id}>{index + 1}. {item.label}</option>)}
                    </select>
                  </div>

                  {section === 'readiness' ? (
                    <div className={styles.editorSection}>
                      <div className={styles.sectionTitle}>
                        <div><p className={styles.eyebrow}>01 · Before you begin</p><h3 id='section-title'>Check your readiness</h3><p>These are the Organization’s stated requirements. Missa does not decide your eligibility.</p></div>
                        <Badge variant='outline'>About 12 minutes</Badge>
                      </div>
                      <div className={styles.factGrid}>
                        <div><CalendarClock /><span>Deadline<strong>{scenario.deadline}</strong></span></div>
                        <div><CircleDollarSign /><span>Fee<strong>{scenario.fee}</strong></span></div>
                        <div><BriefcaseBusiness /><span>Works<strong>1–5 Works</strong></span></div>
                        <div><Clock3 /><span>Route<strong>Hosted on Missa</strong></span></div>
                      </div>
                      <Card className={styles.requirementCard}>
                        <CardHeader><CardTitle>Field requirement</CardTitle><CardDescription>Field rules are separate from geography, career stage, and fee.</CardDescription></CardHeader>
                        <CardContent>
                          <div className={`${styles.practiceRule} ${styles[scenario.practiceRule.kind]}`}>
                            <Badge variant='outline'>{scenario.practiceRule.kind}</Badge>
                            <div><strong>{scenario.practiceRule.label}</strong><p>{scenario.practiceRule.detail}</p></div>
                          </div>
                        </CardContent>
                      </Card>
                      <fieldset className={styles.checklist}>
                        <legend>Confirm before continuing</legend>
                        <label><Checkbox defaultChecked /> <span>I have read the official guidelines and deadline timezone.</span></label>
                        <label><Checkbox /> <span>I understand the Organization’s eligibility statements and will answer them accurately.</span></label>
                        <label><Checkbox /> <span>I can provide at least one eligible Work in an accepted format.</span></label>
                      </fieldset>
                    </div>
                  ) : null}

                  {section === 'works' ? (
                    <div className={styles.editorSection}>
                      <div className={styles.sectionTitle}>
                        <div><p className={styles.eyebrow}>02 · Submission packet</p><h3 id='section-title'>Choose your Works</h3><p>Add 1–5 Works. Each becomes a fixed snapshot when you submit.</p></div>
                        <Button variant='outline'><FolderOpen /> Choose from Library</Button>
                      </div>
                      <div className={styles.workList}>
                        {Array.from({ length: Math.max(scenario.workCount, 1) }, (_, index) => <WorkCard key={index} index={index} upload={index === 0 ? currentUpload : 'ready'} removable={scenario.workCount > 1} />)}
                      </div>
                      <div className={styles.dropzone}>
                        <Upload />
                        <div><strong>Add a file to this application</strong><p>PDF, JPG, PNG, MP4, or MP3 · up to 25 MB per file</p></div>
                        <Button variant='outline' onClick={simulateUpload}>Choose file</Button>
                      </div>
                      <Button disabled={scenario.workCount >= 5}>Add another Work</Button>
                    </div>
                  ) : null}

                  {section === 'questions' ? (
                    <div className={styles.editorSection}>
                      <div className={styles.sectionTitle}>
                        <div><p className={styles.eyebrow}>03 · Organization questions</p><h3 id='section-title'>Tell the Organization about this proposal</h3><p>Your answers remain private until you submit.</p></div>
                        <Badge variant='outline'>{scenario.questionCount} questions</Badge>
                      </div>
                      {scenario.questionCount === 0 ? (
                        <div className={styles.emptyQuestions}><FileText /><h4>No additional questions</h4><p>This Organization only requires your Works and readiness confirmations.</p></div>
                      ) : (
                        <form className={styles.questionForm} onChange={() => setSaved(false)}>
                          {fixture === 'field-error' ? (
                            <Alert variant='destructive' className={`${styles.notice} ${styles.danger}`}>
                              <AlertCircle /><AlertTitle>Two answers need attention</AlertTitle><AlertDescription><a href='#proposal-summary'>Proposal summary</a> and <a href='#website'>Project website</a>.</AlertDescription>
                            </Alert>
                          ) : null}
                          <div className={styles.fieldGroup}>
                            <Label htmlFor='proposal-summary'>Proposal summary <span>Required</span></Label>
                            <p id='proposal-summary-help'>Describe the work you plan to develop. 600 characters maximum.</p>
                            <Textarea id='proposal-summary' aria-describedby='proposal-summary-help proposal-summary-error' aria-invalid={fixture === 'field-error'} defaultValue={fixture === 'unicode' ? 'Àwọn ohun tí omi ń kọ sí ilẹ̀—حول الذاكرة والمكان.' : 'River Forms studies memory, movement, and repair through a new installation made from sound, paper, and projected light.'} />
                            <div className={styles.fieldMeta}><span id='proposal-summary-error'>{fixture === 'field-error' ? 'Add at least 80 characters.' : 'Visible to the Organization after submission.'}</span><span>118 / 600</span></div>
                          </div>
                          <div className={styles.fieldGroup}>
                            <Label htmlFor='website'>Project website <span>Optional</span></Label>
                            <p id='website-help'>Use a full public URL. Do not include a password here.</p>
                            <Input id='website' type='url' aria-describedby='website-help website-error' aria-invalid={fixture === 'field-error'} defaultValue={fixture === 'field-error' ? 'river forms' : 'https://example.com/river-forms'} />
                            <span id='website-error' className={fixture === 'field-error' ? styles.errorText : styles.helperText}>{fixture === 'field-error' ? 'Enter a complete URL beginning with https://.' : 'Optional'}</span>
                          </div>
                          <fieldset className={styles.radioField}>
                            <legend>Career stage <span>Required</span></legend>
                            <p>Choose the description that best reflects your current field.</p>
                            <label><input type='radio' name='career-stage' defaultChecked /> Emerging</label>
                            <label><input type='radio' name='career-stage' /> Mid-career</label>
                            <label><input type='radio' name='career-stage' /> Established</label>
                            <label><input type='radio' name='career-stage' /> I use different language</label>
                          </fieldset>
                          <div className={styles.fieldGroup}>
                            <Label htmlFor='access'>Accessibility or accommodation request <span>Optional</span></Label>
                            <p id='access-help'>This is shared only with the team responsible for access arrangements.</p>
                            <Textarea id='access' aria-describedby='access-help' placeholder='Tell the Organization what would help you participate.' />
                          </div>
                          {scenario.questionCount > 4 ? <div className={styles.moreQuestions}><MoreHorizontal /><span>{scenario.questionCount - 4} more Organization questions follow in this fixture.</span></div> : null}
                        </form>
                      )}
                    </div>
                  ) : null}

                  {section === 'review' ? (
                    <div className={styles.editorSection}>
                      <div className={styles.sectionTitle}>
                        <div><p className={styles.eyebrow}>04 · Final review</p><h3 id='section-title'>Review what the Organization will receive</h3><p>This is the submitted packet. Expand or edit any section before the final action.</p></div>
                        <Badge variant='outline'>{fixture === 'field-error' ? '2 issues' : 'Ready to submit'}</Badge>
                      </div>
                      {fixture === 'field-error' ? <Notice notice={{ tone: 'danger', title: 'Two answers need attention', body: 'Proposal summary is too short. Project website is not a complete URL.' }} /> : null}
                      <div className={styles.reviewList}>
                        <button type='button' onClick={() => navigate('readiness')}><span><ShieldCheck /><strong>Readiness</strong></span><span>{fixture === 'required-practice' ? '1 requirement to confirm' : '3 confirmations'} <ChevronRight /></span></button>
                        <button type='button' onClick={() => navigate('works')}><span><BriefcaseBusiness /><strong>Works</strong></span><span>{scenario.workCount || 1} Work{scenario.workCount === 1 ? '' : 's'} · files ready <ChevronRight /></span></button>
                        <button type='button' onClick={() => navigate('questions')}><span><FileText /><strong>Questions</strong></span><span>{scenario.questionCount} answers <ChevronRight /></span></button>
                        <div><span><CircleDollarSign /><strong>Application fee</strong></span><span>{scenario.fee}</span></div>
                      </div>
                      <fieldset className={styles.declarations}>
                        <legend>Final declarations</legend>
                        <label><Checkbox /> <span>I confirm that this application is accurate and I have permission to submit these Works.</span></label>
                        <label><Checkbox /> <span>I understand that this packet cannot be edited after submission.</span></label>
                      </fieldset>
                      <div className={styles.paymentSummary}>
                        <div><span>Due now</span><strong>{scenario.actionFee ?? '$0'}</strong></div>
                        <p>{scenario.actionFee ? 'You will continue to secure checkout, then return here while Missa confirms the submission.' : 'No payment is required for this application.'}</p>
                      </div>
                    </div>
                  ) : null}

                  <footer className={styles.editorFooter}>
                    <Button variant='outline' disabled={activeIndex === 0} onClick={() => navigate(sections[Math.max(activeIndex - 1, 0)].id)}><ArrowLeft /> Back</Button>
                    {section !== 'review' ? (
                      <Button onClick={continueSection}>Continue to {sections[Math.min(activeIndex + 1, sections.length - 1)].label} <ArrowRight /></Button>
                    ) : (
                      <Dialog>
                        <DialogTrigger render={<Button disabled={Boolean(scenario.closed || scenario.paymentState === 'processing' || scenario.paymentState === 'paid-pending' || scenario.paymentState === 'unsupported' || fixture === 'field-error')} />}>
                          {scenario.actionFee ? `Pay ${scenario.actionFee} and submit` : 'Submit application'} <ArrowRight />
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>{scenario.actionFee ? `Pay ${scenario.actionFee} and submit?` : 'Submit this application?'}</DialogTitle><DialogDescription>Your packet will become read-only. {scenario.actionFee ? 'Payment is completed in secure checkout before Missa creates the receipt.' : 'Missa will create a durable receipt after final checks.'}</DialogDescription></DialogHeader>
                          <DialogFooter><DialogClose render={<Button variant='outline' />}>Keep reviewing</DialogClose><DialogClose render={<Button onClick={() => setSubmitted(true)} />}>{scenario.actionFee ? 'Continue to payment' : 'Submit application'}</DialogClose></DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </footer>
                </section>

                <aside className={styles.contextRail} aria-label='Opportunity and draft summary'>
                  <Card>
                    <CardHeader><CardTitle>Opportunity</CardTitle><CardDescription>{scenario.organization}</CardDescription></CardHeader>
                    <CardContent>
                      <dl className={styles.contextFacts}>
                        <div><dt>Deadline</dt><dd>{scenario.deadline}</dd></div>
                        <div><dt>Fee</dt><dd>{scenario.fee}</dd></div>
                        <div><dt>Works</dt><dd>1–5</dd></div>
                      </dl>
                      <Button variant='outline' size='sm'>Read official guidelines <ExternalLink /></Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>Packet status</CardTitle><CardDescription>{saved ? scenario.draftLabel : 'Changes not yet saved'}</CardDescription></CardHeader>
                    <CardContent>
                      <ul className={styles.statusList}>
                        <li><CheckCircle2 /> Readiness started</li>
                        <li className={scenario.workCount ? '' : styles.mutedItem}><CheckCircle2 /> {scenario.workCount || 0} Work{scenario.workCount === 1 ? '' : 's'} added</li>
                        <li className={section === 'review' ? '' : styles.mutedItem}><FileText /> Questions {section === 'questions' || section === 'review' ? 'started' : 'not started'}</li>
                      </ul>
                    </CardContent>
                  </Card>
                  <div className={styles.privacyNote}><LockKeyhole /><p><strong>Private draft</strong><span>The Organization cannot see answers or files until you submit.</span></p></div>
                </aside>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}

export function HostedApplicationDirections() {
  return <HostedApplicationExperience selectedOnly={false} />
}

export function HostedApplicationSelected() {
  return <HostedApplicationExperience selectedOnly />
}
