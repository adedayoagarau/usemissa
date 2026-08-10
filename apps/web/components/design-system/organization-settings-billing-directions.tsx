'use client'

import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  Building2,
  Check,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Database,
  ExternalLink,
  FileDown,
  KeyRound,
  Landmark,
  LockKeyhole,
  Mail,
  Network,
  Palette,
  ReceiptText,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  Trash2,
  UsersRound,
  WalletCards,
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
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
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
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import styles from './organization-settings-billing-directions.module.css'

type Direction = 'index' | 'control' | 'ledger'
type SectionId = 'general' | 'structure' | 'brand' | 'communications' | 'security' | 'integrations' | 'data' | 'billing'
type Fixture =
  | 'healthy'
  | 'free'
  | 'trialing'
  | 'past-due'
  | 'cancel-scheduled'
  | 'enterprise'
  | 'seat-limit'
  | 'owner'
  | 'admin'
  | 'finance'
  | 'program-manager'
  | 'viewer'
  | 'payout-pending'
  | 'payout-action'
  | 'domain-pending'
  | 'domain-error'
  | 'sso-test'
  | 'scim'
  | 'integration-revoked'
  | 'legal-hold'
  | 'export-pending'
  | 'deletion-blocked'
  | 'deletion-scheduled'
  | 'stale'
  | 'offline'
  | 'loading'
  | 'error'
  | 'long-name'

type Section = {
  id: SectionId
  label: string
  description: string
  authority: string
  icon: typeof Settings2
  status: 'Complete' | 'Needs attention' | 'Not configured' | 'Managed' | 'Unavailable'
  target?: boolean
}

type Scenario = {
  organizationName: string
  legalName: string
  role: string
  plan: string
  planStatus: string
  seats: string
  renewal: string
  payout: string
  canEditGeneral: boolean
  canEditBilling: boolean
  canEditSecurity: boolean
  notice?: { tone: 'info' | 'warning' | 'danger'; title: string; body: string }
  loading?: boolean
  offline?: boolean
  error?: boolean
  legalHold?: boolean
  deletionScheduled?: boolean
  stale?: boolean
}

const directions = [
  { id: 'index' as const, number: '01', name: 'Settings index', description: 'A searchable setup map with status and one next action per domain.' },
  { id: 'control' as const, number: '02', name: 'Control centre', description: 'One focused settings domain with authority and consequences kept in view.' },
  { id: 'ledger' as const, number: '03', name: 'Governance ledger', description: 'A dense oversight matrix for policy owners and enterprise review.' },
]

const fixtureOptions: Array<{ value: Fixture; label: string }> = [
  { value: 'healthy', label: 'Healthy Program plan' },
  { value: 'free', label: 'Free plan' },
  { value: 'trialing', label: 'Trialing plan' },
  { value: 'past-due', label: 'Plan past due' },
  { value: 'cancel-scheduled', label: 'Cancellation scheduled' },
  { value: 'enterprise', label: 'Contract Enterprise' },
  { value: 'seat-limit', label: 'Seat limit reached' },
  { value: 'owner', label: 'Owner projection' },
  { value: 'admin', label: 'Organization Admin projection' },
  { value: 'finance', label: 'Finance projection' },
  { value: 'program-manager', label: 'Program Manager projection' },
  { value: 'viewer', label: 'Viewer projection' },
  { value: 'payout-pending', label: 'Payout setup incomplete' },
  { value: 'payout-action', label: 'Payout requirements due' },
  { value: 'domain-pending', label: 'Custom domain pending' },
  { value: 'domain-error', label: 'Custom domain misconfigured' },
  { value: 'sso-test', label: 'SSO test required' },
  { value: 'scim', label: 'SCIM-managed policy' },
  { value: 'integration-revoked', label: 'Integration revoked' },
  { value: 'legal-hold', label: 'Legal hold active' },
  { value: 'export-pending', label: 'Export pending' },
  { value: 'deletion-blocked', label: 'Deletion blocked by active work' },
  { value: 'deletion-scheduled', label: 'Deletion scheduled' },
  { value: 'stale', label: 'Settings changed elsewhere' },
  { value: 'offline', label: 'Offline before save' },
  { value: 'loading', label: 'Loading' },
  { value: 'error', label: 'Recoverable error' },
  { value: 'long-name', label: 'Long Organization and legal names' },
]

