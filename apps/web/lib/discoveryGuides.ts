import type { OpportunityRepositoryQuery } from '@missa/radar-engine';

export interface DiscoveryGuide {
  slug: string;
  title: string;
  description: string;
  answer: string;
  query: OpportunityRepositoryQuery;
}

export interface DiscoveryCollection {
  slug: string;
  title: string;
  description: string;
  answer: string;
  audience: string;
  checklist: string[];
  relatedGuideSlug: string;
  query: OpportunityRepositoryQuery;
}

const baseQuery = { openNow: true, sort: 'soonest-deadline' as const, limit: 6 };

export const discoveryGuides: DiscoveryGuide[] = [
  {
    slug: 'find-submission-opportunities',
    title: 'How to find submission opportunities',
    description: 'A practical starting point for finding open calls, grants, magazines, residencies, and fellowships without losing the source details.',
    answer: 'Start with opportunities that are open now, then compare the deadline, fee, eligibility, required materials, and official source. Missa keeps those facts together so you can decide whether a call deserves your time before you prepare a submission.',
    query: baseQuery,
  },
  {
    slug: 'no-fee-submission-opportunities',
    title: 'No-fee submission opportunities',
    description: 'Browse currently open opportunities where the source record says no submission fee is disclosed.',
    answer: 'A no-fee label means Missa’s current source record says the submission fee is zero. Always open the official source before applying, because fees and eligibility can change after a record is checked.',
    query: { ...baseQuery, feeStatus: 'no-fee' },
  },
  {
    slug: 'grants-for-creators',
    title: 'Grants for creators',
    description: 'See open grant opportunities and the evidence you should check before preparing an application.',
    answer: 'A grant opportunity usually asks you to explain the work, need, audience, or project plan rather than submit to a publication. Check the funder’s eligibility, geography, budget rules, and reporting expectations on the official source.',
    query: { ...baseQuery, types: ['grant'] },
  },
  {
    slug: 'residencies-and-fellowships',
    title: 'Residencies and fellowships',
    description: 'Browse open residencies and fellowships with deadline, location, fee, and source context in view.',
    answer: 'Residencies and fellowships can differ widely in what they provide: time, space, money, mentorship, or a community. Compare the location, duration, eligibility, required materials, and any costs before deciding whether the opportunity fits your practice.',
    query: { ...baseQuery, types: ['residency', 'fellowship'] },
  },
  {
    slug: 'magazine-submissions',
    title: 'Magazine submission opportunities',
    description: 'Find open magazine calls and check the publication’s guidelines, reading period, fee, and accepted formats.',
    answer: 'For a magazine submission, the most important checks are the current reading period, accepted formats, simultaneous-submission rules, fee, rights, and response expectations. Missa’s listing is a starting point; the publication’s own guidelines are the authority.',
    query: { ...baseQuery, types: ['magazine'] },
  },
  {
    slug: 'verify-an-opportunity-before-applying',
    title: 'How to verify an opportunity before applying',
    description: 'Use a source-first checklist to avoid relying on an expired, copied, or incomplete opportunity listing.',
    answer: 'Verify the opportunity on the organization’s own source, confirm that the deadline and submission path are current, check the fee and eligibility, and make sure the destination uses a safe HTTPS link. Treat anything Missa marks as unconfirmed as a prompt to investigate, not as a guarantee.',
    query: { ...baseQuery, verifiedOnly: true },
  },
];

export const discoveryCollections: DiscoveryCollection[] = [
  {
    slug: 'contests',
    title: 'Contests for creators',
    description: 'Open contests, prizes, and calls for entries with deadlines and source details in view.',
    answer: 'Compare the closing date, fee, eligibility, prize information, and official submission path before entering a contest. Missa shows the current source record; the organizer’s page remains the authority.',
    audience: 'Creators looking for prizes, calls for entries, and time-bound competitions.',
    checklist: ['Closing date and time zone', 'Entry fee and prize information', 'Eligibility and accepted formats', 'Official submission path'],
    relatedGuideSlug: 'verify-an-opportunity-before-applying',
    query: { ...baseQuery, types: ['contest'] },
  },
  {
    slug: 'magazines',
    title: 'Magazine submissions',
    description: 'Find open magazine calls and review reading periods, fees, formats, and source links.',
    answer: 'For magazine submissions, check the current reading period, accepted formats, simultaneous-submission rules, fee, rights, and response expectations on the publication’s own guidelines.',
    audience: 'Writers, poets, artists, and editors comparing publications and reading periods.',
    checklist: ['Reading period or rolling status', 'Accepted formats and genres', 'Fee, rights, and simultaneous-submission rules', 'Official guidelines and response expectations'],
    relatedGuideSlug: 'magazine-submissions',
    query: { ...baseQuery, types: ['magazine'] },
  },
  {
    slug: 'poetry',
    title: 'Poetry opportunities',
    description: 'Browse current poetry-related submission opportunities and open calls for writers.',
    answer: 'A poetry opportunity can be a magazine call, contest, grant, or residency. Start with the source-linked deadline and requirements, then confirm the publication or organizer’s current guidelines before sending work.',
    audience: 'Poets looking across magazines, contests, grants, and residencies rather than one opportunity type.',
    checklist: ['Opportunity type and fit', 'Deadline or reading period', 'Accepted work and length limits', 'Fee, rights, and official requirements'],
    relatedGuideSlug: 'find-submission-opportunities',
    query: { ...baseQuery, query: 'poetry' },
  },
  {
    slug: 'grants',
    title: 'Grants for creators',
    description: 'Open grants for creative work, with eligibility, deadline, and source context kept together.',
    answer: 'Before preparing a grant application, confirm the funder’s geography, career-stage rules, budget limits, project fit, and reporting expectations on the official source.',
    audience: 'Creators seeking project, practice, or professional-development funding.',
    checklist: ['Geography and career-stage eligibility', 'Project fit and eligible costs', 'Budget and reporting rules', 'Deadline and official application instructions'],
    relatedGuideSlug: 'grants-for-creators',
    query: { ...baseQuery, types: ['grant'] },
  },
  {
    slug: 'residencies',
    title: 'Residencies for creators',
    description: 'Browse open residencies with location, deadline, fee, and official source context.',
    answer: 'Residencies vary in what they offer: time, space, money, mentorship, or community. Compare location, duration, costs, eligibility, and required materials before applying.',
    audience: 'Creators comparing places, time, community, and support for developing new work.',
    checklist: ['Location, duration, and what is provided', 'Eligibility and required materials', 'Costs, travel, and accessibility', 'Deadline and official program details'],
    relatedGuideSlug: 'residencies-and-fellowships',
    query: { ...baseQuery, types: ['residency'] },
  },
  {
    slug: 'fellowships',
    title: 'Fellowships for creators',
    description: 'Find open fellowships and review the requirements and source evidence before preparing an application.',
    answer: 'A fellowship may support a project, practice, period of research, or professional development. Confirm what the award includes, who can apply, and what the recipient must deliver.',
    audience: 'Creators, researchers, and practitioners looking for structured support beyond a single submission.',
    checklist: ['What the fellowship provides', 'Eligibility and selection criteria', 'Required materials and timeline', 'Recipient obligations and official source'],
    relatedGuideSlug: 'residencies-and-fellowships',
    query: { ...baseQuery, types: ['fellowship'] },
  },
];

export function discoveryGuide(slug: string): DiscoveryGuide | undefined {
  return discoveryGuides.find((guide) => guide.slug === slug);
}

export function discoveryCollection(slug: string): DiscoveryCollection | undefined {
  return discoveryCollections.find((collection) => collection.slug === slug);
}
