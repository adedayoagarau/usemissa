import { directory, expandMany, org } from '../helpers.js';
import type { SourceRegistryEntry } from '../types.js';

export type AfricanLiteraryPhase3CountryStatus =
  | 'seeded'
  | 'research-needed';

export interface AfricanLiteraryPhase3CountryPlan {
  code: string;
  country: string;
  status: AfricanLiteraryPhase3CountryStatus;
  sourceNames: string[];
}

export const AFRICAN_LITERARY_PHASE_3_COUNTRY_PLAN: AfricanLiteraryPhase3CountryPlan[] = [
  { code: 'DZ', country: 'Algeria', status: 'research-needed', sourceNames: [] },
  { code: 'AO', country: 'Angola', status: 'research-needed', sourceNames: [] },
  { code: 'BJ', country: 'Benin', status: 'research-needed', sourceNames: [] },
  { code: 'BW', country: 'Botswana', status: 'seeded', sourceNames: ['Kalahari Review'] },
  { code: 'BF', country: 'Burkina Faso', status: 'research-needed', sourceNames: [] },
  { code: 'BI', country: 'Burundi', status: 'research-needed', sourceNames: [] },
  { code: 'CM', country: 'Cameroon', status: 'seeded', sourceNames: ['Bakwa Magazine'] },
  { code: 'CV', country: 'Cape Verde', status: 'research-needed', sourceNames: [] },
  { code: 'CF', country: 'Central African Republic', status: 'research-needed', sourceNames: [] },
  { code: 'TD', country: 'Chad', status: 'research-needed', sourceNames: [] },
  { code: 'KM', country: 'Comoros', status: 'research-needed', sourceNames: [] },
  { code: 'CG', country: 'Republic of the Congo', status: 'research-needed', sourceNames: [] },
  { code: 'CD', country: 'Democratic Republic of the Congo', status: 'research-needed', sourceNames: [] },
  { code: 'CI', country: 'Cote d\'Ivoire', status: 'research-needed', sourceNames: [] },
  { code: 'DJ', country: 'Djibouti', status: 'research-needed', sourceNames: [] },
  { code: 'EG', country: 'Egypt', status: 'research-needed', sourceNames: [] },
  { code: 'GQ', country: 'Equatorial Guinea', status: 'research-needed', sourceNames: [] },
  { code: 'ER', country: 'Eritrea', status: 'research-needed', sourceNames: [] },
  { code: 'SZ', country: 'Eswatini', status: 'research-needed', sourceNames: [] },
  { code: 'ET', country: 'Ethiopia', status: 'research-needed', sourceNames: [] },
  { code: 'GA', country: 'Gabon', status: 'research-needed', sourceNames: [] },
  { code: 'GM', country: 'Gambia', status: 'research-needed', sourceNames: [] },
  { code: 'GH', country: 'Ghana', status: 'seeded', sourceNames: ['Nenta Literary Journal', 'Ta Adesa', 'Hummingbird Journal'] },
  { code: 'GN', country: 'Guinea', status: 'research-needed', sourceNames: [] },
  { code: 'GW', country: 'Guinea-Bissau', status: 'research-needed', sourceNames: [] },
  { code: 'KE', country: 'Kenya', status: 'seeded', sourceNames: ['Jalada Africa', 'Inkazi Africa'] },
  { code: 'LS', country: 'Lesotho', status: 'research-needed', sourceNames: [] },
  { code: 'LR', country: 'Liberia', status: 'research-needed', sourceNames: [] },
  { code: 'LY', country: 'Libya', status: 'research-needed', sourceNames: [] },
  { code: 'MG', country: 'Madagascar', status: 'research-needed', sourceNames: [] },
  { code: 'MW', country: 'Malawi', status: 'research-needed', sourceNames: [] },
  { code: 'ML', country: 'Mali', status: 'research-needed', sourceNames: [] },
  { code: 'MR', country: 'Mauritania', status: 'research-needed', sourceNames: [] },
  { code: 'MU', country: 'Mauritius', status: 'research-needed', sourceNames: [] },
  { code: 'MA', country: 'Morocco', status: 'research-needed', sourceNames: [] },
  { code: 'MZ', country: 'Mozambique', status: 'research-needed', sourceNames: [] },
  { code: 'NA', country: 'Namibia', status: 'seeded', sourceNames: ['Doek'] },
  { code: 'NE', country: 'Niger', status: 'research-needed', sourceNames: [] },
  { code: 'NG', country: 'Nigeria', status: 'seeded', sourceNames: ['Naira Stories', 'LOGOS Magazine', 'The Inkline', 'Agbowo'] },
  { code: 'RW', country: 'Rwanda', status: 'research-needed', sourceNames: [] },
  { code: 'ST', country: 'Sao Tome and Principe', status: 'research-needed', sourceNames: [] },
  { code: 'SC', country: 'Seychelles', status: 'research-needed', sourceNames: [] },
  { code: 'SN', country: 'Senegal', status: 'research-needed', sourceNames: [] },
  { code: 'SL', country: 'Sierra Leone', status: 'research-needed', sourceNames: [] },
  { code: 'SO', country: 'Somalia', status: 'research-needed', sourceNames: [] },
  { code: 'ZA', country: 'South Africa', status: 'seeded', sourceNames: ['KUDU Journal', 'Botsotso Publishing', 'Coinage Africa'] },
  { code: 'SS', country: 'South Sudan', status: 'research-needed', sourceNames: [] },
  { code: 'SD', country: 'Sudan', status: 'research-needed', sourceNames: [] },
  { code: 'TZ', country: 'Tanzania', status: 'research-needed', sourceNames: [] },
  { code: 'TG', country: 'Togo', status: 'research-needed', sourceNames: [] },
  { code: 'TN', country: 'Tunisia', status: 'research-needed', sourceNames: [] },
  { code: 'UG', country: 'Uganda', status: 'seeded', sourceNames: ['Writivism'] },
  { code: 'ZM', country: 'Zambia', status: 'seeded', sourceNames: ['Ubwali'] },
  { code: 'ZW', country: 'Zimbabwe', status: 'seeded', sourceNames: ['Munyori Literary Journal'] },
];

