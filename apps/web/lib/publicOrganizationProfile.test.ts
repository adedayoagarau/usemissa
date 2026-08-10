import assert from 'node:assert/strict';
import test from 'node:test';
import { organizationMonogram, publicDeadlineLabel, publicFeeLabel, publicPracticeLabels, safePublicMedia } from './publicOrganizationProfile';

test('Organization monograms support one word, long names, and Unicode', () => {
  assert.equal(organizationMonogram('Missa'), 'MI');
  assert.equal(organizationMonogram('Missa Arts Foundation'), 'MF');
  assert.equal(organizationMonogram('Àjọṣe Arts'), 'ÀA');
});

test('public deadline and fee labels never invent missing facts', () => {
  assert.equal(publicDeadlineLabel(null), 'Deadline not linked');
  assert.equal(publicFeeLabel(null), 'Fee not stated');
  assert.equal(publicDeadlineLabel({ deadline: { kind: 'rolling', raw: 'Reviewed monthly' } } as never), 'Reviewed monthly');
  assert.equal(publicFeeLabel({ fee: { status: 'no-fee' } } as never), 'No application fee');
});

test('practice labels derive only from supported canonical facets and remain bounded', () => {
  const labels = publicPracticeLabels([{ taxonomy: { schemeVersion: 1, termIds: ['taxterm_pf-writing-and-literature', 'taxterm_role-editor', 'taxterm_language-english'], primaryTermIds: [] } } as never], 2);
  assert.equal(labels.length, 2);
  assert.ok(labels.every((label) => label !== 'Editor'));
});

test('public media accepts only HTTP URLs', () => {
  assert.equal(safePublicMedia('https://example.com/image.jpg'), 'https://example.com/image.jpg');
  assert.equal(safePublicMedia('javascript:alert(1)'), undefined);
  assert.equal(safePublicMedia('/relative.jpg'), undefined);
});