const baseSections: Section[] = [
  { id: 'general', label: 'General', description: 'Names, locale, timezone, and currency', authority: 'Owner or Organization Admin', icon: Building2, status: 'Complete', target: true },
  { id: 'structure', label: 'Structure', description: 'Entities, teams, and Programs', authority: 'Organization Admin', icon: Network, status: 'Complete' },
  { id: 'brand', label: 'Brand', description: 'Logo and public identity', authority: 'Owner or Organization Admin', icon: Palette, status: 'Needs attention', target: true },
  { id: 'communications', label: 'Communications', description: 'Sender and reply-to identity', authority: 'Communications access', icon: Mail, status: 'Not configured', target: true },
  { id: 'security', label: 'Security', description: 'Sign-in, provisioning, and recovery', authority: 'Owner or Security access', icon: ShieldCheck, status: 'Not configured', target: true },
  { id: 'integrations', label: 'Integrations', description: 'Connections, keys, and webhooks', authority: 'Integration access', icon: KeyRound, status: 'Not configured', target: true },
  { id: 'data', label: 'Data governance', description: 'Retention, export, and legal hold', authority: 'Owner or Legal access', icon: Database, status: 'Not configured', target: true },
  { id: 'billing', label: 'Billing & payouts', description: 'Plan, seats, invoices, and payouts', authority: 'Owner or Billing access', icon: CreditCard, status: 'Complete' },
]

function scenarioFor(fixture: Fixture): Scenario {
  const base: Scenario = {
    organizationName: 'Missa Arts Foundation',
    legalName: 'Missa Arts Foundation, Inc.',
    role: 'Organization Owner',
    plan: 'Program',
    planStatus: 'Active',
    seats: '18 of 25',
    renewal: 'Renews 14 September 2026',
    payout: 'Connected',
    canEditGeneral: true,
    canEditBilling: true,
    canEditSecurity: true,
  }
  if (fixture === 'free') return { ...base, plan: 'Free', planStatus: 'Inactive', seats: '3 of 3', renewal: 'No paid subscription', payout: 'Not connected' }
  if (fixture === 'trialing') return { ...base, planStatus: 'Trialing', renewal: 'Trial ends 21 August 2026', notice: { tone: 'info', title: 'Trial ends in 13 days', body: 'Choose a paid plan before the trial ends to keep Program entitlements.' } }
  if (fixture === 'past-due') return { ...base, planStatus: 'Past due', notice: { tone: 'danger', title: 'Payment needs attention', body: 'Update the payment method. Existing work remains available while the billing policy is reviewed.' } }
  if (fixture === 'cancel-scheduled') return { ...base, planStatus: 'Cancellation scheduled', renewal: 'Program access ends 14 September 2026', notice: { tone: 'warning', title: 'Cancellation is scheduled', body: 'The plan stays active until 14 September 2026. Resuming is a separate action.' } }
  if (fixture === 'enterprise') return { ...base, plan: 'Enterprise', seats: '184 of 240', renewal: 'Annual contract · 1 January 2027', payout: 'Connected' }
  if (fixture === 'seat-limit') return { ...base, seats: '25 of 25', notice: { tone: 'warning', title: 'No seats available', body: 'Review existing memberships or change the plan before inviting another person.' } }
  if (fixture === 'admin') return { ...base, role: 'Organization Admin', canEditBilling: false, canEditSecurity: false, notice: { tone: 'info', title: 'Some settings are Owner-controlled', body: 'You can manage routine Organization settings. Billing and security policy remain read-only.' } }
  if (fixture === 'finance') return { ...base, role: 'Finance', canEditGeneral: false, canEditSecurity: false, canEditBilling: true, notice: { tone: 'info', title: 'Finance view', body: 'Billing and payouts are available. Organization identity and security remain read-only.' } }
  if (fixture === 'program-manager') return { ...base, role: 'Program Manager', canEditGeneral: false, canEditBilling: false, canEditSecurity: false, notice: { tone: 'info', title: 'Settings are read-only', body: 'Your Program access does not include Organization settings or billing.' } }
  if (fixture === 'viewer') return { ...base, role: 'Viewer', canEditGeneral: false, canEditBilling: false, canEditSecurity: false, notice: { tone: 'info', title: 'Read-only view', body: 'You can review approved settings summaries, but cannot make changes.' } }
  if (fixture === 'payout-pending') return { ...base, payout: 'Setup incomplete', notice: { tone: 'warning', title: 'Finish payout setup', body: 'Submission fees cannot be paid out until the provider setup is complete.' } }
  if (fixture === 'payout-action') return { ...base, payout: 'Requirements due', notice: { tone: 'warning', title: 'Payout information required', body: 'The payout provider needs updated account information. Existing balances remain separate from the Missa subscription.' } }
  if (fixture === 'domain-pending') return { ...base, notice: { tone: 'info', title: 'Domain verification pending', body: 'The public domain stays inactive until ownership and DNS checks complete.' } }
  if (fixture === 'domain-error') return { ...base, notice: { tone: 'danger', title: 'Domain records do not match', body: 'Review the required DNS records. The current public address is still active.' } }
  if (fixture === 'sso-test') return { ...base, notice: { tone: 'warning', title: 'Test sign-in before enforcement', body: 'SSO remains optional until a successful test and recovery contact are confirmed.' } }
  if (fixture === 'scim') return { ...base, notice: { tone: 'info', title: 'Provisioning is managed externally', body: 'SCIM-owned identity fields are read-only in Missa.' } }
  if (fixture === 'integration-revoked') return { ...base, notice: { tone: 'danger', title: 'Connection needs attention', body: 'The integration can no longer access the approved scope. Reconnect or remove it.' } }
  if (fixture === 'legal-hold') return { ...base, legalHold: true, notice: { tone: 'warning', title: 'Legal hold is active', body: 'Retention and deletion changes cannot remove protected records.' } }
  if (fixture === 'export-pending') return { ...base, notice: { tone: 'info', title: 'Export is being prepared', body: 'The requester will receive a time-limited private download when it is ready.' } }
  if (fixture === 'deletion-blocked') return { ...base, legalHold: true, notice: { tone: 'danger', title: 'Deletion cannot be scheduled', body: 'Resolve active Opportunities, pending payouts, and the legal hold first.' } }
  if (fixture === 'deletion-scheduled') return { ...base, deletionScheduled: true, notice: { tone: 'danger', title: 'Deletion scheduled for 7 September 2026', body: 'An Owner may cancel deletion before that date. Access becomes read-only during the final review window.' } }
  if (fixture === 'stale') return { ...base, stale: true, notice: { tone: 'warning', title: 'Settings changed elsewhere', body: 'Compare the newer version before reapplying your draft.' } }
  if (fixture === 'offline') return { ...base, offline: true, notice: { tone: 'danger', title: 'You are offline', body: 'Your draft remains on this device. Reconnect before saving.' } }
  if (fixture === 'loading') return { ...base, loading: true }
  if (fixture === 'error') return { ...base, error: true, notice: { tone: 'danger', title: 'Settings could not be loaded', body: 'Try again. No changes were made.' } }
  if (fixture === 'long-name') return { ...base, organizationName: 'The International Foundation for Experimental Literature, Moving Image, Sound, and Collaborative Public Practice', legalName: 'The International Foundation for Experimental Literature, Moving Image, Sound, and Collaborative Public Practice, Incorporated' }
  return base
}