/**
 * Phase 3 regional expansion seeds for literary magazines and small presses.
 *
 * These are first-party publisher or journal pages selected as crawl seeds for
 * review. Adding them to the registry schedules deterministic discovery; it
 * does not by itself publish an opportunity or claim that submissions are open.
 */
export const GLOBAL_LITERARY_PHASE_3_SOURCES: SourceRegistryEntry[] = expandMany(
  [
    org('Naira Stories', 'https://nairastories.com/print-submissions/', 'creative-nonfiction', {
      opportunityTypes: ['magazine'],
      disciplines: ['fiction', 'nonfiction', 'memoir'],
      geography: ['NG'],
      notes: 'Phase 3 Tranche A seed: Nigerian literary magazine submission guidelines.',
    }),
    org('LOGOS Magazine', 'https://www.logosmagazine.com.ng/', 'literary-fiction', {
      opportunityTypes: ['magazine'],
      disciplines: ['fiction', 'essay'],
      geography: ['NG'],
      notes: 'Phase 3 Tranche A seed: Nigerian literary magazine and writing community.',
    }),
    org('The Inkline', 'https://www.tilmagazine.com.ng/p/be-contributor.html', 'literary-fiction', {
      opportunityTypes: ['magazine'],
      disciplines: ['fiction', 'poetry', 'flash-fiction', 'essay'],
      geography: ['NG'],
      notes: 'Phase 3 Tranche A seed: Nigerian contributor guidelines.',
    }),
    org('African Writer Magazine', 'https://www.africanwriter.com/submissions/', 'literary-fiction', {
      opportunityTypes: ['magazine'],
      disciplines: ['fiction', 'poetry', 'nonfiction', 'essay', 'drama'],
      geography: ['global'],
      notes: 'Phase 3 Tranche A seed: African and diaspora literary magazine guidelines.',
    }),
    org('AFREADA', 'https://www.afreada.com/submissions', 'literary-fiction', {
      opportunityTypes: ['magazine'],
      disciplines: ['fiction'],
      geography: ['global'],
      notes: 'Phase 3 Tranche A seed: African short fiction submission guidelines.',
    }),
    org('Africa in Dialogue', 'https://africaindialogue.com/submissions/', 'creative-nonfiction', {
      opportunityTypes: ['magazine'],
      disciplines: ['interview', 'nonfiction', 'translation'],
      geography: ['global'],
      notes: 'Phase 3 Tranche A seed: African interview and long-form dialogue submissions.',
    }),
    org('Afritondo', 'https://www.afritondo.com/submission', 'literary-fiction', {
      opportunityTypes: ['magazine', 'contest'],
      disciplines: ['fiction', 'poetry', 'nonfiction', 'essay'],
      geography: ['global'],
      notes: 'Phase 3 Tranche A seed: African and Black diaspora literary submission page.',
    }),
    org('Akuko Magazine', 'https://www.akukomagazine.com/submission', 'literary-fiction', {
      opportunityTypes: ['magazine', 'contest'],
      disciplines: ['fiction', 'poetry', 'nonfiction'],
      geography: ['global'],
      notes: 'Phase 3 Tranche A seed: African and diaspora magazine submission guidelines.',
    }),
    org('A Long House', 'https://alonghouse.submittable.com/submit', 'flash-hybrid', {
      opportunityTypes: ['magazine'],
      disciplines: ['fiction', 'poetry', 'nonfiction', 'essay', 'hybrid'],
      geography: ['global'],
      notes: 'Phase 3 Tranche A seed: African experimental literary magazine submission manager.',
    }),
    org('The Iroko Circle', 'https://theirokocircle.org/submissions/', 'literary-fiction', {
      opportunityTypes: ['magazine'],
      disciplines: ['fiction', 'poetry', 'nonfiction', 'essay', 'review'],
      geography: ['global'],
      notes: 'Phase 3 Tranche A seed: African literature submissions page.',
    }),
    org('Brittle Paper', 'https://brittlepaper.com/submissions/', 'creative-nonfiction', {
      opportunityTypes: ['magazine'],
      disciplines: ['fiction', 'poetry', 'nonfiction', 'essay', 'review'],
      geography: ['global'],
      notes: 'Phase 3 Tranche A seed: African literary platform submissions page.',
    }),
    org('Agbowo', 'https://agbowo.org/submissions/', 'literary-fiction', {
      opportunityTypes: ['magazine'],
      disciplines: ['fiction', 'poetry', 'nonfiction', 'drama'],
      geography: ['NG'],
      notes: 'Phase 3 Tranche A seed: Nigerian literary and art magazine submissions page.',
    }),
    org('Omenana', 'https://omenana.com/omenana-submissions/', 'flash-hybrid', {
      opportunityTypes: ['magazine'],
      disciplines: ['speculative-fiction', 'fiction', 'nonfiction', 'flash-fiction'],
      geography: ['global'],
      notes: 'Phase 3 Tranche A seed: African speculative fiction magazine submissions page.',
    }),
    org('Iskanchi', 'https://www.iskanchi.com/blog/iskanchi-press-mag', 'flash-hybrid', {
      opportunityTypes: ['magazine', 'open-call'],
      disciplines: ['fiction', 'poetry', 'nonfiction', 'folklore', 'children'],
      geography: ['global'],
      notes: 'Phase 3 Tranche A seed: African magazine and press submission guidance.',
    }),
    org('Isele Magazine', 'https://iselemagazine.com/about/', 'literary-fiction', {
      opportunityTypes: ['magazine'],
      disciplines: ['fiction', 'poetry', 'nonfiction', 'essay', 'review'],
      geography: ['global'],
      notes: 'Phase 3 Tranche A seed: African literary magazine with submission handoff.',
    }),
    org('Adda Stories', 'https://www.addastories.org/submissions/', 'creative-nonfiction', {
      opportunityTypes: ['magazine', 'open-call'],
      disciplines: ['fiction', 'poetry', 'nonfiction'],
      geography: ['global'],
      notes: 'Phase 3 Tranche A seed: Commonwealth literary publication with Africa-region calls.',
    }),
    org('Writivism', 'https://writivism.org/submissions/', 'literary-fiction', {
      opportunityTypes: ['magazine', 'contest', 'fellowship'],
      disciplines: ['fiction', 'poetry', 'nonfiction', 'essay'],
      geography: ['UG'],
      notes: 'Phase 3 Tranche A seed: Ugandan literary initiative submissions page.',
    }),
    org('Nenta Literary Journal', 'https://www.nentajournal.com/submissions', 'literary-fiction', {
      opportunityTypes: ['magazine'],
      disciplines: ['fiction', 'poetry', 'nonfiction'],
      geography: ['GH'],
      notes: 'Phase 3 Tranche A seed: Ghanaian literary journal submission guidelines.',
    }),
    org('Ta Adesa', 'https://taadesa.org/about-us/', 'literary-fiction', {
      opportunityTypes: ['magazine'],
      disciplines: ['fiction', 'poetry'],
      geography: ['GH'],
      notes: 'Phase 3 Tranche A seed: Ghanaian literary magazine with submission page handoff.',
    }),
    org('Hummingbird Journal', 'https://www.creativesprojectgh.com/', 'literary-fiction', {
      opportunityTypes: ['magazine'],
      disciplines: ['fiction', 'poetry', 'nonfiction'],
      geography: ['GH'],
      notes: 'Phase 3 Tranche A seed: Ghana creative journal open-call entry point.',
    }),
    org('Lolwe', 'https://lolwe.submittable.com/submit', 'literary-fiction', {
      opportunityTypes: ['magazine'],
      disciplines: ['fiction', 'poetry', 'nonfiction', 'translation'],
      geography: ['global'],
      notes: 'Phase 3 Tranche A seed: Pan-African multilingual literary submission manager.',
    }),
    org('Jalada Africa', 'https://jaladaafrica.org/submissions/', 'flash-hybrid', {
      opportunityTypes: ['magazine'],
      disciplines: ['fiction', 'poetry', 'nonfiction', 'experimental'],
      geography: ['KE'],
      notes: 'Phase 3 Tranche A seed: Pan-African writers collective submission manager.',
    }),
    org('Inkazi Africa', 'https://www.inkaziafrica.com/submit-manuscript/', 'novel-book', {
      opportunityTypes: ['magazine', 'open-call'],
      disciplines: ['fiction', 'nonfiction', 'poetry', 'ya', 'children'],
      geography: ['KE'],
      notes: 'Phase 3 Tranche A seed: Kenyan publisher and manuscript submissions page.',
    }),
    org('KUDU Journal', 'https://kudujournal.wordpress.com/submissions/', 'literary-fiction', {
      opportunityTypes: ['magazine'],
      disciplines: ['fiction', 'poetry', 'nonfiction'],
      geography: ['ZA'],
      notes: 'Phase 3 Tranche A seed: South African literary journal submission guidelines.',
    }),
    org('Botsotso Publishing', 'https://botsotso.org.za/contact-submissions/', 'poetry', {
      opportunityTypes: ['magazine'],
      disciplines: ['poetry', 'fiction'],
      geography: ['ZA'],
      notes: 'Phase 3 Tranche A seed: South African journal and publisher submissions page.',
    }),
    org('Coinage Africa', 'https://coinage.africa/call-for-submissions-coinage-book-three-coinage-africa/', 'literary-fiction', {
      opportunityTypes: ['magazine'],
      disciplines: ['fiction', 'poetry', 'memoir'],
      geography: ['ZA'],
      notes: 'Phase 3 Tranche A seed: South African literary journal call page.',
    }),
    org('Doek', 'https://doeklitmag.com/submissions/', 'literary-fiction', {
      opportunityTypes: ['magazine'],
      disciplines: ['fiction', 'poetry', 'nonfiction'],
      geography: ['NA'],
      notes: 'Phase 3 Tranche A seed: Namibian literary magazine submissions page.',
    }),
    org('Munyori Literary Journal', 'https://munyoriliteraryjournal.submittable.com/', 'literary-fiction', {
      opportunityTypes: ['magazine'],
      disciplines: ['fiction', 'poetry', 'nonfiction', 'translation'],
      geography: ['ZW'],
      notes: 'Phase 3 Tranche A seed: Zimbabwean/African literary journal submission manager.',
    }),
    org('Bakwa Magazine', 'https://bakwamagazine.com/news-events/submissions/', 'creative-nonfiction', {
      opportunityTypes: ['magazine'],
      disciplines: ['fiction', 'poetry', 'nonfiction', 'translation'],
      geography: ['CM'],
      notes: 'Phase 3 Tranche A seed: Cameroonian literary magazine submissions page.',
    }),
    org('Kalahari Review', 'https://kalaharireview.com/about', 'literary-fiction', {
      opportunityTypes: ['magazine'],
      disciplines: ['fiction', 'poetry', 'nonfiction'],
      geography: ['BW'],
      notes: 'Phase 3 Tranche A seed: African writing magazine with submission contact details.',
    }),
    org('Ubwali', 'https://www.ubwali.com/submissions/', 'literary-fiction', {
      opportunityTypes: ['magazine'],
      disciplines: ['fiction', 'poetry', 'nonfiction'],
      geography: ['ZM'],
      notes: 'Phase 3 Tranche A seed: Zambian literary magazine submissions page.',
    }),
    directory('Doek List', 'https://doeklitmag.com/the-doek-list/', 'literary-fiction', {
      opportunityTypes: ['magazine', 'contest', 'grant', 'fellowship'],
      disciplines: ['fiction', 'poetry', 'nonfiction', 'translation'],
      geography: ['global'],
      checkIntervalHours: 168,
      discoveryAdapterId: 'african-literary-directory',
      discoveryLinkLimit: 200,
      notes: 'Phase 3 Tranche A directory seed: curated publications and organizations for African writers and writers of African descent.',
    }),
    directory('African Literary Magazines Directory', 'https://africanliterarymagazines.singlestory.org/business-directory/', 'literary-fiction', {
      opportunityTypes: ['magazine'],
      disciplines: ['fiction', 'poetry', 'nonfiction', 'essay', 'translation'],
      geography: ['global'],
      checkIntervalHours: 168,
      discoveryAdapterId: 'african-literary-directory',
      discoveryLinkLimit: 400,
      notes: 'Phase 3 Tranche A directory seed: African literary magazine database; child listings require first-party verification before publication.',
    }),
    directory('The Open Desk Writing Opportunities', 'https://theopendesk.co/', 'literary-fiction', {
      opportunityTypes: ['magazine', 'contest', 'grant', 'fellowship', 'residency'],
      disciplines: ['fiction', 'poetry', 'nonfiction', 'translation'],
      geography: ['global'],
      checkIntervalHours: 24,
      discoveryAdapterId: 'african-literary-directory',
      discoveryLinkLimit: 100,
      notes: 'Phase 3 Tranche A directory seed: current writing opportunities including Africa and Black diaspora literary calls.',
    }),
    directory('PUBLISH\'D AFRIKA African Writer List', 'https://publishdafrika.com/2024/01/31/are-you-an-african-writer-or-a-writer-of-african-descent/', 'literary-fiction', {
      opportunityTypes: ['magazine', 'contest', 'grant', 'fellowship'],
      disciplines: ['fiction', 'poetry', 'nonfiction', 'translation'],
      geography: ['global'],
      checkIntervalHours: 168,
      discoveryAdapterId: 'african-literary-directory',
      discoveryLinkLimit: 200,
      notes: 'Phase 3 Tranche A directory seed: African and African-diaspora publication list requiring source-by-source verification.',
    }),
  ],
  ['magazine'],
);
