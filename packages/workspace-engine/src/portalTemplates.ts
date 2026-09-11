import type { FormDefinition, PortalConfiguration, ReviewWorkflowDefinition } from './portalConfiguration.js';

export type SubmissionPortalTemplate = {
  id: 'poetry-prize' | 'residency';
  name: string;
  portal: PortalConfiguration;
  forms: readonly { key: string; definition: FormDefinition }[];
  reviewWorkflow: ReviewWorkflowDefinition;
};

export const submissionPortalTemplates: readonly SubmissionPortalTemplate[] = [
  {
    id: 'poetry-prize',
    name: 'Poetry prize',
    portal: {
      name: 'Poetry Prize',
      supportEmail: 'submissions@example.invalid',
      locale: 'en',
      timeZone: 'UTC',
      privacyPolicyUrl: 'https://example.invalid/privacy',
      termsUrl: 'https://example.invalid/terms',
      brand: {},
    },
    forms: [
      {
        key: 'application',
        definition: {
          name: 'Prize application',
          purpose: 'application',
          fields: [
            { id: 'title', type: 'short-text', label: 'Manuscript title', required: true, visibility: ['applicant', 'organization', 'reviewer'], order: 0, maxLength: 160 },
            { id: 'manuscript', type: 'file-upload', label: 'Manuscript', required: true, visibility: ['applicant', 'organization', 'reviewer'], order: 1, acceptedTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], maximumBytes: 25_000_000, maximumFiles: 1 },
          ],
        },
      },
      {
        key: 'review',
        definition: {
          name: 'Prize review',
          purpose: 'review',
          fields: [
            { id: 'score', type: 'number', label: 'Score', required: true, visibility: ['reviewer', 'organization'], order: 0, minimum: 1, maximum: 10 },
            { id: 'notes', type: 'long-text', label: 'Review notes', required: true, visibility: ['reviewer', 'organization'], order: 1, maxWords: 500 },
          ],
        },
      },
    ],
    reviewWorkflow: {
      name: 'Prize review',
      stages: [
        { id: 'readers', type: 'custom-form', name: 'Readers', order: 0, requiredReviewCount: 2, blindMode: 'identity-redacted', peerReviewVisibility: 'after-finalization', reviewFormVersionId: 'review' },
        { id: 'jury', type: 'custom-form', name: 'Jury', order: 1, requiredReviewCount: 3, blindMode: 'identity-redacted', peerReviewVisibility: 'hidden', reviewFormVersionId: 'review' },
      ],
    },
  },
  {
    id: 'residency',
    name: 'Residency',
    portal: {
      name: 'Artist Residency',
      supportEmail: 'programs@example.invalid',
      locale: 'en',
      timeZone: 'UTC',
      privacyPolicyUrl: 'https://example.invalid/privacy',
      termsUrl: 'https://example.invalid/terms',
      brand: {},
    },
    forms: [
      {
        key: 'application',
        definition: {
          name: 'Residency application',
          purpose: 'application',
          fields: [
            { id: 'statement', type: 'long-text', label: 'Practice statement', required: true, visibility: ['applicant', 'organization', 'reviewer'], order: 0, maxWords: 750 },
            { id: 'portfolio', type: 'url', label: 'Portfolio URL', required: true, visibility: ['applicant', 'organization', 'reviewer'], order: 1 },
          ],
        },
      },
      {
        key: 'review',
        definition: {
          name: 'Residency review',
          purpose: 'review',
          fields: [
            { id: 'recommendation', type: 'single-choice', label: 'Recommendation', required: true, visibility: ['reviewer', 'organization'], order: 0, options: [{ id: 'advance', label: 'Advance' }, { id: 'hold', label: 'Hold' }, { id: 'decline', label: 'Do not advance' }] },
            { id: 'notes', type: 'long-text', label: 'Panel notes', required: true, visibility: ['reviewer', 'organization'], order: 1, maxWords: 750 },
          ],
        },
      },
    ],
    reviewWorkflow: {
      name: 'Residency panel',
      stages: [
        { id: 'eligibility', type: 'vote', name: 'Eligibility', order: 0, requiredReviewCount: 1, blindMode: 'none', peerReviewVisibility: 'hidden', choices: ['yes', 'no', 'maybe'] },
        { id: 'panel', type: 'custom-form', name: 'Panel', order: 1, requiredReviewCount: 3, blindMode: 'none', peerReviewVisibility: 'after-finalization', reviewFormVersionId: 'review' },
      ],
    },
  },
];
