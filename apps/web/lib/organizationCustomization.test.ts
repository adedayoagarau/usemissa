import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeCustomization, normalizeCustomizationInput, organizationCustomizationSchema, resolveOrganizationCustomization } from './organizationCustomization';

test('defaults resolve from the organization name', () => {
  const resolved = resolveOrganizationCustomization({ name: 'North River Review' });
  assert.equal(resolved.displayName, 'North River Review');
  assert.equal(resolved.accent, 'forest');
  assert.equal(resolved.density, 'compact');
  assert.equal(resolved.statusTransparency, 'stages');
  assert.deepEqual(resolved.stageLabels, { longlist: 'Longlist', shortlist: 'Shortlist', finalist: 'Finalist' });
  assert.equal(resolved.communications.senderName, 'North River Review');
  assert.equal(resolved.communications.signoff, 'The team at North River Review');
  assert.equal(resolved.communications.secondApproverRequired, false);
});

test('stored values win and stage labels merge with defaults', () => {
  const resolved = resolveOrganizationCustomization({
    name: 'North River Review',
    customization: { displayName: 'NRR Prize', accent: 'ochre', stageLabels: { shortlist: 'Short list' }, communications: { signoff: 'Warmly, the editors', secondApproverRequired: true } },
  });
  assert.equal(resolved.displayName, 'NRR Prize');
  assert.equal(resolved.accent, 'ochre');
  assert.deepEqual(resolved.stageLabels, { longlist: 'Longlist', shortlist: 'Short list', finalist: 'Finalist' });
  assert.equal(resolved.communications.senderName, 'NRR Prize');
  assert.equal(resolved.communications.signoff, 'Warmly, the editors');
  assert.equal(resolved.communications.secondApproverRequired, true);
});

test('schema rejects raw colors, unknown keys and insecure logos', () => {
  assert.equal(organizationCustomizationSchema.safeParse({ accent: 'purple' }).success, false);
  assert.equal(organizationCustomizationSchema.safeParse({ primaryColor: 'something' }).success, false);
  assert.equal(organizationCustomizationSchema.safeParse({ logoUrl: 'http://example.org/logo.png' }).success, false);
  assert.equal(organizationCustomizationSchema.safeParse({ logoUrl: 'https://example.org/logo.png', accent: 'mineral', declaredStages: ['shortlist', 'longlist'] }).success, true);
});

test('normalize drops empty strings and orders declared stages', () => {
  const next = normalizeCustomizationInput({ displayName: '', accent: 'moss', declaredStages: ['finalist', 'longlist', 'longlist'], stageLabels: { longlist: '' }, communications: { replyTo: 'prize@example.org', signoff: '' } });
  assert.deepEqual(next, { accent: 'moss', declaredStages: ['longlist', 'finalist'], communications: { replyTo: 'prize@example.org' } });
});

test('merge keeps sections the patch did not touch', () => {
  const merged = mergeCustomization({ accent: 'ink', stageLabels: { longlist: 'Long list' }, communications: { senderName: 'Editors' } }, { density: 'comfortable' });
  assert.deepEqual(merged, { accent: 'ink', density: 'comfortable', stageLabels: { longlist: 'Long list' }, communications: { senderName: 'Editors' } });
  const replaced = mergeCustomization(merged, { communications: { replyTo: 'hello@example.org' } });
  assert.deepEqual(replaced.communications, { replyTo: 'hello@example.org' });
});
