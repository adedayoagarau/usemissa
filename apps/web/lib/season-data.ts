import {
  creatorFeatures,
  creatorPlan,
  creatorPoolFor,
  getPlanningPreferences,
  listObligations,
  listSeasonTrackedCalls,
  listWatchedForecasts,
  loadDeadlineFacts,
} from "@missa/radar-adapters";
import type { OpportunityDeadlineFacts } from "@missa/radar-engine";
import { addDays } from "./deadline-moment";
import { creatorToday } from "./deadline-planning";
import type { SeasonCall, SeasonForecast, SeasonObligation, SeasonTier } from "./season-plan";

export type SeasonData = {
  today: string;
  calls: SeasonCall[];
  obligations: SeasonObligation[];
  tiers: Record<string, SeasonTier[]>;
  forecasts: SeasonForecast[];
  features: { capacityPlanning: boolean; seasonPlan: boolean };
  weeklyHours: number | null;
};

/**
 * Everything the Season page renders on first load, read through the shared
 * read layer. Each part degrades to empty on its own so a missing table or a
 * slow query never blanks the whole page.
 */
export async function loadSeasonData(connectionString: string, accountId: string, now = new Date()): Promise<SeasonData> {
  const pool = creatorPoolFor(connectionString);
  // The creator's own date, so "today" here agrees with the capacity report.
  const today = await creatorToday(accountId, now);
  const [calls, obligations, forecasts, preferences, plan] = await Promise.all([
    listSeasonTrackedCalls(pool, accountId),
    listObligations(pool, accountId, { to: addDays(today, 200), states: ["open"] }).catch(() => []),
    listWatchedForecasts(pool, accountId).catch(() => []),
    getPlanningPreferences(pool, accountId).catch(() => null),
    creatorPlan(pool, accountId).catch(() => "free" as const),
  ]);
  const facts = await loadDeadlineFacts(
    pool,
    calls.map((call) => call.opportunityId),
  ).catch(() => new Map<string, OpportunityDeadlineFacts>());
  const tiers: Record<string, SeasonTier[]> = {};
  for (const [opportunityId, fact] of facts)
    tiers[opportunityId] = fact.tiers.map((tier) => ({
      id: tier.id,
      label: tier.label,
      closesOn: tier.closesOn,
      feeCents: tier.feeCents,
      feeCurrency: tier.feeCurrency,
    }));
  const features = creatorFeatures(plan);
  return {
    today,
    calls: calls.map((call) => ({
      trackedId: call.trackedId,
      opportunityId: call.opportunityId,
      title: call.title,
      organizationName: call.organizationName,
      myStatus: call.myStatus,
      revision: call.revision,
      deadline: call.deadline,
      deadlineKind: call.deadlineKind,
      feeStatus: call.feeStatus,
      feeCents: call.feeCents,
      feeCurrency: call.feeCurrency,
      personalTargetOn: call.personalTargetOn,
    })),
    obligations: obligations.map((obligation) => ({
      id: obligation.id,
      opportunityId: obligation.opportunityId,
      opportunityTitle: obligation.opportunityTitle,
      kind: obligation.kind,
      label: obligation.label,
      dueOn: obligation.dueOn,
      state: obligation.state,
    })),
    tiers,
    forecasts: forecasts.map((item) => ({
      opportunityId: item.opportunityId,
      title: item.title,
      organizationName: item.organizationName,
      deadline: item.deadline,
      relation: item.relation,
      forecast: item.forecast,
    })),
    features: { capacityPlanning: features.capacityPlanning, seasonPlan: features.seasonPlan },
    weeklyHours: preferences?.weeklyHoursAvailable ?? null,
  };
}
