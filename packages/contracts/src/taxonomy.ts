import { z } from "zod";
import { opportunityTypeSchema } from "./opportunities.js";
import { resourceIdSchema } from "./shared.js";

export const taxonomyFacetKeySchema = z.enum([
  "practice-family",
  "discipline",
  "form",
  "genre",
  "subgenre",
  "medium",
  "technique",
  "mode",
  "role",
  "theme",
  "audience",
  "language",
]);

export const taxonomyTermStatusSchema = z.enum([
  "draft",
  "active",
  "deprecated",
  "archived",
]);

export const taxonomyTermLabelSchema = z.object({
  languageCode: z.string().trim().min(2).max(35),
  regionCode: z.string().trim().min(2).max(16).optional(),
  label: z.string().trim().min(1).max(160),
  kind: z.enum([
    "preferred",
    "alias",
    "abbreviation",
    "historical",
    "source-label",
    "community-name",
  ]),
});

export const taxonomyTermRelationSchema = z.object({
  termId: resourceIdSchema,
  relationType: z.enum([
    "broader",
    "related",
    "exact-match",
    "close-match",
    "replaced-by",
    "requires",
    "usually-used-with",
  ]),
  weight: z.number().int().min(0).max(100),
});

export const taxonomyTermSchema = z.object({
  id: resourceIdSchema,
  facet: taxonomyFacetKeySchema,
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(160),
  preferredLabel: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1_000).optional(),
  status: taxonomyTermStatusSchema,
  selectable: z.boolean(),
  culturallySensitive: z.boolean(),
  labels: z.array(taxonomyTermLabelSchema).max(128),
  relations: z.array(taxonomyTermRelationSchema).max(128),
});

export const taxonomyFacetSchema = z.object({
  id: resourceIdSchema,
  key: taxonomyFacetKeySchema,
  label: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(600),
  selectionMode: z.enum(["single", "multiple", "hierarchical"]),
  userVisible: z.boolean(),
  sortOrder: z.number().int().min(0),
});

export const taxonomyCatalogResponseSchema = z.object({
  scheme: z.object({
    id: resourceIdSchema,
    key: z.string().trim().min(1).max(120),
    label: z.string().trim().min(1).max(160),
    description: z.string().trim().min(1).max(1_000),
    version: z.number().int().min(1),
    publishedAt: z.iso.datetime().optional(),
  }),
  facets: z.array(taxonomyFacetSchema).length(12),
  terms: z.array(taxonomyTermSchema).max(20_000),
});

export const taxonomyAssignmentSchema = z.object({
  termId: resourceIdSchema,
  sourcePhrase: z.string().trim().min(1).max(240).optional(),
  assignmentOrigin: z.enum([
    "source",
    "extractor",
    "registry",
    "backfill",
    "organization",
    "reviewer",
    "user",
    "import",
  ]),
  certainty: z.enum([
    "confirmed",
    "probable",
    "inferred",
    "unknown",
    "rejected",
  ]),
  primary: z.boolean().default(false),
});

export const taxonomyAssignmentSetSchema = z.object({
  schemeVersion: z.number().int().min(1),
  assignments: z.array(taxonomyAssignmentSchema).max(128),
});

export const taxonomyPreferenceInputSchema = z.object({
  termId: resourceIdSchema,
  preference: z.enum(["include", "prefer", "exclude"]),
  weight: z.number().int().min(0).max(100).default(100),
});

export const sourceCoverageCellSchema = z.object({
  id: resourceIdSchema,
  dimensionKey: z.string().trim().min(1).max(1_000),
  termIds: z.array(resourceIdSchema).min(1).max(32),
  opportunityType: opportunityTypeSchema,
  geographyCode: z.string().trim().min(2).max(32),
  languageCode: z.string().trim().min(2).max(35),
  sourceTier: z.number().int().min(0).max(3),
  minimumSources: z.number().int().min(1).max(10_000),
  minimumCanonicalSources: z.number().int().min(0).max(10_000),
  status: z.enum(["unassessed", "gap", "thin", "covered", "strong", "blocked"]),
  lastAssessedAt: z.iso.datetime().optional(),
  nextReviewAt: z.iso.datetime().optional(),
});

export const taxonomyChangeProposalInputSchema = z.object({
  termId: resourceIdSchema.optional(),
  kind: z.enum([
    "add-term",
    "rename-term",
    "add-alias",
    "change-relation",
    "deprecate-term",
    "restore-term",
    "merge-terms",
    "split-term",
  ]),
  payload: z.record(z.string(), z.unknown()),
  evidenceUrls: z.array(z.url()).max(16).default([]),
});

export type TaxonomyFacetKey = z.infer<typeof taxonomyFacetKeySchema>;
export type TaxonomyTerm = z.infer<typeof taxonomyTermSchema>;
export type TaxonomyFacet = z.infer<typeof taxonomyFacetSchema>;
export type TaxonomyCatalogResponse = z.infer<
  typeof taxonomyCatalogResponseSchema
>;
export type TaxonomyAssignment = z.infer<typeof taxonomyAssignmentSchema>;
export type TaxonomyAssignmentSet = z.infer<typeof taxonomyAssignmentSetSchema>;
export type TaxonomyPreferenceInput = z.infer<
  typeof taxonomyPreferenceInputSchema
>;
export type SourceCoverageCell = z.infer<typeof sourceCoverageCellSchema>;
export type TaxonomyChangeProposalInput = z.infer<
  typeof taxonomyChangeProposalInputSchema
>;
