import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assessOpportunityRelevance,
  decodeHtmlEntities,
  isGenericOpportunityLabel,
  isUsableOrganizationName,
  normalizeOpportunityTitle,
  titleContainsOrganization,
} from '../src/index.js';

type Case = {
  raw: string;
  organizationName?: string;
  title: string;
  generic?: boolean;
  needsOrganization: boolean;
};

// Every example below was published by the staging review agent.
const stagingExamples: Case[] = [
  { raw: 'POETRY', title: 'Poetry', generic: true, needsOrganization: true },
  { raw: 'POETRY', organizationName: 'Rattle', title: 'Rattle — Poetry', generic: true, needsOrganization: false },
  { raw: 'Fiction', title: 'Fiction', generic: true, needsOrganization: true },
  { raw: 'Fiction', organizationName: 'The Masters Review', title: 'The Masters Review — Fiction', generic: true, needsOrganization: false },
  { raw: 'glean 2026/27', title: 'Glean 2026/27', generic: false, needsOrganization: true },
  { raw: 'glean 2026/27', organizationName: 'Glean', title: 'Glean 2026/27', needsOrganization: false },
  { raw: 'kluge fellowships', title: 'Kluge Fellowships', generic: false, needsOrganization: true },
  { raw: 'kluge fellowships', organizationName: 'Library of Congress', title: 'Library of Congress — Kluge Fellowships', needsOrganization: false },
  { raw: 'house in the neighborhood', title: 'House in the Neighborhood', generic: false, needsOrganization: true },
  { raw: '🌟 Short Story Submission — ALWAYS OPEN', title: 'Short Story Submission — Always Open', generic: true, needsOrganization: true },
  { raw: '🌟 Short Story Submission — ALWAYS OPEN', organizationName: 'Bright Flash Literary Review', title: 'Bright Flash Literary Review — Short Story Submission — Always Open', needsOrganization: false },
  { raw: '❄︎ (2026W) PHIL LIT Poetry Prize', title: 'PHIL LIT Poetry Prize (2026W)', generic: false, needsOrganization: false },
  { raw: 'Visual Art : HUMBLE - Volume IX - Quibble Lit', title: 'Visual Art: HUMBLE — Volume IX — Quibble Lit', generic: false, needsOrganization: false },
  { raw: 'Visual Art : HUMBLE - Volume IX - Quibble Lit', organizationName: 'Quibble Lit Magazine', title: 'Visual Art: HUMBLE — Volume IX — Quibble Lit', needsOrganization: false },
  { raw: 'How to Poet Blog', title: 'How to Poet Blog', generic: false, needsOrganization: false },
  { raw: 'The Minnesota Microgrant Partnership - Housing', title: 'The Minnesota Microgrant Partnership — Housing', generic: false, needsOrganization: false },
];

for (const example of stagingExamples) {
  test(`normalizes ${JSON.stringify(example.raw)}${example.organizationName ? ` for ${example.organizationName}` : ''}`, () => {
    const result = normalizeOpportunityTitle(example.raw, { organizationName: example.organizationName ?? null });
    assert.equal(result.title, example.title);
    assert.equal(result.rawTitle, example.raw);
    assert.equal(result.needsOrganization, example.needsOrganization);
    if (example.generic !== undefined) assert.equal(result.genericLabel, example.generic);
    assert.equal(result.changed, example.title !== example.raw);
  });
}

test('records each editorial change it makes', () => {
  assert.deepEqual(normalizeOpportunityTitle('🌟 Short Story Submission — ALWAYS OPEN').changes, ['removed-decorations', 'recased']);
  assert.deepEqual(normalizeOpportunityTitle('Visual Art : HUMBLE - Volume IX - Quibble Lit').changes, ['fixed-punctuation-spacing', 'normalized-separators']);
  assert.deepEqual(normalizeOpportunityTitle('❄︎ (2026W) PHIL LIT Poetry Prize').changes, ['removed-decorations', 'moved-edition-code']);
  assert.deepEqual(normalizeOpportunityTitle('POETRY', { organizationName: 'Rattle' }).changes, ['recased', 'added-organization']);
  assert.deepEqual(normalizeOpportunityTitle('Tin House Summer Workshop').changes, []);
});

