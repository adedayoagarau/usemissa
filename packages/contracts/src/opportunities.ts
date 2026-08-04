import { z } from "zod";
import { resourceIdSchema } from "./shared.js";

/** Public opportunity taxonomy. Keep this in contracts so web and repositories
 * share the same accepted vocabulary without importing the engine package. */
export const opportunityTypeSchema = z.enum([
  "open-call",
  "magazine",
  "grant",
  "award",
  "fellowship",
  "residency",
  "festival",
  "scholarship",
  "conference",
  "rfp",
  "contest",
  "pitch",
  "exhibition",
  "commission",
  "other",
]);

export const opportunityStatusSchema = z.enum([
  "opening-soon",
  "open",
  "closing-soon",
  "deadline-extended",
  "closed",
  "archived",
]);

export const deadlineKindSchema = z.enum([
  "exact",
  "inferred",
  "rolling",
  "until-filled",
  "conflicting",
  "unknown",
]);

export const sourceKindSchema = z.enum([
  "organization-website",
  "directory",
  "feed",
  "newsletter",
  "user-suggested",
  "partner-feed",
]);

export const feeStatusSchema = z.enum(["no-fee", "paid", "unknown"]);

const httpUrlSchema = z.url().refine(
  (value) => /^https?:\/\//i.test(value),
  "Expected an http(s) URL",
);

export const opportunitySortSchema = z.enum([
  "recommended",
  "soonest-deadline",
  "recently-verified",
  "recently-added",
]);

export const opportunityCategorySchema = z.enum([
  "all",
  "magazines",
  "grants",
  "awards",
  "residencies",
  "fellowships",
  "contests",
  "more",
]);

export const opportunityBrowseQuerySchema = z.object({
  query: z.string().trim().max(200).optional(),
  category: opportunityCategorySchema.default("all"),
  types: z.array(opportunityTypeSchema).max(16).default([]),
  disciplines: z.array(z.string().trim().min(1).max(80)).max(16).default([]),
  genres: z.array(z.string().trim().min(1).max(80)).max(32).default([]),
  locations: z.array(z.string().trim().min(1).max(120)).max(32).default([]),
  feeStatus: feeStatusSchema.optional(),
  maxFeeCents: z.number().int().min(0).max(10_000_000).optional(),
  deadlineWithinDays: z.number().int().min(0).max(366).optional(),
  openNow: z.boolean().default(true),
  verifiedOnly: z.boolean().default(false),
  simultaneousRequired: z.boolean().optional(),
  sort: opportunitySortSchema.default("soonest-deadline"),
  cursor: z.string().trim().max(2048).optional(),
  limit: z.number().int().min(1).max(48).default(24),
});

export const opportunityDeadlineSchema = z.object({
  kind: deadlineKindSchema,
  date: z.iso.date().optional(),
  time: z.iso.datetime().optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
  raw: z.string().trim().max(500).optional(),
});

export const opportunityFeeSchema = z.object({
  status: feeStatusSchema,
  amountCents: z.number().int().min(0).optional(),
  currency: z.string().trim().length(3).optional(),
  raw: z.string().trim().max(200).optional(),
});

export const opportunitySourceEvidenceSchema = z.object({
  kind: sourceKindSchema,
  name: z.string().trim().min(1).max(200),
  url: httpUrlSchema,
  checkedAt: z.iso.datetime(),
  processingSucceededAt: z.iso.datetime().optional(),
  organizationConfirmed: z.boolean(),
  verifiedUntil: z.iso.datetime().optional(),
});

export const opportunityTailoringReasonSchema = z.object({
  code: z.enum([
    "type",
    "discipline",
    "genre",
    "location",
    "fee",
    "deadline",
    "career-stage",
    "simultaneous-submission",
    "followed-organization",
    "saved-search",
  ]),
  label: z.string().trim().min(1).max(160),
});

export const opportunityPersonalStateSchema = z.object({
  tracked: z.boolean(),
  followingOrganization: z.boolean(),
  tailoringReasons: z.array(opportunityTailoringReasonSchema).max(4).default([]),
});

const opportunityIdentitySchema = z.object({
  id: resourceIdSchema,
  slug: z.string().trim().min(1).max(160),
  title: z.string().trim().min(1).max(300),
  organizationId: resourceIdSchema.optional(),
  organizationName: z.string().trim().max(240).optional(),
  organizationVerified: z.boolean().optional(),
  identityAssetUrl: httpUrlSchema.optional(),
  identityAssetAlt: z.string().trim().max(240).optional(),
});

export const opportunityBrowseItemSchema = opportunityIdentitySchema.extend({
  status: opportunityStatusSchema,
  type: opportunityTypeSchema,
  discipline: z.string().trim().max(80).optional(),
  genres: z.array(z.string().trim().min(1).max(80)).max(32),
  taxonomy: z
    .object({
      schemeVersion: z.number().int().min(1),
      termIds: z.array(resourceIdSchema).max(128),
      primaryTermIds: z.array(resourceIdSchema).max(16),
    })
    .optional(),
  deadline: opportunityDeadlineSchema,
  fee: opportunityFeeSchema,
  prize: z.string().trim().max(300).optional(),
  location: z.string().trim().max(160).optional(),
  submissionAvailable: z.boolean(),
  source: opportunitySourceEvidenceSchema,
  personal: opportunityPersonalStateSchema.optional(),
});

