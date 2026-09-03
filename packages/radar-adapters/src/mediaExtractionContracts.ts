export type SourceRole =
  | "official-opportunity-page"
  | "organization-page"
  | "program-page"
  | "application-portal"
  | "discovery-directory"
  | "attachment";

export type CandidateKind =
  | "opportunity-artwork"
  | "program-artwork"
  | "organization-logo"
  | "organization-cover"
  | "venue/place"
  | "editorial-image"
  | "unknown";

export type InheritanceLevel = "opportunity" | "program" | "organization";

export type ExtractionMethod =
  | "json-ld"
  | "open-graph"
  | "twitter"
  | "dom-hero"
  | "srcset"
  | "organization-fallback";

export type CandidateStatus =
  | "found"
  | "rejected"
  | "reviewable"
  | "cleared"
  | "permitted"
  | "needs-attribution"
  | "blocked";

export type RightsStatus =
  | "unknown"
  | "cleared"
  | "permitted"
  | "rejected"
  | "needs-attribution";

export type MediaConfidence = "confirmed" | "probable" | "unknown";

export interface DiscoveredMediaCandidate {
  originalUrl: string;
  resolvedUrl: string;
  pageUrl: string;
  sourceRole: SourceRole;
  candidateKind: CandidateKind;
  alt?: string;
  caption?: string;
  title?: string;
  width?: number;
  height?: number;
  mimeType?: string;
  fileSize?: number;
  httpStatus?: number;
  redirectChain?: string[];
  contentHash?: string;
  attributionText?: string;
  inheritanceLevel: InheritanceLevel;
  linkedOrganizationId?: string;
  linkedProgramId?: string;
  extractionMethod: ExtractionMethod;
  parserVersion: string;
  confidence: MediaConfidence;
  rejectionReasons: string[];
  status: CandidateStatus;
  rightsStatus: RightsStatus;
  metadata?: Record<string, unknown>;
}

export interface ExtractionContext {
  opportunityId: string;
  title: string;
  pageUrl: string;
  sourceRole: SourceRole;
  organizationId?: string;
  programId?: string;
  organizationConfirmed?: boolean;
  programConfirmed?: boolean;
  minWidth?: number;
  minHeight?: number;
  maxFileSize?: number;
}

export interface ReviewMediaParams {
  candidateId: string;
  opportunityId: string;
  decision: "cleared" | "permitted" | "rejected" | "needs-attribution";
  reviewer: string;
  evidencePassage?: string;
  attributionRequirement?: string;
  approvedCrop?: {
    x: number;
    y: number;
    width: number;
    height: number;
    focalPoint?: { x: number; y: number };
  };
  permittedScope?: string;
  reviewedAlt?: string;
  notes?: string;
}

export interface MediaEnrichmentTelemetry {
  checked: number;
  found: number;
  rejected: number;
  reviewable: number;
  cleared: number;
  blocked: number;
  failed: number;
}
