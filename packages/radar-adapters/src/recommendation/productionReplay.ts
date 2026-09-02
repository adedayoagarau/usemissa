import { Pool } from "pg";
import {
  DEFAULT_RECOMMENDATION_POLICY_CONFIG,
  evaluateCandidate,
  PRE_PRODUCTION_PRODUCTION_CATALOGUE_REPLAY_STATE,
  replayScenario,
  type OpportunityEvidence,
  type RecommendationContext,
  type RecommendationSignal,
} from "@missa/radar-engine";

const PUBLIC_STATUSES = ["opening-soon", "open", "closing-soon", "deadline-extended"];
const OBSERVED_AT = new Date().toISOString();

interface ProductionOpportunityRow {
  id: string;
  version_id: string;
  title: string;
  status: string;
  publication_state: OpportunityEvidence["publicationState"];
  type: string;
  location: string | null;
  deadline_kind: string;
  deadline_date: string | null;
  deadline_timezone: string | null;
  fee_status: "no-fee" | "paid" | "unknown";
  fee_cents: number | null;
  fee_currency: string | null;
  source_id: string;
  source_url: string;
  source_authority: string;
  source_observed_at: string | Date | null;
  organization_id: string | null;
  organization_name: string | null;
  taxonomy: Array<{ termId: string; certainty: "confirmed" | "probable" | "inferred" | "rejected" }>;
  rules: Array<{ key: string; value?: string; description: string; certainty: string }>;
}

function signal<T>(input: Omit<RecommendationSignal<T>, "confidence"> & { confidence: number }): RecommendationSignal<T> {
  return input;
}

function lifecycle(status: string): OpportunityEvidence["lifecycle"] {
  if (status === "opening-soon" || status === "open" || status === "closing-soon" || status === "deadline-extended") return status;
  return "unknown";
}

function geography(location: string | null): OpportunityEvidence["geography"]["value"] {
  if (!location?.trim()) return { mode: "unknown" };
  const normalized = location.toLocaleLowerCase();
  if (normalized.includes("remote") || normalized.includes("online")) return { mode: "remote", regions: [location] };
  if (normalized.includes("hybrid")) return { mode: "hybrid", regions: [location] };
  if (normalized.includes("travel")) return { mode: "travel-required", regions: [location] };
  return { mode: "unknown", regions: [location] };
}

function toEvidence(row: ProductionOpportunityRow): OpportunityEvidence {
  const observedAt = row.source_observed_at ? new Date(row.source_observed_at).toISOString() : OBSERVED_AT;
  return {
    opportunityId: row.id,
    versionId: row.version_id,
    title: row.title,
    publicationState: row.publication_state,
    lifecycle: lifecycle(row.status),
    type: row.type,
    taxonomy: signal({
      key: "opportunity.taxonomy",
      value: row.taxonomy,
      source: "production.opportunity_taxonomy_terms",
      sourceRef: row.source_url,
      observedAt,
      confidence: row.taxonomy.length ? 0.75 : 0,
      explicit: false,
      missing: row.taxonomy.length ? undefined : "source-omitted",
    }),
    eligibilityRules: row.rules.map((rule) => signal({
      key: `opportunity.eligibility.${rule.key}`,
      value: { key: rule.key, value: rule.value, description: rule.description },
      source: "production.opportunity_eligibility_rules",
      sourceRef: row.source_url,
      observedAt,
      confidence: rule.certainty === "confirmed" ? 1 : rule.certainty === "inferred" ? 0.5 : 0,
      explicit: false,
      missing: rule.certainty === "unknown" ? "source-omitted" : undefined,
    })),
    geography: signal({
      key: "opportunity.geography",
      value: geography(row.location),
      source: "production.opportunities.location",
      sourceRef: row.source_url,
      observedAt,
      confidence: row.location ? 0.5 : 0,
      explicit: false,
      missing: row.location ? "not-modeled" : "source-omitted",
    }),
    fee: signal({
      key: "opportunity.fee",
      value: { status: row.fee_status, amountMinor: row.fee_cents ?? undefined, currency: row.fee_currency ?? undefined },
      source: "production.opportunities.fee",
      sourceRef: row.source_url,
      observedAt,
      confidence: row.fee_status === "unknown" ? 0 : 0.75,
      explicit: false,
      missing: row.fee_status === "unknown" ? "source-omitted" : undefined,
    }),
    accessibility: signal({ key: "opportunity.accessibility", source: "production.policy-not-modeled", sourceRef: row.source_url, observedAt, confidence: 0, explicit: false, missing: "not-modeled" }),
    preparation: signal({ key: "opportunity.preparation", source: "production.policy-not-modeled", sourceRef: row.source_url, observedAt, confidence: 0, explicit: false, missing: "not-modeled" }),
    deadline: signal({
      key: "opportunity.deadline",
      value: { kind: row.deadline_kind, date: row.deadline_date ?? undefined, timeZone: row.deadline_timezone ?? undefined },
      source: "production.opportunities.deadline",
      sourceRef: row.source_url,
      observedAt,
      confidence: row.deadline_date ? 0.75 : 0,
      explicit: false,
      missing: row.deadline_date ? undefined : "source-omitted",
    }),
    source: signal({
      key: "opportunity.source",
      value: { sourceId: row.source_id, url: row.source_url, authority: row.source_authority },
      source: "production.opportunity_sources",
      sourceRef: row.source_url,
      observedAt,
      confidence: 0.75,
      explicit: false,
    }),
    safety: signal({ key: "opportunity.safety", value: { state: "unknown" }, source: "production.safety-authority-not-found", observedAt, confidence: 0, explicit: false, missing: "not-modeled" }),
    organization: row.organization_id
      ? signal({ key: "opportunity.organization", value: { organizationId: row.organization_id, name: row.organization_name ?? row.organization_id }, source: "production.opportunities.organization_id", sourceRef: row.source_url, observedAt, confidence: 0.75, explicit: false })
      : undefined,
  };
}