function statusTone(status: Section['status']) {
  if (status === 'Complete') return styles.good
  if (status === 'Needs attention') return styles.warning
  if (status === 'Unavailable') return styles.danger
  if (status === 'Managed') return styles.info
  return styles.neutral
}

function Notice({ notice }: { notice?: Scenario['notice'] }) {
  if (!notice) return null
  const Icon = notice.tone === 'danger' ? AlertTriangle : notice.tone === 'warning' ? AlertTriangle : ShieldCheck
  return (
    <Alert className={`${styles.notice} ${styles[notice.tone]}`}>
      <Icon aria-hidden="true" />
      <AlertTitle>{notice.title}</AlertTitle>
      <AlertDescription>{notice.body}</AlertDescription>
    </Alert>
  )
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className={styles.fieldHint}>{children}</p>
}

function SaveBoundary({ dirty, saving, allowed, offline, onSave, onReset }: { dirty: boolean; saving: boolean; allowed: boolean; offline?: boolean; onSave: () => void; onReset: () => void }) {
  return (
    <div className={styles.saveBoundary} aria-live="polite">
      <div>
        <b>{dirty ? 'Unsaved changes' : 'No unsaved changes'}</b>
        <span>{allowed ? 'Only this section is saved.' : 'Your role can view this section but cannot change it.'}</span>
      </div>
      <div className={styles.actionRow}>
        {dirty && <Button type="button" variant="ghost" onClick={onReset} disabled={saving}><RotateCcw />Discard</Button>}
        <Button type="button" onClick={onSave} disabled={!dirty || saving || !allowed || offline}>
          <Save />{saving ? 'Saving…' : 'Save section'}
        </Button>
      </div>
    </div>
  )
}

