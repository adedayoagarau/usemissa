'use client'

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CircleAlert,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  MailCheck,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

import { MissaWordmark } from '@/components/missa-wordmark'
import styles from './auth-onboarding-directions.module.css'

type Direction = 'return' | 'quiet' | 'guided'
type Journey = 'login' | 'signup' | 'profile' | 'organization' | 'recovery' | 'verification'
type Fixture =
  | 'ordinary-login'
  | 'opportunity-return'
  | 'application-return'
  | 'invalid-credentials'
  | 'malformed-return'
  | 'rate-limited'
  | 'session-expired'
  | 'login-timeout'
  | 'ordinary-signup'
  | 'invite-only'
  | 'existing-account'
  | 'invalid-email'
  | 'weak-password'
  | 'password-mismatch'
  | 'signup-pending'
  | 'ambiguous-signup'
  | 'signup-unavailable'
  | 'profile-start'
  | 'no-practice'
  | 'many-practices'
  | 'alias-match'
  | 'deprecated-term'
  | 'preference-conflict'
  | 'profile-offline'
  | 'profile-concurrent'
  | 'profile-resume'
  | 'no-matches'
  | 'owner-create'
  | 'valid-invite'
  | 'expired-invite'
  | 'revoked-invite'
  | 'accepted-invite'
  | 'duplicate-organization'
  | 'domain-mismatch'
  | 'reviewer-invite'
  | 'reviewer-removed'
  | 'role-limited'
  | 'recovery-request'
  | 'recovery-safe-unknown'
  | 'recovery-used'
  | 'recovery-expired'
  | 'recovery-weak'
  | 'recovery-success'
  | 'verification-pending'
  | 'verification-expired'
  | 'verification-resend-limit'
  | 'verification-changed-email'
  | 'verification-outage'
  | 'verification-success'

const directions: Array<{ id: Direction; number: string; name: string; description: string }> = [
  { id: 'return', number: '01', name: 'Task return', description: 'The interrupted task leads; credentials stay compact and the safe destination is explicit.' },
  { id: 'quiet', number: '02', name: 'Quiet split', description: 'A restrained product explanation balances a focused credential or onboarding form.' },
  { id: 'guided', number: '03', name: 'Guided continuity', description: 'Entry, account, context, and next task remain visible as one recoverable journey.' },
]

const journeys: Array<{ id: Journey; label: string }> = [
  { id: 'login', label: 'Login' },
  { id: 'signup', label: 'Signup' },
  { id: 'profile', label: 'Profile onboarding' },
  { id: 'organization', label: 'Organization onboarding' },
  { id: 'recovery', label: 'Recovery target' },
  { id: 'verification', label: 'Verification target' },
]

