import { z } from 'zod';

const optionalUrl = z.string().url().optional();

export const portalConfigurationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  introduction: z.string().trim().max(2_000).optional(),
  supportEmail: z.string().trim().email(),
  locale: z.string().trim().min(2).max(35),
  timeZone: z.string().trim().min(1).max(100).refine((timeZone) => {
    try {
      new Intl.DateTimeFormat('en', { timeZone });
      return true;
    } catch {
      return false;
    }
  }, 'Invalid time zone'),
  privacyPolicyUrl: z.string().url(),
  termsUrl: z.string().url(),
  accessibilityContactUrl: optionalUrl,
  brand: z.object({
    logoUrl: optionalUrl,
    logoAlt: z.string().trim().max(160).optional(),
    primaryColor: z.string().regex(/^#[0-9a-f]{6}$/i, 'Use a six-digit hex color').optional(),
  }).strict(),
}).strict();

export const configurationStatusSchema = z.enum([
  'draft',
  'in-review',
  'approved',
  'published',
  'superseded',
  'archived',
]);

const fieldBase = z.object({
  id: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(240),
  helpText: z.string().trim().max(1_000).optional(),
  required: z.boolean(),
  visibility: z.array(z.enum(['applicant', 'organization', 'reviewer'])).min(1),
  order: z.number().int().min(0),
});

const choiceOption = z.object({ id: z.string().trim().min(1).max(80), label: z.string().trim().min(1).max(240) }).strict();

export const formFieldSchema = z.discriminatedUnion('type', [
  fieldBase.extend({ type: z.literal('short-text'), minLength: z.number().int().min(0).optional(), maxLength: z.number().int().positive().optional() }).strict(),
  fieldBase.extend({ type: z.literal('long-text'), minWords: z.number().int().min(0).optional(), maxWords: z.number().int().positive().optional() }).strict(),
  fieldBase.extend({ type: z.literal('number'), minimum: z.number().optional(), maximum: z.number().optional() }).strict(),
  fieldBase.extend({ type: z.literal('date') }).strict(),
  fieldBase.extend({ type: z.literal('email') }).strict(),
  fieldBase.extend({ type: z.literal('url') }).strict(),
  fieldBase.extend({ type: z.literal('checkbox'), acknowledgment: z.string().trim().min(1).max(500) }).strict(),
  fieldBase.extend({ type: z.literal('single-choice'), options: z.array(choiceOption).min(1).max(100) }).strict(),
  fieldBase.extend({ type: z.literal('multiple-choice'), options: z.array(choiceOption).min(1).max(100), minimumSelections: z.number().int().min(0).optional(), maximumSelections: z.number().int().positive().optional() }).strict(),
  fieldBase.extend({ type: z.literal('file-upload'), acceptedTypes: z.array(z.string().trim().min(1)).min(1), maximumBytes: z.number().int().positive().max(100_000_000), maximumFiles: z.number().int().positive().max(20) }).strict(),
  fieldBase.extend({ type: z.literal('display'), content: z.string().trim().min(1).max(10_000), required: z.literal(false) }).strict(),
]);

export const formDefinitionSchema = z.object({
  name: z.string().trim().min(1).max(160),
  purpose: z.enum(['eligibility', 'application', 'work', 'reference', 'additional-information', 'internal', 'review', 'delivery']),
  fields: z.array(formFieldSchema).max(200),
}).strict().superRefine((definition, context) => {
  const ids = new Set<string>();
  for (const [index, field] of definition.fields.entries()) {
    if (ids.has(field.id)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['fields', index, 'id'], message: 'Field IDs must be unique' });
    ids.add(field.id);
  }
});

const reviewStageBase = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(160),
  order: z.number().int().min(0),
  requiredReviewCount: z.number().int().positive().max(100),
  blindMode: z.enum(['none', 'identity-redacted']),
  peerReviewVisibility: z.enum(['hidden', 'after-finalization']),
});

export const reviewWorkflowDefinitionSchema = z.object({
  name: z.string().trim().min(1).max(160),
  stages: z.array(z.discriminatedUnion('type', [
    reviewStageBase.extend({ type: z.literal('no-review') }).strict(),
    reviewStageBase.extend({ type: z.literal('vote'), choices: z.array(z.enum(['yes', 'no', 'maybe'])).min(2) }).strict(),
    reviewStageBase.extend({ type: z.literal('custom-form'), reviewFormVersionId: z.string().trim().min(1) }).strict(),
  ])).min(1).max(30),
}).strict();

export const opportunityConfigurationSchema = z.object({
  locale: z.string().trim().min(2).max(35),
  timeZone: portalConfigurationSchema.shape.timeZone,
  opensAt: z.string().datetime().optional(),
  closesAt: z.string().datetime().optional(),
  gracePeriodMinutes: z.number().int().min(0).max(1_440),
  submissionLimitPerApplicant: z.number().int().positive().max(1_000).optional(),
  amendmentPolicy: z.enum(['not-allowed', 'organization-opens']),
  withdrawalPolicy: z.enum(['not-allowed', 'before-final-decision']),
  fee: z.discriminatedUnion('type', [
    z.object({ type: z.literal('none') }).strict(),
    z.object({ type: z.literal('fixed'), amountMinor: z.number().int().positive(), currency: z.string().trim().length(3).transform((currency) => currency.toUpperCase()), waiversAllowed: z.boolean() }).strict(),
  ]),
  eligibility: z.object({
    summary: z.string().trim().min(1).max(2_000),
    applicantTypes: z.array(z.string().trim().min(1).max(160)).max(50),
  }).strict().optional(),
  place: z.object({
    reach: z.enum(['worldwide', 'countries', 'region']),
    participation: z.enum(['remote', 'in-person', 'hybrid']),
    location: z.string().trim().max(240).optional(),
  }).strict().optional(),
  terms: z.object({
    award: z.string().trim().max(1_000).optional(),
    expenses: z.string().trim().max(1_000).optional(),
    rights: z.string().trim().max(1_000).optional(),
    paymentPolicy: z.string().trim().max(1_000).optional(),
    refundPolicy: z.string().trim().max(1_000).optional(),
  }).strict().optional(),
  applicationFormVersionId: z.string().trim().min(1),
  eligibilityFormVersionId: z.string().trim().min(1).optional(),
  reviewWorkflowVersionId: z.string().trim().min(1).optional(),
}).strict().refine((configuration) => !configuration.opensAt || !configuration.closesAt || configuration.opensAt < configuration.closesAt, { message: 'Opening time must be before closing time', path: ['closesAt'] });