async function readProductionEvidence(pool: Pool): Promise<OpportunityEvidence[]> {
  const result = await pool.query<ProductionOpportunityRow>(
    `
      select
        o.id,
        coalesce(latest_version.id, o.id || ':current') as version_id,
        o.title,
        o.status,
        o.publication_state,
        o.type,
        o.location,
        o.deadline_kind,
        o.deadline_date::text as deadline_date,
        o.deadline_timezone,
        o.fee_status,
        o.fee_cents,
        o.fee_currency,
        source.id as source_id,
        source.url as source_url,
        source.authority_kind as source_authority,
        coalesce(evidence.checked_at, o.source_checked_at) as source_observed_at,
        o.organization_id,
        coalesce(org.data->>'name', o.organization_id) as organization_name,
        coalesce(taxonomy.taxonomy, '[]'::jsonb) as taxonomy,
        coalesce(rules.rules, '[]'::jsonb) as rules
      from opportunities o
      join opportunity_sources source on source.id = o.source_id
      left join radar_organizations org on org.id = o.organization_id
      left join lateral (
        select v.id
        from opportunity_versions v
        where v.opportunity_id = o.id
        order by v.created_at desc
        limit 1
      ) latest_version on true
      left join lateral (
        select e.checked_at
        from opportunity_source_evidence e
        where e.opportunity_id = o.id
        order by e.checked_at desc
        limit 1
      ) evidence on true
      left join lateral (
        select jsonb_agg(jsonb_build_object('termId', t.term_id, 'certainty', t.certainty) order by t.primary desc, t.term_id) as taxonomy
        from opportunity_taxonomy_terms t
        where t.opportunity_id = o.id and t.certainty <> 'rejected'
      ) taxonomy on true
      left join lateral (
        select jsonb_agg(jsonb_build_object('key', r.rule_key, 'value', r.value, 'description', r.description, 'certainty', r.certainty) order by r.sort_order, r.id) as rules
        from opportunity_eligibility_rules r
        where r.opportunity_id = o.id
      ) rules on true
      where o.publication_state = 'published' and o.status = any($1::text[])
      order by case when exists (
        select 1 from opportunity_source_evidence verified
        where verified.opportunity_id = o.id and verified.verified_until > now()
      ) then 0 else 1 end, o.deadline_date asc nulls last, o.processing_succeeded_at desc nulls last, o.id asc
    `,
    [PUBLIC_STATUSES],
  );
  return result.rows.map(toEvidence);
}

function creatorSignal<T>(key: string, value: T, explicit = true): RecommendationSignal<T> {
  return { key, value, source: "pre-production-replay-scenario", observedAt: OBSERVED_AT, confidence: 1, explicit };
}