test('leaves a well-formed title unchanged', () => {
  const result = normalizeOpportunityTitle('The Kenyon Review Short Fiction Contest', { organizationName: 'The Kenyon Review' });
  assert.equal(result.title, 'The Kenyon Review Short Fiction Contest');
  assert.equal(result.changed, false);
  assert.equal(result.organizationInTitle, true);
});

test('keeps acronyms, years, and roman numerals when recasing', () => {
  assert.equal(normalizeOpportunityTitle('MFA PROGRAM FOR BIPOC WRITERS 2026').title, 'MFA Program for BIPOC Writers 2026');
  assert.equal(normalizeOpportunityTitle('lgbtq+ writers fellowship 2026/27').title, 'LGBTQ+ Writers Fellowship 2026/27');
  assert.equal(normalizeOpportunityTitle('volume ix open call').title, 'Volume IX Open Call');
  assert.equal(normalizeOpportunityTitle('ANTHOLOGY VOLUME II: STORIES OF THE SEA').title, 'Anthology Volume II: Stories of the Sea');
  assert.equal(normalizeOpportunityTitle('NEA LITERATURE FELLOWSHIPS').title, 'NEA Literature Fellowships');
  assert.equal(normalizeOpportunityTitle('phd residency for 2slgbtqia+ artists').title, 'PhD Residency for 2SLGBTQIA+ Artists');
});

test('keeps a short all-caps brand at the start of a mixed-case title', () => {
  assert.equal(normalizeOpportunityTitle('TOMA HOUSE AIR — How to Live Together?').title, 'TOMA HOUSE AIR — How to Live Together?');
  assert.equal(normalizeOpportunityTitle('Key West Literary Seminar — 2027/ BETH NGUYEN').title, 'Key West Literary Seminar — 2027/ Beth Nguyen');
  assert.equal(normalizeOpportunityTitle('TRAILBLAZER INITIATIVE NIGERIA — Call for Proposal').title, 'Trailblazer Initiative Nigeria — Call for Proposal');
});

test('keeps short all-caps names and acronyms it does not know', () => {
  for (const title of ['SXSW 2027', 'SCBWI', 'YIDFF 2027', 'DOC NYC', 'CHEAP POP', 'ACM SIGCHI CFP', 'TOS']) {
    assert.equal(normalizeOpportunityTitle(title).title, title);
  }
  assert.equal(normalizeOpportunityTitle('AWP CFP').changes.includes('recased'), false);
  assert.equal(normalizeOpportunityTitle('POETRY', { organizationName: 'Rattle' }).title, 'Rattle — Poetry');
  assert.equal(normalizeOpportunityTitle('MEMOIR PRIZE FOR BOOKS 2026').title, 'Memoir Prize for Books 2026');
});

