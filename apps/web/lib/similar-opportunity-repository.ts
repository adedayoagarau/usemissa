import {
  CreatorRepositoryBase,
  creatorPoolFor,
  canonicalPublicOpportunityPredicate,
} from "@missa/radar-adapters";
import type {
  SimilarAnchor,
  SimilarCandidate,
  SimilarReason,
} from "./similar-opportunities.ts";

const DECLINED = ["declined"];
const PRE_SUBMISSION = [
  "interested",
  "saved",
  "preparing",
  "draft-started",
  "ready-to-submit",
];

/** Hidden similar calls are remembered per anchor, separately from the main feed. */
export const similarContextKey = (anchorId: string) =>
  JSON.stringify(["similar", anchorId]);

/**
 * Candidate generation for similar open calls. Only published, open calls the
 * creator does not already track or has not hidden for this anchor; scoring
 * and explanations happen in the pure `scoreSimilar`.
 */
export class SimilarOpportunityRepository extends CreatorRepositoryBase {
  constructor() {
    if (!process.env.DATABASE_URL)
      throw new Error("Opportunity storage unavailable");
    super(creatorPoolFor(process.env.DATABASE_URL));
  }

  async anchor(
    accountId: string,
    opportunityId: string,
  ): Promise<{ anchor: SimilarAnchor; reason: SimilarReason } | null> {
    const row = (
      await this.query<SimilarAnchor & { status: string; past: boolean }>(
        `select o.id,o.title,o.type,o.discipline,coalesce(o.genres,'{}') as genres,o.organization_id as "organizationId",o.program_id as "programId",
        o.fee_status as "feeStatus",t.status,coalesce(o.deadline_date < current_date,false) as past
       from tracked_opportunities t join opportunities o on o.id=t.opportunity_id
       where t.account_id=$1 and t.opportunity_id=$2`,
        [accountId, opportunityId],
      )
    ).rows[0];
    if (!row) return null;
    const { status, past, ...anchor } = row;
    const reason: SimilarReason = DECLINED.includes(status)
      ? "declined"
      : PRE_SUBMISSION.includes(status) && past
        ? "missed"
        : "record";
    return { anchor, reason };
  }

  async candidates(
    accountId: string,
    anchor: SimilarAnchor,
  ): Promise<SimilarCandidate[]> {
    return (
      await this.query<SimilarCandidate>(
        `select o.id,o.title,o.type,o.discipline,coalesce(o.genres,'{}') as genres,o.organization_id as "organizationId",
         coalesce(p.name,org.data->>'name','') as "organizationName",o.program_id as "programId",o.fee_status as "feeStatus",
         o.deadline_date::text as deadline,coalesce(o.deadline_kind,'unknown') as "deadlineKind",
         coalesce(shared.score,0)::float as "termScore",coalesce(shared.labels,'{}') as "sharedTerms"
       from opportunities o
       left join radar_organizations org on org.id=o.organization_id
       left join gary_profiles p on p.id=o.organization_id
       left join lateral (
         select sum((case when t."primary" then 2 else 1 end)*(case when t.certainty='confirmed' then 2 else 1 end)*(case when a."primary" then 2 else 1 end)) as score,
                array_agg(tt.preferred_label order by a."primary" desc,t."primary" desc,tt.preferred_label) as labels
         from opportunity_taxonomy_terms t
         join opportunity_taxonomy_terms a on a.opportunity_id=$2 and a.term_id=t.term_id and a.certainty<>'rejected'
         join taxonomy_terms tt on tt.id=t.term_id
         where t.opportunity_id=o.id and t.certainty<>'rejected'
       ) shared on true
       where ${canonicalPublicOpportunityPredicate("o")}
         and o.status in ('open','closing-soon','deadline-extended','opening-soon')
         and (o.deadline_date is null or o.deadline_date>=current_date)
         and o.id<>$2
         and not exists(select 1 from tracked_opportunities x where x.account_id=$1 and x.opportunity_id=o.id)
         and not exists(select 1 from creator_recommendation_feedback f where f.account_id=$1 and f.opportunity_id=o.id and f.hidden and f.context_key=$3)
         and (shared.score is not null or coalesce(o.genres,'{}') && $4::text[] or ($5::text is not null and o.program_id=$5))
       order by coalesce(shared.score,0) desc,o.deadline_date nulls last,o.id
       limit 80`,
        [
          accountId,
          anchor.id,
          similarContextKey(anchor.id),
          anchor.genres,
          anchor.programId,
        ],
      )
    ).rows;
  }

  async hide(
    accountId: string,
    anchorId: string,
    opportunityId: string,
  ): Promise<void> {
    await this.query(
      `insert into creator_recommendation_feedback(account_id,opportunity_id,context_key,hidden,reason)
       values($1,$2,$3,true,'not-relevant')
       on conflict(account_id,opportunity_id,context_key) do update set hidden=true,revision=creator_recommendation_feedback.revision+1,updated_at=now()`,
      [accountId, opportunityId, similarContextKey(anchorId)],
    );
  }
}
