/**
 * Pure planning decisions behind the obligation ledger: when a default plan
 * is added on save, which template steps it holds, and the capacity report.
 * Database work lives in lib/deadline-planning.ts and the routes; everything
 * here is testable without one.
 */
import type {
  CreatorFeature,
  CreatorPlanningPreferences,
  ObligationTemplateInput,
  PlanningItem,
} from "@missa/radar-adapters";
import { daysBetween } from "./deadline-moment";
import { cushion, startBy, type CushionResult, type StartBy } from "./deadline-chain";
import { acceptanceTemplates, preparationTemplates, templateEffort } from "./obligation-templates";

export const PRE_SUBMISSION_STATUSES = new Set(["interested", "saved", "preparing", "draft-started", "ready-to-submit"]);

export type PlanFeatures = Pick<Record<CreatorFeature, boolean>, "startByPlanning" | "capacityPlanning">;

type PlanTarget = Pick<PlanningItem, "status" | "deadline" | "deadlineKind" | "personalTargetOn">;

/** The confirmed deadline, or null when the date is rolling, estimated or missing. */
export function exactDeadline(item: Pick<PlanningItem, "deadline" | "deadlineKind">): string | null {
  return item.deadline && (item.deadlineKind === "exact" || item.deadlineKind === "fixed") ? item.deadline : null;
}

/** The date the work must be finished by: the personal target when set, else the confirmed deadline. */
export function finishDate(item: PlanTarget): string | null {
  return item.personalTargetOn ?? exactDeadline(item);
}

export type DefaultPlanSkip = "plan" | "not-tracked" | "not-preparing" | "no-exact-deadline" | "deadline-passed";

/**
 * Why a default plan is not added on save, or undefined when it should be.
 * Plans with start-by planning only, calls still in preparation, and only a
 * confirmed deadline that is still ahead.
 */
export function defaultPlanSkipReason(
  features: Pick<PlanFeatures, "startByPlanning">,
  item: PlanTarget | undefined,
  today: string,
): DefaultPlanSkip | undefined {
  if (!features.startByPlanning) return "plan";
  if (!item) return "not-tracked";
  if (!PRE_SUBMISSION_STATUSES.has(item.status)) return "not-preparing";
  const deadline = exactDeadline(item);
  if (!deadline) return "no-exact-deadline";
  if (deadline <= today) return "deadline-passed";
  return undefined;
}

export type TemplateSet = "preparation" | "acceptance";

/** A template set for a call type, with effort corrected by the creator's own estimates. */
export function templateInputs(
  set: TemplateSet,
  type: string | undefined,
  preferences: Pick<CreatorPlanningPreferences, "materialEffort">,
): ObligationTemplateInput[] {
  const templates = set === "preparation" ? preparationTemplates(type) : acceptanceTemplates(type);
  return templates.map((template) => ({
    key: template.key,
    label: template.label,
    kind: template.kind,
    anchor: template.anchor,
    offsetDays: template.offsetDays,
    effortHours: templateEffort(template, preferences.materialEffort) ?? null,
  }));
}

export const START_BY_TEMPLATE_KEY = "start-by";

/**
 * The default plan for a call saved on a plan with start-by planning: the
 * preparation steps for its type and, once the creator has said how many
 * hours a week they have, a start-by step sized to the total effort and
 * finished by the personal target or the deadline with the creator's buffer.
 * The start-by step carries no effort of its own, so capacity sums never
 * count the work twice.
 */
export function defaultPlanTemplates(
  type: string | undefined,
  preferences: Pick<CreatorPlanningPreferences, "materialEffort" | "weeklyHoursAvailable" | "defaultBufferDays">,
  dates: { deadline: string; personalTargetOn?: string | null; today: string },
): ObligationTemplateInput[] {
  const steps = templateInputs("preparation", type, preferences);
  const weeklyHours = preferences.weeklyHoursAvailable;
  if (!weeklyHours || weeklyHours <= 0) return steps;
  const effortHours = steps.reduce((total, step) => total + (step.effortHours ?? 0), 0);
  if (effortHours <= 0) return steps;
  const plan = startBy({
    effortHours,
    weeklyHours,
    finishOn: dates.personalTargetOn ?? dates.deadline,
    bufferDays: preferences.defaultBufferDays,
    today: dates.today,
  });
  const startOn = plan.startOn < dates.today ? dates.today : plan.startOn;
  const offsetDays = daysBetween(dates.deadline, startOn) ?? 0;
  if (offsetDays >= 0) return steps;
  return [
    { key: START_BY_TEMPLATE_KEY, label: "Start this application", kind: "start-by", anchor: "deadline", offsetDays, effortHours: null },
    ...steps,
  ];
}

export type CapacityItem = CushionResult & {
  opportunityId: string;
  trackedOpportunityId: string;
  /** Whether the finish date is the creator's own target or the deadline. */
  finishBasis: "personal-target" | "deadline";
  remainingEffortHours: number;
  startBy?: StartBy;
};

export type CapacityReport =
  | { status: "locked"; feature: "capacityPlanning" }
  | { status: "needs-hours" }
  | {
      status: "ready";
      weeklyHours: number;
      today: string;
      items: CapacityItem[];
      /** Calls in preparation without a date to finish by. */
      undated: Array<{ opportunityId: string; title: string }>;
    };

/**
 * Pro capacity planning: the cushion over every call still in preparation,
 * using the effort left on open steps and the date each must be finished by,
 * plus a start-by date per call when the plan includes start-by planning.
 */
export function capacityReport(input: {
  features: PlanFeatures;
  preferences: Pick<CreatorPlanningPreferences, "weeklyHoursAvailable" | "defaultBufferDays">;
  items: readonly PlanningItem[];
  today: string;
}): CapacityReport {
  if (!input.features.capacityPlanning) return { status: "locked", feature: "capacityPlanning" };
  const weeklyHours = input.preferences.weeklyHoursAvailable;
  if (weeklyHours === null || weeklyHours <= 0) return { status: "needs-hours" };
  const dated: Array<PlanningItem & { finishOn: string }> = [];
  const undated: Array<{ opportunityId: string; title: string }> = [];
  for (const item of input.items) {
    if (!PRE_SUBMISSION_STATUSES.has(item.status)) continue;
    const finishOn = finishDate(item);
    if (!finishOn || finishOn < input.today) {
      if (!finishOn) undated.push({ opportunityId: item.opportunityId, title: item.title });
      continue;
    }
    dated.push({ ...item, finishOn });
  }
  const byId = new Map(dated.map((item) => [item.trackedOpportunityId, item]));
  const results = cushion(
    dated.map((item) => ({ id: item.trackedOpportunityId, title: item.title, finishOn: item.finishOn, effortHours: item.remainingEffortHours })),
    weeklyHours,
    input.today,
  );
  const items = results.map((result): CapacityItem => {
    const item = byId.get(result.id)!;
    return {
      ...result,
      opportunityId: item.opportunityId,
      trackedOpportunityId: item.trackedOpportunityId,
      finishBasis: item.personalTargetOn ? "personal-target" : "deadline",
      remainingEffortHours: item.remainingEffortHours,
      ...(input.features.startByPlanning && item.remainingEffortHours > 0
        ? {
            startBy: startBy({
              effortHours: item.remainingEffortHours,
              weeklyHours,
              finishOn: item.finishOn,
              bufferDays: input.preferences.defaultBufferDays,
              today: input.today,
            }),
          }
        : {}),
    };
  });
  return { status: "ready", weeklyHours, today: input.today, items, undated };
}
