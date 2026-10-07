'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { OrganizationActionError, PendingLabel, useOrganizationAction } from '@/components/organization-action-kit';
import { organizationMutation } from '@/lib/organizationMutation';

type LifecycleProps = { organizationId: string; opportunity: { id: string; title: string; revision?: number }; disabled?: boolean };

function opportunityUrl(organizationId: string, opportunityId: string, suffix = '') {
  return `/api/orgs/${encodeURIComponent(organizationId)}/open-calls/${encodeURIComponent(opportunityId)}${suffix}`;
}

/** Publishing is a consequential state transition, so it is confirmed rather than toggled. */
export function PublishOpportunityAction({ organizationId, opportunity, disabled }: LifecycleProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { pending, error, setError, run } = useOrganizationAction();
  return (
    <AlertDialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setError(''); }}>
      <AlertDialogTrigger render={<Button type="button" disabled={disabled} />}><Send aria-hidden="true" />Publish Opportunity</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Publish “{opportunity.title}”?</AlertDialogTitle>
          <AlertDialogDescription>Applicants can find it on your public Organization page and apply through the saved submission form straight away. You can close it to new submissions later.</AlertDialogDescription>
        </AlertDialogHeader>
        <OrganizationActionError message={error} title="Not published" />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Keep as draft</AlertDialogCancel>
          <Button
            type="button"
            disabled={pending}
            onClick={() => run(async () => {
              const result = await organizationMutation(opportunityUrl(organizationId, opportunity.id, '/publish'), { method: 'POST', body: opportunity.revision ? { expectedRevision: opportunity.revision } : {}, fallbackError: 'This Opportunity could not be published. It is still a draft.' });
              if (!result.ok) return result.error;
              setOpen(false);
              toast.success('Opportunity published. Applicants can apply now.');
              router.refresh();
            })}
          >
            <PendingLabel pending={pending} idle="Publish now" busy="Publishing…" />
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Policy `action.destructive-final`: closing stops intake and is confirmed in an AlertDialog. */
export function CloseOpportunityAction({ organizationId, opportunity, disabled }: LifecycleProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { pending, error, setError, run } = useOrganizationAction();
  return (
    <AlertDialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setError(''); }}>
      <AlertDialogTrigger render={<Button type="button" variant="outline" disabled={disabled} />}><XCircle aria-hidden="true" />Close to new submissions</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Close “{opportunity.title}”?</AlertDialogTitle>
          <AlertDialogDescription>New applications stop immediately. Submissions already received stay in your queue for review, decisions, and delivery.</AlertDialogDescription>
        </AlertDialogHeader>
        <OrganizationActionError message={error} title="Still open" />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Keep open</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => run(async () => {
              const result = await organizationMutation(opportunityUrl(organizationId, opportunity.id), { method: 'DELETE', ...(opportunity.revision ? { body: { expectedRevision: opportunity.revision } } : {}), fallbackError: 'This Opportunity could not be closed. It is still accepting submissions.' });
              if (!result.ok) return result.error;
              setOpen(false);
              toast.success('Opportunity closed to new submissions.');
              router.refresh();
            })}
          >
            <PendingLabel pending={pending} idle="Close Opportunity" busy="Closing…" />
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
