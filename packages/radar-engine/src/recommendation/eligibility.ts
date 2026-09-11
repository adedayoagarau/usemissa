import {
  DETERMINISTIC_FIT_GATE_VERSION,
  type EligibilityDecision,
  type EligibilityReason,
  type OpportunityEvidence,
  type RecommendationContext,
  type RecommendationSignal,
} from "./types.js";
import { safetyEvidenceIsCurrentAndAuthoritative } from "./safety.js";

function known<T>(signal: RecommendationSignal<T> | undefined): signal is RecommendationSignal<T> & { value: T } {
  return Boolean(signal && signal.value !== undefined && !signal.missing);
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function addHardReason(
  reasons: EligibilityReason[],
  code: string,
  signalKeys: string[],
): void {
  reasons.push({ code, signalKeys, customerSafe: true });
}

function isPastDeadline(opportunity: OpportunityEvidence, now: string): boolean {
  if (!known(opportunity.deadline) || !opportunity.deadline.value.date) return false;
  const deadline = Date.parse(opportunity.deadline.value.date);
  const current = Date.parse(now);
  return Number.isFinite(deadline) && Number.isFinite(current) && deadline < current;
}

function creatorPracticeExcludes(
  context: RecommendationContext,
  opportunity: OpportunityEvidence,
): boolean {
  if (!known(context.practice) || !known(opportunity.taxonomy)) return false;
  const excluded = new Set(context.practice.value.exclude.map(normalized));
  return opportunity.taxonomy.value.some(
    (term) => term.certainty === "confirmed" && excluded.has(normalized(term.termId)),
  );
}

function ruleMismatch(
  context: RecommendationContext,
  opportunity: OpportunityEvidence,
  missing: EligibilityDecision["missing"],
  hardReasons: EligibilityReason[],
): void {
  if (!opportunity.eligibilityRules.length) return;
  const creatorValues = known(context.explicitEligibility)
    ? context.explicitEligibility.value
    : undefined;

  for (const rule of opportunity.eligibilityRules) {
    if (!known(rule) || !rule.value.value) continue;
    const creatorValue = creatorValues?.[rule.value.key];
    if (creatorValue === undefined) {
      if (context.explicitEligibility?.explicit) {
        missing.push({
          code: `eligibility.${rule.value.key}`,
          signalKeys: [rule.key, context.explicitEligibility.key],
        });
      }
      continue;
    }
    if (normalized(creatorValue) !== normalized(rule.value.value ?? "")) {
      addHardReason(hardReasons, `eligibility.${rule.value.key}.mismatch`, [
        rule.key,
        context.explicitEligibility?.key ?? "creator.eligibility",
      ]);
    }
  }
}

function feeGate(
  context: RecommendationContext,
  opportunity: OpportunityEvidence,
  missing: EligibilityDecision["missing"],
  hardReasons: EligibilityReason[],
): void {
  const preferences = context.opportunityPreferences;
  if (!known(preferences)) return;
  const fee = opportunity.fee;
  const noFeeOnly = preferences.value.noFeeOnly === true;
  const maxFee = preferences.value.maxFee;

  if (!known(fee) || fee.value.status === "unknown") {
    if (noFeeOnly || maxFee) {
      missing.push({ code: "fee.unknown", signalKeys: [fee.key, preferences.key] });
    }
    return;
  }

  if (noFeeOnly && fee.value.status === "paid") {
    addHardReason(hardReasons, "fee.no-fee-required", [fee.key, preferences.key]);
  }
  if (maxFee && fee.value.status === "paid") {
    if (!fee.value.currency || fee.value.currency !== maxFee.currency) {
      missing.push({ code: "fee.currency-unknown", signalKeys: [fee.key, preferences.key] });
    } else if ((fee.value.amountMinor ?? Number.POSITIVE_INFINITY) > maxFee.amountMinor) {
      addHardReason(hardReasons, "fee.exceeds-explicit-ceiling", [fee.key, preferences.key]);
    }
  }
}

function geographyGate(
  context: RecommendationContext,
  opportunity: OpportunityEvidence,
  missing: EligibilityDecision["missing"],
  hardReasons: EligibilityReason[],
): void {
  const preferences = context.opportunityPreferences;
  if (!known(preferences)) return;
  const geography = opportunity.geography;
  const travel = preferences.value.travel;
  if (travel === "unwilling") {
    if (!known(geography) || geography.value.mode === "unknown") {
      missing.push({ code: "participation.mode-unknown", signalKeys: [geography.key, preferences.key] });
    } else if (geography.value.mode === "travel-required") {
      addHardReason(hardReasons, "participation.travel-not-allowed", [geography.key, preferences.key]);
    }
  }
  if (preferences.value.locations?.length) {
    if (!known(geography) || !geography.value.regions?.length) {
      missing.push({ code: "participation.location-unknown", signalKeys: [geography.key, preferences.key] });
    } else if (!preferences.value.locations.some((location) => geography.value.regions?.includes(location))) {
      addHardReason(hardReasons, "participation.location-mismatch", [geography.key, preferences.key]);
    }
  }
}

function accessibilityGate(
  context: RecommendationContext,
  opportunity: OpportunityEvidence,
  missing: EligibilityDecision["missing"],
  hardReasons: EligibilityReason[],
): void {
  const preferences = context.opportunityPreferences;
  if (!known(preferences) || !preferences.value.accessibility?.length) return;
  const access = opportunity.accessibility;
  if (!known(access)) {
    missing.push({ code: "accessibility.unknown", signalKeys: [access?.key ?? "opportunity.accessibility", preferences.key] });
    return;
  }
  const available = new Set(access.value.map(normalized));
  const compatible = preferences.value.accessibility.every((need) => available.has(normalized(need)));
  if (!compatible) addHardReason(hardReasons, "accessibility.confirmed-mismatch", [access.key, preferences.key]);
}

function preparationGate(
  context: RecommendationContext,
  opportunity: OpportunityEvidence,
  missing: EligibilityDecision["missing"],
): void {
  const preferences = context.opportunityPreferences;
  if (!known(preferences) || preferences.value.preparationDays === undefined) return;
  if (!known(opportunity.preparation) || opportunity.preparation.value.estimatedDays === undefined) return;
  if (opportunity.preparation.value.estimatedDays > preferences.value.preparationDays) {
    missing.push({ code: "preparation.insufficient", signalKeys: [opportunity.preparation.key, preferences.key] });
  }
}

export function evaluateEligibility(
  context: RecommendationContext,
  opportunity: OpportunityEvidence,
): EligibilityDecision {
  const hardReasons: EligibilityReason[] = [];
  const missing: EligibilityDecision["missing"] = [];

  if (opportunity.publicationState !== "published") {
    addHardReason(hardReasons, `publication.${opportunity.publicationState}`, ["opportunity.publication"]);
  }
  if (!known(opportunity.safety) || opportunity.safety.value.state === "unknown") {
    missing.push({ code: "safety.unknown", signalKeys: ["opportunity.safety"] });
  } else if (!safetyEvidenceIsCurrentAndAuthoritative(opportunity.safety.value, opportunity.versionId, context.now)) {
    missing.push({ code: "safety.authority-unknown", signalKeys: [opportunity.safety.key] });
  } else if (opportunity.safety.value.state !== "clear") {
    addHardReason(hardReasons, `safety.${opportunity.safety.value.state}`, [opportunity.safety.key]);
  }
  if (opportunity.lifecycle === "closed") {
    addHardReason(hardReasons, "lifecycle.closed", ["opportunity.lifecycle"]);
  } else if (opportunity.lifecycle === "unknown") {
    missing.push({ code: "lifecycle.unknown", signalKeys: ["opportunity.lifecycle"] });
  }
  if (isPastDeadline(opportunity, context.now)) {
    addHardReason(hardReasons, "deadline.past", [opportunity.deadline?.key ?? "opportunity.deadline"]);
  } else if (!known(opportunity.deadline)) {
    missing.push({
      code: opportunity.deadline?.missing === "conflict" ? "deadline.conflict" : "deadline.unknown",
      signalKeys: [opportunity.deadline?.key ?? "opportunity.deadline"],
    });
  }
  if (known(opportunity.duplicate) && opportunity.duplicate.value.isDuplicate) {
    addHardReason(hardReasons, "opportunity.duplicate", [opportunity.duplicate.key]);
  }
  if (creatorPracticeExcludes(context, opportunity)) {
    addHardReason(hardReasons, "practice.explicit-exclusion", [context.practice.key, opportunity.taxonomy.key]);
  }

  ruleMismatch(context, opportunity, missing, hardReasons);
  feeGate(context, opportunity, missing, hardReasons);
  geographyGate(context, opportunity, missing, hardReasons);
  accessibilityGate(context, opportunity, missing, hardReasons);
  preparationGate(context, opportunity, missing);

  let state: EligibilityDecision["state"] = "eligible";
  if (hardReasons.length) state = "ineligible";
  else if (missing.some((item) => item.code.startsWith("safety.") || item.code.includes(".conflict"))) state = "unknown";
  else if (missing.length) state = "needs_input";

  return {
    state,
    hardReasons,
    missing,
    gateVersion: DETERMINISTIC_FIT_GATE_VERSION,
  };
}
