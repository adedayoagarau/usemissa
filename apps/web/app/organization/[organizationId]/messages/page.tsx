import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { readOrganizationMessageHistory } from '@missa/radar-adapters';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { organizationCapabilityProjection } from '@/lib/organizationProduct';
import { organizationMessageState, recipientReferenceLabel } from '@/lib/organizationMessagePresentation';
import styles from '../outcome-desk.module.css';
import { COMMUNICATION_TEMPLATES } from '@missa/workspace-engine';
import { CommunicationsManager } from '@/components/communications-manager';
import { batchSummary, COMMUNICATIONS_UNAVAILABLE } from '@/lib/communicationsData';
import { deliveryStatusByEffect } from '@/lib/communicationsSend';
import { resolveOrganizationCustomization } from '@/lib/organizationCustomization';
import { getEngine } from '@/lib/engine';
import { OrganizationQuestionsPanel } from '@/components/submitter-questions';
import { submitterQuestionView, SUBMITTER_QUESTIONS_UNAVAILABLE } from '@/lib/submitterQuestionsData';
import { getCompatibilityWorkspaceEngine, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';
import { MessagesWorkspace } from '@/components/messages-workspace';
import { DeliveryStateBadge } from '@/components/missa/operations-badges';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function displayDate(value: string): string {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default async function OrganizationMessagesPage({ params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  const session = await getSessionAccountFromToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect(`/login?next=${encodeURIComponent(`/organization/${organizationId}/messages`)}`);
  const membership = session.memberships.find((item) => item.organizationId === organizationId);
  if (!membership) notFound();
  const projection = organizationCapabilityProjection(membership.role);
  if (!projection.destinations.includes('messages')) notFound();

  if (membership.role !== 'owner' && membership.role !== 'admin') {
    return <main id="organization-main" className={styles.main}><header className={styles.header}><div><p className={styles.eyebrow}>Outcome desk</p><h1>Messages</h1><p>Decision correspondence remains separate from review evidence and delivery obligations.</p></div><span className={styles.role}>{projection.label}</span></header><section className={styles.limited}><h2>{membership.role === 'legal' ? 'Legal correspondence projection unavailable' : 'Scoped message projection unavailable'}</h2><p>{membership.role === 'legal' ? 'Only approved terms, the relevant Work, and the external copy should be visible here. That server-enforced projection does not exist yet, so the full Organization correspondence record is withheld.' : 'Missa does not yet enforce Team or Program scope for correspondence. The full recipient ledger is withheld rather than exposed outside a proven assignment.'}</p></section></main>;
  }

  const radar = await getEngine();
  const organization = radar.store.organizations.get(organizationId);
  const customization = resolveOrganizationCustomization(organization ?? { name: organizationId });
  const relational = workspaceRelationalAuthorityEnabled();
  const compatibility = relational ? undefined : await getCompatibilityWorkspaceEngine();
  const openCalls = compatibility ? compatibility.entitiesForOrganization(organizationId).flatMap((team) => compatibility.programsForEntity(team.id).flatMap((program) => compatibility.openCallsForProgram(program.id).map((call) => ({ id: call.id, title: call.title })))) : [];
  const delivery = compatibility ? await deliveryStatusByEffect(process.env.DATABASE_URL, organizationId) : undefined;
  const manager = <CommunicationsManager
    organizationId={organizationId}
    canManage={membership.role === 'owner' || membership.role === 'admin'}
    currentAccountId={session.account.id}
    secondApproverRequired={customization.communications.secondApproverRequired}
    openCalls={openCalls}
    templates={COMMUNICATION_TEMPLATES.map((template) => ({ kind: template.kind, label: template.label, description: template.description, stage: template.stage, defaultSubject: template.defaultSubject, defaultBody: template.defaultBody }))}
    stageLabels={customization.stageLabels}
    initialBatches={compatibility ? compatibility.communicationBatchesForOrganization(organizationId).map((batch) => batchSummary(batch, radar, delivery)) : []}
    available={!relational}
    unavailableReason={relational ? COMMUNICATIONS_UNAVAILABLE : undefined}
  />;
  const questionsPanel = <OrganizationQuestionsPanel
    organizationId={organizationId}
    canManage={membership.role === 'owner' || membership.role === 'admin'}
    questions={compatibility ? compatibility.submitterQuestionsForOrganization(organizationId).map((question) => submitterQuestionView(question, radar, compatibility)) : []}
    available={!relational}
    unavailableReason={relational ? SUBMITTER_QUESTIONS_UNAVAILABLE : undefined}
  />;
  const history = process.env.DATABASE_URL ? await readOrganizationMessageHistory(process.env.DATABASE_URL, organizationId) : { available: false, effects: [] as const };
  const records = history.effects.filter((effect) => effect.kind === 'decision-email').map((effect) => ({
    id: effect.id,
    subject: effect.templateKey ?? 'Recorded decision letter',
    recipient: recipientReferenceLabel(effect.recipientAccountId),
    at: effect.createdAt ?? effect.updatedAt ?? new Date(0).toISOString(),
    state: organizationMessageState(effect.status),
  }));
  const historyPanel = !history.available ? (
    <Empty variant="bordered">
      <EmptyHeader>
        <EmptyTitle>Delivery record unavailable</EmptyTitle>
        <EmptyDescription>Missa cannot read the delivery ledger here, so it shows nothing rather than guess. Each letter still keeps its own per-recipient results under Letters.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  ) : records.length === 0 ? (
    <Empty variant="bordered">
      <EmptyHeader>
        <EmptyTitle>Nothing recorded yet</EmptyTitle>
        <EmptyDescription>A decision is not a message. Records appear here once a decision letter has gone to the provider.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  ) : (
    <div className="grid gap-3">
      <Table variant="grid">
        <caption className="sr-only">Decision letters recorded by the email provider</caption>
        <TableHeader>
          <TableRow>
            <TableHead>Letter</TableHead>
            <TableHead className="hidden sm:table-cell">Recipient</TableHead>
            <TableHead className="hidden md:table-cell">Recorded</TableHead>
            <TableHead>Delivery</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.id}>
              <TableCell><span className="block truncate text-foreground">{record.subject}</span></TableCell>
              <TableCell className="hidden sm:table-cell"><span className="text-muted-foreground">{record.recipient}</span></TableCell>
              <TableCell className="hidden md:table-cell"><span className="text-muted-foreground tabular-nums">{displayDate(record.at)}</span></TableCell>
              <TableCell><DeliveryStateBadge state={record.state} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-sm text-muted-foreground">Accepted by the provider is not delivered. Approved wording, exclusions and replies are not kept on these records, so they cannot be retried from here.</p>
    </div>
  );
  const questionView = compatibility ? compatibility.submitterQuestionsForOrganization(organizationId) : [];

  return (
    <main id="organization-main" className={styles.main}>
      <header className="grid gap-1 border-b border-border pb-5">
        <h1 className="font-sans text-3xl font-semibold tracking-tight text-foreground">Messages</h1>
        <p className="text-sm text-muted-foreground">Letters to submitters, their questions, and what the email provider recorded.</p>
      </header>
      <div className="pt-6">
        <MessagesWorkspace
          letters={manager}
          questions={questionsPanel}
          history={historyPanel}
          letterCount={compatibility ? compatibility.communicationBatchesForOrganization(organizationId).length : 0}
          waitingQuestions={questionView.filter((question) => question.status === 'open').length}
          historyCount={history.available ? records.length : undefined}
        />
      </div>
    </main>
  );
}
