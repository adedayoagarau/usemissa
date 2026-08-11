import type { OpportunityRepositoryQuery } from '@missa/radar-engine';

// Keep this aligned with meaningful edits to public discovery copy. Bing uses
// accurate lastmod values to prioritize recrawls; it ignores cosmetic sitemap
// fields such as priority and changefreq.
export const discoveryContentLastModified = new Date('2026-08-11T00:00:00.000Z');
export const discoveryContentLastModifiedLabel = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'long',
  timeZone: 'UTC',
}).format(discoveryContentLastModified);

export interface DiscoveryGuide {
  slug: string;
  title: string;
  description: string;
  answer: string;
  faqs: Array<{ question: string; answer: string }>;
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
    faqs: [
      { question: 'What should I check before applying to an opportunity?', answer: 'Check the official source, deadline or reading window, fee, eligibility, required materials, and submission path. Missa is a source-linked starting point; the organization’s page remains the authority.' },
      { question: 'Does Missa guarantee that an opportunity is still open?', answer: 'No. Missa shows the current public source snapshot and freshness signal, but deadlines and requirements can change. Confirm the official source before sending work.' },
    ],
    query: baseQuery,
  },
  {
    slug: 'no-fee-submission-opportunities',
    title: 'No-fee submission opportunities',
    description: 'Browse currently open opportunities where the source record says no submission fee is disclosed.',
    answer: 'A no-fee label means Missa’s current source record says the submission fee is zero. Always open the official source before applying, because fees and eligibility can change after a record is checked.',
    faqs: [
      { question: 'What does no-fee mean on Missa?', answer: 'It means the current source record says the submission fee is zero. Confirm the organization’s own guidelines before applying because fees and windows can change.' },
      { question: 'Are no-fee opportunities automatically a good fit?', answer: 'No. Compare the opportunity’s eligibility, accepted work, deadline, rights, and required materials with your practice before preparing a submission.' },
    ],
    query: { ...baseQuery, feeStatus: 'no-fee' },
  },
  {
    slug: 'grants-for-creators',
    title: 'Grants for creators',
    description: 'See open grant opportunities and the evidence you should check before preparing an application.',
    answer: 'A grant opportunity usually asks you to explain the work, need, audience, or project plan rather than submit to a publication. Check the funder’s eligibility, geography, budget rules, and reporting expectations on the official source.',
    faqs: [
      { question: 'What should creators check in a grant opportunity?', answer: 'Check geography, career stage, eligible costs, project fit, budget rules, reporting expectations, deadline, and the funder’s official application instructions.' },
      { question: 'Is a grant the same as a submission call?', answer: 'Not always. Grants often fund a project, practice, or professional development plan, while a submission call may ask for work to publish, exhibit, or judge.' },
    ],
    query: { ...baseQuery, types: ['grant'] },
  },
  {
    slug: 'residencies-and-fellowships',
    title: 'Residencies and fellowships',
    description: 'Browse open residencies and fellowships with deadline, location, fee, and source context in view.',
    answer: 'Residencies and fellowships can differ widely in what they provide: time, space, money, mentorship, or a community. Compare the location, duration, eligibility, required materials, and any costs before deciding whether the opportunity fits your practice.',
    faqs: [
      { question: 'What is the difference between a residency and a fellowship?', answer: 'A residency often centers time, space, place, or community for developing work. A fellowship may support research, a project, practice, or professional development. The official program description should define the terms.' },
      { question: 'What should I compare before applying to a residency?', answer: 'Compare location, duration, what is provided, travel or participation costs, accessibility, eligibility, required materials, and the program’s expectations for recipients.' },
    ],
    query: { ...baseQuery, types: ['residency', 'fellowship'] },
  },
  {
    slug: 'magazine-submissions',
    title: 'Magazine submission opportunities',
    description: 'Find open magazine calls and check the publication’s guidelines, reading period, fee, and accepted formats.',
    answer: 'For a magazine submission, the most important checks are the current reading period, accepted formats, simultaneous-submission rules, fee, rights, and response expectations. Missa’s listing is a starting point; the publication’s own guidelines are the authority.',
    faqs: [
      { question: 'What should I check before submitting to a magazine?', answer: 'Check the current reading period, accepted formats and genres, simultaneous-submission rules, fee, rights, response expectations, and the publication’s official guidelines.' },
      { question: 'Can I rely on a listing instead of the magazine’s guidelines?', answer: 'No. Use a Missa listing to compare opportunities, then open the publication’s official guidelines to confirm the current requirements and submission path.' },
    ],
    query: { ...baseQuery, types: ['magazine'] },
  },
  {
    slug: 'verify-an-opportunity-before-applying',
    title: 'How to verify an opportunity before applying',
    description: 'Use a source-first checklist to avoid relying on an expired, copied, or incomplete opportunity listing.',
    answer: 'Verify the opportunity on the organization’s own source, confirm that the deadline and submission path are current, check the fee and eligibility, and make sure the destination uses a safe HTTPS link. Treat anything Missa marks as unconfirmed as a prompt to investigate, not as a guarantee.',
    faqs: [
      { question: 'How do I verify an opportunity before applying?', answer: 'Open the organization’s official source, confirm the deadline and submission path, review fee and eligibility, check required materials, and make sure the destination is the one you intend to use.' },
      { question: 'What does needs confirmation mean?', answer: 'It means Missa has not established that fact strongly enough to present it as settled. Treat it as a prompt to inspect the official source, not as a hidden assumption.' },
    ],
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
