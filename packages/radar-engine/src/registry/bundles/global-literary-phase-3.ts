import { expandMany, org } from '../helpers.js';
import type { SourceRegistryEntry } from '../types.js';

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
    org('Jalada Africa', 'https://jalada.submittable.com/', 'flash-hybrid', {
      opportunityTypes: ['magazine'],
      disciplines: ['fiction', 'poetry', 'nonfiction', 'experimental'],
      geography: ['global'],
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
  ],
  ['magazine'],
);
