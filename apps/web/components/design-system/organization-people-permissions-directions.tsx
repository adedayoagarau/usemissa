'use client'

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Crown,
  FileClock,
  Filter,
  KeyRound,
  LockKeyhole,
  Menu,
  MoreHorizontal,
  Search,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  UserMinus,
  UserPlus,
  UsersRound,
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import styles from './organization-people-permissions-directions.module.css'

type Direction = 'ledger' | 'dossier' | 'map'
type Fixture =
  | 'healthy'
  | 'sole-owner'
  | 'two-owners'
  | 'self-edit'
  | 'transfer-pending'
  | 'program-scope'
  | 'multi-scope'
  | 'reviewer-assigned'
  | 'guest-expiring'
  | 'guest-expired'
  | 'legacy-member'
  | 'invite-pending'
  | 'invite-bounced'
  | 'seat-limit'
  | 'scim-managed'
  | 'suspended'
  | 'long-identity'
  | 'large-directory'
  | 'empty'
  | 'no-results'
  | 'denied'
  | 'stale-edit'
  | 'loading'
  | 'error'
  | 'offline'

type Role = 'Organization Owner' | 'Organization Admin' | 'Team Admin' | 'Program Manager' | 'Reviewer' | 'Finance' | 'Legal' | 'Viewer' | 'Guest' | 'Legacy member'
type AccessState = 'Active' | 'Pending invitation' | 'Expiring' | 'Expired' | 'Bounced' | 'Suspended' | 'Provisioned'
type SeatClass = 'Core' | 'Reviewer' | 'Viewer' | 'Guest' | 'Legacy'

type Person = {
  id: string
  name: string
  email: string
  initials: string
  role: Role
  scope: string
  scopeDetail: string
  seat: SeatClass
  state: AccessState
  currentUser?: boolean
  owner?: boolean
  managedBy?: 'Missa' | 'SCIM'
  expiry?: string
  lastAccess?: string
  assignments: string[]
  capabilities: string[]
  restrictions: string[]
}

type FixtureData = {
  people: Person[]
  selectedId: string
  seatUsed: number
  seatLimit: number
  canManage: boolean
  note?: string
  loading?: boolean
  error?: boolean
  offline?: boolean
  denied?: boolean
  query?: string
}

const directions = [
  { id: 'ledger' as const, number: '01', name: 'Directory ledger', description: 'A compact directory and invitation queue for high-volume administration.' },
  { id: 'dossier' as const, number: '02', name: 'Access dossier', description: 'Keeps one person’s role, scope, assignments, and safeguards together.' },
  { id: 'map' as const, number: '03', name: 'Team map', description: 'Groups people by Entity/team and Program scope for portfolio governance.' },
]

const fixtures: Array<{ value: Fixture; label: string }> = [
  { value: 'healthy', label: 'Healthy multi-role Organization' },
  { value: 'sole-owner', label: 'Current user is sole Owner' },
  { value: 'two-owners', label: 'Two Owners' },
  { value: 'self-edit', label: 'Current user edits own access' },
  { value: 'transfer-pending', label: 'Ownership transfer awaiting acceptance' },
  { value: 'program-scope', label: 'Program Manager restricted scope' },
  { value: 'multi-scope', label: 'Different roles across scopes' },
  { value: 'reviewer-assigned', label: 'Reviewer has unfinished assignments' },
  { value: 'guest-expiring', label: 'Guest expires today' },
  { value: 'guest-expired', label: 'Guest access expired' },
  { value: 'legacy-member', label: 'Legacy member role' },
  { value: 'invite-pending', label: 'Pending invitation' },
  { value: 'invite-bounced', label: 'Invitation email bounced' },
  { value: 'seat-limit', label: 'Seat limit reached' },
  { value: 'scim-managed', label: 'SCIM-managed person' },
  { value: 'suspended', label: 'Suspended account' },
  { value: 'long-identity', label: 'Long name and email' },
  { value: 'large-directory', label: '1,000+ memberships' },
  { value: 'empty', label: 'Organization bootstrap' },
  { value: 'no-results', label: 'No search results' },
  { value: 'denied', label: 'Permission denied' },
  { value: 'stale-edit', label: 'Access changed elsewhere' },
  { value: 'loading', label: 'Loading' },
  { value: 'error', label: 'Recoverable error' },
  { value: 'offline', label: 'Offline before save' },
]

const roleDescriptions: Record<Role, string> = {
  'Organization Owner': 'Full Organization governance, security, billing, and operational access.',
  'Organization Admin': 'Manages people, Opportunities, workflows, and Organization operations.',
  'Team Admin': 'Runs one assigned Entity or team without Organization ownership controls.',
  'Program Manager': 'Runs assigned Programs and Opportunities.',
  Reviewer: 'Reviews only assigned rounds or records.',
  Finance: 'Handles financial records in assigned scope without artistic review access.',
  Legal: 'Handles agreements, consent, retention, and audit in assigned scope.',
  Viewer: 'Reads approved aggregate views without mutations.',
  Guest: 'Temporary, narrow access to explicitly assigned work.',
  'Legacy member': 'Compatibility role whose effective capabilities need review.',
}

