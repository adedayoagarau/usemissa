export type CoverageContractStatus = 'pass' | 'attention' | 'fail';

export interface CoverageContractThresholds {
  minimumHealthySourceRate: number;
  minimumCanonicalSources: number;
  minimumSegmentCoverageRate: number;
  minimumPublishedDeadlineRate: number;
  minimumPublishedDestinationRate: number;
  minimumPublishedOrganizationRate: number;
  maximumReviewSlaBreachRate: number;
  maximumActiveExpired: number;
  maximumDuplicateGroups: number;
}

export interface OperationalCoverageInput {
  monitoredSources: number;
  healthySources: number;
  canonicalSources: number;
  requiredSegments: string[];
  coveredSegments: string[];
  activePublished: number;
  publishedDeadlineKnown: number;
  publishedDestinationAvailable: number;
  publishedOrganizationConfirmed: number;
  reviewable: number;
  reviewSlaBreaches: number;
  activeExpired: number;
  duplicateGroups: number;
}

export interface CoverageContractCheck {
  key: keyof CoverageContractThresholds;
  status: CoverageContractStatus;
  actual: number;
  target: number;
  direction: 'minimum' | 'maximum';
  explanation: string;
}

export interface OperationalCoverageAssessment {
  status: CoverageContractStatus;
  metrics: {
    healthySourceRate: number;
    canonicalSources: number;
    segmentCoverageRate: number;
    publishedDeadlineRate: number;
    publishedDestinationRate: number;
    publishedOrganizationRate: number;
    reviewSlaBreachRate: number;
    activeExpired: number;
    duplicateGroups: number;
  };
  missingSegments: string[];
  checks: CoverageContractCheck[];
}

export const WRITING_COVERAGE_SEGMENTS = [
  'contests-and-awards',
  'magazines-and-reading-periods',
  'grants-and-fellowships',
  'residencies',
  'publishers-and-manuscripts',
  'playwriting-and-screenwriting',
  'literary-translation',
] as const;

/** Provisional operating thresholds. They are deliberately quality-weighted:
 * adding noisy records cannot make the contract pass. */
export const WRITING_COVERAGE_THRESHOLDS: CoverageContractThresholds = {
  minimumHealthySourceRate: 0.95,
  minimumCanonicalSources: 2,
  minimumSegmentCoverageRate: 1,
  minimumPublishedDeadlineRate: 0.95,
  minimumPublishedDestinationRate: 0.9,
  minimumPublishedOrganizationRate: 0.9,
  maximumReviewSlaBreachRate: 0.1,
  maximumActiveExpired: 0,
  maximumDuplicateGroups: 0,
};

function rate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.max(0, Math.min(1, numerator / denominator));
}

function minimumCheck(
  key: keyof CoverageContractThresholds,
  actual: number,
  target: number,
  explanation: string,
): CoverageContractCheck {
  return { key, status: actual >= target ? 'pass' : 'fail', actual, target, direction: 'minimum', explanation };
}

function maximumCheck(
  key: keyof CoverageContractThresholds,
  actual: number,
  target: number,
  explanation: string,
): CoverageContractCheck {
  return { key, status: actual <= target ? 'pass' : 'fail', actual, target, direction: 'maximum', explanation };
}

export function evaluateOperationalCoverage(
  input: OperationalCoverageInput,
  thresholds: CoverageContractThresholds,
): OperationalCoverageAssessment {
  const required = new Set(input.requiredSegments);
  const covered = new Set(input.coveredSegments.filter((segment) => required.has(segment)));
  const missingSegments = [...required].filter((segment) => !covered.has(segment));
  const metrics = {
    healthySourceRate: rate(input.healthySources, input.monitoredSources),
    canonicalSources: Math.max(0, input.canonicalSources),
    segmentCoverageRate: rate(covered.size, required.size),
    publishedDeadlineRate: rate(input.publishedDeadlineKnown, input.activePublished),
    publishedDestinationRate: rate(input.publishedDestinationAvailable, input.activePublished),
    publishedOrganizationRate: rate(input.publishedOrganizationConfirmed, input.activePublished),
    reviewSlaBreachRate: rate(input.reviewSlaBreaches, input.reviewable),
    activeExpired: Math.max(0, input.activeExpired),
    duplicateGroups: Math.max(0, input.duplicateGroups),
  };
  const checks = [
    minimumCheck('minimumHealthySourceRate', metrics.healthySourceRate, thresholds.minimumHealthySourceRate, 'Daily and scheduled sources complete successfully within their expected cadence.'),
    minimumCheck('minimumCanonicalSources', metrics.canonicalSources, thresholds.minimumCanonicalSources, 'The desk is not dependent on one source or on aggregators alone.'),
    minimumCheck('minimumSegmentCoverageRate', metrics.segmentCoverageRate, thresholds.minimumSegmentCoverageRate, 'Every required opportunity segment has an active owner source.'),
    minimumCheck('minimumPublishedDeadlineRate', metrics.publishedDeadlineRate, thresholds.minimumPublishedDeadlineRate, 'Published calls represent a deadline or an honest rolling window.'),
    minimumCheck('minimumPublishedDestinationRate', metrics.publishedDestinationRate, thresholds.minimumPublishedDestinationRate, 'Creators can reach verified guidelines or an application destination.'),
    minimumCheck('minimumPublishedOrganizationRate', metrics.publishedOrganizationRate, thresholds.minimumPublishedOrganizationRate, 'Published calls resolve to a confirmed organization identity.'),
    maximumCheck('maximumReviewSlaBreachRate', metrics.reviewSlaBreachRate, thresholds.maximumReviewSlaBreachRate, 'Human-review work remains within the desk SLA.'),
    maximumCheck('maximumActiveExpired', metrics.activeExpired, thresholds.maximumActiveExpired, 'Expired exact-deadline calls are not presented as active.'),
    maximumCheck('maximumDuplicateGroups', metrics.duplicateGroups, thresholds.maximumDuplicateGroups, 'No active public identity resolves to multiple canonical records.'),
  ];
  const failed = checks.filter((check) => check.status === 'fail').length;
  return { status: failed === 0 ? 'pass' : failed <= 2 ? 'attention' : 'fail', metrics, missingSegments, checks };
}
