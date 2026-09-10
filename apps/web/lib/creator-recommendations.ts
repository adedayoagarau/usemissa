import {
  CreatorRepositoryBase,
  CreatorConflictError,
  creatorPoolFor,
  canonicalPublicOpportunityPredicate,
  type CreatorCommandEnvelope,
} from "@missa/radar-adapters";
import { goalOpportunityScope } from "./goal-scope.ts";

export type RecommendationContext = {
  goalId?: string;
  workId?: string;
  mode?: "now" | "plan";
  page?: number;
  dismissed?: boolean;
};
export type MatchPreferences = {
  locations?: string[];
  noFeeOnly?: boolean;
  feeBudget?: { cents: number; currency: string };
  attendFrom?: string;
  attendUntil?: string;
};
export type RecommendationReason = {
  label: string;
  kind:
    | "goal"
    | "discipline"
    | "type"
    | "work"
    | "following"
    | "fee"
    | "location"
    | "availability";
};
export type RecommendationMatch = {
  id: string;
  title: string;
  type: string;
  reasons: RecommendationReason[];
  checks: string[];
  feedbackRevision: number;
};
export type ProgramMatch = {
  id: string;
  name: string;
  organizationName: string;
  openCalls: number;
};
export class RecommendationValidationError extends Error {}
type GoalRow = {
  id: string;
  title: string;
  discipline: string | null;
  opportunity_types: string[];
  work_id: string | null;
  match_preferences: MatchPreferences;
  ends_on: string;
  state: string;
  recommendations: boolean;
};
type Preferences = {
  types: string[];
  disciplines: string[];
  genres: string[];
  locations: string[];
  no_fee_only: boolean;
  max_fee_cents: number | null;
  simultaneous_required: boolean;
  deadline_within_days: number | null;
};

