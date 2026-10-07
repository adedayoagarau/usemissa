'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserMinus, UserPlus, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import type { OrgRole } from '@missa/radar-engine';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { OrganizationActionError, PendingLabel, useOrganizationAction } from '@/components/organization-action-kit';
import { grantableRoles } from '@/lib/organizationActions';
import { organizationMutation } from '@/lib/organizationMutation';
import { ORGANIZATION_ROLE_LABELS } from '@/lib/organizationPeople';
import { organizationCapabilityProjection, organizationNavigation } from '@/lib/organizationProduct';

function roleReach(role: OrgRole, organizationId: string): string {
  if (role === 'owner') return 'Every area, including billing and granting Owner access. Can change Organization records.';
  if (role === 'admin') return 'Every area. Can change Organization records, except Owner access.';
  if (role === 'reviewer') return 'Only the Submissions assigned to them, in their own review queue. Cannot change Organization records.';
  const destinations = organizationNavigation(organizationCapabilityProjection(role), organizationId).map((item) => item.label);
  return `Can open ${destinations.join(', ')}, but Organization-wide Submissions, reviews, decisions, and people stay hidden until Team and Program access exists. Cannot change Organization records.`;
}

function RoleSelect({ id, organizationId, actorRole, currentRole, value, onChange }: { id: string; organizationId: string; actorRole: OrgRole; currentRole?: OrgRole; value: OrgRole; onChange: (role: OrgRole) => void }) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>Role</FieldLabel>
      <NativeSelect id={id} className="w-full" value={value} aria-describedby={`${id}-reach`} onChange={(event) => onChange(event.target.value as OrgRole)}>
        {grantableRoles(actorRole, currentRole).map((role) => <NativeSelectOption key={role} value={role}>{ORGANIZATION_ROLE_LABELS[role]}</NativeSelectOption>)}
      </NativeSelect>
      <FieldDescription id={`${id}-reach`}>{roleReach(value, organizationId)}</FieldDescription>
    </Field>
  );
}

export function InvitePersonDialog({ organizationId, actorRole, seatsAvailable }: { organizationId: string; actorRole: OrgRole; seatsAvailable: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrgRole>('reviewer');
  const { pending, error, setError, run } = useOrganizationAction();
  const reset = () => { setEmail(''); setRole('reviewer'); setError(''); };
  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
      <DialogTrigger render={<Button type="button" size="sm" />}><UserPlus aria-hidden="true" />Add person</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            run(async () => {
              const result = await organizationMutation<{ message?: string }>(`/api/orgs/${encodeURIComponent(organizationId)}/members`, { method: 'POST', body: { email: email.trim(), role }, fallbackError: 'This person could not be added. The details are still here.' });
              if (!result.ok) return result.error;
              setOpen(false);
              reset();
              toast.success(result.data.message ?? 'Access request recorded.');
              router.refresh();
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Add a person</DialogTitle>
            <DialogDescription>They need a Missa account with this email. Adding someone who already has access changes their role instead.</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="invite-email">Email</FieldLabel>
            <Input id="invite-email" type="email" autoComplete="off" required autoFocus value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <RoleSelect id="invite-role" organizationId={organizationId} actorRole={actorRole} value={role} onChange={setRole} />
          {seatsAvailable <= 0 ? <p className="text-sm text-muted-foreground">Every seat is in use. Remove someone first, or change the role of someone who already has access.</p> : null}
          <OrganizationActionError message={error} />
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending || !email.trim()}><PendingLabel pending={pending} idle="Add person" busy="Adding…" /></Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type Person = { accountId: string; name: string; role: OrgRole };

export function ChangeRoleDialog({ organizationId, actorRole, person, isSelf }: { organizationId: string; actorRole: OrgRole; person: Person; isSelf: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<OrgRole>(person.role);
  const { pending, error, setError, run } = useOrganizationAction();
  const ownerLocked = person.role === 'owner' && actorRole !== 'owner';
  const losesManagement = isSelf && (person.role === 'owner' || person.role === 'admin') && role !== 'owner' && role !== 'admin';
  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) { setRole(person.role); setError(''); } }}>
      <DialogTrigger render={<Button type="button" size="sm" variant="outline" disabled={ownerLocked} />}><UserCog aria-hidden="true" />Change role</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            run(async () => {
              const result = await organizationMutation(`/api/orgs/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(person.accountId)}`, { method: 'PATCH', body: { role }, fallbackError: 'The role could not be changed. It is still the same.' });
              if (!result.ok) return result.error;
              setOpen(false);
              toast.success(`${person.name} is now ${ORGANIZATION_ROLE_LABELS[role]}.`);
              if (losesManagement) router.push(`/organization/${encodeURIComponent(organizationId)}/overview`);
              router.refresh();
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Change {isSelf ? 'your' : `${person.name}’s`} role</DialogTitle>
            <DialogDescription>The new role applies the next time a page loads. Existing review assignments and recorded decisions stay attributed to this person.</DialogDescription>
          </DialogHeader>
          <RoleSelect id="change-role" organizationId={organizationId} actorRole={actorRole} currentRole={person.role} value={role} onChange={setRole} />
          {losesManagement ? <p className="text-sm text-muted-foreground">You will no longer be able to change Organization records, including your own role.</p> : null}
          <OrganizationActionError message={error} />
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending || role === person.role}><PendingLabel pending={pending} idle="Change role" busy="Changing…" /></Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RemoveAccessDialog({ organizationId, actorRole, person, isSelf, incompleteReviews }: { organizationId: string; actorRole: OrgRole; person: Person; isSelf: boolean; incompleteReviews: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { pending, error, setError, run } = useOrganizationAction();
  const ownerLocked = person.role === 'owner' && actorRole !== 'owner';
  return (
    <AlertDialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setError(''); }}>
      <AlertDialogTrigger render={<Button type="button" size="sm" variant="destructive" disabled={ownerLocked} />}><UserMinus aria-hidden="true" />Remove access</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isSelf ? 'Remove your own access?' : `Remove ${person.name}’s access?`}</AlertDialogTitle>
          <AlertDialogDescription>
            {isSelf ? 'You leave this Organization immediately and need another Owner or Admin to add you back.' : `${person.name} can no longer open this Organization. Their Missa account is not deleted.`}
            {incompleteReviews ? ` ${incompleteReviews} open review ${incompleteReviews === 1 ? 'assignment stays' : 'assignments stay'} on record but can no longer be completed.` : ''}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <OrganizationActionError message={error} title="Access unchanged" />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Keep access</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => run(async () => {
              const result = await organizationMutation(`/api/orgs/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(person.accountId)}`, { method: 'DELETE', fallbackError: 'Access could not be removed. Nothing changed.' });
              if (!result.ok) return result.error;
              setOpen(false);
              toast.success(isSelf ? 'You left the Organization.' : `${person.name} no longer has access.`);
              if (isSelf) router.push('/organization');
              else router.push(`/organization/${encodeURIComponent(organizationId)}/people`);
              router.refresh();
            })}
          >
            <PendingLabel pending={pending} idle="Remove access" busy="Removing…" />
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
