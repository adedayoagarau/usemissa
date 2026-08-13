import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
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
  const opportunitiesHref = `/organization/${encodeURIComponent(organizationId)}/opportunities`;
  return <main id="organization-main" className={styles.main}><Link className={styles.back} href={opportunitiesHref}>← Opportunities</Link><header className={styles.header}><p>Start a draft</p><h1>New Opportunity</h1><p>Create the smallest safe draft first. Public facts, field rules, eligibility, place, dates, fees, terms, and the applicant form remain separate review areas.</p></header>{programs.length ? <OrganizationOpportunityCreate organizationId={organizationId} programs={programs} /> : <section className={styles.notice}>A Team and Program must exist before you can create an Opportunity. Team and Program setup has not yet moved into this new Organization surface.</section>}<p className={styles.notice}>Creating this draft does not publish anything. Missa will not infer missing public facts from the title or Program.</p></main>;
}
