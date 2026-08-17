export const opportunity = {
  id: 'prototype-opportunity-001',
  version: 'opp-v1',
  title: 'Synthetic Creative Project Grant',
  externalMappings: [
    { componentId: 'project-summary', fieldKey: 'project_description', method: 'verified-adapter' },
    { componentId: 'primary-sample', fieldKey: 'work_sample_1', method: 'verified-adapter' },
  ],
  requirements: [
    {
      id: 'residency', semanticKey: 'eligibility.residency', type: 'eligibility_claim', label: 'Applicant residency is permitted',
      required: true, privacy: 'sensitive', blocksReadiness: true,
      rule: { profileField: 'residency', allowedValues: ['global'] },
      source: { url: 'https://example.invalid/prototype-guidelines', section: 'Eligibility', verified: true },
    },
    {
      id: 'project-summary', semanticKey: 'narrative.project_summary', type: 'narrative', label: 'Project summary',
      required: true, privacy: 'private', blocksReadiness: true, constraints: { maxWords: 250 },
      source: { url: 'https://example.invalid/prototype-guidelines', section: 'Question 2', verified: true },
    },
    {
      id: 'primary-sample', semanticKey: 'work_sample.primary', type: 'work_sample', label: 'Primary work sample',
      required: true, privacy: 'private', blocksReadiness: true, constraints: { count: 1 },
      practiceRules: {
        writer: { formats: ['pdf'], maxPages: 10, blindReview: true },
        musician: { formats: ['audio/mpeg'], maxDurationSeconds: 300, creditsRequired: true },
      },
      source: { url: 'https://example.invalid/prototype-guidelines', section: 'Work samples', verified: true },
    },
    {
      id: 'project-budget', semanticKey: 'budget.project', type: 'budget', label: 'Project budget',
      required: true, privacy: 'private', blocksReadiness: true, constraints: { currencyRequired: true },
      source: { url: 'https://example.invalid/prototype-guidelines', section: 'Budget', verified: true },
    },
    {
      id: 'rights', semanticKey: 'attestation.rights', type: 'legal_attestation', label: 'Rights attestation',
      required: true, privacy: 'sensitive', blocksReadiness: true,
      source: { url: 'https://example.invalid/prototype-guidelines', section: 'Certification', verified: true },
    },
  ],
};

export const playbook = {
  id: 'grant-playbook',
  version: 'grant-playbook-v1',
  steps: [
    { id: 'confirm-eligibility', label: 'Confirm eligibility', whenComponentTypes: ['eligibility_claim'], dependsOn: [], offsetDays: -28 },
    { id: 'define-project', label: 'Define project', whenComponentTypes: ['narrative'], dependsOn: ['confirm-eligibility'], offsetDays: -21 },
    { id: 'build-budget', label: 'Build budget', whenComponentTypes: ['budget'], dependsOn: ['define-project'], offsetDays: -14 },
    { id: 'choose-sample', label: 'Choose evidence and samples', whenComponentTypes: ['work_sample'], dependsOn: ['define-project'], offsetDays: -10 },
    { id: 'compliance-review', label: 'Complete compliance review', whenComponentTypes: ['legal_attestation'], dependsOn: ['build-budget', 'choose-sample'], offsetDays: -3 },
  ],
};

export const profiles = {
  writer: { version: 'profile-writer-v1', residency: null },
  musician: { version: 'profile-musician-v1', residency: 'global' },
  multidisciplinary: { version: 'profile-multi-v1', residency: 'global' },
};

export const packs = {
  writer: ['writer'],
  musician: ['musician'],
  multidisciplinary: ['writer', 'musician'],
};

export const assets = [
  { versionId: 'asset-writer-pdf-v3', practice: 'writer', format: 'pdf', label: 'Essay excerpt, revision 3' },
  { versionId: 'asset-musician-mp3-v2', practice: 'musician', format: 'audio/mpeg', label: 'Studio master, revision 2' },
];