test('never puts a placeholder, listing site, domain, or run-together slug in a title', () => {
  for (const name of [
    'Please Wait', 'Calls & Opportunities', 'Contest Information', 'ArtConnect', 'CuratorSpace', 'Poets & Writers', 'Duotrope',
    'NewPages.com', 'Grants.gov', 'CaFÉ (CallForEntry.org)', 'West Seattle Blog...', 'Blackpublicmedia', 'Shortstoryawards',
    'Thekenyonreview', 'L I M I N A L . S P A C E S', '2026 Power Platform Community Conference: Call for Speakers @ Sessionize.com',
  ]) {
    assert.equal(isUsableOrganizationName(name), false, name);
    assert.equal(normalizeOpportunityTitle('Poetry', { organizationName: name }).needsOrganization, true, name);
  }
  for (const name of ['FICTION', 'Open Calls', 'Chateau Orquevaux', 'Studio Ofo', 'ART COMP']) assert.equal(isUsableOrganizationName(name), false, name);
  assert.equal(
    normalizeOpportunityTitle('2026 Anthology', { organizationName: 'Submittable for Horror Writers Assoc.' }).title,
    'Horror Writers Assoc. — 2026 Anthology',
  );
  for (const name of ['32 Poems', 'I-70 Review', '7.13 Books', 'Creative Screenwriting', 'In a Flash', 'Rattle', 'WILDsound Writing Festival', 'Hangar / Center of Artistic Research', 'Rijksakademie', 'Constellations', 'PRS for Music Foundation', 'The Ex-Puritan']) {
    assert.equal(isUsableOrganizationName(name), true, name);
  }
});

test('keeps small words lower case except at the start and after a colon or dash', () => {
  assert.equal(normalizeOpportunityTitle('the prize for the best of the year').title, 'The Prize for the Best of the Year');
  assert.equal(normalizeOpportunityTitle('A CALL FOR WORK: ON THE EDGE OF THE MAP').title, 'A Call for Work: On the Edge of the Map');
  assert.equal(normalizeOpportunityTitle('artist-in-residence program').title, 'Artist-in-Residence Program');
});

test('does not treat ambiguous two-letter words as acronyms', () => {
  assert.equal(normalizeOpportunityTitle('write to us in winter').title, 'Write to Us in Winter');
  assert.equal(normalizeOpportunityTitle('IT IS OPEN NOW').title, 'It Is Open Now');
});

test('does not mangle non-Latin or diacritic-bearing words', () => {
  const salish = normalizeOpportunityTitle('sƛ̓x̣etkʷ artist-in-residence program');
  assert.equal(salish.title, 'sƛ̓x̣etkʷ Artist-in-Residence Program');
  assert.ok(salish.title.startsWith('sƛ̓x̣etkʷ'));
  assert.equal(salish.needsOrganization, true, 'a short lower-case label still waits for an organization');
  assert.equal(
    normalizeOpportunityTitle('sƛ̓x̣etkʷ artist-in-residence program', { organizationName: 'Burrard Arts Foundation' }).title,
    'Burrard Arts Foundation — sƛ̓x̣etkʷ Artist-in-Residence Program',
  );
  assert.equal(normalizeOpportunityTitle('Premio de Poesía Ñandú 2026').title, 'Premio de Poesía Ñandú 2026');
  assert.equal(normalizeOpportunityTitle('文学奖 2026').title, '文学奖 2026');
  assert.equal(normalizeOpportunityTitle('جائزة الشعر').title, 'جائزة الشعر');
  assert.equal(normalizeOpportunityTitle('CAFÉ STORIES PRIZE').title, 'CAFÉ Stories Prize');
});

test('strips emoji sequences, flags, keycaps, and decorative symbols', () => {
  assert.equal(normalizeOpportunityTitle('🇺🇸 👩🏽‍🎨 Art Prize ★★★').title, 'Art Prize');
  assert.equal(normalizeOpportunityTitle('1️⃣ ✨Spring Chapbook Contest✨ →').title, 'Spring Chapbook Contest');
  assert.equal(normalizeOpportunityTitle('*** NEW *** Flash Fiction Prize ~~').title, 'NEW Flash Fiction Prize');
});

test('collapses whitespace and trims dangling separators', () => {
  assert.equal(normalizeOpportunityTitle('  Fall  Reading   Period  | ').title, 'Fall Reading Period');
  assert.equal(normalizeOpportunityTitle('— Poetry Prize 2026 :').title, 'Poetry Prize 2026');
  assert.equal(normalizeOpportunityTitle('Poetry Prize , 2026').title, 'Poetry Prize, 2026');
});

