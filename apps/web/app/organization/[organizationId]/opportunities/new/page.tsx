import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';
import { OrganizationOpportunityCreate } from '@/components/organization-opportunity-create';
import styles from './new.module.css';

export default async function NewOrganizationOpportunityPage({ params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  const session = await getSessionAccountFromToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect(`/login?next=${encodeURIComponent(`/organization/${organizationId}/opportunities/new`)}`);
  const membership = session.memberships.find((item) => item.organizationId === organizationId);
  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) notFound();
  const workspace = await getWorkspaceEngine();
  const programs = workspace.entitiesForOrganization(organizationId).flatMap((team) => workspace.programsForEntity(team.id).map((program) => ({ id: program.id, name: program.name, teamName: team.name })));
  const claimedListings = [...(await getEngine()).store.opportunities.values()].filter((opportunity) => opportunity.claimedByOrganizationId === organizationId).map((opportunity) => ({ id: opportunity.id, title: opportunity.fields.title }));
  const opportunitiesHref = `/organization/${encodeURIComponent(organizationId)}/opportunities`;
  return <main id="organization-main" className={styles.main}><Link className={styles.back} href={opportunitiesHref}>← Opportunities</Link><header className={styles.header}><p>Start a draft</p><h1>New call</h1><p>Create the smallest safe draft first. Public facts, field rules, eligibility, place, dates, fees, terms, and the applicant form remain separate review areas.</p></header>{programs.length ? <OrganizationOpportunityCreate organizationId={organizationId} programs={programs} claimedListings={claimedListings} /> : <section className={styles.notice}>You need a team and a program before you can create a call. <Link href={`/organization/${encodeURIComponent(organizationId)}/settings?section=structure`}>Create them in Settings, under Structure</Link>.</section>}<p className={styles.notice}>Creating this draft does not publish anything. Missa will not infer missing public facts from the title or Program.</p></main>;
}
