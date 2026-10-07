import assert from 'node:assert/strict';
import test from 'node:test';
import { publicContactEmail } from './profileContactEmail';

test('an address at the profile website domain is shown', () => {
  assert.equal(publicContactEmail('editors@tinhouse.com', 'https://tinhouse.com'), 'editors@tinhouse.com');
  assert.equal(publicContactEmail('info@example.org', 'https://www.example.org/about'), 'info@example.org');
  assert.equal(publicContactEmail(' Info@Example.org ', 'http://EXAMPLE.org'), 'Info@Example.org');
  assert.equal(publicContactEmail('info@example.org', 'www.example.org'), 'info@example.org');
});

test('a subdomain on either side still counts as the same organization', () => {
  assert.equal(publicContactEmail('residency@arts.example.edu', 'https://example.edu'), 'residency@arts.example.edu');
  assert.equal(publicContactEmail('press@example.edu', 'https://press.example.edu'), 'press@example.edu');
});

test('free-mail addresses are never shown, even next to a matching website', () => {
  for (const domain of ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'proton.me', 'protonmail.com', 'yahoo.fr', 'hotmail.it']) {
    assert.equal(publicContactEmail(`someone@${domain}`, 'https://www.amielinart.com/'), null, domain);
    assert.equal(publicContactEmail(`someone@${domain}`, `https://${domain}`), null, domain);
  }
});

test('an address at an unrelated domain is not shown', () => {
  assert.equal(publicContactEmail('studio@otherdomain.com', 'https://www.amielinart.com/'), null);
  // A suffix that is not a subdomain boundary does not match.
  assert.equal(publicContactEmail('hi@notexample.org', 'https://example.org'), null);
});

test('without a usable website there is nothing to match, so nothing is shown', () => {
  assert.equal(publicContactEmail('info@example.org', null), null);
  assert.equal(publicContactEmail('info@example.org', 'not a url'), null);
  assert.equal(publicContactEmail('info@example.org', 'mailto:info@example.org'), null);
});

test('missing or malformed emails are not shown', () => {
  assert.equal(publicContactEmail(null, 'https://example.org'), null);
  assert.equal(publicContactEmail('', 'https://example.org'), null);
  assert.equal(publicContactEmail('info at example.org', 'https://example.org'), null);
  assert.equal(publicContactEmail('info@example', 'https://example.org'), null);
  assert.equal(publicContactEmail('https://example.org/a@b.org', 'https://example.org'), null);
});
