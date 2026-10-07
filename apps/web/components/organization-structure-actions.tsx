'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { OrganizationActionError, PendingLabel, useOrganizationAction } from '@/components/organization-action-kit';
import { organizationMutation } from '@/lib/organizationMutation';

type NameDialogProps = {
  trigger: string;
  triggerVariant: 'default' | 'outline';
  title: string;
  description: string;
  label: string;
  placeholder: string;
  help: string;
  submit: string;
  busy: string;
  inputId: string;
  save: (name: string) => Promise<string | void>;
};

/** Policy `overlay.focused-task` with `input.short-text`: one named record per dialog. */
function NameDialog(props: NameDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const { pending, error, setError, run } = useOrganizationAction();
  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) { setName(''); setError(''); } }}>
      <DialogTrigger render={<Button type="button" size="sm" variant={props.triggerVariant} />}><Plus aria-hidden="true" />{props.trigger}</DialogTrigger>
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            run(async () => {
              const failure = await props.save(name.trim());
              if (failure) return failure;
              setOpen(false);
              setName('');
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>{props.title}</DialogTitle>
            <DialogDescription>{props.description}</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor={props.inputId}>{props.label}</FieldLabel>
            <Input id={props.inputId} value={name} required maxLength={120} autoFocus placeholder={props.placeholder} aria-describedby={`${props.inputId}-help`} onChange={(event) => setName(event.target.value)} />
            <FieldDescription id={`${props.inputId}-help`}>{props.help}</FieldDescription>
          </Field>
          <OrganizationActionError message={error} />
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending || !name.trim()}><PendingLabel pending={pending} idle={props.submit} busy={props.busy} /></Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CreateTeamDialog({ organizationId, variant = 'default' }: { organizationId: string; variant?: 'default' | 'outline' }) {
  const router = useRouter();
  return (
    <NameDialog
      trigger="Create Team"
      triggerVariant={variant}
      title="Create a Team"
      description="A Team is a department, imprint, or chapter. Programs and their Opportunities sit inside it."
      label="Team name"
      placeholder="e.g. Poetry desk"
      help="People see this name on programs and calls inside your organization. It isn’t shown to applicants."
      submit="Create Team"
      busy="Creating…"
      inputId="create-team-name"
      save={async (name) => {
        const result = await organizationMutation<{ id?: string }>(`/api/orgs/${encodeURIComponent(organizationId)}/teams`, { method: 'POST', body: { name }, fallbackError: 'The Team could not be created. Your name is still here.' });
        if (!result.ok) return result.error;
        toast.success(`Team “${name}” created. Add its first Program next.`);
        router.refresh();
      }}
    />
  );
}

export function CreateProgramDialog({ organizationId, team }: { organizationId: string; team: { id: string; name: string } }) {
  const router = useRouter();
  return (
    <NameDialog
      trigger="Add Program"
      triggerVariant="outline"
      title={`Add a Program to ${team.name}`}
      description="A Program groups related Opportunities, their submissions, reviews, and reporting."
      label="Program name"
      placeholder="e.g. Spring reading period"
      help="You can create Opportunities in this Program as soon as it exists."
      submit="Add Program"
      busy="Adding…"
      inputId={`create-program-name-${team.id}`}
      save={async (name) => {
        const result = await organizationMutation(`/api/orgs/${encodeURIComponent(organizationId)}/teams/${encodeURIComponent(team.id)}/programs`, { method: 'POST', body: { name }, fallbackError: 'The Program could not be added. Your name is still here.' });
        if (!result.ok) return result.error;
        toast.success(`Program “${name}” added to ${team.name}.`);
        router.refresh();
      }}
    />
  );
}
