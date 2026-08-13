'use client'

import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  FileAudio,
  FileText,
  Flag,
  HelpCircle,
  Inbox,
  LockKeyhole,
  Menu,
  MessageSquareText,
  MoreHorizontal,
  Save,
  Scale,
  ShieldCheck,
  UserRoundX,
  WifiOff,
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
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'

import { MissaWordmark } from '@/components/missa-wordmark'
import styles from './reviewer-directions.module.css'

type Direction = 'focused' | 'desk' | 'packet'
type MobilePane = 'work' | 'review'

const fixtures = [
  ['active', 'Active assignment'],
  ['empty', 'No assignments'],
  ['many', 'Many assignments'],
  ['multi-org', 'Several Organizations'],
  ['due-soon', 'Due soon'],
  ['overdue', 'Overdue but open'],
  ['closed', 'Round closed'],
  ['removed', 'Assignment removed'],
  ['single-blind', 'Single-blind review'],
  ['double-blind', 'Double-blind review'],
  ['withheld', 'Identity-bearing answer withheld'],
  ['multi-work', 'Multiple Works'],
  ['pdf', 'PDF Work'],
  ['audio', 'Audio Work'],
  ['unavailable-file', 'File unavailable'],
  ['inaccessible-file', 'Alternative missing'],
  ['long-rubric', 'Long rubric'],
  ['required-missing', 'Required criterion missing'],
  ['score-range', 'Score outside range'],
  ['saving', 'Draft saving'],
  ['offline', 'Offline changes waiting'],
  ['save-failed', 'Draft save failed'],
  ['concurrent', 'Changed on another device'],
  ['rubric-changed', 'Rubric changed'],
  ['conflict', 'Conflict declared'],
  ['conflict-failed', 'Conflict failed'],
  ['submitted', 'Submitted review'],
  ['reopened', 'Reopened review'],
  ['ambiguous', 'Checking submission'],
  ['forbidden', 'Assignment unavailable'],
  ['long-text', 'Long names and Unicode'],
] as const

type Fixture = (typeof fixtures)[number][0]

const directions: Array<{ id: Direction; number: string; title: string; description: string }> = [
  { id: 'focused', number: '01', title: 'Focused assignment', description: 'A linear queue-to-Work flow with the rubric following the evidence.' },
  { id: 'desk', number: '02', title: 'Evidence desk', description: 'Assignments, permitted Work, and rubric remain visible as one calm review surface.' },
  { id: 'packet', number: '03', title: 'Review packet', description: 'A structured dossier organizes Works, answers, files, criteria, and the final recommendation.' },
]

const assignments = [
  { id: '042', organization: 'North River Review', opportunity: 'Emerging Writers Award', due: '12 Aug', progress: 67 },
  { id: '039', organization: 'Common Ground Arts', opportunity: 'Public Memory Commission', due: '16 Aug', progress: 0 },
  { id: '027', organization: 'Meridian Press', opportunity: 'New Voices Poetry Prize', due: '20 Aug', progress: 100 },
  { id: '018', organization: 'Field Notes Foundation', opportunity: 'Research and Writing Fellowship', due: '24 Aug', progress: 33 },
]

const rubric = [
  { id: 'clarity', title: 'Clarity of intent', help: 'How clearly does the Work express its central intention?', left: 'Still emerging', right: 'Exceptionally clear' },
  { id: 'craft', title: 'Craft and execution', help: 'Consider control of form, language, pacing, and composition.', left: 'Needs development', right: 'Highly resolved' },
  { id: 'potential', title: 'Potential for the programme', help: 'Use the opportunity brief, not assumptions about the creator.', left: 'Limited alignment', right: 'Strong alignment' },
]

function isFixture(value: string): value is Fixture {
  return fixtures.some(([id]) => id === value)
}

