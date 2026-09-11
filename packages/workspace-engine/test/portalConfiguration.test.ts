import assert from 'node:assert/strict';
import test from 'node:test';
import { canTransitionConfiguration, portalConfigurationFromDatabase, type FormField, type ReviewStage } from '../src/portalConfiguration.js';
import { poetryPrizePortal, residencyPortal } from './fixtures/portalConfigurations.js';
import { submissionPortalTemplates } from '../src/portalTemplates.js';

test('configuration lifecycle permits review and publication without mutating a published version', () => {
  assert.equal(canTransitionConfiguration('draft', 'in-review'), true);
  assert.equal(canTransitionConfiguration('in-review', 'approved'), true);
  assert.equal(canTransitionConfiguration('approved', 'published'), true);
  assert.equal(canTransitionConfiguration('published', 'draft'), false);
  assert.equal(canTransitionConfiguration('published', 'superseded'), true);
  assert.equal(canTransitionConfiguration('archived', 'draft'), false);
});

test('form fields keep settings on the variant that owns them', () => {
  const fields: FormField[] = [
    { id: 'statement', type: 'long-text', label: 'Artist statement', required: true, visibility: ['applicant', 'organization', 'reviewer'], order: 0, maxWords: 500 },
    { id: 'work', type: 'file-upload', label: 'Work', required: true, visibility: ['applicant', 'organization', 'reviewer'], order: 1, acceptedTypes: ['application/pdf'], maximumBytes: 25_000_000, maximumFiles: 3 },
  ];

  assert.equal(fields[0]!.type, 'long-text');
  assert.equal(fields[1]!.type, 'file-upload');
});

test('review stages make their review mechanism explicit', () => {
  const stages: ReviewStage[] = [
    { id: 'screen', type: 'vote', name: 'Eligibility screen', order: 0, requiredReviewCount: 2, blindMode: 'identity-redacted', peerReviewVisibility: 'after-finalization', choices: ['yes', 'no', 'maybe'] },
    { id: 'panel', type: 'custom-form', name: 'Panel review', order: 1, requiredReviewCount: 3, blindMode: 'identity-redacted', peerReviewVisibility: 'hidden', reviewFormVersionId: 'form_review_1' },
  ];

  assert.deepEqual(stages.map((stage) => stage.type), ['vote', 'custom-form']);
});

test('organizations can publish distinct portal data without feature-code branches', () => {
  assert.notEqual(poetryPrizePortal.name, residencyPortal.name);
  assert.notEqual(poetryPrizePortal.timeZone, residencyPortal.timeZone);
  assert.notEqual(poetryPrizePortal.brand.primaryColor, residencyPortal.brand.primaryColor);
  assert.equal('organizationType' in poetryPrizePortal, false);
  assert.equal('organizationType' in residencyPortal, false);
});

test('stored portal configuration is validated once at the database boundary', () => {
  assert.equal(portalConfigurationFromDatabase(poetryPrizePortal).name, poetryPrizePortal.name);
  assert.throws(() => portalConfigurationFromDatabase({ name: 'Incomplete' }), /invalid/);
});

test('portal templates reference forms they actually define', () => {
  for (const template of submissionPortalTemplates) {
    const formKeys = new Set(template.forms.map((form) => form.key));
    for (const stage of template.reviewWorkflow.stages) {
      if (stage.type === 'custom-form') assert.equal(formKeys.has(stage.reviewFormVersionId), true);
    }
  }
});
