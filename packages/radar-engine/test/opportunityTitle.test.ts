import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assessOpportunityRelevance,
  isGenericOpportunityLabel,
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

test('flags obvious non-opportunities for a person without deleting them', () => {
  assert.deepEqual(assessOpportunityRelevance('How to Poet Blog'), { relevant: false, signals: ['blog-post', 'how-to-article'] });
  assert.deepEqual(assessOpportunityRelevance('The Minnesota Microgrant Partnership - Housing'), { relevant: false, signals: ['non-creative-assistance'] });
  assert.equal(assessOpportunityRelevance('Sign up for our newsletter').relevant, false);
  assert.equal(assessOpportunityRelevance('Masthead').relevant, false);
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
