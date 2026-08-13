import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { Info } from 'lucide-react';
import { MISSA_TAXONOMY, TAXONOMY_FACET_KEYS, type TaxonomyFacetKey } from '@missa/taxonomy';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';
import { completeOutcomeTime, decidedWorkCoverage, taggedWorkCounts } from '@/lib/organizationInsights';
import { organizationCapabilityProjection } from '@/lib/organizationProduct';
import styles from './insights.module.css';

type Query = { program?: string; opportunity?: string; facet?: string };

function percentage(value: number | null): string { return value === null ? '—' : `${Math.round(value * 100)}%`; }

export default async function OrganizationInsightsPage({ params, searchParams }: { params: Promise<{ organizationId: string }>; searchParams: Promise<Query> }) {
  const { organizationId } = await params;
  const query = await searchParams;
  const session = await getSessionAccountFromToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect(`/login?next=${encodeURIComponent(`/organization/${organizationId}/insights`)}`);
  const membership = session.memberships.find((item) => item.organizationId === organizationId);
  if (!membership) notFound();
  const projection = organizationCapabilityProjection(membership.role);
  if (!projection.destinations.includes('insights')) notFound();
  const workspace = await getWorkspaceEngine();
  const allSubmissions = workspace.submissionsForOrganization(organizationId);

  if (membership.role === 'finance') {
    const counts = allSubmissions.reduce((result, submission) => { const state = submission.paymentStatus ?? 'unknown'; result.set(state, (result.get(state) ?? 0) + 1); return result; }, new Map<string, number>());
    return <main id="organization-main" className={styles.main}><header className={styles.header}><div><p className={styles.eyebrow}>Program lens</p><h1>Insights</h1><p>A payment-state projection that avoids creative review material and currency claims the current ledger cannot support.</p></div><span className={styles.role}>{projection.label}</span></header><dl className={styles.finance}><div><dt>Paid records</dt><dd>{counts.get('paid') ?? 0}</dd></div><div><dt>Pending records</dt><dd>{counts.get('pending') ?? 0}</dd></div><div><dt>Need attention</dt><dd>{(counts.get('failed') ?? 0) + (counts.get('disputed') ?? 0)}</dd></div><div><dt>Refunded records</dt><dd>{counts.get('refunded') ?? 0}</dd></div></dl><section className={styles.limited}><h2>Amounts are unavailable</h2><p>Submission fee records do not yet carry a currency-safe accounting ledger. Missa therefore shows payment-state counts only and does not add fee, award, payout, refund, or waiver amounts.</p></section></main>;
  }
  if (!['owner', 'admin', 'viewer'].includes(membership.role)) return <main id="organization-main" className={styles.main}><header className={styles.header}><div><p className={styles.eyebrow}>Program lens</p><h1>Insights</h1><p>Operational reporting must follow the same Team and Program boundary as the underlying records.</p></div><span className={styles.role}>{projection.label}</span></header><section className={styles.limited}><h2>Scoped Insights projection unavailable</h2><p>Missa does not yet enforce Team or Program assignment scope for this role. Organization-wide totals are withheld rather than presented outside a proven scope.</p></section></main>;

  const contexts = workspace.entitiesForOrganization(organizationId).flatMap((team) => workspace.programsForEntity(team.id).flatMap((program) => workspace.openCallsForProgram(program.id).map((opportunity) => ({ team, program, opportunity }))));
  const validProgram = contexts.some((item) => item.program.id === query.program) ? query.program : undefined;
  const programContexts = validProgram ? contexts.filter((item) => item.program.id === validProgram) : contexts;
  const validOpportunity = programContexts.some((item) => item.opportunity.id === query.opportunity) ? query.opportunity : undefined;
  const scopedContexts = validOpportunity ? programContexts.filter((item) => item.opportunity.id === validOpportunity) : programContexts;
  const scopedOpportunityIds = new Set(scopedContexts.map((item) => item.opportunity.id));
  const submissions = allSubmissions.filter((submission) => scopedOpportunityIds.has(submission.openCallId));
  const works = submissions.flatMap((submission) => workspace.worksForSubmission(submission.id));
  const workIds = new Set(works.map((work) => work.id));
  const decisions = workspace.decisionsForOrganization(organizationId).filter((decision) => workIds.has(decision.workId));
  const assignments = submissions.flatMap((submission) => workspace.reviewAssignmentsForSubmission(submission.id));
  const coverage = decidedWorkCoverage(works.map((work) => work.id), decisions);
  const timing = completeOutcomeTime(submissions.map((submission) => ({ id: submission.id, submittedAt: submission.submittedAt, workIds: workspace.worksForSubmission(submission.id).map((work) => work.id) })), decisions);
  const outcomes = decisions.reduce((counts, decision) => { counts[decision.outcome] += 1; return counts; }, { accepted: 0, waitlisted: 0, declined: 0 });
  const incompleteAssignments = assignments.filter((assignment) => !assignment.completedAt).length;
  const partialSubmissions = submissions.filter((submission) => { const packetWorks = workspace.worksForSubmission(submission.id); const decided = packetWorks.filter((work) => decisions.some((decision) => decision.workId === work.id)).length; return decided > 0 && decided < packetWorks.length; }).length;
  const acceptedAmongDecided = decisions.length ? outcomes.accepted / decisions.length : null;
  const selectedFacet: TaxonomyFacetKey = TAXONOMY_FACET_KEYS.includes(query.facet as TaxonomyFacetKey) ? query.facet as TaxonomyFacetKey : 'discipline';
  const taxonomy = taggedWorkCounts(works, MISSA_TAXONOMY.terms, selectedFacet);
  const facetLabel = MISSA_TAXONOMY.facets.find((facet) => facet.key === selectedFacet)?.label ?? selectedFacet;
  const opportunityRows = scopedContexts.map((context) => {
    const opportunitySubmissions = submissions.filter((submission) => submission.openCallId === context.opportunity.id);
    const opportunityWorks = opportunitySubmissions.flatMap((submission) => workspace.worksForSubmission(submission.id));
    const opportunityWorkIds = new Set(opportunityWorks.map((work) => work.id));
    const opportunityDecisions = decisions.filter((decision) => opportunityWorkIds.has(decision.workId));
    const opportunityAssignments = opportunitySubmissions.flatMap((submission) => workspace.reviewAssignmentsForSubmission(submission.id));
    const opportunityCoverage = decidedWorkCoverage(opportunityWorks.map((work) => work.id), opportunityDecisions);
    const incompleteReviews = opportunityAssignments.filter((assignment) => !assignment.completedAt).length;
    const undecided = opportunityWorks.length - opportunityCoverage.decidedWorks;
    const next = incompleteReviews ? `Complete ${incompleteReviews} review ${incompleteReviews === 1 ? 'assignment' : 'assignments'}` : undecided ? `Review ${undecided} undecided ${undecided === 1 ? 'Work' : 'Works'}` : opportunityWorks.length ? 'No immediate workflow action' : 'No Submissions yet';
    return { ...context, submissions: opportunitySubmissions.length, works: opportunityWorks.length, coverage: opportunityCoverage.ratio, reviews: opportunityAssignments.length ? `${opportunityAssignments.length - incompleteReviews}/${opportunityAssignments.length}` : '—', next, rank: incompleteReviews + undecided };
  }).sort((a, b) => b.rank - a.rank || b.submissions - a.submissions || a.opportunity.title.localeCompare(b.opportunity.title));
  const programs = [...new Map(contexts.map((item) => [item.program.id, item.program.name])).entries()].map(([id, name]) => ({ id, name }));
  const base = `/organization/${encodeURIComponent(organizationId)}/insights`;
  const scopeLabel = validOpportunity ? scopedContexts[0]?.opportunity.title : validProgram ? scopedContexts[0]?.program.name : 'All Opportunities';
  const qualityNotes = [
    'Organization timezone is not configured, so month buckets and period comparison are withheld.',
    `${timing.incompleteSubmissions} ${timing.incompleteSubmissions === 1 ? 'Submission is' : 'Submissions are'} excluded from outcome-time because not every Work has a Decision.`,
    ...(timing.invalidDateSubmissions ? [`${timing.invalidDateSubmissions} fully decided ${timing.invalidDateSubmissions === 1 ? 'Submission has' : 'Submissions have'} invalid or backwards dates.`] : []),
    `${taxonomy.untaggedWorks} ${taxonomy.untaggedWorks === 1 ? 'Work has' : 'Works have'} no ${facetLabel.toLocaleLowerCase('en')} term.`,
    ...(taxonomy.unresolvedReferences ? [`${taxonomy.unresolvedReferences} taxonomy ${taxonomy.unresolvedReferences === 1 ? 'reference is' : 'references are'} unavailable in the current catalog.`] : []),
    'Review assignments have no created or due date, so review lateness is not calculated.',
    'Demographic, equity, reviewer-ranking, and currency-total analysis remain unavailable.',
  ];

  return <main id="organization-main" className={styles.main}><header className={styles.header}><div><p className={styles.eyebrow}>Program lens</p><h1>Insights</h1><p>An operating review of intake, review, and current Work-level decisions. Counts are descriptive workflow facts—not quality, impact, or success scores.</p></div><span className={styles.role}>{projection.label}</span></header>
    <form className={styles.scope}><label><span>Program scope</span><select name="program" defaultValue={validProgram ?? ''}><option value="">All Programs</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</select></label><label><span>Opportunity scope</span><select name="opportunity" defaultValue={validOpportunity ?? ''}><option value="">All Opportunities in scope</option>{programContexts.map((item) => <option key={item.opportunity.id} value={item.opportunity.id}>{item.opportunity.title}</option>)}</select></label><label><span>Field facet</span><select name="facet" defaultValue={selectedFacet}>{MISSA_TAXONOMY.facets.filter((facet) => facet.userVisible).sort((a, b) => a.sortOrder - b.sortOrder).map((facet) => <option key={facet.key} value={facet.key}>{facet.label}</option>)}</select></label><button type="submit">Apply scope</button>{validProgram || validOpportunity || query.facet ? <Link className={styles.clear} href={base}>Clear</Link> : null}</form>
    <aside className={styles.scopeNote}><Info aria-hidden="true" /><div><strong>{scopeLabel} · all recorded dates</strong><p>Date-range comparison and monthly trend stay unavailable until the Organization has a timezone. Current non-time-bucketed counts remain usable.</p></div></aside>
    <section className={styles.metrics} aria-label="Primary workflow measures"><article className={styles.metric}><div><h2>Submissions received</h2><p className={styles.value}>{submissions.length}</p><p className={styles.denominator}>Submission grain · {scopeLabel}</p></div><div><p className={styles.definition}>Counts in-scope Submission records. One Submission may contain several Works.</p><p className={styles.exclusion}>No period comparison while timezone is unavailable.</p></div></article><article className={styles.metric}><div><h2>Decided Works coverage</h2><p className={styles.value}>{percentage(coverage.ratio)}</p><p className={styles.denominator}>{coverage.decidedWorks} of {coverage.totalWorks} current Works</p></div><div><p className={styles.definition}>Works with a current Decision divided by all Works in the selected Submission cohort.</p><p className={styles.exclusion}>{coverage.totalWorks - coverage.decidedWorks} undecided {coverage.totalWorks - coverage.decidedWorks === 1 ? 'Work remains' : 'Works remain'}.</p></div></article><article className={styles.metric}><div><h2>Median complete-outcome time</h2><p className={styles.value}>{timing.medianDays === null ? '—' : `${timing.medianDays}d`}</p><p className={styles.denominator}>{timing.includedSubmissions} fully decided {timing.includedSubmissions === 1 ? 'Submission' : 'Submissions'}</p></div><div><p className={styles.definition}>Submission received to its latest Work Decision, only when every Work is decided.</p><p className={styles.exclusion}>{timing.incompleteSubmissions + timing.invalidDateSubmissions} records excluded with reasons below.</p></div></article></section>
    <section className={styles.section}><header className={styles.sectionHeader}><div><p className={styles.eyebrow}>Review and decision</p><h2>Current workflow drivers</h2></div><span>Assignment, Work, and Submission grains remain separate</span></header><dl className={styles.drivers}><div><dt>Review completion</dt><dd>{assignments.length ? `${assignments.length - incompleteAssignments}/${assignments.length}` : '—'}<small>Completed assignments / assignments</small></dd></div><div><dt>Undecided Works</dt><dd>{coverage.totalWorks - coverage.decidedWorks}<small>Current in-scope Works without a Decision</small></dd></div><div><dt>Partially decided packets</dt><dd>{partialSubmissions}<small>Submissions with some, not all, Works decided</small></dd></div><div><dt>Accepted among decided</dt><dd>{percentage(acceptedAmongDecided)}<small>Diagnostic only; not a quality or success measure</small></dd></div></dl><div className={styles.outcomes} aria-label="Current Work outcomes"><span>{outcomes.accepted} accepted Works</span><span>{outcomes.waitlisted} waitlisted Works</span><span>{outcomes.declined} declined Works</span></div></section>
    <section className={styles.section}><header className={styles.sectionHeader}><div><p className={styles.eyebrow}>Operational comparison</p><h2>Opportunities in scope</h2></div><span>{opportunityRows.length} {opportunityRows.length === 1 ? 'Opportunity' : 'Opportunities'}</span></header>{opportunityRows.length ? <ol className={styles.opportunityList}>{opportunityRows.map((row) => <li className={styles.opportunityRow} key={row.opportunity.id}><div><h3>{row.opportunity.title}</h3><p>{row.program.name} · {row.team.name} · {row.opportunity.status}</p></div><dl><div><dt>Submissions</dt><dd>{row.submissions}</dd></div><div><dt>Work coverage</dt><dd>{percentage(row.coverage)}</dd></div><div><dt>Review completion</dt><dd>{row.reviews}</dd></div></dl><div className={styles.next}>{row.next}</div></li>)}</ol> : <section className={styles.empty}><h2>No Opportunities in this scope</h2><p>Choose another Program or return to all Opportunities. No comparative figures are invented for an empty scope.</p></section>}</section>
    <section className={styles.section}><header className={styles.sectionHeader}><div><p className={styles.eyebrow}>Field lens</p><h2>{facetLabel} tags on Works</h2></div><span>Rows are non-additive; one Work may appear under several terms</span></header><div className={styles.practiceLayout}><div>{taxonomy.rows.length ? <div className={styles.practiceRows}>{taxonomy.rows.map((row) => <div className={styles.practiceRow} key={row.termId}><strong>{row.label}</strong><span>{row.worksTagged} {row.worksTagged === 1 ? 'Work' : 'Works'}</span></div>)}</div> : <p className={styles.practiceEmpty}>No in-scope Work has a {facetLabel.toLocaleLowerCase('en')} tag. Free-text Submission category is not substituted for canonical taxonomy.</p>}</div><aside className={styles.quality}><header><h3>Data limits</h3><p>These limits are part of the result, not hidden methodology.</p></header><ul>{qualityNotes.map((note) => <li key={note}>{note}</li>)}</ul></aside></div></section>
  </main>;
}
