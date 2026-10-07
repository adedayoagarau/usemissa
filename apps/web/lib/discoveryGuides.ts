import type { OpportunityRepositoryQuery } from '@missa/radar-engine';

// Keep this aligned with meaningful edits to public discovery copy. Bing uses
// accurate lastmod values to prioritize recrawls; it ignores cosmetic sitemap
// fields such as priority and changefreq.
export const discoveryContentLastModified = new Date('2026-10-07T00:00:00.000Z');
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
  /** Listed in the site-wide "Keep exploring" footer. Hubs still link each other. */
  footer?: boolean;
}

const baseQuery = { openNow: true, sort: 'soonest-deadline' as const, limit: 6 };

export const discoveryGuides: DiscoveryGuide[] = [
  {
    slug: 'find-submission-opportunities',
    title: 'How to find open calls for your work',
    description: 'A practical starting point for finding open calls, grants, magazines, residencies, and fellowships without losing the source details.',
    answer: 'Start with opportunities that are open now, then compare the deadline, fee, eligibility, required materials, and official source. Missa keeps those facts together so you can decide whether a call deserves your time before you prepare a submission.',
    faqs: [
      { question: 'What should I check before applying to an opportunity?', answer: 'Check the official source, deadline or reading window, fee, eligibility, required materials, and submission path. Missa is a source-linked starting point; the organization’s page remains the authority.' },
      { question: 'Does Missa guarantee that an opportunity is still open?', answer: 'No. Deadlines and requirements can change. Confirm the official source before sending work.' },
    ],
    query: baseQuery,
  },
  {
    slug: 'no-fee-submission-opportunities',
    title: 'Open calls with no submission fee: what no-fee means',
    description: 'Browse currently open opportunities where the source record says no submission fee is disclosed.',
    answer: 'A no-fee label means the published call says the submission fee is zero. Always open the official source before you apply, because fees and eligibility can change.',
    faqs: [
      { question: 'What does no-fee mean on Missa?', answer: 'It means the published call says the submission fee is zero. Check the organizer’s own guidelines before you apply, because fees and windows can change.' },
      { question: 'Are no-fee opportunities automatically a good fit?', answer: 'No. Compare the opportunity’s eligibility, accepted work, deadline, rights, and required materials with your field before preparing a submission.' },
    ],
    query: { ...baseQuery, feeStatus: 'no-fee' },
  },
  {
    slug: 'grants-for-creators',
    title: 'Grants for artists and writers: what to check',
    description: 'See open grant opportunities and the evidence you should check before preparing an application.',
    answer: 'A grant opportunity usually asks you to explain the work, need, audience, or project plan rather than submit to a publication. Check the funder’s eligibility, geography, budget rules, and reporting expectations on the official source.',
    faqs: [
      { question: 'What should I check in a grant call?', answer: 'Check geography, career stage, eligible costs, project fit, budget rules, reporting expectations, deadline, and the funder’s official application instructions.' },
      { question: 'Is a grant the same as a submission call?', answer: 'Not always. Grants often fund a project, creative work, or professional development plan, while a submission call may ask for work to publish, exhibit, or judge.' },
    ],
    query: { ...baseQuery, types: ['grant'] },
  },
  {
    slug: 'residencies-and-fellowships',
    title: 'Residencies and fellowships: how to compare them',
    description: 'Browse open residencies and fellowships with deadline, location, fee, and source context in view.',
    answer: 'Residencies and fellowships can differ widely in what they provide: time, space, money, mentorship, or a community. Compare the location, duration, eligibility, required materials, and any costs before deciding whether the opportunity fits your field.',
    faqs: [
      { question: 'What is the difference between a residency and a fellowship?', answer: 'A residency often centers time, space, place, or community for developing work. A fellowship may support research, a project, a body of work, or professional development. The official program description should define the terms.' },
      { question: 'What should I compare before applying to a residency?', answer: 'Compare location, duration, what is provided, travel or participation costs, accessibility, eligibility, required materials, and the program’s expectations for recipients.' },
    ],
    query: { ...baseQuery, types: ['residency', 'fellowship'] },
  },
  {
    slug: 'magazine-submissions',
    title: 'Submitting to literary magazines: what to check',
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
    title: 'How to check a call before you apply',
    description: 'Use a source-first checklist to avoid relying on an expired, copied, or incomplete opportunity listing.',
    answer: 'Verify the opportunity on the organization’s own source, confirm that the deadline and submission path are current, check the fee and eligibility, and make sure the destination uses a safe HTTPS link. Treat anything Missa marks as unconfirmed as a prompt to investigate, not as a guarantee.',
    faqs: [
      { question: 'How do I verify an opportunity before applying?', answer: 'Open the organization’s official source, confirm the deadline and submission path, review fee and eligibility, check required materials, and make sure the destination is the one you intend to use.' },
      { question: 'What does needs confirmation mean?', answer: 'It means Missa has not established that fact strongly enough to present it as settled. Treat it as a prompt to inspect the official source, not as a hidden assumption.' },
    ],
    query: { ...baseQuery, verifiedOnly: true },
  },
  {
    slug: 'jobs-for-creators',
    title: 'Jobs in publishing and the arts: what to check',
    description: 'Paid editorial roles, curatorial posts, publishing internships and teaching jobs for writers and artists, and what to check before you apply.',
    answer: 'Creative and cultural jobs provide steady income, institutional backing, and professional growth for practitioners. Always confirm the salary transparency, benefits, eligibility criteria, and application procedure directly on the hiring institution’s official careers page.',
    faqs: [
      { question: 'What kinds of jobs are listed on Missa?', answer: 'Missa indexes creative-sector positions including literary magazine editors, publishing interns, museum and gallery curators, arts administration coordinators, and higher education faculty in creative writing and studio arts.' },
      { question: 'What should I verify before applying to a creative job?', answer: 'Check the employment status (full-time, part-time, contract), salary range or stipend, remote vs in-person requirements, closing date, required portfolio or writing samples, and the employer’s official submission path.' },
    ],
    query: { ...baseQuery, types: ['job'] },
  },
];