test('does not prefix an organization the title already names', () => {
  assert.equal(titleContainsOrganization('Ploughshares Emerging Writer’s Contest', 'Ploughshares'), true);
  assert.equal(titleContainsOrganization('Kenyon Review Fellowship', 'The Kenyon Review'), true);
  assert.equal(titleContainsOrganization('Masters Review Anthology', 'The Masters Review Magazine'), true);
  assert.equal(titleContainsOrganization('Poetry Prize', 'Rattle'), false);
  assert.equal(normalizeOpportunityTitle('Ploughshares Emerging Writer’s Contest', { organizationName: 'Ploughshares' }).title, 'Ploughshares Emerging Writer’s Contest');
});

test('cleans a decorated organization name before using it', () => {
  assert.equal(normalizeOpportunityTitle('Poetry', { organizationName: ' ✨ Rattle  ' }).title, 'Rattle — Poetry');
  assert.equal(normalizeOpportunityTitle('Poetry', { organizationName: '   ' }).needsOrganization, true);
});

test('recognizes bare section, status, and year or season labels', () => {
  for (const label of ['Fiction', 'POETRY', 'Nonfiction', 'Art', 'Submissions', 'General Submissions', 'Visual Art', 'Open Call', '2026', 'Spring 2027', '2026/27', 'Winter 2026W', 'Volume IX', 'Short Story Submission — Always Open']) {
    assert.equal(isGenericOpportunityLabel(label), true, label);
  }
  for (const label of ['Kluge Fellowships', 'PHIL LIT Poetry Prize', 'Tin House Summer Workshop', 'sƛ̓x̣etkʷ Artist-in-Residence Program']) {
    assert.equal(isGenericOpportunityLabel(label), false, label);
  }
});

test('flags obvious non-opportunities', () => {
  assert.deepEqual(assessOpportunityRelevance('How to Poet Blog'), { relevant: false, signals: ['blog-post', 'how-to-article'] });
  assert.deepEqual(assessOpportunityRelevance('The Minnesota Microgrant Partnership - Housing'), { relevant: false, signals: ['non-creative-assistance'] });
  assert.equal(assessOpportunityRelevance('Sign up for our newsletter').relevant, false);
  assert.equal(assessOpportunityRelevance('Masthead').relevant, false);
  for (const title of ['Fahmidan Blog', 'Subscribe', 'How to apply to study in the UK', 'How To Apply', 'How to write about Contemporary Art']) {
    assert.equal(assessOpportunityRelevance(title).relevant, false, title);
  }
});

test('removes the cut-off a search snippet leaves on a title', () => {
  assert.equal(normalizeOpportunityTitle('BEERS London – Group Exhibition and 40 Day Residency ...').title, 'BEERS London — Group Exhibition and 40 Day Residency');
  assert.equal(normalizeOpportunityTitle('Open Call: Frank Moorhouse Fellowship for Young Writers ...').title, 'Open Call: Frank Moorhouse Fellowship for Young Writers');
  assert.equal(normalizeOpportunityTitle('Submissions open for the AsBEA-RJ Sérgio Bernardes Architectur...').title, 'Submissions open for the AsBEA-RJ Sérgio Bernardes');
  assert.equal(normalizeOpportunityTitle('Wise Children: Summer Open Residency. Deadline 17th ...').title, 'Wise Children: Summer Open Residency. Deadline 17th');
  assert.equal(normalizeOpportunityTitle('Art contest gives children and youth the chance to share ...').title, 'Art contest gives children and youth the chance to share');
  assert.equal(normalizeOpportunityTitle('Call for ...').title, 'Call for ...');
  assert.ok(normalizeOpportunityTitle('Open Calls for Creatives at Brampton Arts ...').changes.includes('removed-truncation'));
});