function Header() {
  return <header className={styles.header}><MissaWordmark href='#reviewer-main' size='app' className={styles.wordmark} /><nav aria-label='Reviewer navigation'><a href='#reviewer-main' aria-current='page'>Reviews</a><a href='#help'>Help</a></nav><div><Button type='button' size='icon' variant='ghost' aria-label='Open Inbox'><Inbox aria-hidden='true' /></Button><Button type='button' size='icon' variant='ghost' className={styles.menuButton} aria-label='Open navigation'><Menu aria-hidden='true' /></Button><button type='button' className={styles.avatar} aria-label='Open Profile'>AO</button></div></header>
}

function ReviewControls({ direction, fixture, selectedOnly, onDirection, onFixture }: { direction: Direction; fixture: Fixture; selectedOnly: boolean; onDirection: (value: Direction) => void; onFixture: (value: Fixture) => void }) {
  return <div className={styles.reviewControls} aria-label='Design review controls'>{selectedOnly ? <div className={styles.selectedLabel}><strong>Selected reviewer composition</strong><span>02 · Evidence desk</span></div> : <div className={styles.directionButtons}>{directions.map((item) => <button key={item.id} type='button' aria-pressed={direction === item.id} data-active={direction === item.id} onClick={() => onDirection(item.id)}><span>{item.number}</span>{item.title}</button>)}</div>}<label><span>Edge state</span><select aria-label='Edge state' value={fixture} onChange={(event) => { if (isFixture(event.target.value)) onFixture(event.target.value) }}>{fixtures.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
}

function DirectionIntro({ direction, selectedOnly }: { direction: Direction; selectedOnly: boolean }) {
  const active = directions.find((item) => item.id === direction)!
  return <section className={styles.intro}><div><p className={styles.eyebrow}>{selectedOnly ? 'Selected reviewer workspace' : `Direction ${active.number}`}</p><h1>{selectedOnly ? 'Reviews' : active.title}</h1><p>{selectedOnly ? 'Read assigned Work, complete the Organization rubric, and submit a deliberate recommendation.' : active.description}</p></div><Badge variant='outline'><ShieldCheck aria-hidden='true' />Assigned Work only</Badge></section>
}

function fixtureStatus(fixture: Fixture) {
  if (fixture === 'saving') return { icon: Clock3, title: 'Saving draft…', copy: 'Keep working. This draft has not been confirmed on the server yet.', tone: 'info' }
  if (fixture === 'offline') return { icon: WifiOff, title: 'Offline changes waiting', copy: 'Your latest responses remain on this device and will save when the connection returns.', tone: 'attention' }
  if (fixture === 'save-failed') return { icon: AlertCircle, title: 'Draft could not be saved', copy: 'Your responses are still here. Check your connection and try again.', tone: 'danger' }
  if (fixture === 'concurrent') return { icon: AlertCircle, title: 'This draft changed on another device', copy: 'Compare the newer saved draft before choosing which responses to keep.', tone: 'attention' }
  if (fixture === 'rubric-changed') return { icon: AlertCircle, title: 'The rubric changed', copy: 'Review one updated criterion before you submit. Your existing responses remain available.', tone: 'attention' }
  if (fixture === 'ambiguous') return { icon: Clock3, title: 'Checking whether your review was received', copy: 'Do not submit again. Missa is confirming the first request.', tone: 'info' }
  if (fixture === 'reopened') return { icon: MessageSquareText, title: 'This review was reopened', copy: 'The review team requested a new revision. Your previous submission remains read-only below.', tone: 'info' }
  if (fixture === 'due-soon') return { icon: Clock3, title: 'Due tomorrow at 5:00 PM', copy: 'Your saved draft is available on every signed-in device.', tone: 'attention' }
  if (fixture === 'overdue') return { icon: Clock3, title: 'The deadline has passed, but review remains open', copy: 'The Organization is still accepting this recommendation.', tone: 'attention' }
  if (fixture === 'closed') return { icon: LockKeyhole, title: 'This review round is closed', copy: 'You can read the saved review state, but no response or submission can be changed.', tone: 'info' }
  if (fixture === 'score-range') return { icon: AlertCircle, title: 'One saved score is no longer valid', copy: 'The rubric now accepts scores from 1 to 5. Choose a valid response before reviewing your recommendation.', tone: 'danger' }
  return null
}

function AssignmentList({ fixture, compact = false }: { fixture: Fixture; compact?: boolean }) {
  const rows = fixture === 'many' ? Array.from({ length: 12 }, (_, index) => ({ ...assignments[index % assignments.length], id: String(42 - index).padStart(3, '0') })) : assignments.slice(0, fixture === 'multi-org' ? 4 : 3)
  return <section className={compact ? styles.assignmentRail : styles.queue} aria-labelledby={compact ? 'assignment-rail-title' : 'assignment-queue-title'}><header><div><p className={styles.eyebrow}>Your queue</p><h2 id={compact ? 'assignment-rail-title' : 'assignment-queue-title'}>Assignments</h2></div><Badge variant='outline'>{rows.filter((item) => item.progress < 100).length} open</Badge></header><div className={styles.assignmentRows}>{rows.map((item, index) => <button key={`${item.id}-${index}`} type='button' data-active={index === 0}><span className={styles.assignmentTop}><strong>{item.organization}</strong><small>{item.due}</small></span><span>{item.opportunity}</span><span className={styles.assignmentBottom}><small>{item.progress === 100 ? 'Submitted' : item.progress ? `${item.progress}% complete` : 'Not started'}</small>{index === 0 ? <ChevronRight aria-hidden='true' /> : null}</span></button>)}</div>{fixture === 'many' ? <nav className={styles.pagination} aria-label='Assignment pages'><Button type='button' variant='outline' disabled>Previous</Button><span>Page 1 of 3</span><Button type='button' variant='outline'>Next</Button></nav> : null}</section>
}

function AssignmentHeader({ fixture }: { fixture: Fixture }) {
  const long = fixture === 'long-text'
  return <header className={styles.assignmentHeader}><div><Button type='button' variant='ghost' size='icon' aria-label='Back to assignments'><ArrowLeft aria-hidden='true' /></Button><div><p className={styles.eyebrow}>{long ? 'Àjọ Àwọn Òǹkọ̀wé Àgbáyé · International Programme for Emerging and Experimental Writers' : 'North River Review · First review round'}</p><h2>{long ? 'A Long Work About Memory, Migration, Belonging, and the Places We Build Between Languages' : 'Emerging Writers Award'}</h2><p>Submission 042 · One recommendation for the complete packet</p></div></div><div className={styles.assignmentMeta}><Badge variant='outline'><LockKeyhole aria-hidden='true' />{fixture === 'double-blind' ? 'Double-blind' : fixture === 'single-blind' ? 'Single-blind' : 'Identity withheld'}</Badge><span><Clock3 aria-hidden='true' />Due 12 August · 5:00 PM</span></div></header>
}

function WorkReader({ fixture }: { fixture: Fixture }) {
  const [work, setWork] = useState('work-1')
  const multi = fixture === 'multi-work'
  const unavailable = fixture === 'unavailable-file'
  const inaccessible = fixture === 'inaccessible-file'
  const audio = fixture === 'audio'
  const pdf = fixture === 'pdf'

  return <section className={styles.reader} aria-labelledby='work-reader-title'><header><div><p className={styles.eyebrow}>Permitted evidence</p><h3 id='work-reader-title'>Work</h3></div><Button type='button' variant='ghost' size='icon' aria-label='More Work actions'><MoreHorizontal aria-hidden='true' /></Button></header>{multi ? <div className={styles.workTabs} role='tablist' aria-label='Works'><button type='button' role='tab' aria-selected={work === 'work-1'} onClick={() => setWork('work-1')}>01 · Saltwater</button><button type='button' role='tab' aria-selected={work === 'work-2'} onClick={() => setWork('work-2')}>02 · Night bus</button><button type='button' role='tab' aria-selected={work === 'work-3'} onClick={() => setWork('work-3')}>03 · Notes</button></div> : null}<article className={styles.workDocument}><div className={styles.documentHead}><span>{audio ? <FileAudio aria-hidden='true' /> : pdf ? <FileText aria-hidden='true' /> : <BookOpen aria-hidden='true' />}</span><div><p className={styles.eyebrow}>{audio ? 'Audio · 06:42' : pdf ? 'PDF · 12 pages' : 'Written Work · 1,840 words'}</p><h4>{work === 'work-2' ? 'Night bus' : work === 'work-3' ? 'Notes toward a public memory' : 'Saltwater remembers every name'}</h4></div><Button type='button' variant='outline'><Download aria-hidden='true' />Download</Button></div>{unavailable ? <Alert variant='destructive'><AlertCircle aria-hidden='true' /><AlertTitle>This file is temporarily unavailable</AlertTitle><AlertDescription>Your review draft is safe. Report the file or try opening it later.</AlertDescription></Alert> : audio ? <div className={styles.mediaPlaceholder}><FileAudio aria-hidden='true' /><strong>Audio player</strong><span>00:00 / 06:42</span><Button type='button' variant='outline'>Read transcript</Button></div> : pdf ? <div className={styles.pdfPlaceholder}><span>01</span><div><strong>Saltwater remembers every name</strong><p>A portfolio excerpt appears here with the original page geometry preserved.</p></div></div> : <div className={styles.prose}><p>The sea had learned our names before the city did. It held each syllable carefully, returning it only when the tide reached the old steps.</p><p>At dusk, the market folded itself into small blue tarpaulins. I walked home with a notebook under my shirt and the sound of ferries crossing behind me.</p><p>Some memories arrive as evidence. Others ask to be carried before they can be understood.</p></div>}{inaccessible ? <Alert><HelpCircle aria-hidden='true' /><AlertTitle>No text alternative was supplied</AlertTitle><AlertDescription>This image may not be accessible to you. Report the access problem without declaring a conflict.</AlertDescription><Button type='button' variant='outline'>Report access problem</Button></Alert> : null}</article><section className={styles.answers}><header><h4>Opportunity answers</h4><Badge variant='outline'>2 visible</Badge></header><dl><div><dt>What do you hope to develop?</dt><dd>A linked sequence of essays about memory, coastlines, and public space.</dd></div><div><dt>How will the programme help?</dt><dd>Time for sustained research, editorial conversation, and a first complete manuscript.</dd></div></dl>{fixture === 'withheld' || fixture === 'double-blind' ? <p><LockKeyhole aria-hidden='true' />One identity-bearing answer is withheld under this round’s blind-review policy.</p> : null}</section></section>
}

function ScaleField({ criterion, value, onChange, invalid, invalidReason }: { criterion: (typeof rubric)[number]; value: string; onChange: (value: string) => void; invalid: boolean; invalidReason?: string }) {
  const errorId = `${criterion.id}-error`
  return <fieldset className={styles.criterion} aria-describedby={invalid ? errorId : undefined}><legend>{criterion.title}<span>Required</span></legend><p>{criterion.help}</p><div className={styles.scaleLabels}><span>{criterion.left}</span><span>{criterion.right}</span></div><div className={styles.scale}>{['1', '2', '3', '4', '5'].map((score) => <label key={score}><input type='radio' name={criterion.id} value={score} checked={value === score} onChange={() => onChange(score)} />{score}</label>)}</div>{invalid ? <p id={errorId} role='alert' className={styles.fieldError}>{invalidReason ?? `Choose a response for ${criterion.title}.`}</p> : null}</fieldset>
}

function RubricPanel({ fixture, onStatus }: { fixture: Fixture; onStatus: (message: string) => void }) {
  const [scores, setScores] = useState<Record<string, string>>({ clarity: '4', craft: '3', potential: '4' })
  const [recommendation, setRecommendation] = useState('consider')
  const [reviewing, setReviewing] = useState(false)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [conflictOpen, setConflictOpen] = useState(false)
  const errorSummaryRef = useRef<HTMLDivElement>(null)
  const submitted = fixture === 'submitted'
  const conflict = fixture === 'conflict'
  const missing = fixture === 'required-missing'
  const scoreRange = fixture === 'score-range'
  const shownRubric = fixture === 'long-rubric' ? [...rubric, ...rubric.map((item) => ({ ...item, id: `${item.id}-2`, title: `${item.title} · programme context` }))] : rubric
  const status = fixtureStatus(fixture)

  function reviewRecommendation() {
    if (missing) {
      setScores((current) => ({ ...current, clarity: '' }))
      window.setTimeout(() => errorSummaryRef.current?.focus(), 0)
      return
    }
    setReviewing(true)
    window.setTimeout(() => document.getElementById('recommendation-summary')?.focus(), 0)
  }

  if (submitted) return <section className={styles.rubricPanel} aria-labelledby='submitted-title'><div className={styles.receipt}><CheckCircle2 aria-hidden='true' /><p className={styles.eyebrow}>Review received</p><h3 id='submitted-title'>Recommendation submitted</h3><p>North River Review received your recommendation on 8 August at 4:42 PM.</p><dl><div><dt>Recommendation</dt><dd>Consider</dd></div><div><dt>Scope</dt><dd>Complete packet · 1 Work</dd></div><div><dt>Rubric</dt><dd>Emerging Writers · version 3</dd></div></dl><p>This review is read-only unless the Organization reopens it.</p></div></section>

  if (conflict) return <section className={styles.rubricPanel} aria-labelledby='conflict-title'><div className={styles.conflictState}><UserRoundX aria-hidden='true' /><p className={styles.eyebrow}>Conflict recorded</p><h3 id='conflict-title'>You are recused from this assignment</h3><p>The review team has been notified. Work and rubric access are closed under this round’s policy.</p><Button type='button' variant='outline'>Return to assignments</Button></div></section>

  return <section className={styles.rubricPanel} aria-labelledby='rubric-title'>{status ? <Alert data-tone={status.tone} variant={status.tone === 'danger' ? 'destructive' : 'default'}><status.icon aria-hidden='true' /><AlertTitle>{status.title}</AlertTitle><AlertDescription>{status.copy}</AlertDescription></Alert> : null}{fixture === 'conflict-failed' ? <Alert variant='destructive'><AlertCircle aria-hidden='true' /><AlertTitle>Conflict could not be recorded</AlertTitle><AlertDescription>Your explanation remains here. Work access has not changed; try again or contact the review team.</AlertDescription></Alert> : null}<header className={styles.rubricHead}><div><p className={styles.eyebrow}>Emerging Writers · rubric v3</p><h3 id='rubric-title'>Your review</h3></div><div><Progress value={67} aria-label='Review completion'><ProgressLabel>Completion</ProgressLabel><ProgressValue /></Progress></div></header>{reviewing ? <ReviewSummary scores={scores} recommendation={recommendation} onBack={() => setReviewing(false)} onSubmit={() => setSubmitOpen(true)} /> : <><div ref={errorSummaryRef} data-testid='review-error-summary' tabIndex={-1} className={styles.errorSummary} hidden={!missing}><AlertCircle aria-hidden='true' /><div><strong>Complete 1 required criterion</strong><a href='#criterion-clarity'>Go to Clarity of intent</a></div></div><div className={styles.criteria}>{shownRubric.map((criterion, index) => { const invalid = index === 0 && (missing || scoreRange); return <div id={index === 0 ? 'criterion-clarity' : undefined} key={criterion.id}><ScaleField criterion={criterion} value={invalid ? '' : scores[criterion.id] ?? ''} onChange={(value) => setScores((current) => ({ ...current, [criterion.id]: value }))} invalid={invalid} invalidReason={scoreRange ? 'Choose a valid score from 1 to 5.' : undefined} /></div> })}</div><div className={styles.notes}><label htmlFor='review-notes'>Notes for the review team</label><Textarea id='review-notes' rows={5} placeholder='Add evidence for your recommendation…' aria-describedby='review-notes-help' /><p id='review-notes-help'>Private to the authorized review team · 2,000 characters maximum.</p></div><fieldset className={styles.recommendation}><legend>Overall recommendation<span>Required</span></legend>{[['recommend', 'Recommend'], ['consider', 'Consider'], ['do-not', 'Do not recommend']].map(([value, label]) => <label key={value}><input type='radio' name='recommendation' value={value} checked={recommendation === value} onChange={() => setRecommendation(value)} />{label}</label>)}</fieldset><div className={styles.rubricActions}><Button type='button' variant='outline' onClick={() => onStatus(fixture === 'save-failed' ? 'Draft could not be saved. Your responses remain here.' : 'Draft saved privately.')}><Save aria-hidden='true' />Save draft</Button><Button type='button' onClick={reviewRecommendation} disabled={fixture === 'closed'}>Review recommendation<ChevronRight aria-hidden='true' /></Button><button type='button' className={styles.conflictLink} onClick={() => setConflictOpen(true)} disabled={fixture === 'closed'}><Flag aria-hidden='true' />Declare a conflict</button></div></>}
  <AlertDialog open={submitOpen} onOpenChange={setSubmitOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Submit this recommendation?</AlertDialogTitle><AlertDialogDescription>North River Review will receive your complete recommendation for Submission 042. You will not be able to edit it unless the review team reopens the assignment.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Return to review</AlertDialogCancel><AlertDialogAction onClick={() => { setSubmitOpen(false); onStatus('Review submitted once. Receipt is ready.') }}>Submit review</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  <AlertDialog open={conflictOpen} onOpenChange={setConflictOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Declare a conflict?</AlertDialogTitle><AlertDialogDescription>The review team will receive your policy-required reason and reassign the Work. Your draft will not be submitted.</AlertDialogDescription></AlertDialogHeader><Textarea aria-label='Conflict explanation' placeholder='Briefly explain the conflict…' /><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { setConflictOpen(false); onStatus('Conflict recorded privately. Assignment access is now closed.') }}>Declare conflict</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></section>
}

function ReviewSummary({ scores, recommendation, onBack, onSubmit }: { scores: Record<string, string>; recommendation: string; onBack: () => void; onSubmit: () => void }) {
  return <section className={styles.reviewSummary} aria-labelledby='recommendation-summary'><header><p className={styles.eyebrow}>Final check</p><h3 id='recommendation-summary' tabIndex={-1}>Review your recommendation</h3><p>Confirm the exact rubric responses and audience before submission.</p></header><dl>{rubric.map((criterion) => <div key={criterion.id}><dt>{criterion.title}</dt><dd>{scores[criterion.id]} of 5</dd></div>)}<div><dt>Overall recommendation</dt><dd>{recommendation === 'recommend' ? 'Recommend' : recommendation === 'do-not' ? 'Do not recommend' : 'Consider'}</dd></div><div><dt>Visible to</dt><dd>Authorized North River Review team</dd></div></dl><div><Button type='button' variant='outline' onClick={onBack}>Back to rubric</Button><Button type='button' onClick={onSubmit}>Submit review</Button></div></section>
}

function EmptyState() {
  return <section className={styles.emptyState}><CheckCircle2 aria-hidden='true' /><p className={styles.eyebrow}>Reviews</p><h2>No assignments right now</h2><p>New invitations and reopened reviews will appear here. You do not need to refresh this page.</p></section>
}

function UnavailableState({ removed = false }: { removed?: boolean }) {
  return <section className={styles.emptyState}><LockKeyhole aria-hidden='true' /><p className={styles.eyebrow}>Assignment unavailable</p><h2>{removed ? 'This assignment was removed' : 'You cannot open this assignment'}</h2><p>{removed ? 'The review team withdrew access. No Work, answers, files, or review draft are shown.' : 'It may belong to another reviewer, be closed, or no longer be available.'}</p><Button type='button' variant='outline'>Return to your assignments</Button></section>
}

function DeskDirection({ fixture, onStatus }: { fixture: Fixture; onStatus: (message: string) => void }) {
  const [pane, setPane] = useState<MobilePane>('work')
  return <div><div className={styles.mobileSwitch} aria-label='Assignment workspace view'><button type='button' aria-pressed={pane === 'work'} onClick={() => setPane('work')}><BookOpen aria-hidden='true' />Work</button><button type='button' aria-pressed={pane === 'review'} onClick={() => setPane('review')}><Scale aria-hidden='true' />Review</button></div><div className={styles.deskLayout} data-mobile-pane={pane}><AssignmentList fixture={fixture} compact /><WorkReader fixture={fixture} /><RubricPanel fixture={fixture} onStatus={onStatus} /></div></div>
}

function FocusedDirection({ fixture, onStatus }: { fixture: Fixture; onStatus: (message: string) => void }) {
  return <div className={styles.focusedLayout}><AssignmentList fixture={fixture} /><div className={styles.focusedAssignment}><WorkReader fixture={fixture} /><RubricPanel fixture={fixture} onStatus={onStatus} /></div></div>
}

function PacketDirection({ fixture, onStatus }: { fixture: Fixture; onStatus: (message: string) => void }) {
  return <div className={styles.packetLayout}><nav aria-label='Review packet sections'><p className={styles.eyebrow}>Packet</p><a href='#packet-brief'>Brief<span>Read</span></a><a href='#work-reader-title'>Work<span>1 file</span></a><a href='#packet-answers'>Answers<span>2 visible</span></a><a href='#rubric-title'>Rubric<span>67%</span></a><a href='#recommendation'>Recommendation<span>Draft</span></a></nav><div><section id='packet-brief' className={styles.packetBrief}><p className={styles.eyebrow}>Opportunity brief</p><h3>What North River Review is asking you to consider</h3><p>Review the artistic clarity, craft, and potential of the submitted packet. Do not infer eligibility, identity, or career stage from the Work.</p></section><WorkReader fixture={fixture} /></div><div id='recommendation'><RubricPanel fixture={fixture} onStatus={onStatus} /></div></div>
}

function ReviewerExperience({ selectedOnly }: { selectedOnly: boolean }) {
  const [direction, setDirection] = useState<Direction>('desk')
  const [fixture, setFixture] = useState<Fixture>('active')
  const [status, setStatus] = useState('')
  const activeDirection = selectedOnly ? 'desk' : direction
  const unavailable = fixture === 'forbidden' || fixture === 'removed'

  const content = useMemo(() => {
    if (fixture === 'empty') return <EmptyState />
    if (unavailable) return <UnavailableState removed={fixture === 'removed'} />
    const props = { fixture, onStatus: setStatus }
    if (activeDirection === 'focused') return <FocusedDirection {...props} />
    if (activeDirection === 'packet') return <PacketDirection {...props} />
    return <DeskDirection {...props} />
  }, [activeDirection, fixture, unavailable])

  return <div className={styles.page}><ReviewControls direction={activeDirection} fixture={fixture} selectedOnly={selectedOnly} onDirection={(value) => { setDirection(value); setStatus('') }} onFixture={(value) => { setFixture(value); setStatus('') }} /><Header /><main id='reviewer-main' className={styles.main}><DirectionIntro direction={activeDirection} selectedOnly={selectedOnly} />{fixture !== 'empty' && !unavailable ? <AssignmentHeader fixture={fixture} /> : null}{content}</main><p className={styles.liveStatus} role='status' aria-live='polite'>{status}{status ? <Check aria-hidden='true' /> : null}</p></div>
}

export function ReviewerDirections() {
  return <ReviewerExperience selectedOnly={false} />
}

export function ReviewerSelected() {
  return <ReviewerExperience selectedOnly />
}