function GeneralPanel({ scenario }: { scenario: Scenario }) {
  const [name, setName] = useState(scenario.organizationName)
  const [legal, setLegal] = useState(scenario.legalName)
  const [timezone, setTimezone] = useState('America/Los_Angeles')
  const [currency, setCurrency] = useState('USD')
  const [saved, setSaved] = useState({ name, legal, timezone, currency })
  const [saving, setSaving] = useState(false)
  const dirty = name !== saved.name || legal !== saved.legal || timezone !== saved.timezone || currency !== saved.currency

  const reset = () => {
    setName(saved.name)
    setLegal(saved.legal)
    setTimezone(saved.timezone)
    setCurrency(saved.currency)
  }
  const save = () => {
    if (scenario.offline || scenario.stale) return
    setSaving(true)
    window.setTimeout(() => {
      setSaved({ name, legal, timezone, currency })
      setSaving(false)
    }, 450)
  }

  return (
    <section aria-labelledby="general-heading">
      <div className={styles.panelHeading}>
        <div>
          <p className={styles.eyebrow}>Organization identity</p>
          <h2 id="general-heading">General</h2>
          <p>Set the names and defaults people see when they work with this Organization.</p>
        </div>
        <Badge variant="outline">Contract target</Badge>
      </div>
      {scenario.stale && <Notice notice={scenario.notice} />}
      <div className={styles.formGrid}>
        <div className={styles.fullField}>
          <Label htmlFor="organization-public-name">Public Organization name</Label>
          <Input id="organization-public-name" value={name} onChange={(event) => setName(event.target.value)} disabled={!scenario.canEditGeneral} />
          <FieldHint>Shown on public Opportunities, messages, and Organization pages.</FieldHint>
        </div>
        <div className={styles.fullField}>
          <Label htmlFor="organization-legal-name">Legal billing name</Label>
          <Input id="organization-legal-name" value={legal} onChange={(event) => setLegal(event.target.value)} disabled={!scenario.canEditGeneral} />
          <FieldHint>Used for billing records. Changing this does not rename public content.</FieldHint>
        </div>
        <div>
          <Label htmlFor="organization-timezone">Timezone</Label>
          <select id="organization-timezone" className={styles.nativeSelect} value={timezone} onChange={(event) => setTimezone(event.target.value)} disabled={!scenario.canEditGeneral}>
            <option value="America/Los_Angeles">America/Los_Angeles · UTC−07:00</option>
            <option value="Africa/Lagos">Africa/Lagos · UTC+01:00</option>
            <option value="Europe/London">Europe/London · UTC+01:00</option>
          </select>
          <FieldHint>Used when a deadline or schedule needs an Organization default.</FieldHint>
        </div>
        <div>
          <Label htmlFor="organization-currency">Default currency</Label>
          <select id="organization-currency" className={styles.nativeSelect} value={currency} onChange={(event) => setCurrency(event.target.value)} disabled={!scenario.canEditGeneral}>
            <option value="USD">USD · US dollar</option>
            <option value="NGN">NGN · Nigerian naira</option>
            <option value="GBP">GBP · Pound sterling</option>
            <option value="EUR">EUR · Euro</option>
          </select>
          <FieldHint>Applies to new records only. Historical amounts are never converted.</FieldHint>
        </div>
      </div>
      <SaveBoundary dirty={dirty} saving={saving} allowed={scenario.canEditGeneral} offline={scenario.offline || scenario.stale} onSave={save} onReset={reset} />
    </section>
  )
}