export const opportunityBrowseResponseSchema = z.object({
  items: z.array(opportunityBrowseItemSchema).max(48),
  nextCursor: z.string().trim().max(2048).nullable(),
  total: z.number().int().min(0),
  query: opportunityBrowseQuerySchema,
});

export const opportunityEligibilityRuleSchema = z.object({
  key: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(500),
  value: z.string().trim().max(160).optional(),
  certainty: z.enum(["confirmed", "inferred", "unknown"]),
});

export const opportunityRequiredMaterialSchema = z.object({
  label: z.string().trim().min(1).max(240),
  description: z.string().trim().max(500).optional(),
  required: z.boolean(),
  limit: z.string().trim().max(160).optional(),
});

export const opportunityChangeSchema = z.object({
  kind: z.enum([
    "deadline-changed",
    "deadline-extended",
    "fee-changed",
    "eligibility-changed",
    "submission-url-changed",
    "call-closed",
    "call-reopened",
    "guidelines-updated",
  ]),
  at: z.iso.datetime(),
  oldValue: z.string().trim().max(500).optional(),
  newValue: z.string().trim().max(500).optional(),
});

export const opportunityDetailResponseSchema = opportunityBrowseItemSchema.extend({
  openDate: z.iso.date().optional(),
  eligibility: z.array(opportunityEligibilityRuleSchema).max(64),
  requiredMaterials: z.array(opportunityRequiredMaterialSchema).max(64),
  guidelinesUrl: httpUrlSchema.optional(),
  submissionUrl: httpUrlSchema.optional(),
  simultaneousAllowed: z.boolean().optional(),
  changes: z.array(opportunityChangeSchema).max(32),
  organizationSummary: z.string().trim().max(1000).optional(),
  relatedOpportunityIds: z.array(resourceIdSchema).max(24),
});

export const opportunityPreferenceInputSchema = z.object({
  types: z.array(opportunityTypeSchema).max(16).default([]),
  disciplines: z.array(z.string().trim().min(1).max(80)).max(16).default([]),
  genres: z.array(z.string().trim().min(1).max(80)).max(32).default([]),
  locations: z.array(z.string().trim().min(1).max(120)).max(32).default([]),
  maxFeeCents: z.number().int().min(0).max(10_000_000).nullable().default(null),
  noFeeOnly: z.boolean().default(false),
  deadlineWithinDays: z.number().int().min(0).max(366).nullable().default(null),
  careerStages: z.array(z.string().trim().min(1).max(80)).max(16).default([]),
  simultaneousRequired: z.boolean().default(false),
});

export const savedSearchInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  criteria: opportunityBrowseQuerySchema.omit({ cursor: true, limit: true, sort: true }),
  includeInDigest: z.boolean().default(false),
});

export const trackOpportunityInputSchema = z.object({
  opportunityId: resourceIdSchema,
  idempotencyKey: z.uuid(),
});

export const trackedStatusInputSchema = z.object({
  opportunityId: resourceIdSchema,
  status: z.enum([
    "interested",
    "preparing",
    "submitted",
    "withdrawn",
    "accepted",
    "declined",
    "archived",
  ]),
  idempotencyKey: z.uuid(),
});

export const followOrganizationInputSchema = z.object({
  organizationId: resourceIdSchema,
  idempotencyKey: z.uuid(),
});

export const outboundDestinationStateSchema = z.object({
  opportunityId: resourceIdSchema,
  kind: z.enum(["available", "missing", "changed", "unsafe", "closed"]),
  host: z.string().trim().max(255).optional(),
  verifiedAt: z.iso.datetime().optional(),
  message: z.string().trim().max(500).optional(),
});

export const opportunityIssueReportInputSchema = z.object({
  opportunityId: resourceIdSchema,
  reason: z.enum(["incorrect-details", "closed-or-expired", "unsafe-or-suspicious", "other"]),
  note: z.string().trim().max(1000).optional(),
  idempotencyKey: z.uuid(),
});

export type OpportunityType = z.infer<typeof opportunityTypeSchema>;
export type OpportunityBrowseQuery = z.infer<typeof opportunityBrowseQuerySchema>;
export type OpportunityBrowseItem = z.infer<typeof opportunityBrowseItemSchema>;
export type OpportunityBrowseResponse = z.infer<typeof opportunityBrowseResponseSchema>;
export type OpportunityDetailResponse = z.infer<typeof opportunityDetailResponseSchema>;
export type OpportunityTailoringReason = z.infer<typeof opportunityTailoringReasonSchema>;
export type OpportunityPersonalState = z.infer<typeof opportunityPersonalStateSchema>;
export type OpportunityPreferenceInput = z.infer<typeof opportunityPreferenceInputSchema>;
export type SavedSearchInput = z.infer<typeof savedSearchInputSchema>;
export type TrackOpportunityInput = z.infer<typeof trackOpportunityInputSchema>;
export type TrackedStatusInput = z.infer<typeof trackedStatusInputSchema>;
export type FollowOrganizationInput = z.infer<typeof followOrganizationInputSchema>;
export type OutboundDestinationState = z.infer<typeof outboundDestinationStateSchema>;
export type OpportunityIssueReportInput = z.infer<typeof opportunityIssueReportInputSchema>;