const basePeople: Person[] = [
  {
    id: 'ade',
    name: 'Ade Adebayo',
    email: 'ade@missa.org',
    initials: 'AA',
    role: 'Organization Owner',
    scope: 'Whole Organization',
    scopeDetail: 'Missa Arts Foundation',
    seat: 'Core',
    state: 'Active',
    currentUser: true,
    owner: true,
    managedBy: 'Missa',
    lastAccess: 'Today',
    assignments: ['Ownership and security', 'Billing contact', '2 message approvals'],
    capabilities: ['Manage people and access', 'Transfer ownership', 'Manage billing and security', 'Operate all Programs'],
    restrictions: ['Ownership transfer requires acceptance and step-up verification'],
  },
  {
    id: 'maya',
    name: 'Maya Okafor',
    email: 'maya.okafor@missa.org',
    initials: 'MO',
    role: 'Organization Admin',
    scope: 'Whole Organization',
    scopeDetail: 'Missa Arts Foundation',
    seat: 'Core',
    state: 'Active',
    managedBy: 'Missa',
    lastAccess: 'Yesterday',
    assignments: ['3 Opportunity drafts', '1 message approval'],
    capabilities: ['Manage people and access', 'Manage Opportunities', 'Assign reviewers', 'Send approved messages'],
    restrictions: ['Cannot take or transfer ownership without an Owner'],
  },
  {
    id: 'zainab',
    name: 'Zainab Bello',
    email: 'zainab.bello@missa.org',
    initials: 'ZB',
    role: 'Program Manager',
    scope: 'One Program',
    scopeDetail: 'Artist development',
    seat: 'Core',
    state: 'Active',
    managedBy: 'Missa',
    lastAccess: '2 days ago',
    assignments: ['Open Studio Fellowship', 'New Voices Residency', '4 incomplete decisions'],
    capabilities: ['Manage assigned Opportunities', 'View assigned Submissions', 'Assign reviews', 'Prepare decisions'],
    restrictions: ['No Commissions Program access', 'No Organization billing or ownership access'],
  },
  {
    id: 'tomi',
    name: 'Tomi Adeyemi',
    email: 'tomi.adeyemi@example.com',
    initials: 'TA',
    role: 'Reviewer',
    scope: 'Assigned round',
    scopeDetail: 'Open Studio · First reader review',
    seat: 'Reviewer',
    state: 'Active',
    managedBy: 'Missa',
    lastAccess: 'Today',
    assignments: ['14 assigned Submissions', '5 reviews incomplete'],
    capabilities: ['Open assigned Submissions', 'Record own recommendation', 'Read round guidance'],
    restrictions: ['No other reviewer notes', 'No finance or final decision access', 'Submitter identity follows round policy'],
  },
  {
    id: 'chidi',
    name: 'Chidi Mensah',
    email: 'chidi.mensah@missa.org',
    initials: 'CM',
    role: 'Finance',
    scope: 'Whole Organization',
    scopeDetail: 'Financial records only',
    seat: 'Core',
    state: 'Active',
    managedBy: 'Missa',
    lastAccess: '5 days ago',
    assignments: ['7 payment exceptions'],
    capabilities: ['View payment states', 'Resolve refunds and waivers', 'Prepare finance exports'],
    restrictions: ['No artistic scores', 'No private reviewer notes'],
  },
  {
    id: 'elena',
    name: 'Elena García',
    email: 'elena.garcia@example.org',
    initials: 'EG',
    role: 'Viewer',
    scope: 'One Program',
    scopeDetail: 'Residencies',
    seat: 'Viewer',
    state: 'Active',
    managedBy: 'Missa',
    lastAccess: '1 week ago',
    assignments: ['Board reporting'],
    capabilities: ['Read approved aggregate reports'],
    restrictions: ['No record-level drill-down', 'No mutations', 'Export requires separate capability'],
  },
  {
    id: 'nnenna-invite',
    name: 'Nnenna Eze',
    email: 'nnenna.eze@example.org',
    initials: 'NE',
    role: 'Legal',
    scope: 'One Program',
    scopeDetail: 'Public commissions',
    seat: 'Core',
    state: 'Pending invitation',
    managedBy: 'Missa',
    expiry: 'Expires in 5 days',
    assignments: [],
    capabilities: ['Review agreements and consent records in assigned Program'],
    restrictions: ['No access until invitation is accepted'],
  },
]

function clonePeople() {
  return basePeople.map((person) => ({ ...person, assignments: [...person.assignments], capabilities: [...person.capabilities], restrictions: [...person.restrictions] }))
}

