import type { IsoDateTime } from '@missa/radar-engine';

export type ConfigurationStatus =
  | 'draft'
  | 'in-review'
  | 'approved'
  | 'published'
  | 'superseded'
  | 'archived';

const configurationTransitions: Record<ConfigurationStatus, readonly ConfigurationStatus[]> = {
  draft: ['in-review', 'archived'],
  'in-review': ['draft', 'approved', 'archived'],
  approved: ['draft', 'published', 'archived'],
  published: ['superseded'],
  superseded: ['archived'],
  archived: [],
};

export function canTransitionConfiguration(from: ConfigurationStatus, to: ConfigurationStatus): boolean {
  return configurationTransitions[from].includes(to);
}

export type PortalBrand = {
  logoUrl?: string;
  logoAlt?: string;
  primaryColor?: string;
};

export type PortalConfiguration = {
  name: string;
  introduction?: string;
  supportEmail: string;
  locale: string;
  timeZone: string;
  privacyPolicyUrl: string;
  termsUrl: string;
  accessibilityContactUrl?: string;
  brand: PortalBrand;
};

export function portalConfigurationFromDatabase(value: unknown): PortalConfiguration {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Stored portal configuration is invalid');
  const configuration = value as Partial<PortalConfiguration>;
  if (
    typeof configuration.name !== 'string'
    || typeof configuration.supportEmail !== 'string'
    || typeof configuration.locale !== 'string'
    || typeof configuration.timeZone !== 'string'
    || typeof configuration.privacyPolicyUrl !== 'string'
    || typeof configuration.termsUrl !== 'string'
    || !configuration.brand
    || typeof configuration.brand !== 'object'
    || Array.isArray(configuration.brand)
  ) throw new Error('Stored portal configuration is invalid');
  if (configuration.introduction !== undefined && typeof configuration.introduction !== 'string') throw new Error('Stored portal configuration is invalid');
  if (configuration.accessibilityContactUrl !== undefined && typeof configuration.accessibilityContactUrl !== 'string') throw new Error('Stored portal configuration is invalid');
  if (configuration.brand.logoUrl !== undefined && typeof configuration.brand.logoUrl !== 'string') throw new Error('Stored portal configuration is invalid');
  if (configuration.brand.logoAlt !== undefined && typeof configuration.brand.logoAlt !== 'string') throw new Error('Stored portal configuration is invalid');
  if (configuration.brand.primaryColor !== undefined && typeof configuration.brand.primaryColor !== 'string') throw new Error('Stored portal configuration is invalid');
  return configuration as PortalConfiguration;
}

export type PortalConfigurationVersion = {
  id: string;
  organizationId: string;
  version: number;
  status: ConfigurationStatus;
  configuration: PortalConfiguration;
  revision: number;
  createdAt: IsoDateTime;
  publishedAt?: IsoDateTime;
  supersedesVersionId?: string;
};

type FieldVisibility = 'applicant' | 'organization' | 'reviewer';

type FormFieldBase = {
  id: string;
  label: string;
  helpText?: string;
  required: boolean;
  visibility: readonly FieldVisibility[];
  order: number;
};

export type ShortTextField = FormFieldBase & {
  type: 'short-text';
  minLength?: number;
  maxLength?: number;
};

export type LongTextField = FormFieldBase & {
  type: 'long-text';
  minWords?: number;
  maxWords?: number;
};

export type NumberField = FormFieldBase & {
  type: 'number';
  minimum?: number;
  maximum?: number;
};

export type DateField = FormFieldBase & { type: 'date' };
export type EmailField = FormFieldBase & { type: 'email' };
export type UrlField = FormFieldBase & { type: 'url' };
export type CheckboxField = FormFieldBase & { type: 'checkbox'; acknowledgment: string };

export type SingleChoiceField = FormFieldBase & {
  type: 'single-choice';
  options: readonly { id: string; label: string }[];
};

export type MultipleChoiceField = FormFieldBase & {
  type: 'multiple-choice';
  options: readonly { id: string; label: string }[];
  minimumSelections?: number;
  maximumSelections?: number;
};

export type FileUploadField = FormFieldBase & {
  type: 'file-upload';
  acceptedTypes: readonly string[];
  maximumBytes: number;
  maximumFiles: number;
};

