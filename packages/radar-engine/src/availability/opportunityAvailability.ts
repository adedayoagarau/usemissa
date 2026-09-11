export type OpportunityAvailabilityState =
  | "forecasted"
  | "opening-soon"
  | "open"
  | "paused"
  | "closed"
  | "archived"
  | "uncertain";

export type OpportunityIntakeMode =
  | "fixed-deadline"
  | "rolling"
  | "year-round"
  | "seasonal"
  | "until-filled"
  | "unknown";

export type OpportunityAvailabilityInput = {
  lifecycleStatus: string;
  openDate?: string | null;
  deadlineDate?: string | null;
  deadlineKind?: string | null;
  readingPeriodKind?: string | null;
  now?: Date;
};

export type OpportunityAvailability = {
  state: OpportunityAvailabilityState;
  intakeMode: OpportunityIntakeMode;
  availableNow: boolean;
  upcoming: boolean;
  timingEvidenceKnown: boolean;
  publicationTimingReady: boolean;
  nextTransitionAt?: string;
  reason: string;
};

export type HistoricalOpeningWindow = {
  expectedOpenStart: string;
  expectedOpenEnd: string;
  confidence: "low" | "medium" | "high";
  basedOnCycles: number;
};

const OPEN_STATES = new Set(["open", "closing-soon", "deadline-extended"]);

function validDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const time = Date.parse(`${value.slice(0, 10)}T00:00:00.000Z`);
  return Number.isFinite(time) ? value.slice(0, 10) : undefined;
}

export function normalizeOpportunityIntakeMode(
  deadlineKind?: string | null,
  readingPeriodKind?: string | null,
): OpportunityIntakeMode {
  const value = (readingPeriodKind || deadlineKind || "unknown").toLowerCase();
  if (value === "exact" || value === "fixed" || value === "fixed-deadline") return "fixed-deadline";
  if (value === "rolling" || value === "continuous") return "rolling";
  if (value === "year-round" || value === "year_round" || value === "always-open") return "year-round";
  if (value === "seasonal") return "seasonal";
  if (value === "until-filled" || value === "until_filled" || value === "until-funds-exhausted") return "until-filled";
  return "unknown";
}

export function projectOpportunityAvailability(input: OpportunityAvailabilityInput): OpportunityAvailability {
  const today = (input.now ?? new Date()).toISOString().slice(0, 10);
  const openDate = validDate(input.openDate);
  const deadlineDate = validDate(input.deadlineDate);
  const intakeMode = normalizeOpportunityIntakeMode(input.deadlineKind, input.readingPeriodKind);
  const hasOpenMode = ["rolling", "year-round", "until-filled"].includes(intakeMode);
  const status = input.lifecycleStatus;

  if (status === "archived") return { state: "archived", intakeMode, availableNow: false, upcoming: false, timingEvidenceKnown: true, publicationTimingReady: false, reason: "Opportunity is archived." };
  if (status === "uncertain" || status === "needs-verification") return { state: "uncertain", intakeMode, availableNow: false, upcoming: false, timingEvidenceKnown: false, publicationTimingReady: false, reason: "Availability evidence is stale or conflicting." };
  if (status === "paused") return { state: "paused", intakeMode, availableNow: false, upcoming: false, timingEvidenceKnown: true, publicationTimingReady: false, reason: "Intake is temporarily paused." };
  if (status === "closed") return { state: "closed", intakeMode, availableNow: false, upcoming: false, timingEvidenceKnown: Boolean(deadlineDate || intakeMode !== "unknown"), publicationTimingReady: false, reason: "The latest intake cycle is closed." };

  if (status === "opening-soon") {
    const verifiedFutureOpening = Boolean(openDate && openDate > today);
    return {
      state: verifiedFutureOpening ? "opening-soon" : "uncertain",
      intakeMode,
      availableNow: false,
      upcoming: verifiedFutureOpening,
      timingEvidenceKnown: verifiedFutureOpening,
      publicationTimingReady: verifiedFutureOpening,
      ...(verifiedFutureOpening ? { nextTransitionAt: openDate } : {}),
      reason: verifiedFutureOpening ? "A verified future opening date is known." : "Opening soon lacks a verified future opening date.",
    };
  }

  if (status === "forecasted" || status === "discovered") {
    const forecasted = Boolean(openDate && openDate > today);
    return { state: forecasted ? "forecasted" : "uncertain", intakeMode, availableNow: false, upcoming: forecasted, timingEvidenceKnown: forecasted, publicationTimingReady: false, ...(forecasted ? { nextTransitionAt: openDate } : {}), reason: forecasted ? "A future opening is forecasted but not yet open." : "No verified current or future intake window is known." };
  }

  if (OPEN_STATES.has(status)) {
    const fixedWindow = Boolean(deadlineDate && deadlineDate >= today);
    const timingEvidenceKnown = fixedWindow || hasOpenMode || intakeMode === "seasonal";
    return {
      state: timingEvidenceKnown ? "open" : "uncertain",
      intakeMode,
      availableNow: timingEvidenceKnown,
      upcoming: false,
      timingEvidenceKnown,
      publicationTimingReady: timingEvidenceKnown,
      ...(fixedWindow ? { nextTransitionAt: deadlineDate } : {}),
      reason: fixedWindow ? "A current fixed deadline is known." : hasOpenMode ? `Intake is open on a ${intakeMode} basis.` : intakeMode === "seasonal" ? "The current seasonal intake is open." : "Open status lacks a current intake window.",
    };
  }

  return { state: "uncertain", intakeMode, availableNow: false, upcoming: false, timingEvidenceKnown: false, publicationTimingReady: false, reason: "Availability state is not recognized." };
}

/** Historical recurrence schedules source verification only. It never changes
 * public availability or proves that a new cycle exists. */
export function internalRecheckFromHistory(
  prediction: HistoricalOpeningWindow | null | undefined,
  now = new Date(),
  leadDays = 14,
): string | undefined {
  if (!prediction || prediction.basedOnCycles < 2) return undefined;
  const expected = Date.parse(`${prediction.expectedOpenStart}T00:00:00.000Z`);
  if (!Number.isFinite(expected)) return undefined;
  const today = now.toISOString().slice(0, 10);
  const scheduled = new Date(expected - Math.max(0, leadDays) * 86_400_000).toISOString().slice(0, 10);
  if (scheduled >= today) return scheduled;
  return prediction.expectedOpenStart >= today ? today : undefined;
}