export class CreatorRecommendationRepository extends CreatorRepositoryBase {
  constructor() {
    if (!process.env.DATABASE_URL)
      throw new Error("Recommendation storage unavailable");
    super(creatorPoolFor(process.env.DATABASE_URL));
  }
  async choices(accountId: string) {
    const [goals, works] = await Promise.all([
      this.query<{ id: string; title: string; workId: string | null }>(
        `select id,title,work_id as "workId" from creator_goals where account_id=$1 and state='active' and recommendations and ends_on >= (now() at time zone timezone)::date order by created_at desc`,
        [accountId],
      ),
      this.query<{ id: string; title: string }>(
        "select id,title from creator_library_works where account_id=$1 order by title,id",
        [accountId],
      ),
    ]);
    return { goals: goals.rows, works: works.rows };
  }
  async scope(accountId: string, input: RecommendationContext) {
    let goal: GoalRow | undefined;
    if (input.goalId) {
      goal = (
        await this.query<GoalRow>(
          "select *,ends_on::text as ends_on from creator_goals where id=$1 and account_id=$2",
          [input.goalId, accountId],
        )
      ).rows[0];
      if (!goal)
        throw new RecommendationValidationError("This goal is unavailable.");
    }
    const workId = goal?.work_id ?? input.workId;
    let work:
      | {
          id: string;
          title: string;
          metadata: { taxonomyAssignments?: { termId: string }[] };
        }
      | undefined;
    if (workId) {
      work = (
        await this.query<typeof work & object>(
          "select id,title,metadata from creator_library_works where id=$1 and account_id=$2",
          [workId, accountId],
        )
      ).rows[0];
      if (!work)
        throw new RecommendationValidationError(
          "Choose a work from your Library.",
        );
    }
    // A serialized tuple keeps arbitrary owned IDs from colliding with another context.
    return {
      goal,
      work,
      key: JSON.stringify([input.goalId ?? null, workId ?? null]),
    };
  }
  async feed(accountId: string, input: RecommendationContext = {}) {
    const { goal, work, key } = await this.scope(accountId, input);
    const prefs = (
      await this.query<Preferences>(
        "select * from opportunity_preferences where account_id=$1",
        [accountId],
      )
    ).rows[0];
    const notes: string[] = [];
    if (goal && (goal.state !== "active" || !goal.recommendations))
      return {
        items: [] as RecommendationMatch[],
        programs: [] as ProgramMatch[],
        total: 0,
        contextKey: key,
        notes: ["Recommendations are paused for this goal."],
      };
    const specific = goal?.match_preferences ?? {};
    const types = goal?.opportunity_types.length
      ? goal.opportunity_types
      : (prefs?.types ?? []);
    const disciplines = goal?.discipline
      ? [goal.discipline]
      : [...new Set([...(prefs?.disciplines ?? []), ...(prefs?.genres ?? [])])];
    const locations = specific.locations?.length
      ? specific.locations
      : (prefs?.locations ?? []);
    const noFee =
      specific.noFeeOnly ??
      (specific.feeBudget ? false : (prefs?.no_fee_only ?? false));
    const workIds =
      work?.metadata.taxonomyAssignments?.map((t) => t.termId) ?? [];
    const workTerms = workIds.length
      ? (
          await this.query<{ id: string; facet_id: string }>(
            `select id,facet_id from taxonomy_terms where id=any($1::text[]) and facet_id in ('taxfacet_discipline','taxfacet_practice-family','taxfacet_genre','taxfacet_subgenre','taxfacet_form','taxfacet_medium') and status='active'`,
            [workIds],
          )
        ).rows
      : [];
    const workNarrow = workTerms.filter((t) =>
      ["taxfacet_genre", "taxfacet_subgenre", "taxfacet_form"].includes(
        t.facet_id,
      ),
    );
    const selectedTerms = (workNarrow.length ? workNarrow : workTerms).map(
      (t) => t.id,
    );
    if (work && !selectedTerms.length)
      notes.push(
        `Add a discipline or genre to “${work.title}” in Library to match its subject. Other preferences still apply.`,
      );
    if (specific.attendFrom || specific.attendUntil)
      notes.push(
        "Attendance dates need checking on each program’s website. Your application deadline is separate.",
      );
    const values: unknown[] = [];
    const bind = (value: unknown) => `$${values.push(value)}`;
    const owner = bind(accountId),
      context = bind(key),
      typeParam = bind(types),
      disciplineParam = bind(disciplines),
      locationsParam = bind(locations.map((v) => v.toLowerCase()));
    // Goal relevance must honor the same explicit budget, location and project
    // constraints when a user is browsing the general feed.
    const goalWorkFit = `(g.work_id is null or not exists(select 1 from creator_library_works w cross join lateral jsonb_array_elements(coalesce(w.metadata->'taxonomyAssignments','[]'::jsonb)) a join taxonomy_terms t on t.id=a->>'termId' where w.id=g.work_id and w.account_id=${owner} and t.status='active' and t.facet_id in ('taxfacet_discipline','taxfacet_practice-family','taxfacet_genre','taxfacet_subgenre','taxfacet_form','taxfacet_medium')) or exists(
      with recursive tags as (select t.id,t.facet_id from creator_library_works w cross join lateral jsonb_array_elements(coalesce(w.metadata->'taxonomyAssignments','[]'::jsonb)) a join taxonomy_terms t on t.id=a->>'termId' where w.id=g.work_id and w.account_id=${owner} and t.status='active' and t.facet_id in ('taxfacet_discipline','taxfacet_practice-family','taxfacet_genre','taxfacet_subgenre','taxfacet_form','taxfacet_medium')),
      expanded(term_id) as (select id from tags where facet_id in ('taxfacet_genre','taxfacet_subgenre','taxfacet_form') or not exists(select 1 from tags where facet_id in ('taxfacet_genre','taxfacet_subgenre','taxfacet_form')) union select r.subject_term_id from taxonomy_term_relations r join expanded x on r.object_term_id=x.term_id where r.relation_type='broader')
      select 1 from expanded x join opportunity_taxonomy_terms ot on ot.term_id=x.term_id where ot.opportunity_id=o.id and ot.certainty<>'rejected'))`;
    const goalConstraints = `(coalesce(g.match_preferences->>'noFeeOnly','false')<>'true' or o.fee_status='no-fee')
      and (g.match_preferences->'feeBudget' is null or o.fee_status='no-fee' or (o.fee_status='paid' and o.fee_currency=g.match_preferences->'feeBudget'->>'currency' and o.fee_cents<=(g.match_preferences->'feeBudget'->>'cents')::int))
      and (coalesce(jsonb_array_length(g.match_preferences->'locations'),0)=0 or lower(o.location) in ('global','worldwide','international','online','remote') or exists(select 1 from jsonb_array_elements_text(g.match_preferences->'locations') loc where lower(loc)=lower(o.country_code) or lower(loc)=lower(o.country) or lower(loc)=lower(o.location))) and ${goalWorkFit}`;
    const goalFit = `exists(select 1 from creator_goals g where g.account_id=${owner} and g.state='active' and g.recommendations and g.ends_on >= (now() at time zone g.timezone)::date and ${goalOpportunityScope()} and ${goalConstraints} and (o.deadline_date is null or o.deadline_date<=g.ends_on))`;
    const profileFit = `((cardinality(${typeParam}::text[])=0 or o.type=any(${typeParam}::text[])) and (cardinality(${disciplineParam}::text[])=0 or o.discipline=any(${disciplineParam}::text[]) or o.genres && ${disciplineParam}::text[]))`;
    const where = [canonicalPublicOpportunityPredicate("o")];
    if (goal) {
      where.push(profileFit);
      const goalId = bind(goal.id);
      where.push(
        `exists(select 1 from creator_goals g where g.id=${goalId} and g.account_id=${owner} and ${goalOpportunityScope()})`,
      );
      where.push(
        `(o.deadline_date is null or o.deadline_date<=${bind(goal.ends_on)}::date)`,
      );
    } else if (!types.length && !disciplines.length)
      where.push(
        `(${goalFit} or not exists(select 1 from creator_goals g where g.account_id=${owner} and g.state='active' and g.recommendations and g.ends_on >= (now() at time zone g.timezone)::date)) and ${profileFit}`,
      );
    else where.push(`(${profileFit} or ${goalFit})`);
    // Explicit fee/location/access constraints are not relaxed by a high relevance score.
    where.push(
      `(cardinality(${locationsParam}::text[])=0 or lower(o.country_code)=any(${locationsParam}::text[]) or lower(o.country)=any(${locationsParam}::text[]) or lower(o.location)=any(${locationsParam}::text[]) or lower(o.location) in ('global','worldwide','international','online','remote'))`,
    );
    if (noFee) where.push("o.fee_status='no-fee'");
    if (specific.feeBudget) {
      const budget = bind(specific.feeBudget.cents),
        currency = bind(specific.feeBudget.currency);
      where.push(
        `(o.fee_status='no-fee' or (o.fee_status='paid' and o.fee_currency=${currency} and o.fee_cents<=${budget}::int))`,
      );
    } else if (
      prefs?.max_fee_cents !== null &&
      prefs?.max_fee_cents !== undefined &&
      !noFee
    ) {
      where.push("o.fee_status='no-fee'");
      notes.push(
        "Your saved fee limit has no currency. Showing fee-free calls; add a currency and budget to a goal to include paid calls.",
      );
    }
    if (prefs?.simultaneous_required) where.push("o.simultaneous_allowed=true");
    if (prefs?.deadline_within_days && input.mode !== "plan")
      where.push(
        `o.deadline_date between current_date and current_date+${bind(prefs.deadline_within_days)}::int`,
      );
    const expansion = (seed: string) =>
      `with recursive expanded(term_id) as (${seed} union select r.subject_term_id from taxonomy_term_relations r join expanded x on r.object_term_id=x.term_id where r.relation_type='broader') select 1 from expanded x join opportunity_taxonomy_terms ot on ot.term_id=x.term_id where ot.opportunity_id=o.id and ot.certainty<>'rejected'`;
    where.push(
      `not exists(${expansion(`select term_id from account_taxonomy_preferences where account_id=${owner} and preference='exclude'`)})`,
    );
    if (selectedTerms.length)
      where.push(
        `exists(${expansion(`select unnest(${bind(selectedTerms)}::text[])`)})`,
      );
    const hidden = `exists(select 1 from creator_recommendation_feedback f where f.account_id=${owner} and f.opportunity_id=o.id and f.context_key=${context} and f.hidden)`;
    where.push(input.dismissed ? hidden : `not ${hidden}`);
    if (!input.dismissed)
      where.push(
        `not exists(select 1 from tracked_opportunities t where t.account_id=${owner} and t.opportunity_id=o.id)`,
      );
    const following = `exists(select 1 from organization_follows f where f.account_id=${owner} and f.organization_id=o.organization_id) or exists(select 1 from creator_program_follows f where f.account_id=${owner} and f.program_id=o.program_id)`;
    const page = Math.max(0, Math.min(500, Math.floor(input.page ?? 0))),
      offset = bind(page * 24);
    if (input.mode === "plan") {
      where.push(
        "o.status in ('open','closing-soon','deadline-extended','opening-soon','closed')",
      );
      const rows = (
        await this.query<ProgramMatch & { total: number }>(
          `select p.id,p.name,coalesce(r.data->>'name',e.name) as "organizationName",count(*) filter(where o.status in ('open','closing-soon','deadline-extended') and (o.deadline_date is null or o.deadline_date>=current_date))::int as "openCalls",count(*) over()::int as total from opportunities o join programs p on p.id=o.program_id join entities e on e.id=p.entity_id left join radar_organizations r on r.id=e.organization_id where ${where.join(" and ")} group by p.id,p.name,r.data,e.name order by bool_or(${goalFit}) desc,p.name,p.id limit 24 offset ${offset}`,
          values,
        )
      ).rows;
      return {
        items: [] as RecommendationMatch[],
        programs: rows.map(({ total: _total, ...r }) => r),
        total: rows[0]?.total ?? 0,
        contextKey: key,
        notes,
      };
    }
    if (!input.dismissed)
      where.push(
        "o.status in ('open','closing-soon','deadline-extended') and (o.open_date is null or o.open_date<=current_date) and (o.deadline_date is null or o.deadline_date>=current_date)",
      );
    const rows = (
      await this.query<{
        id: string;
        title: string;
        type: string;
        discipline: string | null;
        genres: string[];
        fee_status: string;
        deadline_kind: string;
        location: string | null;
        goal_fit: boolean;
        following: boolean;
        feedback_revision: number;
        total: number;
      }>(
        `select o.id,o.title,o.type,o.discipline,o.genres,o.fee_status,o.deadline_kind,o.location,${goalFit} as goal_fit,(${following}) as following,coalesce((select f.revision from creator_recommendation_feedback f where f.account_id=${owner} and f.opportunity_id=o.id and f.context_key=${context}),0) as feedback_revision,count(*) over()::int as total from opportunities o where ${where.join(" and ")} order by ${goalFit} desc,(${following}) desc,o.deadline_date asc nulls last,o.id limit 24 offset ${offset}`,
        values,
      )
    ).rows;
    return {
      items: rows.map((row) => {
        const reasons: RecommendationReason[] = [],
          checks: string[] = [];
        if (goal) reasons.push({ kind: "goal", label: `For “${goal.title}”` });
        else if (row.goal_fit)
          reasons.push({ kind: "goal", label: "Matches an active goal" });
        if (
          disciplines.some(
            (d) => d === row.discipline || row.genres.includes(d),
          )
        )
          reasons.push({
            kind: "discipline",
            label: `Accepts ${disciplines
              .filter((d) => d === row.discipline || row.genres.includes(d))
              .join(", ")
              .replaceAll("-", " ")}`,
          });
        if (types.includes(row.type))
          reasons.push({
            kind: "type",
            label: `${row.type.replaceAll("-", " ")} applications`,
          });
        if (work && selectedTerms.length) {
          reasons.push({
            kind: "work",
            label: `Related to the tags on “${work.title}”`,
          });
          checks.push(
            "Catalogue tags may be inferred; check the stated disciplines and requirements",
          );
        }
        if (row.following)
          reasons.push({
            kind: "following",
            label: "From an organization or program you follow",
          });
        if (noFee || specific.feeBudget)
          reasons.push({
            kind: "fee",
            label:
              row.fee_status === "no-fee"
                ? "No application fee"
                : "Within your fee budget",
          });
        if (!reasons.length)
          reasons.push({ kind: "availability", label: "Currently open" });
        if (
          row.deadline_kind === "unknown" ||
          row.deadline_kind === "inferred" ||
          row.deadline_kind === "conflicting"
        )
          checks.push("Confirm the deadline");
        if (row.fee_status === "unknown")
          checks.push("Check the application fee");
        return {
          id: row.id,
          title: row.title,
          type: row.type,
          reasons,
          checks,
          feedbackRevision: row.feedback_revision,
        };
      }),
      programs: [] as ProgramMatch[],
      total: rows[0]?.total ?? 0,
      contextKey: key,
      notes,
    };
  }
  async feedback(
    envelope: CreatorCommandEnvelope,
    input: RecommendationContext & {
      opportunityId: string;
      reason: string;
      hidden: boolean;
      revision: number;
    },
  ) {
    const { key } = await this.scope(envelope.accountId, input);
    return this.executeOwnerCommand(envelope, async (client) => {
      if (
        !(
          await client.query(
            `select id from opportunities where id=$1 and publication_state='published'`,
            [input.opportunityId],
          )
        ).rowCount
      )
        throw new RecommendationValidationError(
          "This opportunity is unavailable.",
        );
      const row = (
        await client.query<{ revision: number }>(
          `insert into creator_recommendation_feedback(account_id,opportunity_id,context_key,hidden,reason) select $1,$2,$3,$4,$5 where $6::int=0 or exists(select 1 from creator_recommendation_feedback f where f.account_id=$1 and f.opportunity_id=$2 and f.context_key=$3) on conflict(account_id,opportunity_id,context_key) do update set hidden=excluded.hidden,reason=excluded.reason,revision=creator_recommendation_feedback.revision+1,updated_at=now() where creator_recommendation_feedback.revision=$6 returning revision`,
          [
            envelope.accountId,
            input.opportunityId,
            key,
            input.hidden,
            input.reason,
            input.revision,
          ],
        )
      ).rows[0];
      if (!row)
        throw new CreatorConflictError(
          "recommendation",
          input.opportunityId,
          envelope.expectedRevision,
          0,
        );
      return {
        resourceType: "recommendation-feedback",
        resourceId: input.opportunityId,
        revision: row.revision,
      };
    });
  }
}