export type DisplayField = FormFieldBase & {
  type: 'display';
  content: string;
  required: false;
};

export type FormField =
  | ShortTextField
  | LongTextField
  | NumberField
  | DateField
  | EmailField
  | UrlField
  | CheckboxField
  | SingleChoiceField
  | MultipleChoiceField
  | FileUploadField
  | DisplayField;

export type FormPurpose =
  | 'eligibility'
  | 'application'
  | 'work'
  | 'reference'
  | 'additional-information'
  | 'internal'
  | 'review'
  | 'delivery';

export type FormDefinition = {
  name: string;
  purpose: FormPurpose;
  fields: readonly FormField[];
};

export type FormVersion = {
  id: string;
  organizationId: string;
  version: number;
  status: ConfigurationStatus;
  definition: FormDefinition;
  revision: number;
  createdAt: IsoDateTime;
  publishedAt?: IsoDateTime;
  supersedesVersionId?: string;
};

export type OpportunityConfiguration = {
  locale: string;
  timeZone: string;
  opensAt?: IsoDateTime;
  closesAt?: IsoDateTime;
  gracePeriodMinutes: number;
  submissionLimitPerApplicant?: number;
  amendmentPolicy: 'not-allowed' | 'organization-opens';
  withdrawalPolicy: 'not-allowed' | 'before-final-decision';
  fee: { type: 'none' } | { type: 'fixed'; amountMinor: number; currency: string; waiversAllowed: boolean };
  eligibility?: {
    summary: string;
    applicantTypes: readonly string[];
  };
  place?: {
    reach: 'worldwide' | 'countries' | 'region';
    participation: 'remote' | 'in-person' | 'hybrid';
    location?: string;
  };
  terms?: {
    award?: string;
    expenses?: string;
    rights?: string;
    paymentPolicy?: string;
    refundPolicy?: string;
  };
  applicationFormVersionId: string;
  eligibilityFormVersionId?: string;
  reviewWorkflowVersionId?: string;
};

export type OpportunityConfigurationVersion = {
  id: string;
  organizationId: string;
  openCallId: string;
  version: number;
  status: ConfigurationStatus;
  configuration: OpportunityConfiguration;
  revision: number;
  createdAt: IsoDateTime;
  publishedAt?: IsoDateTime;
  supersedesVersionId?: string;
};

type ReviewStageBase = {
  id: string;
  name: string;
  order: number;
  requiredReviewCount: number;
  blindMode: 'none' | 'identity-redacted';
  peerReviewVisibility: 'hidden' | 'after-finalization';
};

export type ReviewStage =
  | (ReviewStageBase & { type: 'no-review' })
  | (ReviewStageBase & { type: 'vote'; choices: readonly ('yes' | 'no' | 'maybe')[] })
  | (ReviewStageBase & { type: 'custom-form'; reviewFormVersionId: string });

export type ReviewWorkflowDefinition = {
  name: string;
  stages: readonly ReviewStage[];
};

export type ReviewWorkflowVersion = {
  id: string;
  organizationId: string;
  openCallId: string;
  version: number;
  status: ConfigurationStatus;
  definition: ReviewWorkflowDefinition;
  revision: number;
  createdAt: IsoDateTime;
  publishedAt?: IsoDateTime;
  supersedesVersionId?: string;
};

export type PortalCapability =
  | 'portal.configure'
  | 'portal.publish'
  | 'opportunity.configure'
  | 'opportunity.publish'
  | 'submission.read'
  | 'submission.triage'
  | 'review.assign'
  | 'review.complete'
  | 'decision.draft'
  | 'decision.finalize'
  | 'message.send'
  | 'delivery.manage'
  | 'report.export'
  | 'member.manage';

export type PortalResourceScope =
  | { type: 'organization'; organizationId: string }
  | { type: 'team'; organizationId: string; teamIds: readonly string[] }
  | { type: 'program'; organizationId: string; programIds: readonly string[] }
  | { type: 'opportunity'; organizationId: string; openCallIds: readonly string[] }
  | { type: 'assignment'; organizationId: string; reviewerAccountId: string };

export type PortalCapabilityGrant = {
  capability: PortalCapability;
  scope: PortalResourceScope;
};