function fixtureData(fixture: Fixture): FixtureData {
  const people = clonePeople()
  const base: FixtureData = { people, selectedId: 'zainab', seatUsed: 7, seatLimit: 10, canManage: true }
  if (fixture === 'sole-owner') return { ...base, selectedId: 'ade', people: people.filter((person) => person.id !== 'maya'), seatUsed: 6, note: 'Ade is the only Owner. Ownership must be transferred and accepted before this access can be reduced or removed.' }
  if (fixture === 'two-owners') return { ...base, selectedId: 'maya', people: people.map((person) => person.id === 'maya' ? { ...person, role: 'Organization Owner', owner: true, capabilities: [...person.capabilities, 'Transfer ownership'] } : person), note: 'Two active Owners preserve continuity; either can begin a deliberate ownership transfer.' }
  if (fixture === 'self-edit') return { ...base, selectedId: 'ade', note: 'You are reviewing your own access. Self-demotion cannot leave the Organization without an active Owner.' }
  if (fixture === 'transfer-pending') return { ...base, selectedId: 'maya', note: 'Ownership transfer to Maya is awaiting acceptance. Ade remains the Owner until acceptance and verification are complete.' }
  if (fixture === 'program-scope') return { ...base, selectedId: 'zainab' }
  if (fixture === 'multi-scope') return { ...base, selectedId: 'zainab', people: people.map((person) => person.id === 'zainab' ? { ...person, scope: 'Multiple scopes', scopeDetail: 'Program Manager · Artist development; Reviewer · Public commissions', capabilities: [...person.capabilities, 'Review assigned Public commissions round'] } : person), note: 'Role and scope are separate. One person may hold different roles in different Programs without gaining Organization-wide access.' }
  if (fixture === 'reviewer-assigned') return { ...base, selectedId: 'tomi', note: 'Five incomplete review assignments need reassignment before Tomi’s access can end.' }
  if (fixture === 'guest-expiring') return { ...base, selectedId: 'guest', seatUsed: 8, people: [...people, { id: 'guest', name: 'Kwame Boateng', email: 'kwame@example.net', initials: 'KB', role: 'Guest', scope: 'One review round', scopeDetail: 'Public Art · Final panel', seat: 'Guest', state: 'Expiring', expiry: 'Expires today at 6:00 PM PDT', managedBy: 'Missa', lastAccess: 'Today', assignments: ['2 assigned Submissions'], capabilities: ['Open assigned Submissions', 'Record own recommendation'], restrictions: ['No Organization directory', 'No access after expiry'] }], note: 'Guest access expires today. Extension requires a new explicit expiry and revalidation of assignments.' }
  if (fixture === 'guest-expired') return { ...base, selectedId: 'guest', people: [...people, { id: 'guest', name: 'Kwame Boateng', email: 'kwame@example.net', initials: 'KB', role: 'Guest', scope: 'One review round', scopeDetail: 'Public Art · Final panel', seat: 'Guest', state: 'Expired', expiry: 'Expired yesterday', managedBy: 'Missa', lastAccess: '2 days ago', assignments: [], capabilities: [], restrictions: ['No active access', 'Historical review authorship preserved'] }], note: 'Expired access is not silently reactivated. A new grant requires a new expiry and scope.' }
  if (fixture === 'legacy-member') return { ...base, selectedId: 'legacy', seatUsed: 8, people: [...people, { id: 'legacy', name: 'Amina Yusuf', email: 'amina@example.org', initials: 'AY', role: 'Legacy member', scope: 'Whole Organization', scopeDetail: 'Compatibility membership', seat: 'Legacy', state: 'Active', managedBy: 'Missa', lastAccess: '3 weeks ago', assignments: [], capabilities: ['Effective access requires server mapping review'], restrictions: ['Not available for new invitations', 'Do not assume read or write capability from this label'] }], note: 'Legacy member is a compatibility role. Review and migrate it to an explicit role and scope.' }
  if (fixture === 'invite-pending') return { ...base, selectedId: 'nnenna-invite' }
  if (fixture === 'invite-bounced') return { ...base, selectedId: 'nnenna-invite', people: people.map((person) => person.id === 'nnenna-invite' ? { ...person, state: 'Bounced', expiry: 'Delivery failed' } : person), note: 'The invitation was not delivered. Correct the address or revoke it before sending a replacement.' }
  if (fixture === 'seat-limit') return { ...base, seatUsed: 10, seatLimit: 10, note: 'No seat is available. Invitation details remain intact while an authorized person reviews billing or releases an unused seat.' }
  if (fixture === 'scim-managed') return { ...base, selectedId: 'maya', people: people.map((person) => person.id === 'maya' ? { ...person, state: 'Provisioned', managedBy: 'SCIM', restrictions: [...person.restrictions, 'Identity and Organization membership are managed by SCIM'] } : person), note: 'SCIM manages Maya’s identity and membership. Local edits that conflict with directory provisioning are disabled.' }
  if (fixture === 'suspended') return { ...base, selectedId: 'tomi', people: people.map((person) => person.id === 'tomi' ? { ...person, state: 'Suspended', capabilities: [], restrictions: ['No active sessions or access', 'Five review assignments still require reassignment'] } : person), note: 'Suspension stops access but preserves review authorship and pending reassignment work.' }
  if (fixture === 'long-identity') return { ...base, selectedId: 'long', seatUsed: 8, people: [...people, { ...people[2]!, id: 'long', name: 'Professor Nkiruka-Adanna Oluwaseun van der Merwe', email: 'nkiruka-adanna.oluwaseun.vandermerwe@international-cultural-cooperation.example.org', initials: 'NO' }] }
  if (fixture === 'large-directory') return { ...base, seatUsed: 1032, seatLimit: 1200, note: '1,032 memberships require server pagination, URL-backed filters, and selection that survives page changes. This fixture validates layout only.' }
  if (fixture === 'empty') return { ...base, people: [], selectedId: '', seatUsed: 0, seatLimit: 3, note: 'The first active Owner must be established during Organization creation; an empty Organization cannot be left ownerless.' }
  if (fixture === 'no-results') return { ...base, query: 'No matching person', note: 'No people or invitations match the current search and filters.' }
  if (fixture === 'denied') return { ...base, canManage: false, denied: true, note: 'Your current role does not include people-directory access.' }
  if (fixture === 'stale-edit') return { ...base, selectedId: 'zainab', note: 'Zainab’s access changed after this view opened. Compare the newer role and scope before trying again.' }
  if (fixture === 'loading') return { ...base, loading: true }
  if (fixture === 'error') return { ...base, error: true }
  if (fixture === 'offline') return { ...base, offline: true, note: 'You are offline. Search remains available on loaded records, but access changes cannot be reviewed or saved.' }
  return base
}