export const discoveryCollections: DiscoveryCollection[] = [
  {
    slug: 'contests',
    title: 'Contests for artists and writers',
    description: 'Contests and calls for entries open now, with the deadline and entry fee for each and a link to the organizer’s page.',
    answer: 'Compare the closing date, fee, eligibility, prize information, and official submission path before entering a contest. The organizer’s page remains the authority.',
    audience: 'Creators looking for prizes, calls for entries, and time-bound competitions.',
    checklist: ['Closing date and time zone', 'Entry fee and prize information', 'Eligibility and accepted formats', 'Official submission path'],
    relatedGuideSlug: 'verify-an-opportunity-before-applying',
    query: { ...baseQuery, types: ['contest'] },
  },
  {
    slug: 'magazines',
    title: 'Magazine submissions',
    description: 'Magazines open for submissions now. Check the reading period, fee and accepted formats, with a link to each magazine’s guidelines.',
    answer: 'For magazine submissions, check the current reading period, accepted formats, simultaneous-submission rules, fee, rights, and response expectations on the publication’s own guidelines.',
    audience: 'Writers, poets, artists, and editors comparing publications and reading periods.',
    checklist: ['Reading period or rolling status', 'Accepted formats and genres', 'Fee, rights, and simultaneous-submission rules', 'Official guidelines and response expectations'],
    relatedGuideSlug: 'magazine-submissions',
    query: { ...baseQuery, types: ['magazine'] },
  },
  {
    slug: 'poetry',
    title: 'Poetry opportunities',
    description: 'Open calls for poets, from magazines and contests to grants and residencies, with the deadline and fee for each.',
    answer: 'A poetry opportunity can be a magazine call, contest, grant, or residency. Start with the source-linked deadline and requirements, then confirm the publication or organizer’s current guidelines before sending work.',
    audience: 'Poets looking across magazines, contests, grants, and residencies rather than one opportunity type.',
    checklist: ['Opportunity type and fit', 'Deadline or reading period', 'Accepted work and length limits', 'Fee, rights, and official requirements'],
    relatedGuideSlug: 'find-submission-opportunities',
    query: { ...baseQuery, query: 'poetry' },
  },
  {
    slug: 'grants',
    title: 'Grants for artists and writers',
    description: 'Grants open now for artists and writers, with who can apply, the deadline and the funder’s own page for each.',
    answer: 'Before preparing a grant application, confirm the funder’s geography, career-stage rules, budget limits, project fit, and reporting expectations on the official source.',
    audience: 'Creators seeking project or professional-development funding.',
    checklist: ['Geography and career-stage eligibility', 'Project fit and eligible costs', 'Budget and reporting rules', 'Deadline and official application instructions'],
    relatedGuideSlug: 'grants-for-creators',
    query: { ...baseQuery, types: ['grant'] },
  },
  {
    slug: 'residencies',
    title: 'Residencies for artists and writers',
    description: 'Residencies open now, with the location, deadline and fee for each and a link to the organizer’s page.',
    answer: 'Residencies vary in what they offer: time, space, money, mentorship, or community. Compare location, duration, costs, eligibility, and required materials before applying.',
    audience: 'Creators comparing places, time, community, and support for developing new work.',
    checklist: ['Location, duration, and what is provided', 'Eligibility and required materials', 'Costs, travel, and accessibility', 'Deadline and official program details'],
    relatedGuideSlug: 'residencies-and-fellowships',
    query: { ...baseQuery, types: ['residency'] },
  },
  {
    slug: 'fellowships',
    title: 'Fellowships for artists and writers',
    description: 'Fellowships open now. See what each one offers and asks for, with a link to the organizer’s page, before you apply.',
    answer: 'A fellowship may support a project, a body of work, a period of research, or professional development. Confirm what the award includes, who can apply, and what the recipient must deliver.',
    audience: 'Creators, researchers, and practitioners looking for structured support beyond a single submission.',
    checklist: ['What the fellowship provides', 'Eligibility and selection criteria', 'Required materials and timeline', 'Recipient obligations and official source'],
    relatedGuideSlug: 'residencies-and-fellowships',
    query: { ...baseQuery, types: ['fellowship'] },
  },
  {
    slug: 'queer-lgbtq-opportunities',
    title: 'Opportunities for queer and LGBTQ+ artists and writers',
    description: 'Grants, residencies, fellowships and open calls that mention queer artists and writers. Check each organizer’s page for who can apply.',
    answer: 'Identity-centered calls provide focused platforms, funding, and community for LGBTQIA+ creators. Compare guidelines, deadlines, rights, and eligibility requirements directly on the organizer’s official source before applying.',
    audience: 'LGBTQIA+ writers, poets, visual artists, and performers seeking dedicated or explicitly inclusive open calls.',
    checklist: ['Eligible identities and community guidelines', 'Deadline and official submission path', 'Funding, stipend, or prize terms', 'Rights, licensing, and publication policies'],
    relatedGuideSlug: 'find-submission-opportunities',
    query: { ...baseQuery, query: 'queer' },
  },
  {
    slug: 'bipoc-opportunities',
    title: 'Opportunities for BIPOC artists and writers',
    description: 'Fellowships, grants, magazines and residencies that mention BIPOC artists and writers. Check each organizer’s page for who can apply.',
    answer: 'Dedicated calls for Black, Indigenous, and creators of color offer vital financial support, mentorship, and creative platforms. Confirm the funder or publication’s stated eligibility and submission requirements on the official source.',
    audience: 'Black, Indigenous, and creators of color seeking fellowships, funding, dedicated reading periods, and residencies.',
    checklist: ['Stated demographic and career-stage eligibility', 'Project proposal or manuscript specifications', 'Application fee waivers or free submission categories', 'Timeline, selection criteria, and funder guidelines'],
    relatedGuideSlug: 'grants-for-creators',
    query: { ...baseQuery, query: 'bipoc' },
  },
  {
    slug: 'women-nonbinary-opportunities',
    title: 'Opportunities for women and non-binary artists and writers',
    description: 'Prizes, grants, residencies and open calls that mention women. Check each organizer’s page for who can apply, including non-binary artists and writers.',
    answer: 'Explore opportunities designed to amplify women and non-binary writers and artists. Check accepted disciplines, deadlines, and submission materials before applying.',
    audience: 'Women, non-binary, and gender-expansive artists, writers, filmmakers, and poets.',
    checklist: ['Eligibility criteria and accepted disciplines', 'Submission windows and deadlines', 'Required materials (samples, CV, artist statement)', 'Application fees and fee assistance options'],
    relatedGuideSlug: 'find-submission-opportunities',
    query: { ...baseQuery, query: 'women' },
  },
  {
    slug: 'disabled-neurodivergent-opportunities',
    title: 'Opportunities for disabled and neurodivergent artists and writers',
    description: 'Residencies, grants and open calls that mention disability. Check each organizer’s page for access details and who can apply.',
    answer: 'Find creative opportunities that prioritize physical, sensory, and cognitive accessibility. Verify accommodation provisions, access statements, and application assistance on the official source.',
    audience: 'Disabled, d/Deaf, chronically ill, and neurodivergent artists and writers seeking accessible, supportive opportunities.',
    checklist: ['Accessibility provisions and accommodations', 'Remote vs in-person participation options', 'Application format flexibility', 'Deadline, eligibility, and grant or stipend terms'],
    relatedGuideSlug: 'verify-an-opportunity-before-applying',
    query: { ...baseQuery, query: 'disability' },
  },
  {
    slug: 'emerging-writers-artists',
    title: 'Opportunities for emerging artists and writers',
    description: 'Calls that mention emerging artists and writers, such as first-book prizes, debut calls, fellowships and residencies. Check how each organizer defines emerging.',
    answer: 'Calls for emerging artists and writers are for people early in their career or publishing history. Check how each organizer defines emerging (for example, fewer than two books, or under five years of making work) before you apply.',
    audience: 'Debut authors, early-career visual artists, emerging performers, and recent graduates.',
    checklist: ['Definition of "emerging" or career-stage requirements', 'Accepted genres and portfolio limits', 'Mentorship, exhibition, or publication deliverables', 'Official guidelines and deadline date'],
    relatedGuideSlug: 'find-submission-opportunities',
    query: { ...baseQuery, query: 'emerging' },
  },
  {
    slug: 'jobs-for-creators',
    title: 'Jobs for artists, writers and arts workers',
    description: 'Editing, curating, publishing and teaching jobs open now, from internships to faculty posts, with a link to each employer’s page.',
    answer: 'Creative and cultural jobs offer structured compensation, institutional backing, and professional growth for practitioners. Always confirm the salary transparency, benefits, eligibility criteria, and application procedure directly on the hiring institution’s official careers page.',
    audience: 'Writers, editors, curators, arts administrators, and educators looking for full-time, part-time, or contract positions.',
    checklist: ['Role responsibilities, schedule, and location (remote/onsite)', 'Compensation, salary bands, or stipend rates', 'Eligibility, required portfolio, and submission materials', 'Application closing date and official careers portal'],
    relatedGuideSlug: 'jobs-for-creators',
    query: { ...baseQuery, types: ['job'] },
  },
  {
    slug: 'no-fee-calls',
    title: 'Open calls with no entry fee',
    description: 'Open calls, contests, magazines, grants and residencies listed with no entry fee, each with the deadline and a link to the organizer’s page.',
    answer: 'A call listed here has no entry or reading fee on the organizer’s page. Fees can change between cycles, so check the official guidelines before you send work.',
    audience: 'Artists and writers who want to send work without paying to be read.',
    checklist: ['No entry or reading fee on the organizer’s page', 'Deadline and time zone', 'Who can apply', 'Rights the organizer asks for'],
    relatedGuideSlug: 'no-fee-submission-opportunities',
    query: { ...baseQuery, feeStatus: 'no-fee' },
  },
  {
    slug: 'free-contests',
    title: 'Free contests and prizes with no entry fee',
    description: 'Writing, art and photography contests and prizes listed with no entry fee, with the deadline and prize for each.',
    answer: 'These contests and prizes list no entry fee. Read the prize terms and the rights you grant before entering; a free contest can still ask for publication rights.',
    audience: 'Writers and artists entering contests without paying an entry fee.',
    checklist: ['No entry fee on the organizer’s page', 'Prize and how it is paid', 'Rights you grant if you win', 'Deadline and accepted formats'],
    relatedGuideSlug: 'no-fee-submission-opportunities',
    query: { ...baseQuery, types: ['contest', 'award'], feeStatus: 'no-fee' },
  },
  {
    slug: 'closing-this-week',
    title: 'Open calls closing this week',
    description: 'Open calls, grants, residencies and contests with a deadline in the next seven days, soonest first.',
    answer: 'These calls close within seven days. Deadlines are shown in the organizer’s time zone where the page gives one; leave time for the form itself.',
    audience: 'Anyone with work ready to send this week.',
    checklist: ['Closing date and time zone', 'Fee and who can apply', 'What to send', 'The organizer’s submission page'],
    relatedGuideSlug: 'verify-an-opportunity-before-applying',
    query: { ...baseQuery, deadlineWithinDays: 7 },
  },
  {
    slug: 'closing-this-month',
    title: 'Open calls closing in the next 30 days',
    description: 'Open calls, grants, residencies, magazines and contests with a deadline in the next 30 days, soonest first.',
    answer: 'These calls close within 30 days, which is usually enough time to prepare a sample, a statement and a budget if one is asked for.',
    audience: 'Artists and writers planning the month’s applications.',
    checklist: ['Closing date and time zone', 'Materials and length limits', 'Fee and who can apply', 'The organizer’s submission page'],
    relatedGuideSlug: 'verify-an-opportunity-before-applying',
    query: { ...baseQuery, deadlineWithinDays: 30 },
    footer: false,
  },
  {
    slug: 'rolling-submissions',
    title: 'Calls open all year (rolling submissions)',
    description: 'Magazines, presses and programs that read submissions on a rolling basis, with no fixed deadline.',
    answer: 'A rolling call has no single deadline: the organizer reads work as it arrives and may close without notice when it fills. Check the page is still open before you send.',
    audience: 'Writers and artists who want somewhere to send work now.',
    checklist: ['That the call is still open today', 'Response time', 'Simultaneous-submission rules', 'Fee and accepted formats'],
    relatedGuideSlug: 'magazine-submissions',
    query: { ...baseQuery, deadlineKind: 'rolling' },
  },
  {
    slug: 'residencies-no-fee',
    title: 'Residencies with no application fee',
    description: 'Artist and writer residencies listed with no application fee, with the location, deadline and a link to the program’s page.',
    answer: 'These residencies list no application fee. That says nothing about the cost of attending: check whether housing, travel and a stipend are covered on the program’s page.',
    audience: 'Artists and writers looking for residencies they can apply to for free.',
    checklist: ['No application fee', 'What is covered: housing, travel, stipend', 'Dates and length of stay', 'Who can apply'],
    relatedGuideSlug: 'residencies-and-fellowships',
    query: { ...baseQuery, types: ['residency'], feeStatus: 'no-fee' },
  },
  {
    slug: 'fiction',
    title: 'Fiction open calls and short story submissions',
    description: 'Magazines, contests, grants and residencies open to fiction writers, with the deadline, fee and word limits for each.',
    answer: 'Fiction calls range from magazine reading periods to story prizes and novel residencies. Check the word limit, simultaneous-submission rules and rights before you send.',
    audience: 'Short story writers and novelists.',
    checklist: ['Word limit and number of pieces', 'Fee and reading period', 'Simultaneous-submission rules', 'Rights and payment'],
    relatedGuideSlug: 'magazine-submissions',
    query: { ...baseQuery, taxonomyTermIds: ['taxterm_disc-fiction'], taxonomyIncludeDescendants: true },
  },
  {
    slug: 'flash-fiction',
    title: 'Flash fiction submissions and contests',
    description: 'Magazines and contests open to flash fiction, with the word limit, deadline and fee for each.',
    answer: 'Flash fiction limits vary from 50 to around 1,500 words. Check the exact limit and how many pieces you may send in one submission.',
    audience: 'Writers of very short fiction.',
    checklist: ['Word limit', 'Number of pieces per submission', 'Fee and deadline', 'Rights and payment'],
    relatedGuideSlug: 'magazine-submissions',
    query: { ...baseQuery, taxonomyTermIds: ['taxterm_form-flash-fiction'], taxonomyIncludeDescendants: true },
    footer: false,
  },
  {
    slug: 'creative-nonfiction',
    title: 'Creative nonfiction and essay submissions',
    description: 'Magazines, prizes and grants open to essays and creative nonfiction, with the deadline and fee for each.',
    answer: 'Creative nonfiction calls include personal essays, lyric essays and reported work. Check the length limit and whether the organizer wants unpublished work only.',
    audience: 'Essayists and nonfiction writers.',
    checklist: ['Length limit', 'Unpublished-work rules', 'Fee and deadline', 'Rights and payment'],
    relatedGuideSlug: 'magazine-submissions',
    query: { ...baseQuery, taxonomyTermIds: ['taxterm_disc-creative-nonfiction'], taxonomyIncludeDescendants: true },
    footer: false,
  },
  {
    slug: 'chapbook-contests',
    title: 'Chapbook contests and manuscript calls',
    description: 'Chapbook contests and open reading periods for short poetry and prose collections, with the page count, fee and deadline for each.',
    answer: 'Chapbook calls usually ask for 15 to 40 pages. Check the page range, the reading fee, and whether the press reads simultaneous submissions.',
    audience: 'Poets and writers with a short collection ready.',
    checklist: ['Page range', 'Reading fee and prize', 'Simultaneous-submission rules', 'Deadline and judge'],
    relatedGuideSlug: 'find-submission-opportunities',
    query: { ...baseQuery, query: 'chapbook' },
  },
  {
    slug: 'visual-arts',
    title: 'Open calls for visual artists',
    description: 'Exhibitions, residencies, grants and commissions open to visual artists, with the deadline, fee and a link to the organizer’s page.',
    answer: 'Visual art calls range from juried shows to public commissions. Check image specs, the entry fee, sales commission and who pays for shipping.',
    audience: 'Painters, sculptors, printmakers and other visual artists.',
    checklist: ['Image count and file specs', 'Entry fee and sales commission', 'Shipping and installation costs', 'Deadline and who can apply'],
    relatedGuideSlug: 'find-submission-opportunities',
    query: { ...baseQuery, taxonomyTermIds: ['taxterm_pf-visual-arts'], taxonomyIncludeDescendants: true },
  },
  {
    slug: 'painting',
    title: 'Open calls for painters',
    description: 'Exhibitions, prizes, residencies and grants open to painters, with the deadline and fee for each.',
    answer: 'Check the size limits, how many works you can enter, the entry fee and the gallery’s commission on sales.',
    audience: 'Painters looking for shows, prizes and residencies.',
    checklist: ['Size and number of works', 'Entry fee and commission', 'Shipping and delivery', 'Deadline'],
    relatedGuideSlug: 'find-submission-opportunities',
    query: { ...baseQuery, taxonomyTermIds: ['taxterm_disc-painting'], taxonomyIncludeDescendants: true },
    footer: false,
  },
  {
    slug: 'sculpture',
    title: 'Open calls for sculptors',
    description: 'Exhibitions, commissions, residencies and grants open to sculptors, with the deadline and fee for each.',
    answer: 'Sculpture calls often involve installation and transport. Check who pays for shipping, insurance and installation before you apply.',
    audience: 'Sculptors and installation artists.',
    checklist: ['Dimensions and weight limits', 'Shipping, insurance and installation', 'Entry fee and commission', 'Deadline'],
    relatedGuideSlug: 'find-submission-opportunities',
    query: { ...baseQuery, taxonomyTermIds: ['taxterm_disc-sculpture'], taxonomyIncludeDescendants: true },
    footer: false,
  },
  {
    slug: 'photography',
    title: 'Photography open calls and competitions',
    description: 'Photography competitions, exhibitions, grants and residencies, with the entry fee, deadline and a link to the organizer’s page.',
    answer: 'Check the image specs, how many photographs you can enter, the entry fee, and the usage rights you grant the organizer.',
    audience: 'Photographers and lens-based artists.',
    checklist: ['Number of images and file specs', 'Entry fee', 'Usage rights you grant', 'Deadline'],
    relatedGuideSlug: 'find-submission-opportunities',
    query: { ...baseQuery, query: 'photography' },
  },
  {
    slug: 'film',
    title: 'Open calls for filmmakers',
    description: 'Festivals, grants, residencies and commissions open to filmmakers and moving-image artists, with the deadline and fee for each.',
    answer: 'Film calls vary by length, format and premiere status. Check running time limits, premiere rules, screener format and the submission fee.',
    audience: 'Filmmakers, video artists and moving-image makers.',
    checklist: ['Running time and format', 'Premiere status rules', 'Submission fee', 'Deadline and screener requirements'],
    relatedGuideSlug: 'find-submission-opportunities',
    query: { ...baseQuery, taxonomyTermIds: ['taxterm_pf-film-and-moving-image'], taxonomyIncludeDescendants: true },
  },
  {
    slug: 'music',
    title: 'Open calls for musicians and composers',
    description: 'Commissions, residencies, grants and competitions open to musicians, composers and sound artists, with the deadline and fee for each.',
    answer: 'Check the instrumentation or format asked for, recording requirements, the fee and who keeps the rights to the work.',
    audience: 'Musicians, composers and sound artists.',
    checklist: ['Instrumentation or format', 'Recording and score requirements', 'Fee and rights', 'Deadline'],
    relatedGuideSlug: 'find-submission-opportunities',
    query: { ...baseQuery, taxonomyTermIds: ['taxterm_pf-music-and-sound'], taxonomyIncludeDescendants: true },
    footer: false,
  },
  {
    slug: 'dance',
    title: 'Open calls for dancers and choreographers',
    description: 'Residencies, commissions, festivals and grants open to dancers and choreographers, with the deadline and fee for each.',
    answer: 'Check rehearsal space, the length of the residency or run, what is paid and the video documentation asked for.',
    audience: 'Dancers and choreographers.',
    checklist: ['Studio time and dates', 'Fee or stipend', 'Video documentation', 'Deadline'],
    relatedGuideSlug: 'residencies-and-fellowships',
    query: { ...baseQuery, taxonomyTermIds: ['taxterm_pf-dance-and-choreography'], taxonomyIncludeDescendants: true },
    footer: false,
  },
  {
    slug: 'theater',
    title: 'Open calls for playwrights and theater makers',
    description: 'Play submissions, residencies, festivals and grants for playwrights and theater makers, with the deadline and fee for each.',
    answer: 'Check whether the call wants a full script or a sample, any running-time limit, the reading fee, and whether earlier productions disqualify the play.',
    audience: 'Playwrights, devisers and theater companies.',
    checklist: ['Script or sample length', 'Production history rules', 'Fee and deadline', 'What the program provides'],
    relatedGuideSlug: 'find-submission-opportunities',
    query: { ...baseQuery, taxonomyTermIds: ['taxterm_pf-theatre-and-dramatic-arts'], taxonomyIncludeDescendants: true },
    footer: false,
  },
  {
    slug: 'exhibitions-and-festivals',
    title: 'Exhibition and festival open calls',
    description: 'Juried exhibitions and festivals taking entries now, with the entry fee, deadline and a link to the organizer’s page.',
    answer: 'Check the entry fee, any hanging or participation fee if selected, the sales commission and who pays for shipping.',
    audience: 'Artists and filmmakers looking for shows and festivals.',
    checklist: ['Entry fee and fees if selected', 'Sales commission', 'Shipping and delivery', 'Dates of the show or festival'],
    relatedGuideSlug: 'verify-an-opportunity-before-applying',
    query: { ...baseQuery, types: ['exhibition', 'festival'] },
    footer: false,
  },
];

export function discoveryGuide(slug: string): DiscoveryGuide | undefined {
  return discoveryGuides.find((guide) => guide.slug === slug);
}

export function discoveryCollection(slug: string): DiscoveryCollection | undefined {
  return discoveryCollections.find((collection) => collection.slug === slug);
}
