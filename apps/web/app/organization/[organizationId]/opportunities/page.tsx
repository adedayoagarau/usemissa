import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { ArrowRight, CircleAlert, Plus, Search } from 'lucide-react';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';
import { organizationCapabilityProjection } from '@/lib/organizationProduct';
import styles from './opportunities.module.css';

type Query = { q?: string; status?: string; program?: string };

export default async function OrganizationOpportunitiesPage({ params, searchParams }: { params: Promise<{ organizationId: string }>; searchParams: Promise<Query> }) {
  const { organizationId } = await params;
  const query = await searchParams;
  const session = await getSessionAccountFromToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect(`/login?next=${encodeURIComponent(`/organization/${organizationId}/opportunities`)}`);
  const membership = session.memberships.find((item) => item.organizationId === organizationId);
  if (!membership) notFound();
  const projection = organizationCapabilityProjection(membership.role);
  if (!projection.destinations.includes('opportunities')) notFound();

  const workspace = await getWorkspaceEngine();
  const programs = workspace.entitiesForOrganization(organizationId).flatMap((team) => workspace.programsForEntity(team.id).map((program) => ({ ...program, teamName: team.name })));
  const normalizedQuery = query.q?.trim().toLocaleLowerCase('en') ?? '';
  const status = ['draft', 'published', 'closed'].includes(query.status ?? '') ? query.status : '';
  const programFilter = programs.some((program) => program.id === query.program) ? query.program : '';
  const grouped = programs.map((program) => ({
    ...program,
    opportunities: workspace.openCallsForProgram(program.id).filter((opportunity) => {
      if (status && opportunity.status !== status) return false;
      if (programFilter && program.id !== programFilter) return false;
      return !normalizedQuery || `${opportunity.title} ${program.name} ${program.teamName}`.toLocaleLowerCase('en').includes(normalizedQuery);
    }).map((opportunity) => {
      const form = workspace.submissionPathsForOpenCall(opportunity.id)[0];
      return { ...opportunity, submissions: workspace.submissionsForOpenCall(opportunity.id).length, hasGuidelines: Boolean(opportunity.guidelineUrl || opportunity.guidelineText), formFields: form?.fields.length ?? 0 };
    }),
  })).filter((program) => program.opportunities.length > 0);
  const total = grouped.reduce((sum, program) => sum + program.opportunities.length, 0);
  const allCount = programs.reduce((sum, program) => sum + workspace.openCallsForProgram(program.id).length, 0);
  const canCreate = membership.role === 'owner' || membership.role === 'admin';
  const hasFilters = Boolean(normalizedQuery || status || programFilter);

  return <main id="organization-main" className={styles.main}>
    <header className={styles.header}><div><p className={styles.eyebrow}>Program ledger</p><h1>Opportunities</h1><p>Find the call you need by Program, then open its public facts, guidelines, form, and lifecycle separately.</p></div><div className={styles.headerActions}>{canCreate ? <Link className={styles.primary} href={`/organization/${encodeURIComponent(organizationId)}/opportunities/new`}><Plus aria-hidden="true" />Create Opportunity</Link> : <span className={styles.secondary}>Read only</span>}</div></header>
    <form className={styles.filters} role="search"><label className={styles.search}><span>Search</span><Search aria-hidden="true" /><input name="q" defaultValue={query.q ?? ''} placeholder="Title, Program, or Team" /></label><label><span>Lifecycle</span><select name="status" defaultValue={status}><option value="">All states</option><option value="draft">Draft</option><option value="published">Published</option><option value="closed">Closed</option></select></label><label><span>Program</span><select name="program" defaultValue={programFilter}><option value="">All Programs</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.name} · {program.teamName}</option>)}</select></label><div className={styles.filterActions}><button type="submit">Apply</button>{hasFilters ? <Link className={styles.clearLink} href={`/organization/${encodeURIComponent(organizationId)}/opportunities`}>Clear</Link> : null}</div></form>
    <div className={styles.summary}><strong>{total} {total === 1 ? 'Opportunity' : 'Opportunities'}</strong><span>{hasFilters ? `Filtered from ${allCount}` : 'Grouped by Program'}</span></div>
    {grouped.length ? <div className={styles.ledger}>{grouped.map((program) => <section className={styles.program} key={program.id} aria-labelledby={`program-${program.id}`}><header className={styles.programHeader}><div><p className={styles.eyebrow}>{program.teamName} · Program</p><h2 id={`program-${program.id}`}>{program.name}</h2></div><span>{program.opportunities.length} {program.opportunities.length === 1 ? 'Opportunity' : 'Opportunities'}</span></header>{program.opportunities.map((opportunity) => <article className={styles.row} key={opportunity.id}><div><h3>{opportunity.title}</h3><p>{opportunity.hasGuidelines ? 'Guidelines added' : 'Guidelines not added'} · {opportunity.formFields ? `${opportunity.formFields} form ${opportunity.formFields === 1 ? 'field' : 'fields'}` : 'Form not added'}</p><span className={styles.status}>{opportunity.status}</span></div><dl className={styles.facts}><div><dt>Team</dt><dd>{program.teamName}</dd></div><div><dt>Submissions</dt><dd>{opportunity.submissions}</dd></div><div><dt>Created</dt><dd>{new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(opportunity.createdAt))}</dd></div></dl><Link className={styles.openLink} href={`/organization/${encodeURIComponent(organizationId)}/opportunities/${encodeURIComponent(opportunity.id)}`}>Open<ArrowRight aria-hidden="true" /></Link></article>)}</section>)}</div> : <section className={styles.empty}><CircleAlert aria-hidden="true" /><h2>{hasFilters ? 'No Opportunities match these filters' : programs.length ? 'Create the first Opportunity' : 'Create a Team and Program first'}</h2><p>{hasFilters ? 'Your filters are still applied. Clear them to return to the full Program ledger.' : programs.length ? 'The draft starts with a title and Program. Missing public facts remain visibly incomplete and cannot be inferred.' : 'Every Opportunity belongs to a Program inside a Team. Team and Program setup has not yet moved into this new Organization surface.'}</p>{hasFilters ? <Link className={styles.secondary} href={`/organization/${encodeURIComponent(organizationId)}/opportunities`}>Clear filters</Link> : canCreate && programs.length ? <Link className={styles.primary} href={`/organization/${encodeURIComponent(organizationId)}/opportunities/new`}><Plus aria-hidden="true" />Create Opportunity</Link> : null}</section>}
    {!canCreate ? <p className={styles.scopeNote}>This is the read-only Opportunity projection for your current Organization role. Mutation controls are omitted.</p> : null}
  </main>;
}