const fixtures: Record<Journey, Array<{ id: Fixture; label: string }>> = {
  login: [
    { id: 'ordinary-login', label: 'Ordinary return' },
    { id: 'opportunity-return', label: 'Return to public Opportunity' },
    { id: 'application-return', label: 'Continue hosted application' },
    { id: 'invalid-credentials', label: 'Invalid credentials' },
    { id: 'malformed-return', label: 'Unsafe return rejected' },
    { id: 'rate-limited', label: 'Rate limited' },
    { id: 'session-expired', label: 'Session expired' },
    { id: 'login-timeout', label: 'Ambiguous timeout' },
  ],
  signup: [
    { id: 'ordinary-signup', label: 'Open signup' },
    { id: 'invite-only', label: 'Invite-only access' },
    { id: 'existing-account', label: 'Existing account' },
    { id: 'invalid-email', label: 'Invalid email' },
    { id: 'weak-password', label: 'Weak password' },
    { id: 'password-mismatch', label: 'Password mismatch' },
    { id: 'signup-pending', label: 'Pending submit' },
    { id: 'ambiguous-signup', label: 'Ambiguous response' },
    { id: 'signup-unavailable', label: 'Signup unavailable' },
  ],
  profile: [
    { id: 'profile-start', label: 'Start with broad fields' },
    { id: 'no-practice', label: 'Skip optional fields' },
    { id: 'many-practices', label: 'Many field interests' },
    { id: 'alias-match', label: 'Alias resolves to canonical term' },
    { id: 'deprecated-term', label: 'Deprecated term review' },
    { id: 'preference-conflict', label: 'Preference conflict' },
    { id: 'profile-offline', label: 'Offline before save' },
    { id: 'profile-concurrent', label: 'Changed on another device' },
    { id: 'profile-resume', label: 'Resume partial onboarding' },
    { id: 'no-matches', label: 'No current matching records' },
  ],
  organization: [
    { id: 'owner-create', label: 'Create new Organization' },
    { id: 'valid-invite', label: 'Valid Organization invite' },
    { id: 'expired-invite', label: 'Expired invite' },
    { id: 'revoked-invite', label: 'Revoked invite' },
    { id: 'accepted-invite', label: 'Invite already accepted' },
    { id: 'duplicate-organization', label: 'Possible duplicate Organization' },
    { id: 'domain-mismatch', label: 'Domain mismatch' },
    { id: 'reviewer-invite', label: 'Reviewer assignment invite' },
    { id: 'reviewer-removed', label: 'Reviewer assignment removed' },
    { id: 'role-limited', label: 'Role-limited landing' },
  ],
  recovery: [
    { id: 'recovery-request', label: 'Request recovery' },
    { id: 'recovery-safe-unknown', label: 'Unknown email safe response' },
    { id: 'recovery-used', label: 'Token already used' },
    { id: 'recovery-expired', label: 'Token expired' },
    { id: 'recovery-weak', label: 'Weak new password' },
    { id: 'recovery-success', label: 'Recovery complete' },
  ],
  verification: [
    { id: 'verification-pending', label: 'Verification pending' },
    { id: 'verification-expired', label: 'Verification expired' },
    { id: 'verification-resend-limit', label: 'Resend limit reached' },
    { id: 'verification-changed-email', label: 'Email changed' },
    { id: 'verification-outage', label: 'Delivery provider unavailable' },
    { id: 'verification-success', label: 'Verification complete' },
  ],
}

function isJourney(value: string): value is Journey {
  return journeys.some((item) => item.id === value)
}