function contextForScenario(scenario: string): RecommendationContext {
  const common = {
    accountId: `replay:${scenario}`,
    contextVersion: "production-catalogue-replay-v1",
    now: OBSERVED_AT,
    practice: creatorSignal("creator.practice", { include: ["writing.poetry"], prefer: ["writing"], exclude: [] }),
    savedSearches: [], followedOrganizations: [], selectedWorks: [], trackerSignals: [], behaviorSignals: [],
  } satisfies Omit<RecommendationContext, "opportunityPreferences">;
  if (scenario === "interdisciplinary-global") {
    return { ...common, opportunityPreferences: creatorSignal("creator.preferences", { types: ["residency", "fellowship", "open-call"], disciplines: ["interdisciplinary"], genres: [], locations: [], participation: ["remote", "hybrid"], travel: "willing", careerStages: [] }) };
  }
  if (scenario === "established-travel-flexible") {
    return { ...common, opportunityPreferences: creatorSignal("creator.preferences", { types: ["award", "fellowship", "grant", "residency"], disciplines: [], genres: [], locations: [], participation: [], travel: "willing", careerStages: ["established"] }) };
  }
  return { ...common, opportunityPreferences: creatorSignal("creator.preferences", { types: ["magazine", "open-call"], disciplines: ["writing"], genres: ["poetry"], locations: [], participation: ["remote"], noFeeOnly: true, travel: "unwilling", careerStages: ["emerging"] }) };
}

export interface ProductionReplaySummary {
  executionState: "pre-production / replay-only / production-catalogue-verified";
  candidateCount: number;
  scenarios: Array<{
    scenario: string;
    deterministic: boolean;
    eligibility: Record<string, number>;
    eligibleCount: number;
    meanRelevanceScore: number;
    meanScoreConfidence: number;
    missingnessCount: number;
    explanationFaithfulnessFailureCount: number;
    eligibilityViolationCount: number;
    baselineOrderChanged: boolean;
    movedCount: number;
  }>;
}

export async function runProductionCatalogueReplay(connectionString = process.env.DATABASE_URL): Promise<ProductionReplaySummary> {
  if (!connectionString) throw new Error("DATABASE_URL is required for production catalogue replay");
  const pool = new Pool({ connectionString, max: 1 });
  try {
    await pool.query("BEGIN READ ONLY");
    const opportunities = await readProductionEvidence(pool);
    const baselineOrder = opportunities.map((opportunity) => opportunity.opportunityId);
    const scenarios = ["emerging-no-fee", "interdisciplinary-global", "established-travel-flexible"].map((scenario) => {
      const context = contextForScenario(scenario);
      const first = opportunities.map((opportunity) => evaluateCandidate(context, opportunity, DEFAULT_RECOMMENDATION_POLICY_CONFIG));
      const second = opportunities.map((opportunity) => evaluateCandidate(context, opportunity, DEFAULT_RECOMMENDATION_POLICY_CONFIG));
      const report = replayScenario({ fixtureId: `production-catalogue:${scenario}`, context, opportunities, baselineOrder, executionState: PRE_PRODUCTION_PRODUCTION_CATALOGUE_REPLAY_STATE });
      const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
      const eligibility = first.reduce<Record<string, number>>((counts, result) => { counts[result.eligibilityState] = (counts[result.eligibilityState] ?? 0) + 1; return counts; }, {});
      return {
        scenario,
        deterministic: JSON.stringify(first.map((result) => result.opportunityId)) === JSON.stringify(second.map((result) => result.opportunityId)) && report.deterministic,
        eligibility,
        eligibleCount: eligibility.eligible ?? 0,
        meanRelevanceScore: Number(mean(first.map((result) => result.relevanceScore)).toFixed(4)),
        meanScoreConfidence: Number(mean(first.map((result) => result.scoreConfidence)).toFixed(4)),
        missingnessCount: report.missingnessCount,
        explanationFaithfulnessFailureCount: report.explanationFaithfulnessFailures.length,
        eligibilityViolationCount: report.eligibilityViolationCount,
        baselineOrderChanged: report.ordering.changed,
        movedCount: report.ordering.moved.length,
      };
    });
    await pool.query("ROLLBACK");
    return { executionState: "pre-production / replay-only / production-catalogue-verified", candidateCount: opportunities.length, scenarios };
  } finally {
    await pool.end();
  }
}