test('flags tenders, admissions, and medical programs unless the title is about the arts', () => {
  for (const title of ['UNICEF Tenders - Business Opportunities And', 'Primary school admissions 2025: How to apply', 'One Year Asylum Deadline', 'Pediatrics Residency Program — College of Medicine', 'California Community Foundation announces Request for Proposals', 'Terms & Conditions — Global Teacher', 'Hours, Tickets & Admission Prices', 'More...']) {
    assert.equal(assessOpportunityRelevance(title).relevant, false, title);
  }
  for (const title of ['Public Art Request for Proposals', 'Creative Crosswalks — Request for Proposals', 'Paediatric Association of Nigeria Announces Art Competition', 'Medical Humanities Writing Prize', 'More Than Words Poetry Prize', 'Intima: A Journal of Narrative Medicine — Field Notes', 'Calendula Review: A Journal of Narrative Medicine — Submissions', 'Glossy Planet: Bad Medicine']) {
    assert.equal(assessOpportunityRelevance(title).relevant, true, title);
  }
});

test('flags public procurement portals named in other languages', () => {
  for (const title of ['E-Prokurimi', 'Prokurimi publik', 'Licitación pública 2026', 'Bando di appalto', 'Aanbestedingen', 'Marchés publics']) {
    assert.deepEqual(assessOpportunityRelevance(title), { relevant: false, signals: ['procurement'] }, title);
  }
  for (const title of ['Public Art Licitación for Artists', 'Prokurimi Art Award']) {
    assert.equal(assessOpportunityRelevance(title).relevant, true, title);
  }
});

test('flags a promotional artist interview even when it calls itself an open call', () => {
  assert.deepEqual(assessOpportunityRelevance("Open Call — Artist's Interview With Al-tiba9"), { relevant: false, signals: ['promotional-interview'] });
  for (const title of ['Open Call | Artist’s Interview With Al-Tiba9', 'Artist Interview Series', 'Call for Artists: Artists Interviews 2026']) {
    assert.equal(assessOpportunityRelevance(title).relevant, false, title);
  }
  for (const title of ['Call for Interviews', 'Interview Submissions', 'Oral History Interview Fellowship', 'Call for Artists — Al-tiba9 Magazine Issue22']) {
    assert.equal(assessOpportunityRelevance(title).relevant, true, title);
  }
});

test('does not flag a call that mentions a blog, a subscription, or how to apply', () => {
  for (const title of ['Call for Blog Submissions', 'Free submission with subscription (or renewal)', 'How to Live Together?', 'How to Apply: Artist Residency']) {
    assert.equal(assessOpportunityRelevance(title).relevant, true, title);
  }
});

test('keeps the relevance check conservative for creative calls', () => {
  for (const title of ['Kluge Fellowships', 'Housing Justice Writing Fellowship', 'Artist Housing Residency', 'Small Business Arts Microgrant', 'Poetry', 'Blogger-in-Residence Program']) {
    assert.equal(assessOpportunityRelevance(title).relevant, true, title);
  }
});

test('falls back to the raw text when nothing but decoration remains', () => {
  const empty = normalizeOpportunityTitle('✨✨');
  assert.equal(empty.label, '');
  assert.equal(empty.needsOrganization, true);
  assert.equal(normalizeOpportunityTitle('✨✨', { organizationName: 'Rattle' }).title, 'Rattle');
});

test('decodes HTML entities left in scraped titles', () => {
  assert.equal(decodeHtmlEntities('Writers&#8217; Residency &amp; Fellowship'), 'Writers’ Residency & Fellowship');
  assert.equal(decodeHtmlEntities('A &amp;amp; B &#x2014; C'), 'A & B — C');
  assert.equal(decodeHtmlEntities('AT&T Prize &unknown;'), 'AT&T Prize &unknown;');
  const result = normalizeOpportunityTitle('Arts&nbsp;&amp;&nbsp;Letters Prize');
  assert.equal(result.title, 'Arts & Letters Prize');
  assert.ok(result.changes.includes('decoded-entities'));
});