function BillingPanel({ scenario }: { scenario: Scenario }) {
  return (
    <section aria-labelledby="billing-heading">
      <div className={styles.panelHeading}>
        <div>
          <p className={styles.eyebrow}>Commercial settings</p>
          <h2 id="billing-heading">Billing & payouts</h2>
          <p>Your Missa plan and submission-fee payouts are separate accounts and actions.</p>
        </div>
        <Badge variant="outline">Partly available today</Badge>
      </div>
      <Notice notice={scenario.notice} />
      <div className={styles.billingSplit}>
        <Card className={styles.quietCard}>
          <CardHeader>
            <div className={styles.cardTitleRow}><CircleDollarSign aria-hidden="true" /><CardTitle>Missa plan</CardTitle></div>
            <CardDescription>Subscription, entitlements, and Organization seats.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className={styles.factList}>
              <div><dt>Plan</dt><dd>{scenario.plan}</dd></div>
              <div><dt>Status</dt><dd><span className={scenario.planStatus === 'Active' ? styles.goodText : scenario.planStatus === 'Past due' ? styles.dangerText : styles.warningText}>{scenario.planStatus}</span></dd></div>
              <div><dt>Seats</dt><dd>{scenario.seats}</dd></div>
              <div><dt>Billing date</dt><dd>{scenario.renewal}</dd></div>
            </dl>
            <div className={styles.cardActions}>
              <Dialog>
                <DialogTrigger render={<Button disabled={!scenario.canEditBilling} />}>Review plan</DialogTrigger>
                <DialogContent className={styles.dialogContent}>
                  <DialogHeader>
                    <DialogTitle>Review plan change</DialogTitle>
                    <DialogDescription>Compare price, cadence, effective date, seats, and changed entitlements before continuing to checkout.</DialogDescription>
                  </DialogHeader>
                  <div className={styles.changePreview}>
                    <div><span>Current</span><b>{scenario.plan} · {scenario.seats}</b></div>
                    <ArrowRight aria-hidden="true" />
                    <div><span>Proposed</span><b>Enterprise · contract seats</b></div>
                  </div>
                  <Alert className={styles.notice}><ReceiptText /><AlertTitle>Price unavailable in this prototype</AlertTitle><AlertDescription>A real plan change cannot proceed until an authoritative quote or checkout preview is available.</AlertDescription></Alert>
                  <DialogFooter><DialogClose render={<Button variant="outline" />}>Close</DialogClose><Button disabled>Continue to review</Button></DialogFooter>
                </DialogContent>
              </Dialog>
              <Button variant="outline" disabled={!scenario.canEditBilling}>Payment method</Button>
            </div>
          </CardContent>
        </Card>
        <Card className={styles.quietCard}>
          <CardHeader>
            <div className={styles.cardTitleRow}><WalletCards aria-hidden="true" /><CardTitle>Submission-fee payouts</CardTitle></div>
            <CardDescription>Money collected for paid submissions and sent to your Organization.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className={styles.factList}>
              <div><dt>Connection</dt><dd>{scenario.payout}</dd></div>
              <div><dt>Destination</dt><dd>{scenario.payout === 'Connected' ? 'Bank account ending 4821' : 'Not available'}</dd></div>
              <div><dt>Available balance</dt><dd>{scenario.payout === 'Connected' ? '$2,480.00' : '—'}</dd></div>
              <div><dt>Schedule</dt><dd>{scenario.payout === 'Connected' ? 'Weekly' : 'Not configured'}</dd></div>
            </dl>
            <div className={styles.cardActions}>
              <Button variant="outline" disabled={!scenario.canEditBilling}>{scenario.payout === 'Connected' ? 'Manage with provider' : 'Set up payouts'}<ExternalLink /></Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className={styles.subsectionHeading}><div><h3>Invoices</h3><p>Invoice and payment records remain separate from payout transfers.</p></div><Button variant="ghost" disabled={!scenario.canEditBilling}><FileDown />Export invoices</Button></div>
      <div className={styles.tableWrap}>
        <Table>
          <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Period</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell>September 2026</TableCell><TableCell>1–30 Sep</TableCell><TableCell>$249.00</TableCell><TableCell><Badge variant="outline">Upcoming</Badge></TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" disabled>Not issued</Button></TableCell></TableRow>
            <TableRow><TableCell>August 2026</TableCell><TableCell>1–31 Aug</TableCell><TableCell>$249.00</TableCell><TableCell><Badge variant="outline">Paid</Badge></TableCell><TableCell className="text-right"><Button variant="ghost" size="sm">Download</Button></TableCell></TableRow>
          </TableBody>
        </Table>
      </div>
      <div className={styles.dangerZone}>
        <div><p className={styles.eyebrow}>Subscription action</p><h3>Schedule cancellation</h3><p>The plan remains active through the current billing period. This does not delete the Organization or disconnect payouts.</p></div>
        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="outline" disabled={!scenario.canEditBilling} />}>Review cancellation</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogMedia><AlertTriangle /></AlertDialogMedia>
              <AlertDialogTitle>Schedule plan cancellation?</AlertDialogTitle>
              <AlertDialogDescription>Program access will remain active until 14 September 2026. Organization records and payout settings are not deleted.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Keep plan</AlertDialogCancel><AlertDialogAction>Schedule cancellation</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  )
}