function stateTone(state: AccessState) {
  if (state === 'Active' || state === 'Provisioned') return 'positive'
  if (state === 'Pending invitation' || state === 'Expiring') return 'attention'
  if (state === 'Expired' || state === 'Bounced' || state === 'Suspended') return 'danger'
  return 'neutral'
}

function PersonIdentity({ person, compact = false }: { person: Person; compact?: boolean }) {
  return (
    <div className={styles.personIdentity} data-compact={compact}>
      <Avatar size={compact ? 'default' : 'lg'}><AvatarFallback>{person.initials}</AvatarFallback></Avatar>
      <div><p>{person.name}{person.currentUser ? <span>You</span> : null}</p><small>{person.email}</small></div>
    </div>
  )
}

function AccessBadges({ person }: { person: Person }) {
  return (
    <div className={styles.badges}>
      <Badge variant="outline" data-tone={stateTone(person.state)}>{person.state}</Badge>
      <Badge variant="outline">{person.role}</Badge>
      <Badge variant="outline">{person.seat} seat</Badge>
    </div>
  )
}

function SeatSummary({ used, limit }: { used: number; limit: number }) {
  const remaining = Math.max(limit - used, 0)
  return (
    <Card className={styles.seatCard}>
      <CardContent>
        <div><p>Organization seats</p><b>{used.toLocaleString()} <span>of {limit.toLocaleString()}</span></b></div>
        <p>{remaining ? `${remaining.toLocaleString()} available` : 'Seat limit reached'}<span>Seat capacity does not grant permission.</span></p>
      </CardContent>
    </Card>
  )
}