function ReviewControls({ direction, journey, fixture, selectedOnly, onDirection, onJourney, onFixture }: { direction: Direction; journey: Journey; fixture: Fixture; selectedOnly: boolean; onDirection: (value: Direction) => void; onJourney: (value: Journey) => void; onFixture: (value: Fixture) => void }) {
  return <div className={styles.reviewControls} aria-label='Design review controls'>{selectedOnly ? null : <div className={styles.directionButtons} role='group' aria-label='Authentication direction'>{directions.map((item) => <button key={item.id} type='button' aria-pressed={direction === item.id} data-active={direction === item.id} onClick={() => onDirection(item.id)}><span>{item.number}</span>{item.name}</button>)}</div>}<div className={styles.selectors}><label><span>Journey</span><select aria-label='Authentication journey' value={journey} onChange={(event) => { if (isJourney(event.target.value)) onJourney(event.target.value) }}>{journeys.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label><span>Edge state</span><select aria-label='Authentication edge state' value={fixture} onChange={(event) => onFixture(event.target.value as Fixture)}>{fixtures[journey].map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label></div></div>
}

function DirectionIntro({ direction, selectedOnly }: { direction: Direction; selectedOnly: boolean }) {
  const item = directions.find((candidate) => candidate.id === direction)!
  return <section className={styles.directionIntro}><span>{item.number}</span><div><p>{selectedOnly ? 'Selected entry composition for this journey' : 'Authentication and onboarding direction'}</p><h1>{item.name}</h1><p>{item.description}</p></div><Badge variant='outline'>{selectedOnly ? 'Selected · local only' : 'Selection pending'}</Badge></section>
}

function BrandHeader() {
  return <header className={styles.brandHeader}><a href='#auth-main' className={styles.skipLink}>Skip to form</a><MissaWordmark href='#home' size='app' className={styles.wordmark} /><a href='#opportunities'>Browse Opportunities</a></header>
}

function ReturnContext({ fixture }: { fixture: Fixture }) {
  const content = fixture === 'application-return'
    ? ['Continue your application', 'International Writing Fellowship · Readiness', 'After login, return to the exact application step. No draft is created twice.']
    : fixture === 'opportunity-return'
      ? ['Return to this Opportunity', 'New Media Production Commission', 'Your originating query and selected result remain available.']
      : fixture === 'session-expired'
        ? ['Your session ended', 'Return to the task you were completing', 'The destination is preserved and server state will be checked again.']
        : fixture === 'malformed-return'
          ? ['Unsafe return removed', 'Continue to Opportunities', 'The requested destination was not a safe application path.']
          : ['Return to your work', 'Opportunities', 'Login returns to the last explicit safe destination.']
  return <section className={styles.returnContext}><ArrowLeft aria-hidden='true' /><div><p>{content[0]}</p><strong>{content[1]}</strong><span>{content[2]}</span></div></section>
}

function JourneyRail({ journey }: { journey: Journey }) {
  const steps = journey === 'profile' ? ['Account', 'Fields', 'Interests', 'Privacy', 'Browse'] : journey === 'organization' ? ['Account', 'Organization', 'Role and scope', 'Next task'] : ['Entry task', 'Account', 'Safe return']
  return <aside className={styles.journeyRail} aria-label='Journey progress'><p>Current journey</p>{steps.map((step, index) => <div key={step} data-current={index === (journey === 'profile' ? 1 : journey === 'organization' ? 1 : 1)}><span>{index < 1 ? <Check /> : index + 1}</span><strong>{step}</strong></div>)}</aside>
}

function StoryPanel({ journey, direction }: { journey: Journey; direction: Direction }) {
  const copy = journey === 'organization'
    ? ['Enter the right Organization context.', 'Review the identity, role, scope, and next task before access changes.']
    : journey === 'profile'
      ? ['Start broad. Refine later.', 'A few private choices can make Opportunities more useful without completing a 1,084-term graph.']
      : ['Return to the task you chose.', 'Authentication should preserve intent, not divert you into a tour or unrelated dashboard.']
  return <aside className={styles.storyPanel}><div><ShieldCheck /><p className={styles.eyebrow}>{direction === 'quiet' ? 'Why this step exists' : 'Continuity contract'}</p><h2>{copy[0]}</h2><p>{copy[1]}</p></div><dl><div><dt>Public by default</dt><dd>Nothing</dd></div><div><dt>Private context</dt><dd>Explained before collection</dd></div><div><dt>Next destination</dt><dd>Named before submit</dd></div></dl></aside>
}

function PasswordField({ id, label, autocomplete, error }: { id: string; label: string; autocomplete: string; error?: string }) {
  const [visible, setVisible] = useState(false)
  return <div className={styles.field}><label htmlFor={id}>{label}</label><div className={styles.passwordField}><Input id={id} name={id} type={visible ? 'text' : 'password'} autoComplete={autocomplete} aria-invalid={Boolean(error) || undefined} aria-describedby={error ? `${id}-error` : undefined} /><button type='button' aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} onClick={() => setVisible((value) => !value)}>{visible ? <EyeOff /> : <Eye />}</button></div>{error ? <p id={`${id}-error`} className={styles.fieldError}>{error}</p> : null}</div>
}

function LoginPanel({ fixture }: { fixture: Fixture }) {
  const invalid = fixture === 'invalid-credentials'
  const rateLimited = fixture === 'rate-limited'
  const timeout = fixture === 'login-timeout'
  return <section id='auth-main' className={styles.journeyPanel}><ReturnContext fixture={fixture} /><div className={styles.panelHeading}><p className={styles.eyebrow}>Existing account</p><h2>Log in</h2><p>Use the account that holds your Profile, Tracker, and Library.</p></div>{invalid ? <Alert variant='destructive'><CircleAlert /><AlertTitle>We could not log you in</AlertTitle><AlertDescription>Check your email and password and try again. This message does not reveal whether the email has an account.</AlertDescription></Alert> : rateLimited ? <Alert><CircleAlert /><AlertTitle>Too many attempts</AlertTitle><AlertDescription>Wait before trying again. A working challenge and recovery policy are required before product promotion.</AlertDescription></Alert> : timeout ? <Alert><CircleAlert /><AlertTitle>We do not know whether login completed</AlertTitle><AlertDescription>Check your account state before submitting again. Do not create a second session blindly.</AlertDescription></Alert> : null}<form onSubmit={(event) => event.preventDefault()} noValidate><div className={styles.field}><label htmlFor='login-email'>Email address</label><Input id='login-email' name='email' type='email' autoComplete='email' /></div><PasswordField id='login-password' label='Password' autocomplete='current-password' /><Button type='submit'>Log in <ArrowRight /></Button></form><div className={styles.panelLinks}><a href='#signup'>Create an account with this return preserved</a><span title='Recovery target is not connected to a production API'>Account recovery · contract target</span></div></section>
}

function SignupPanel({ fixture }: { fixture: Fixture }) {
  const invalidEmail = fixture === 'invalid-email'
  const weak = fixture === 'weak-password'
  const mismatch = fixture === 'password-mismatch'
  const pending = fixture === 'signup-pending'
  const inviteOnly = fixture === 'invite-only'
  const existing = fixture === 'existing-account'
  const ambiguous = fixture === 'ambiguous-signup'
  return <section id='auth-main' className={styles.journeyPanel}>{inviteOnly ? <Alert><LockKeyhole /><AlertTitle>Signup currently requires an invite</AlertTitle><AlertDescription>The invite is exchanged securely after authentication. Organization IDs and role values are not editable fields.</AlertDescription></Alert> : null}<div className={styles.panelHeading}><p className={styles.eyebrow}>Minimum safe account</p><h2>Create your account</h2><p>{inviteOnly ? 'Continue with the email that received the invite.' : 'After signup, continue to Opportunities or the safe task named here.'}</p></div>{existing ? <Alert><CircleAlert /><AlertTitle>An account may already exist</AlertTitle><AlertDescription>Log in or use the future recovery path. Do not disclose account existence beyond the approved abuse-resistant policy.</AlertDescription></Alert> : ambiguous ? <Alert><CircleAlert /><AlertTitle>Account creation may have completed</AlertTitle><AlertDescription>Check your email or try logging in before submitting the same account again.</AlertDescription></Alert> : null}<form onSubmit={(event) => event.preventDefault()} noValidate><div className={styles.field}><label htmlFor='signup-name'>Display name</label><Input id='signup-name' name='name' autoComplete='name' /></div><div className={styles.field}><label htmlFor='signup-email'>Email address</label><Input id='signup-email' name='email' type='email' autoComplete='email' aria-invalid={invalidEmail || undefined} aria-describedby={invalidEmail ? 'signup-email-error' : undefined} />{invalidEmail ? <p id='signup-email-error' className={styles.fieldError}>Enter a complete email address.</p> : null}</div><PasswordField id='signup-password' label='Password' autocomplete='new-password' error={weak ? 'Use at least 8 characters. Longer unique passwords are safer.' : undefined} /><PasswordField id='signup-confirmation' label='Confirm password' autocomplete='new-password' error={mismatch ? 'The passwords do not match.' : undefined} /><label className={styles.consent}><Checkbox id='terms' />I agree to the Terms and acknowledge the Privacy notice.</label><label className={styles.consent}><Checkbox id='marketing' />Send occasional product news. Optional and off by default.</label><Button type='submit' disabled={pending || fixture === 'signup-unavailable'}>{pending ? 'Creating account…' : 'Create account'} <ArrowRight /></Button></form><div className={styles.panelLinks}><a href='#login'>Already have an account? Log in</a></div></section>
}

const practiceOptions = ['Writing', 'Visual arts', 'Film and moving image', 'Sound', 'Performance', 'Interdisciplinary']

function ProfileOnboarding({ fixture }: { fixture: Fixture }) {
  const [selected, setSelected] = useState<string[]>(fixture === 'no-practice' ? [] : fixture === 'many-practices' ? practiceOptions : ['Writing', 'Sound'])
  const notice = fixture === 'alias-match' ? ['Alias found', '“Creative writing” will save as the canonical Writing term.'] : fixture === 'deprecated-term' ? ['Review this term', 'The older source label remains visible while you choose the current reviewed term.'] : fixture === 'preference-conflict' ? ['Resolve one preference', 'Writing cannot be both especially interesting and excluded.'] : fixture === 'profile-offline' ? ['You are offline', 'This section is readable, but changes cannot be saved until you reconnect.'] : fixture === 'profile-concurrent' ? ['Preferences changed elsewhere', 'Compare the current saved version before replacing it.'] : fixture === 'no-matches' ? ['No matching published records in this collection', 'Your choices were saved. This does not mean no Opportunities exist.'] : null
  return <section id='auth-main' className={styles.journeyPanel}><div className={styles.panelHeading}><p className={styles.eyebrow}>Profile onboarding · Section 1 of 4</p><h2>What kinds of Work do you make?</h2><p>Choose a few broad fields now. Search and refine across the 12 facets later. This is private matching context, not a public label or eligibility verdict.</p></div>{notice ? <Alert><CircleAlert /><AlertTitle>{notice[0]}</AlertTitle><AlertDescription>{notice[1]}</AlertDescription></Alert> : null}<fieldset className={styles.choiceField}><legend>Broad fields · optional</legend><div className={styles.choiceGrid}>{practiceOptions.map((option) => { const chosen = selected.includes(option); return <button key={option} type='button' aria-pressed={chosen} onClick={() => setSelected((current) => current.includes(option) ? current.filter((item) => item !== option) : [...current, option])}><span className={styles.choiceIndicator} aria-hidden='true'>{chosen ? <Check /> : null}</span>{option}</button> })}</div></fieldset><div className={styles.searchRefine}><label htmlFor='practice-search'>Search for a more specific field</label><div><Search /><Input id='practice-search' placeholder='Try “documentary poetry”' /></div><p>Aliases help search; canonical IDs are saved. No flat list of 1,084 terms is shown.</p></div><fieldset className={styles.preferenceField}><legend>Opportunity interests are separate</legend><RadioGroup defaultValue='more'><label><RadioGroupItem value='more' />Show me more fellowships and residencies</label><label><RadioGroupItem value='especially' />Especially interested in commissions</label><label><RadioGroupItem value='later' />Decide later</label></RadioGroup></fieldset><div className={styles.panelActions}><Button variant='ghost'>Skip for now</Button><Button disabled={fixture === 'profile-offline'}>Save and continue <ArrowRight /></Button></div></section>
}

function OrganizationOnboarding({ fixture }: { fixture: Fixture }) {
  const invite = fixture !== 'owner-create' && fixture !== 'duplicate-organization' && fixture !== 'domain-mismatch'
  const reviewer = fixture === 'reviewer-invite' || fixture === 'reviewer-removed'
  const unavailable = ['expired-invite', 'revoked-invite', 'reviewer-removed'].includes(fixture)
  const notice = fixture === 'expired-invite' ? ['This invite expired', 'Ask the Organization to send a new invite. No membership was created.'] : fixture === 'revoked-invite' ? ['This invite was revoked', 'The Organization withdrew access before acceptance.'] : fixture === 'accepted-invite' ? ['Invite already accepted', 'Open the Organization with the role and scope already recorded.'] : fixture === 'duplicate-organization' ? ['Possible existing Organization', 'A similar name or domain exists. Review without exposing private tenant data; do not merge automatically.'] : fixture === 'domain-mismatch' ? ['Domain needs review', 'The email domain does not prove ownership or membership. Continue only through verified Organization evidence.'] : fixture === 'reviewer-removed' ? ['Assignment no longer available', 'The reviewer invitation was removed or the round closed. No Submission data is shown.'] : fixture === 'role-limited' ? ['Scoped access', 'This role will land on assigned reviews only. People, billing, and Organization settings remain unavailable.'] : null
  return <section id='auth-main' className={styles.journeyPanel}><div className={styles.panelHeading}><p className={styles.eyebrow}>{reviewer ? 'Reviewer invitation' : invite ? 'Organization invitation' : 'New Organization'}</p><h2>{reviewer ? 'Review the assignment before accepting' : invite ? 'Review your Organization access' : 'Create the minimum Organization identity'}</h2><p>Membership, role, scope, seat, and billing are separate facts. Field taxonomy never grants access.</p></div>{notice ? <Alert variant={unavailable ? 'destructive' : 'default'}><CircleAlert /><AlertTitle>{notice[0]}</AlertTitle><AlertDescription>{notice[1]}</AlertDescription></Alert> : null}{invite ? <section className={styles.inviteCard}><div className={styles.organizationMark}><Building2 /></div><div><p>Organization</p><h3>North River Review</h3><dl><div><dt>Invited by</dt><dd>Amara Okoye</dd></div><div><dt>Role</dt><dd>{reviewer ? 'Reviewer' : 'Program Manager'}</dd></div><div><dt>Scope</dt><dd>{reviewer ? '2027 Poetry Prize · assigned Works only' : 'Artist Development Program'}</dd></div><div><dt>Expires</dt><dd>14 August 2026 · 11:59 PM PT</dd></div></dl></div></section> : <form className={styles.organizationForm} onSubmit={(event) => event.preventDefault()}><div className={styles.field}><label htmlFor='organization-name'>Organization name</label><Input id='organization-name' /></div><div className={styles.field}><label htmlFor='organization-site'>Official website · optional</label><Input id='organization-site' type='url' /></div><div className={styles.field}><label htmlFor='organization-timezone'>Operating timezone</label><Input id='organization-timezone' value='America/Los_Angeles' readOnly /></div></form>}<div className={styles.panelActions}><Button variant='ghost'>{invite ? 'Decline invite' : 'Do this later'}</Button><Button disabled={unavailable}>{invite ? reviewer ? 'Accept assignment' : 'Accept Organization access' : 'Create Organization'} <ArrowRight /></Button></div></section>
}

function RecoveryPanel({ fixture }: { fixture: Fixture }) {
  const success = fixture === 'recovery-success'
  const error = fixture === 'recovery-expired' || fixture === 'recovery-used' || fixture === 'recovery-weak'
  return <section id='auth-main' className={styles.journeyPanel}><Badge variant='outline'>Contract target · no production API</Badge><div className={styles.panelHeading}><p className={styles.eyebrow}>Account recovery</p><h2>{success ? 'Password changed' : fixture === 'recovery-request' || fixture === 'recovery-safe-unknown' ? 'Recover your account' : 'Choose a new password'}</h2><p>{fixture === 'recovery-safe-unknown' ? 'If an account can receive recovery email, instructions will be sent. This response does not reveal whether the address exists.' : 'Recovery tokens must be time-bound, single-use, and abuse-resistant before this route can ship.'}</p></div>{error ? <Alert variant='destructive'><KeyRound /><AlertTitle>{fixture === 'recovery-expired' ? 'This recovery link expired' : fixture === 'recovery-used' ? 'This recovery link was already used' : 'Choose a stronger password'}</AlertTitle><AlertDescription>{fixture === 'recovery-weak' ? 'Use at least 8 characters and avoid a password used for another account.' : 'Request a new link. No password was changed.'}</AlertDescription></Alert> : success ? <Alert><Check /><AlertTitle>Your password was changed</AlertTitle><AlertDescription>Log in again and return to the safe task you were completing.</AlertDescription></Alert> : null}{success ? <Button>Return to login <ArrowRight /></Button> : fixture === 'recovery-request' || fixture === 'recovery-safe-unknown' ? <form onSubmit={(event) => event.preventDefault()}><div className={styles.field}><label htmlFor='recovery-email'>Email address</label><Input id='recovery-email' type='email' autoComplete='email' /></div><Button>Send recovery instructions</Button></form> : <form onSubmit={(event) => event.preventDefault()}><PasswordField id='new-password' label='New password' autocomplete='new-password' error={fixture === 'recovery-weak' ? 'Use at least 8 characters.' : undefined} /><Button disabled={fixture === 'recovery-expired' || fixture === 'recovery-used'}>Change password</Button></form>}</section>
}

function VerificationPanel({ fixture }: { fixture: Fixture }) {
  const success = fixture === 'verification-success'
  const expired = fixture === 'verification-expired'
  const outage = fixture === 'verification-outage'
  return <section id='auth-main' className={styles.journeyPanel}><Badge variant='outline'>Contract target · no production policy</Badge><div className={styles.panelHeading}><p className={styles.eyebrow}>Email verification</p><h2>{success ? 'Email verified' : 'Check your email'}</h2><p>{fixture === 'verification-changed-email' ? 'Verification will be sent to the newly confirmed address after the old address and session are revalidated.' : 'Verification and transactional access messages remain separate from optional marketing.'}</p></div>{expired ? <Alert variant='destructive'><MailCheck /><AlertTitle>This verification link expired</AlertTitle><AlertDescription>Request a new link. The account policy determines whether an unverified session may continue.</AlertDescription></Alert> : fixture === 'verification-resend-limit' ? <Alert><CircleAlert /><AlertTitle>Resend limit reached</AlertTitle><AlertDescription>Wait before requesting another message. Existing links may still work until their expiry.</AlertDescription></Alert> : outage ? <Alert variant='destructive'><CircleAlert /><AlertTitle>Verification email is delayed</AlertTitle><AlertDescription>The delivery provider is unavailable. Do not create another account; retry later.</AlertDescription></Alert> : success ? <Alert><Check /><AlertTitle>Verification complete</AlertTitle><AlertDescription>Continue to the exact safe destination named before signup.</AlertDescription></Alert> : <Alert><MailCheck /><AlertTitle>Verification sent</AlertTitle><AlertDescription>Use the time-bound link sent to ayo@example.com.</AlertDescription></Alert>}<div className={styles.panelActions}><Button variant='outline' disabled={fixture === 'verification-resend-limit' || outage}>Resend email</Button><Button>{success ? 'Continue' : 'Return to login'} <ArrowRight /></Button></div></section>
}

function AuthPreview({ direction, journey, fixture }: { direction: Direction; journey: Journey; fixture: Fixture }) {
  return <div className={styles.preview} data-direction={direction} data-journey={journey}><BrandHeader /><div className={styles.previewBody}>{direction === 'guided' ? <JourneyRail journey={journey} /> : null}<div className={styles.formColumn}>{journey === 'login' ? <LoginPanel fixture={fixture} /> : journey === 'signup' ? <SignupPanel fixture={fixture} /> : journey === 'profile' ? <ProfileOnboarding fixture={fixture} /> : journey === 'organization' ? <OrganizationOnboarding fixture={fixture} /> : journey === 'recovery' ? <RecoveryPanel fixture={fixture} /> : <VerificationPanel fixture={fixture} />}</div><StoryPanel journey={journey} direction={direction} /></div></div>
}

function selectedDirectionForJourney(journey: Journey): Direction {
  return journey === 'profile' || journey === 'organization' ? 'guided' : 'return'
}

function AuthOnboardingExperience({ selectedOnly }: { selectedOnly: boolean }) {
  const [direction, setDirection] = useState<Direction>('return')
  const [journey, setJourney] = useState<Journey>('login')
  const [fixture, setFixture] = useState<Fixture>('ordinary-login')

  function changeJourney(nextJourney: Journey) {
    setJourney(nextJourney)
    setFixture(fixtures[nextJourney][0]!.id)
  }

  const activeDirection = selectedOnly ? selectedDirectionForJourney(journey) : direction
  return <div className={styles.page}><ReviewControls direction={activeDirection} journey={journey} fixture={fixture} selectedOnly={selectedOnly} onDirection={setDirection} onJourney={changeJourney} onFixture={setFixture} /><DirectionIntro direction={activeDirection} selectedOnly={selectedOnly} /><AuthPreview key={`${activeDirection}-${journey}-${fixture}`} direction={activeDirection} journey={journey} fixture={fixture} /></div>
}

export function AuthOnboardingDirections() {
  return <AuthOnboardingExperience selectedOnly={false} />
}

export function AuthOnboardingSelected() {
  return <AuthOnboardingExperience selectedOnly />
}