function TargetPanel({ section, scenario }: { section: Section; scenario: Scenario }) {
  const [enabled, setEnabled] = useState(false)
  const [dirty, setDirty] = useState(false)
  const editable = section.id === 'security' ? scenario.canEditSecurity : scenario.canEditGeneral
  const labels: Record<Exclude<SectionId, 'general' | 'billing'>, { title: string; intro: string; item: string; detail: string }> = {
    structure: { title: 'Structure', intro: 'Manage Entities, teams, and Programs without changing billing or access.', item: 'Artist development', detail: '2 active Opportunities · 3 Program managers' },
    brand: { title: 'Brand', intro: 'Control the public identity shown with your Opportunities and messages.', item: 'Organization logo', detail: 'Optional · text fallback available' },
    communications: { title: 'Communications', intro: 'Set sender and reply-to identity separately from message content.', item: 'Sending domain', detail: 'Not verified' },
    security: { title: 'Security', intro: 'Set sign-in and provisioning policy with tested recovery access.', item: 'Require MFA for elevated roles', detail: 'Owner and Organization Admin' },
    integrations: { title: 'Integrations', intro: 'Review connection scope, owner, and consequences before reconnecting or revoking.', item: 'Submission import connection', detail: 'No Organization integrations configured' },
    data: { title: 'Data governance', intro: 'Set retention and export policy without erasing legal holds or audit history.', item: 'Submission retention', detail: 'Policy not configured' },
  }
  const copy = labels[section.id as keyof typeof labels]
  return (
    <section aria-labelledby={`${section.id}-heading`}>
      <div className={styles.panelHeading}>
        <div><p className={styles.eyebrow}>Settings domain</p><h2 id={`${section.id}-heading`}>{copy.title}</h2><p>{copy.intro}</p></div>
        <Badge variant="outline">Contract target</Badge>
      </div>
      <Notice notice={scenario.notice} />
      <div className={styles.settingRow}>
        <div><b>{copy.item}</b><span>{copy.detail}</span></div>
        {section.id === 'security' || section.id === 'communications' ? (
          <Switch aria-label={`Enable ${copy.item}`} checked={enabled} onCheckedChange={(value) => { setEnabled(value); setDirty(true) }} disabled={!editable || scenario.legalHold} />
        ) : <Button variant="outline" disabled={!editable}>Review</Button>}
      </div>
      {section.id === 'data' && scenario.legalHold && <Alert className={`${styles.notice} ${styles.warning}`}><Landmark /><AlertTitle>Legal hold is active</AlertTitle><AlertDescription>Protected records are excluded from deletion and retention expiry.</AlertDescription></Alert>}
      <div className={styles.readinessList}>
        <div><Check aria-hidden="true" /><span><b>Permission rechecked at save</b><small>{section.authority}</small></span></div>
        <div><LockKeyhole aria-hidden="true" /><span><b>Independent transaction</b><small>Changes here never silently mutate another domain.</small></span></div>
        <div><ReceiptText aria-hidden="true" /><span><b>Audited change</b><small>Actor, before, after, scope, reason, and time.</small></span></div>
      </div>
      <SaveBoundary dirty={dirty} saving={false} allowed={editable} offline={scenario.offline} onSave={() => setDirty(false)} onReset={() => { setEnabled(false); setDirty(false) }} />
      {section.id === 'data' && (
        <div className={styles.dangerZone}>
          <div><p className={styles.eyebrow}>Danger zone</p><h3>{scenario.deletionScheduled ? 'Deletion is scheduled' : 'Delete Organization'}</h3><p>Deletion is separate from plan cancellation and requires active-work, payout, ownership, and legal-hold checks.</p></div>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" disabled={!scenario.canEditSecurity || scenario.legalHold} />}><Trash2 />Review deletion</AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogMedia><Trash2 /></AlertDialogMedia><AlertDialogTitle>Organization deletion is blocked in this prototype</AlertDialogTitle><AlertDialogDescription>A real flow must enumerate active Opportunities, Submissions, reviews, messages, payouts, export readiness, and legal holds before an Owner can schedule deletion.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Close</AlertDialogCancel><AlertDialogAction disabled>Schedule deletion</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </section>
  )
}

function StatusRail({ scenario, active }: { scenario: Scenario; active: Section }) {
  return (
    <aside className={styles.statusRail} aria-label="Section status and safeguards">
      <div className={styles.railBlock}>
        <p className={styles.eyebrow}>Your authority</p>
        <h3>{scenario.role}</h3>
        <p>{active.authority}</p>
        <Badge variant="outline">Server recheck required</Badge>
      </div>
      <div className={styles.railBlock}>
        <p className={styles.eyebrow}>Section state</p>
        <div className={styles.railStatus}><span className={statusTone(active.status)} aria-hidden="true" /><b>{active.status}</b></div>
        <p>{active.target ? 'This domain needs a durable server contract before product promotion.' : 'Existing records are available, but this composition is still local-only.'}</p>
      </div>
      <div className={styles.railBlock}>
        <p className={styles.eyebrow}>Safeguards</p>
        <ul>
          <li>One section saves at a time</li>
          <li>High-risk changes need review</li>
          <li>Stale edits never overwrite silently</li>
          <li>Commercial seats do not grant access</li>
        </ul>
      </div>
    </aside>
  )
}

function ControlCentre({ scenario, fixture }: { scenario: Scenario; fixture: Fixture }) {
  const [sectionId, setSectionId] = useState<SectionId>(fixture.startsWith('payout') || ['free', 'trialing', 'past-due', 'cancel-scheduled', 'enterprise', 'seat-limit', 'finance'].includes(fixture) ? 'billing' : fixture === 'legal-hold' || fixture.startsWith('deletion') || fixture === 'export-pending' ? 'data' : fixture === 'sso-test' || fixture === 'scim' ? 'security' : fixture.startsWith('domain') ? 'brand' : fixture === 'integration-revoked' ? 'integrations' : 'general')
  const active = baseSections.find((section) => section.id === sectionId) ?? baseSections[0]
  return (
    <div className={styles.controlLayout}>
      <nav className={styles.sectionNav} aria-label="Settings sections">
        <p>Settings</p>
        {baseSections.map((section) => {
          const Icon = section.icon
          return <button key={section.id} type="button" aria-current={section.id === sectionId ? 'page' : undefined} onClick={() => setSectionId(section.id)}><Icon aria-hidden="true" /><span><b>{section.label}</b><small>{section.description}</small></span><i className={statusTone(section.status)} aria-label={section.status} /></button>
        })}
      </nav>
      <label className={styles.mobileSectionSelect}>Settings section<select value={sectionId} onChange={(event) => setSectionId(event.target.value as SectionId)}>{baseSections.map((section) => <option key={section.id} value={section.id}>{section.label}</option>)}</select></label>
      <main className={styles.settingsPanel}>
        {sectionId === 'general' ? <GeneralPanel scenario={scenario} /> : sectionId === 'billing' ? <BillingPanel scenario={scenario} /> : <TargetPanel section={active} scenario={scenario} />}
      </main>
      <StatusRail scenario={scenario} active={active} />
    </div>
  )
}

function SettingsIndex({ scenario }: { scenario: Scenario }) {
  const [query, setQuery] = useState('')
  const visible = useMemo(() => baseSections.filter((section) => `${section.label} ${section.description}`.toLowerCase().includes(query.toLowerCase())), [query])
  return (
    <main className={styles.indexLayout}>
      <div className={styles.indexIntro}><div><p className={styles.eyebrow}>Option 01</p><h2>Settings index</h2><p>Find a settings domain, understand its state, and open one bounded task.</p></div><div className={styles.searchField}><Label htmlFor="settings-search">Search settings</Label><Input id="settings-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try billing or security" /></div></div>
      <Notice notice={scenario.notice} />
      <div className={styles.indexGrid}>
        {visible.map((section) => {
          const Icon = section.icon
          return <article key={section.id} className={styles.indexCard}><div className={styles.indexIcon}><Icon aria-hidden="true" /></div><div><h3>{section.label}</h3><p>{section.description}</p></div><div className={styles.indexMeta}><span><i className={statusTone(section.status)} />{section.status}</span><small>{section.authority}</small></div><Button variant="ghost">Open <ChevronRight /></Button></article>
        })}
      </div>
    </main>
  )
}

function GovernanceLedger({ scenario }: { scenario: Scenario }) {
  return (
    <main className={styles.ledgerLayout}>
      <div className={styles.ledgerIntro}><div><p className={styles.eyebrow}>Option 03</p><h2>Governance ledger</h2><p>Review every settings domain by state, authority, owner, and material consequence.</p></div><Button variant="outline"><FileDown />Export policy summary</Button></div>
      <Notice notice={scenario.notice} />
      <div className={styles.ledgerTable}>
        <Table>
          <TableHeader><TableRow><TableHead>Domain</TableHead><TableHead>State</TableHead><TableHead>Authority</TableHead><TableHead>Policy owner</TableHead><TableHead>Material consequence</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
          <TableBody>{baseSections.map((section) => <TableRow key={section.id}><TableCell><div className={styles.tableDomain}>{section.label}{section.target && <small>Contract target</small>}</div></TableCell><TableCell><span className={styles.ledgerStatus}><i className={statusTone(section.status)} />{section.status}</span></TableCell><TableCell>{section.authority}</TableCell><TableCell>{section.id === 'billing' ? 'Ade Adebayo' : section.id === 'data' ? 'Legal team' : 'Organization Owner'}</TableCell><TableCell>{section.id === 'billing' ? 'Entitlements and payment' : section.id === 'security' ? 'Sign-in and recovery' : section.id === 'data' ? 'Retention and deletion' : 'Organization configuration'}</TableCell><TableCell className="text-right"><Button variant="ghost" size="sm">Review</Button></TableCell></TableRow>)}</TableBody>
        </Table>
      </div>
    </main>
  )
}

function OrganizationSettingsBillingExperience({ selectedOnly }: { selectedOnly: boolean }) {
  const [direction, setDirection] = useState<Direction>('control')
  const [fixture, setFixture] = useState<Fixture>('healthy')
  const scenario = scenarioFor(fixture)
  const screenRef = useRef<HTMLDivElement>(null)
  const activeDirection: Direction = selectedOnly ? 'control' : direction

  return (
    <div className={styles.page}>
      <header className={styles.reviewHeader}>
        <div><p className={styles.eyebrow}>Local component library · product untouched</p><h1>{selectedOnly ? 'Organization Settings & Billing · Control centre' : 'Organization Settings & Billing'}</h1><p>{selectedOnly ? 'The selected focused settings composition, retained locally for page-by-page review.' : 'Three premium-component directions built around independent save boundaries, truthful commercial state, explicit authority, and recoverable high-risk actions.'}</p></div>
        <Badge variant="outline">Option 02 selected</Badge>
      </header>
      <section className={styles.directionChooser} aria-labelledby="direction-heading">
        <div className={styles.chooserHeading}><div><p className={styles.eyebrow}>{selectedOnly ? 'Selected composition' : 'Visual direction'}</p><h2 id="direction-heading">{selectedOnly ? '02 · Control centre' : 'Compare the same contract'}</h2></div><label className={styles.fixtureControl}>Edge-case fixture<select value={fixture} onChange={(event) => setFixture(event.target.value as Fixture)}>{fixtureOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>
        {selectedOnly ? null : <div className={styles.directionOptions}>{directions.map((option) => <button key={option.id} type="button" className={styles.directionOption} data-selected={activeDirection === option.id} aria-pressed={activeDirection === option.id} onClick={() => { setDirection(option.id); window.setTimeout(() => screenRef.current?.focus(), 0) }}><span>{option.number}</span><div><b>{option.name}</b><p>{option.description}</p></div>{activeDirection === option.id && <Check aria-hidden="true" />}</button>)}</div>}
      </section>
      <div className={styles.screen} ref={screenRef} tabIndex={-1}>
        <header className={styles.productBar}>
          <a href="#settings-content" className={styles.wordmark}>MISSA</a>
          <div className={styles.organizationIdentity}><span>Organization</span><b>{scenario.organizationName}</b></div>
          <nav aria-label="Organization"><a href="#opportunities">Opportunities</a><a href="#submissions">Submissions</a><a href="#reviews">Reviews</a><a href="#people">People</a><a href="#settings-content" aria-current="page">Settings</a></nav>
          <button type="button" className={styles.avatarButton} aria-label={`Account menu for ${scenario.role}`}>AA</button>
        </header>
        <div className={styles.screenHeading}>
          <div><p className={styles.eyebrow}>{activeDirection === 'control' ? 'Organization control centre' : 'Organization governance'}</p><h2>Settings & billing</h2><p>Configure this Organization without mixing identity, security, access, billing, or payouts.</p></div>
          <div className={styles.headingFacts}><span><UsersRound />{scenario.seats} seats</span><span><BadgeDollarSign />{scenario.plan} · {scenario.planStatus}</span></div>
        </div>
        {scenario.loading ? <div className={styles.loadingState} aria-label="Loading settings"><span /><span /><span /></div> : scenario.error ? <div className={styles.errorState}><AlertTriangle /><h2>Settings could not be loaded</h2><p>Try again. No changes were made.</p><Button>Try again</Button></div> : <div id="settings-content">{activeDirection === 'index' ? <SettingsIndex scenario={scenario} /> : activeDirection === 'ledger' ? <GovernanceLedger scenario={scenario} /> : <ControlCentre key={fixture} scenario={scenario} fixture={fixture} />}</div>}
      </div>
    </div>
  )
}

export function OrganizationSettingsBillingDirections() {
  return <OrganizationSettingsBillingExperience selectedOnly={false} />
}

export function OrganizationSettingsBillingSelected() {
  return <OrganizationSettingsBillingExperience selectedOnly />
}
