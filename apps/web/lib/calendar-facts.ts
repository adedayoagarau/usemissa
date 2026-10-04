import type { Pool } from "pg";
import {
  listObligations,
  listWatchedForecasts,
  loadDeadlineFacts,
  type CreatorCalendarItem,
} from "@missa/radar-adapters";
import type {
  OpportunityDeadlineFacts,
  OpportunityDeadlineProvenance,
} from "@missa/radar-engine";
import type {
  CalendarForecastInput,
  CalendarObligationInput,
  CalendarStageInput,
  CalendarTierInput,
} from "./calendar-planning";

export type CalendarFactsPayload = {
  stages: CalendarStageInput[];
  tiers: CalendarTierInput[];
  obligations: CalendarObligationInput[];
  forecasts: CalendarForecastInput[];
  /** How sure Missa is of each tracked call's deadline, keyed by opportunity. */
  provenance: Record<string, OpportunityDeadlineProvenance>;
};

export const EMPTY_CALENDAR_FACTS: CalendarFactsPayload = {
  stages: [],
  tiers: [],
  obligations: [],
  forecasts: [],
  provenance: {},
};

const inRange = (date: string, from: string, to: string) =>
  date >= from && date <= to;

/** Stages and tiers for tracked calls that fall within the requested range. */
export function shapeCalendarFacts(
  tracker: readonly Pick<CreatorCalendarItem, "opportunityId" | "title" | "deadline">[],
  facts: ReadonlyMap<string, OpportunityDeadlineFacts>,
  from: string,
  to: string,
): Pick<CalendarFactsPayload, "stages" | "tiers" | "provenance"> {
  const stages: CalendarStageInput[] = [];
  const tiers: CalendarTierInput[] = [];
  const provenance: Record<string, OpportunityDeadlineProvenance> = {};
  for (const item of tracker) {
    const fact = facts.get(item.opportunityId);
    if (!fact) continue;
    provenance[item.opportunityId] = fact.provenance;
    for (const stage of fact.stages)
      if (inRange(stage.dueOn, from, to))
        stages.push({ opportunityId: item.opportunityId, title: item.title, stage });
    for (const tier of fact.tiers)
      if (inRange(tier.closesOn, from, to))
        tiers.push({
          opportunityId: item.opportunityId,
          title: item.title,
          deadline: item.deadline,
          tier,
        });
  }
  return { stages, tiers, provenance };
}

/**
 * Deadline facts for the Calendar range: stages, tier closes, open plan
 * steps and predicted cycles. Each source degrades to empty on its own, so a
 * database without migration 0088 still shows the rest of the calendar.
 */
export async function loadCalendarFacts(
  pool: Pool,
  accountId: string,
  tracker: readonly CreatorCalendarItem[],
  fromDate: Date,
  toDate: Date,
): Promise<CalendarFactsPayload> {
  const from = fromDate.toISOString().slice(0, 10);
  const to = toDate.toISOString().slice(0, 10);
  const [facts, obligations, forecasts] = await Promise.all([
    loadDeadlineFacts(
      pool,
      tracker.map((item) => item.opportunityId),
    ).catch(() => new Map<string, OpportunityDeadlineFacts>()),
    listObligations(pool, accountId, { from, to, states: ["open"] }).catch(
      () => [],
    ),
    listWatchedForecasts(pool, accountId).catch(() => []),
  ]);
  return {
    ...shapeCalendarFacts(tracker, facts, from, to),
    obligations: obligations.map((obligation) => ({
      id: obligation.id,
      opportunityId: obligation.opportunityId,
      opportunityTitle: obligation.opportunityTitle,
      kind: obligation.kind,
      label: obligation.label,
      dueOn: obligation.dueOn,
      state: obligation.state,
      revision: obligation.revision,
    })),
    forecasts: forecasts.map((item) => ({
      opportunityId: item.opportunityId,
      title: item.title,
      deadline: item.deadline,
      relation: item.relation,
      forecast: item.forecast,
    })),
  };
}