function InviteDialog({ seatAvailable, onStatus }: { seatAvailable: boolean; onStatus: (message: string) => void }) {
  const [role, setRole] = useState<Role>('Reviewer')
  const [scope, setScope] = useState('One review round')
  const [email, setEmail] = useState('')
  return (
    <Dialog>
      <DialogTrigger render={<Button />}><UserPlus aria-hidden="true" />Invite person</DialogTrigger>
      <DialogContent className={styles.inviteDialog}>
        <DialogHeader><DialogTitle>Invite a person</DialogTitle><DialogDescription>Role and scope are reviewed separately before any access is offered.</DialogDescription></DialogHeader>
        <div className={styles.formGrid}>
          <div><Label htmlFor="invite-email">Email address</Label><Input id="invite-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.org" /></div>
          <div><Label htmlFor="invite-role">Role bundle</Label><Select value={role} onValueChange={(value) => setRole(value as Role)}><SelectTrigger id="invite-role"><SelectValue>{(value: string) => value}</SelectValue></SelectTrigger><SelectContent>{(['Organization Admin', 'Team Admin', 'Program Manager', 'Reviewer', 'Finance', 'Legal', 'Viewer', 'Guest'] as Role[]).map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select><p>{roleDescriptions[role]}</p></div>
          <div><Label htmlFor="invite-scope">Resource scope</Label><Select value={scope} onValueChange={(value) => setScope(value ?? '')}><SelectTrigger id="invite-scope"><SelectValue>{(value: string) => value}</SelectValue></SelectTrigger><SelectContent><SelectItem value="Whole Organization">Whole Organization</SelectItem><SelectItem value="One Program">One Program</SelectItem><SelectItem value="One Opportunity">One Opportunity</SelectItem><SelectItem value="One review round">One review round</SelectItem></SelectContent></Select></div>
          {role === 'Guest' ? <div><Label htmlFor="invite-expiry">Access expires</Label><Input id="invite-expiry" type="date" defaultValue="2026-08-15" /><p>Guest access requires an explicit expiry.</p></div> : null}
          <div className={styles.accessPreview}><ShieldCheck aria-hidden="true" /><div><b>Effective access preview</b><p>{role} · {scope}. Invitation acceptance creates access only after server validation.</p></div></div>
          {!seatAvailable ? <Alert variant="destructive"><CircleAlert aria-hidden="true" /><AlertTitle>Seat limit reached</AlertTitle><AlertDescription>Invitation content is preserved. Release a seat or review billing before sending.</AlertDescription></Alert> : null}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <DialogClose render={<Button disabled={!seatAvailable || !email.includes('@')} onClick={() => onStatus(`Invitation preview prepared for ${email}. No product invitation was sent.`)} />}>Review invitation</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ChangeAccessDialog({ person, fixture, onStatus }: { person: Person; fixture: Fixture; onStatus: (message: string) => void }) {
  const [role, setRole] = useState<Role>(person.role)
  const [scope, setScope] = useState(person.scope)
  const scimLocked = person.managedBy === 'SCIM'
  const stale = fixture === 'stale-edit'
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}><KeyRound aria-hidden="true" />Change access</DialogTrigger>
      <DialogContent className={styles.inviteDialog}>
        <DialogHeader><DialogTitle>Change {person.name}&apos;s access</DialogTitle><DialogDescription>Review the role bundle, resource scope, and affected work before saving.</DialogDescription></DialogHeader>
        <div className={styles.formGrid}>
          {scimLocked ? <Alert><LockKeyhole aria-hidden="true" /><AlertTitle>Managed by SCIM</AlertTitle><AlertDescription>Change this membership in the connected identity directory.</AlertDescription></Alert> : null}
          {stale ? <Alert variant="destructive"><FileClock aria-hidden="true" /><AlertTitle>Access changed elsewhere</AlertTitle><AlertDescription>The newer state must be reloaded and compared before another change can be saved.</AlertDescription></Alert> : null}
          <div><Label htmlFor={`edit-role-${person.id}`}>Role bundle</Label><Select value={role} disabled={scimLocked} onValueChange={(value) => setRole(value as Role)}><SelectTrigger id={`edit-role-${person.id}`}><SelectValue>{(value: string) => value}</SelectValue></SelectTrigger><SelectContent>{Object.keys(roleDescriptions).filter((item) => item !== 'Legacy member').map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
          <div><Label htmlFor={`edit-scope-${person.id}`}>Resource scope</Label><Select value={scope} disabled={scimLocked} onValueChange={(value) => setScope(value ?? '')}><SelectTrigger id={`edit-scope-${person.id}`}><SelectValue>{(value: string) => value}</SelectValue></SelectTrigger><SelectContent><SelectItem value="Whole Organization">Whole Organization</SelectItem><SelectItem value="One team">One Entity or team</SelectItem><SelectItem value="One Program">One Program</SelectItem><SelectItem value="One Opportunity">One Opportunity</SelectItem><SelectItem value="Assigned round">Assigned review round</SelectItem></SelectContent></Select></div>
          <div className={styles.changeSummary}><div><span>Before</span><b>{person.role}</b><p>{person.scope} · {person.scopeDetail}</p></div><ArrowRight aria-hidden="true" /><div><span>Proposed</span><b>{role}</b><p>{scope}</p></div></div>
          {person.assignments.length ? <Alert><CircleAlert aria-hidden="true" /><AlertTitle>Check assigned work</AlertTitle><AlertDescription>{person.assignments.join(' · ')}. Reduced access may require reassignment.</AlertDescription></Alert> : null}
        </div>
        <DialogFooter><DialogClose render={<Button variant="outline" />}>Cancel</DialogClose><DialogClose render={<Button disabled={scimLocked || stale} onClick={() => onStatus(`Local preview: ${person.name}'s proposed access was reviewed but not saved to product data.`)} />}>Review and save</DialogClose></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RemoveAccessDialog({ person, soleOwner, onStatus }: { person: Person; soleOwner: boolean; onStatus: (message: string) => void }) {
  const hasAssignments = person.assignments.length > 0
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" />}><UserMinus aria-hidden="true" />End access</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia><ShieldOff aria-hidden="true" /></AlertDialogMedia>
          <AlertDialogTitle>{soleOwner ? 'Transfer ownership first' : `End ${person.name}'s access?`}</AlertDialogTitle>
          <AlertDialogDescription>{soleOwner ? 'An Organization must keep an active Owner. Choose an eligible person, complete transfer, and wait for acceptance before reducing this access.' : hasAssignments ? `${person.name} still has assigned work. Reassign it before ending access; historical authorship will remain.` : 'This removes future Organization access but preserves historical actions and audit records.'}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {soleOwner ? <AlertDialogCancel render={<Button />}>Review ownership transfer</AlertDialogCancel> : hasAssignments ? <AlertDialogCancel render={<Button />}>Reassign work</AlertDialogCancel> : <AlertDialogAction variant="destructive" onClick={() => onStatus(`Local preview: ${person.name}'s access was not changed.`)}>End access</AlertDialogAction>}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function PersonDossier({ person, fixture, onBack, onStatus }: { person: Person; fixture: Fixture; onBack?: () => void; onStatus: (message: string) => void }) {
  const soleOwner = fixture === 'sole-owner' && person.owner === true
  return (
    <section className={styles.dossier} aria-labelledby={`person-${person.id}`}>
      {onBack ? <Button variant="ghost" className={styles.backButton} onClick={onBack}><ArrowLeft aria-hidden="true" />Back to people</Button> : null}
      <header className={styles.dossierHeader}>
        <PersonIdentity person={person} />
        <AccessBadges person={person} />
      </header>
      <div className={styles.dossierTitle}><div><p className={styles.eyebrow}>Effective access</p><h3 id={`person-${person.id}`}>{person.role}</h3><p>{roleDescriptions[person.role]}</p></div><Badge variant="outline">{person.managedBy ?? 'Missa'} managed</Badge></div>
      <dl className={styles.accessFacts}>
        <div><dt>Scope</dt><dd>{person.scope}<span>{person.scopeDetail}</span></dd></div>
        <div><dt>Seat</dt><dd>{person.seat}<span>Commercial capacity only</span></dd></div>
        <div><dt>Last access</dt><dd>{person.lastAccess ?? 'Not yet'}<span>{person.state}</span></dd></div>
        {person.expiry ? <div><dt>Expiry</dt><dd>{person.expiry}<span>Does not renew automatically</span></dd></div> : null}
      </dl>
      <div className={styles.capabilityGrid}>
        <section><h4><ShieldCheck aria-hidden="true" />Can do</h4><ul>{person.capabilities.map((item) => <li key={item}><Check aria-hidden="true" />{item}</li>)}</ul></section>
        <section><h4><LockKeyhole aria-hidden="true" />Boundaries</h4><ul>{person.restrictions.map((item) => <li key={item}><span aria-hidden="true">—</span>{item}</li>)}</ul></section>
      </div>
      <section className={styles.assignments}><div><h4>Assigned work</h4><p>Operational responsibility is separate from permission.</p></div>{person.assignments.length ? <ul>{person.assignments.map((item) => <li key={item}>{item}</li>)}</ul> : <p>No active assignments recorded.</p>}</section>
      {soleOwner ? <Alert className={styles.ownerAlert}><Crown aria-hidden="true" /><AlertTitle>Sole Owner safeguard</AlertTitle><AlertDescription>Ownership transfer must be accepted before this person can leave or lose Owner access.</AlertDescription></Alert> : null}
      <footer className={styles.dossierActions}><ChangeAccessDialog person={person} fixture={fixture} onStatus={onStatus} /><RemoveAccessDialog person={person} soleOwner={soleOwner} onStatus={onStatus} /></footer>
    </section>
  )
}

function DirectoryList({ people, selectedId, onSelect, triggerRefs }: { people: Person[]; selectedId: string; onSelect: (id: string) => void; triggerRefs: React.MutableRefObject<Record<string, HTMLButtonElement | null>> }) {
  return (
    <div className={styles.directoryList}>
      {people.map((person) => <button key={person.id} ref={(node) => { triggerRefs.current[person.id] = node }} type="button" className={styles.personRow} data-selected={person.id === selectedId} onClick={() => onSelect(person.id)} aria-pressed={person.id === selectedId}><PersonIdentity person={person} compact /><div className={styles.rowMeta}><AccessBadges person={person} /><span>{person.scope} · {person.scopeDetail}</span></div><ChevronRight aria-hidden="true" /></button>)}
    </div>
  )
}

function LedgerDirection({ people, fixture, onStatus }: { people: Person[]; fixture: Fixture; onStatus: (message: string) => void }) {
  return (
    <Card className={styles.directoryCard}>
      <CardHeader className={styles.cardHeader}><div><CardTitle>People and invitations</CardTitle><CardDescription>Commercial seat, access state, role, and scope remain separate.</CardDescription></div><Badge variant="outline">{people.length.toLocaleString()} records</Badge></CardHeader>
      <CardContent className={styles.tableContent}>
        <div className={styles.tableScroller}><table><caption className="sr-only">Organization people and invitation directory</caption><thead><tr><th scope="col">Person</th><th scope="col">Access state</th><th scope="col">Role</th><th scope="col">Scope</th><th scope="col">Seat</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{people.map((person) => <tr key={person.id}><th scope="row"><PersonIdentity person={person} compact /></th><td><Badge variant="outline" data-tone={stateTone(person.state)}>{person.state}</Badge></td><td>{person.role}</td><td><b>{person.scope}</b><small>{person.scopeDetail}</small></td><td>{person.seat}</td><td><ChangeAccessDialog person={person} fixture={fixture} onStatus={onStatus} /></td></tr>)}</tbody></table></div>
        <div className={styles.mobileLedger}>{people.map((person) => <article key={person.id}><PersonIdentity person={person} /><AccessBadges person={person} /><dl><div><dt>Scope</dt><dd>{person.scope}</dd></div><div><dt>Detail</dt><dd>{person.scopeDetail}</dd></div></dl><ChangeAccessDialog person={person} fixture={fixture} onStatus={onStatus} /></article>)}</div>
      </CardContent>
    </Card>
  )
}

function TeamMapDirection({ people }: { people: Person[] }) {
  const groups = [
    { name: 'Whole Organization', description: 'Governance and shared operations', people: people.filter((person) => person.scope === 'Whole Organization') },
    { name: 'Artist development', description: 'Open Studio Fellowship · New Voices Residency', people: people.filter((person) => person.scopeDetail.includes('Artist development') || person.scopeDetail.includes('Open Studio')) },
    { name: 'Residencies', description: 'Program-level reporting and review', people: people.filter((person) => person.scopeDetail.includes('Residencies')) },
    { name: 'Public commissions', description: 'Commission and legal review', people: people.filter((person) => person.scopeDetail.toLowerCase().includes('public')) },
  ].filter((group) => group.people.length)
  return (
    <div className={styles.teamMap}>
      <Alert><Sparkles aria-hidden="true" /><AlertTitle>Target contract</AlertTitle><AlertDescription>This map becomes authoritative only when scoped membership records exist. It does not infer access from current Organization-wide roles.</AlertDescription></Alert>
      {groups.map((group) => <Card key={group.name}><CardHeader className={styles.cardHeader}><div><CardTitle>{group.name}</CardTitle><CardDescription>{group.description}</CardDescription></div><Badge variant="outline">{group.people.length} people</Badge></CardHeader><CardContent className={styles.mapPeople}>{group.people.map((person) => <div key={person.id}><PersonIdentity person={person} compact /><p><b>{person.role}</b><span>{person.scope}</span></p></div>)}</CardContent></Card>)}
    </div>
  )
}

function EmptyState() {
  return <section className={styles.emptyState}><div><UsersRound aria-hidden="true" /></div><h3>No people are listed yet</h3><p>An Organization cannot operate without an active Owner. Establish ownership before inviting additional roles.</p><Button><UserPlus aria-hidden="true" />Establish first Owner</Button></section>
}

function LoadingState() {
  return <div className={styles.loading} aria-busy="true" aria-label="Loading people and permissions"><span /><span /><span /><span /></div>
}

function ErrorState() {
  return <Alert variant="destructive" className={styles.errorState}><AlertCircle aria-hidden="true" /><AlertTitle>People and permissions could not be loaded</AlertTitle><AlertDescription>Nothing was changed. Try again or return to the Organization overview.</AlertDescription><div><Button><ArrowRight aria-hidden="true" />Try again</Button><Button variant="outline">Organization overview</Button></div></Alert>
}

function OrganizationPeoplePermissionsExperience({ selectedOnly }: { selectedOnly: boolean }) {
  const [direction, setDirection] = useState<Direction>('dossier')
  const [fixture, setFixture] = useState<Fixture>('healthy')
  const [selectedId, setSelectedId] = useState('zainab')
  const [mobileDetail, setMobileDetail] = useState(false)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const data = useMemo(() => fixtureData(fixture), [fixture])

  const visiblePeople = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return data.people
    return data.people.filter((person) => `${person.name} ${person.email} ${person.role} ${person.scope} ${person.scopeDetail}`.toLowerCase().includes(normalized))
  }, [data.people, query])
  const selected = data.people.find((person) => person.id === selectedId) ?? visiblePeople[0]
  const activeDirectionId: Direction = selectedOnly ? 'dossier' : direction
  const activeDirection = directions.find((item) => item.id === activeDirectionId) ?? directions[1]!

  function selectPerson(id: string) {
    setSelectedId(id)
    setMobileDetail(true)
  }

  function backToDirectory() {
    setMobileDetail(false)
    requestAnimationFrame(() => triggerRefs.current[selectedId]?.focus())
  }

  function changeFixture(nextFixture: Fixture) {
    const nextData = fixtureData(nextFixture)
    setFixture(nextFixture)
    setSelectedId(nextData.selectedId)
    setQuery(nextData.query ?? '')
    setMobileDetail(false)
    setStatus('')
  }

  return (
    <main className={styles.page}>
      <header className={styles.reviewHeader}><div><p className={styles.eyebrow}>Missa component library · local review</p><h1>{selectedOnly ? 'Organization People · Access dossier' : 'Organization People and permissions'}</h1><p>{selectedOnly ? 'The selected effective-access composition, retained locally for page-by-page review.' : 'Three premium-informed directions grounded in the real membership model and the access contracts Missa still needs.'}</p></div><Badge variant="outline">Promotion blocked</Badge></header>
      <section className={styles.directionChooser} aria-labelledby="people-directions"><div className={styles.chooserHeading}><div><p className={styles.eyebrow}>{selectedOnly ? 'Selected composition' : 'Visual direction'}</p><h2 id="people-directions">{selectedOnly ? '02 · Access dossier' : 'Compare the complete access job'}</h2></div><label className={styles.fixtureControl}><span>Edge-case fixture</span><select value={fixture} onChange={(event) => changeFixture(event.target.value as Fixture)}>{fixtures.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label></div>{selectedOnly ? null : <div className={styles.directionOptions}>{directions.map((item) => <button key={item.id} type="button" className={styles.directionOption} data-selected={activeDirectionId === item.id} aria-pressed={activeDirectionId === item.id} onClick={() => setDirection(item.id)}><span>{item.number}</span><div><b>{item.name}</b><p>{item.description}</p></div>{activeDirectionId === item.id ? <Check aria-hidden="true" /> : null}</button>)}</div>}</section>

      <section className={styles.screen} aria-label={`${activeDirection.name} preview`}>
        <nav className={styles.topbar} aria-label="Organization navigation"><a className={styles.wordmark} href="#people">MISSA</a><div className={styles.organizationIdentity}><span>Organization</span><b>Missa Arts Foundation</b></div><div className={styles.topLinks}><a href="#opportunities">Opportunities</a><a href="#submissions">Submissions</a><a href="#reviews">Reviews</a><a href="#people" aria-current="page">People</a></div><Button variant="ghost" size="icon" className={styles.menuButton} aria-label="Open Organization navigation"><Menu aria-hidden="true" /></Button><div className={styles.roleChip}><ShieldCheck aria-hidden="true" /><span>Owner</span></div></nav>
        <div className={styles.screenBody} id="people">
          <header className={styles.pageHeader}><div><p className={styles.crumb}>Organization <ChevronRight aria-hidden="true" /> People</p><h2>People and permissions</h2><p>Know who has access, what they can do, where they can do it, and what must be protected before access changes.</p></div><div className={styles.headerActions}><Button variant="outline"><FileClock aria-hidden="true" />Access history</Button><InviteDialog seatAvailable={data.seatUsed < data.seatLimit && data.canManage} onStatus={setStatus} /></div></header>
          <div className={styles.summaryRow}><SeatSummary used={data.seatUsed} limit={data.seatLimit} /><Card className={styles.conceptCard}><CardContent><ShieldCheck aria-hidden="true" /><div><b>Seat is not permission</b><p>Role bundle and resource scope determine access. Practice taxonomy never grants it.</p></div></CardContent></Card></div>
          {data.note ? <Alert className={styles.notice}><CircleAlert aria-hidden="true" /><AlertTitle>Review this access state</AlertTitle><AlertDescription>{data.note}</AlertDescription></Alert> : null}
          {status ? <Alert className={styles.status} role="status"><Check aria-hidden="true" /><AlertTitle>Local preview</AlertTitle><AlertDescription>{status}</AlertDescription></Alert> : null}
          {data.denied ? <Alert variant="destructive" className={styles.errorState}><LockKeyhole aria-hidden="true" /><AlertTitle>You cannot view People and permissions</AlertTitle><AlertDescription>Ask an Organization Owner or authorized Admin for the specific access needed. No directory data is shown.</AlertDescription><Button variant="outline">Organization overview</Button></Alert> : data.loading ? <LoadingState /> : data.error ? <ErrorState /> : data.people.length === 0 ? <EmptyState /> : (
            <>
              <section className={styles.toolbar} aria-label="Directory controls"><label><span>Search people and invitations</span><div><Search aria-hidden="true" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, email, role, or scope" /></div></label><label><span>Access state</span><Select defaultValue="all"><SelectTrigger><Filter aria-hidden="true" /><SelectValue>{(value: string) => value === 'all' ? 'All states' : value}</SelectValue></SelectTrigger><SelectContent><SelectItem value="all">All states</SelectItem><SelectItem value="Active">Active</SelectItem><SelectItem value="Pending invitation">Pending invitation</SelectItem><SelectItem value="Attention">Needs attention</SelectItem></SelectContent></Select></label><Button variant="outline"><ChevronDown aria-hidden="true" />More filters</Button></section>
              {data.offline ? <Alert variant="destructive"><AlertCircle aria-hidden="true" /><AlertTitle>You are offline</AlertTitle><AlertDescription>Loaded directory records remain readable. Access changes are unavailable until you reconnect.</AlertDescription></Alert> : null}
              {visiblePeople.length === 0 ? <section className={styles.noResults}><Search aria-hidden="true" /><h3>No matching people or invitations</h3><p>Clear the search or change filters. Existing access has not changed.</p><Button variant="outline" onClick={() => setQuery('')}>Clear search</Button></section> : activeDirectionId === 'ledger' ? <LedgerDirection people={visiblePeople} fixture={fixture} onStatus={setStatus} /> : activeDirectionId === 'map' ? <TeamMapDirection people={visiblePeople} /> : (
                <div className={styles.masterDetail} data-mobile-detail={mobileDetail}>
                  <Card className={styles.directoryPane}><CardHeader className={styles.cardHeader}><div><CardTitle>Directory</CardTitle><CardDescription>{visiblePeople.length.toLocaleString()} people and invitations</CardDescription></div><Button variant="ghost" size="icon" aria-label="Directory options"><MoreHorizontal aria-hidden="true" /></Button></CardHeader><CardContent><DirectoryList people={visiblePeople} selectedId={selected?.id ?? ''} onSelect={selectPerson} triggerRefs={triggerRefs} /></CardContent></Card>
                  {selected ? <Card className={styles.dossierPane}><CardContent><PersonDossier person={selected} fixture={fixture} onBack={mobileDetail ? backToDirectory : undefined} onStatus={setStatus} /></CardContent></Card> : null}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  )
}

export function OrganizationPeoplePermissionsDirections() {
  return <OrganizationPeoplePermissionsExperience selectedOnly={false} />
}

export function OrganizationPeoplePermissionsSelected() {
  return <OrganizationPeoplePermissionsExperience selectedOnly />
}
