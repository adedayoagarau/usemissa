import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSpelling, resolveSpelling, sp, spellingForCountry, toUkSpelling } from './spelling';

test('UK spelling for UK countries only', () => {
  assert.equal(spellingForCountry('GB'), 'uk');
  assert.equal(spellingForCountry('gb'), 'uk');
  assert.equal(spellingForCountry('JE'), 'uk');
  assert.equal(spellingForCountry('NG'), 'us');
  assert.equal(spellingForCountry('US'), 'us');
  assert.equal(spellingForCountry(null), 'us');
});

test('the account country wins over the IP country', () => {
  assert.equal(resolveSpelling({ accountCountry: 'NG', ipCountry: 'GB' }), 'us');
  assert.equal(resolveSpelling({ accountCountry: 'GB', ipCountry: 'US' }), 'uk');
  assert.equal(resolveSpelling({ accountCountry: '', ipCountry: 'GB' }), 'uk');
  assert.equal(resolveSpelling({ ipCountry: null }), 'us');
});

test('converts whole words and keeps their case', () => {
  assert.equal(toUkSpelling('Missa never contacts an organization for you.'), 'Missa never contacts an organisation for you.');
  assert.equal(toUkSpelling('Organizations you follow'), 'Organisations you follow');
  assert.equal(toUkSpelling('PROGRAM'), 'PROGRAMME');
  assert.equal(toUkSpelling('Your favorite color'), 'Your favourite colour');
  assert.equal(toUkSpelling('The program closed.'), 'The programme closed.');
  assert.equal(toUkSpelling('The fifty most honored magazines'), 'The fifty most honoured magazines');
});

test('leaves URLs, paths, emails and slugs alone', () => {
  assert.equal(toUkSpelling('See /for-organizations or /organizations/123'), 'See /for-organizations or /organizations/123');
  assert.equal(toUkSpelling('Visit https://example.org/program'), 'Visit https://example.org/program');
  assert.equal(toUkSpelling('Write to program@example.org'), 'Write to program@example.org');
  assert.equal(toUkSpelling('Programmatic programs'), 'Programmatic programmes');
});

test('sp only changes copy for UK readers', () => {
  assert.equal(sp('Find an organization', 'us'), 'Find an organization');
  assert.equal(sp('Find an organization', 'uk'), 'Find an organisation');
  assert.equal(sp('Find an organization'), 'Find an organization');
});

test('parses the spelling cookie', () => {
  assert.equal(parseSpelling('uk'), 'uk');
  assert.equal(parseSpelling('us'), 'us');
  assert.equal(parseSpelling('fr'), null);
  assert.equal(parseSpelling(undefined), null);
});
