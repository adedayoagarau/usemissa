import {
  DETERMINISTIC_FIT_POLICY_VERSION,
  type EligibilityDecision,
  type FeatureContribution,
  type OpportunityEvidence,
  type PolicyExplanation,
  type RecommendationContext,
} from "./types.js";

const FEATURE_LABELS: Record<string, string> = {
  "explicit-intent.taxonomy": "Matches a practice you selected",
  "explicit-intent.type": "Matches an Opportunity type you selected",
  "explicit-intent.saved-search": "Matches one of your saved searches",
  "explicit-intent.goal-stage": "Matches a stated goal or stage",
  "feasibility.fee": "Matches your fee preference",
  "feasibility.participation": "Matches your participation preference",
  "feasibility.preparation": "Fits the preparation time you gave us",
  "feasibility.accessibility": "Matches the access information you provided",
  "affinity.work-taxonomy": "Matches terms on Work you selected for matching",
  "affinity.organization-follow": "You follow this Organization",
  "affinity.behavior": "Reflects your previous activity on this Opportunity",
  "value-timing.deadline": "The deadline is approaching",
  "value-timing.freshness": "The source was checked recently",
  "value-timing.funding": "Funding or support is described in the source evidence",
};

const MISSING_LABELS: Record<string, string> = {
  "fee.unknown": "Fee information needs checking",
  "fee.currency-unknown": "The fee currency needs checking",
  "participation.mode-unknown": "Participation mode needs checking",
  "participation.location-unknown": "Location or participation requirements need checking",
  "accessibility.unknown": "Accessibility information needs checking",
  "deadline.unknown": "The deadline needs checking",
  "deadline.conflict": "The sources disagree about the deadline",
  "lifecycle.unknown": "The current Opportunity status needs checking",
  "preparation.insufficient": "The preparation window may be shorter than the time you gave us",
  "safety.unknown": "Safety and source review is unavailable",
};

function signalKeys(contribution: FeatureContribution): string[] {
  return contribution.signalRefs.length ? contribution.signalRefs : [contribution.key];
}

function labelForMissing(code: string, contribution?: FeatureContribution): string {
  return MISSING_LABELS[code] ?? (contribution ? `${FEATURE_LABELS[contribution.key] ?? contribution.key} needs checking` : "More information needs checking");
}

export function deriveExplanation(
  _context: RecommendationContext,
  opportunity: OpportunityEvidence,
  eligibility: EligibilityDecision,
  contributions: FeatureContribution[],
): PolicyExplanation {
  const positiveReasons = eligibility.state === "ineligible"
    ? []
    : contributions
        .filter((item) => item.contribution > 0 && item.normalized !== undefined)
        .sort((left, right) => right.contribution - left.contribution || left.key.localeCompare(right.key))
        .slice(0, 4)
        .map((item) => ({
          code: item.key,
          label: FEATURE_LABELS[item.key] ?? item.key,
          contributionKeys: [item.key],
        }));

  const missingInformation = [
    ...eligibility.missing.map((item) => ({
      code: item.code,
      label: labelForMissing(item.code),
      signalKeys: item.signalKeys,
    })),
    ...contributions
      .filter((item) => item.missing && item.group !== "affinity")
      .slice(0, 4)
      .map((item) => ({
        code: `feature.${item.key}.missing`,
        label: labelForMissing(item.key, item),
        signalKeys: signalKeys(item),
      })),
  ].filter((item, index, all) => all.findIndex((candidate) => candidate.code === item.code) === index);

  const watchouts = eligibility.state === "eligible"
    ? contributions
        .filter((item) => item.missing && item.group === "feasibility")
        .slice(0, 3)
        .map((item) => ({
          code: `feature.${item.key}.unknown`,
          label: labelForMissing(item.key, item),
          signalKeys: signalKeys(item),
        }))
    : [];

  const exclusions = eligibility.hardReasons.map((reason) => ({
    code: reason.code,
    label: reason.code.startsWith("safety.")
      ? "This Opportunity is not available because its safety or dispute state is not clear"
      : reason.code.startsWith("publication.")
        ? "This Opportunity is not currently published"
        : reason.code.startsWith("fee.")
          ? "This Opportunity conflicts with your stated fee constraint"
          : reason.code.startsWith("participation.")
            ? "This Opportunity conflicts with your stated participation constraint"
            : reason.code.startsWith("accessibility.")
              ? "The source-backed access information conflicts with your stated need"
              : "A confirmed eligibility rule excludes this Opportunity",
    signalKeys: reason.signalKeys,
  }));

  return {
    positiveReasons,
    watchouts,
    missingInformation,
    exclusions,
    policyVersion: DETERMINISTIC_FIT_POLICY_VERSION,
  };
}
