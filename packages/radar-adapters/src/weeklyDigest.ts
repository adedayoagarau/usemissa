import type { Pool } from "pg";
import { orderByCreatorFit } from "@missa/radar-engine";
import {
  assessCreatorFit,
  hasDeclaredPractice,
  loadCreatorFitProfile,
  recordDigestWorthSending,
  type CreatorFitRanking,
} from "./sorting/creatorFit.js";

export type WeeklyDigestItem = {
  opportunityId: string;
  title: string;
  organizationName: string;
  deadline: string | null;
  /** Plain-language reason the item is here, shown beside it in the email. */
  reason: string;
  /** Opportunity type, e.g. "residency"; the email turns it into a label line. */
  type: string;
  feeStatus: string;
  feeCents: number | null;
  feeCurrency: string | null;
  prize: string | null;
};

/** One dated step across the creator's saved applications. */
export type WeeklyDigestPlanItem = {
  kind: "deadline" | "obligation";
  /** Obligation id, or the opportunity id for a deadline. */
  id: string;
  opportunityId: string;
  /** The call's title. */
  title: string;
  /** What is due: "Application deadline" or the obligation's own label. */
  label: string;
  /** YYYY-MM-DD. */
  dueOn: string;
};

/** The planning view behind "This week's three", triage counts and crunch weeks. */
export type WeeklyDigestPlanning = {
  /** Open obligations and deadlines from today on, soonest first. */
  upcoming: WeeklyDigestPlanItem[];
  /** Every saved application still being prepared, with its exact deadline or null. */
  applications: Array<{ opportunityId: string; title: string; deadline: string | null }>;
};

export type WeeklyDigest = {
  /** The creator's given name when their profile has one. */
  recipientName?: string | null;
  newForYou: WeeklyDigestItem[];
  closingSoon: WeeklyDigestItem[];
  yourDeadlines: WeeklyDigestItem[];
  /** Present when the creator has saved applications still being prepared. */
  planning?: WeeklyDigestPlanning;
};

export type WeeklyDigestRecipient = {
  accountId: string;
  email: string;
  /** ISO week in the recipient's timezone, e.g. 2026-W40; one digest per week. */
  isoWeek: string;
  idempotencyKey: string;
};

export const weeklyDigestKey = (accountId: string, isoWeek: string) => `weekly-digest:${accountId}:${isoWeek}`;

const PRE_SUBMISSION = "'interested','saved','preparing','draft-started','ready-to-submit'";
/** Opportunity statuses that accept submissions, as a SQL list. */
export const OPEN_STATUS_SQL = "'open','closing-soon','deadline-extended'";
const OPEN = OPEN_STATUS_SQL;

/**
 * Accounts due a weekly digest now: weekly cadence and email on, it is Sunday
 * 18:00 or later in their timezone (UTC when unset or unknown), and no digest
 * for this ISO week exists in the mail ledger other than a failed one.
 */
export async function weeklyDigestRecipients(pool: Pool, limit = 200): Promise<WeeklyDigestRecipient[]> {
  const timing = await pool.query<{ ready: boolean }>(
    `select count(*) = 1 as ready from information_schema.columns
      where table_schema=current_schema() and table_name='notification_preferences' and column_name='timezone'`,
  );
  const timezone = timing.rows[0]?.ready
    ? "case when exists (select 1 from pg_timezone_names z where z.name=p.timezone) then p.timezone else 'UTC' end"
    : "'UTC'";
  const result = await pool.query<{ account_id: string; email: string; iso_week: string }>(
    `with local as (
       select p.account_id, acc.email, now() at time zone ${timezone} as local_now
         from notification_preferences p
         join radar_accounts acc on acc.id=p.account_id
        where p.email_enabled and p.digest_cadence='weekly'
          and coalesce(acc.email,'')<>'' and coalesce((acc.data->>'active')::boolean,true)
     )
     select account_id,email,to_char(local_now,'IYYY-"W"IW') iso_week
       from local
      where extract(isodow from local_now)=7 and extract(hour from local_now)>=18
        and not exists (
          select 1 from platform_message_effects e
           where e.idempotency_key='weekly-digest:'||local.account_id||':'||to_char(local_now,'IYYY-"W"IW')
             and e.status<>'failed'
        )
      order by account_id limit $1`,
    [limit],
  );
  return result.rows.map((row) => ({
    accountId: row.account_id,
    email: row.email,
    isoWeek: row.iso_week,
    idempotencyKey: weeklyDigestKey(row.account_id, row.iso_week),
  }));
}

/**
 * The creator's discipline and genre preferences, expanded to narrower terms
 * (as in browse). Opens a query with `matches(opportunity_id, preference,
 * preferred_label)`; `$1` must be the account id. Shared by the weekly digest
 * and the Season page so both agree on what "matches you" means.
 */
export const PREFERENCE_MATCH_CTE = `with recursive expanded(root_id, term_id, preference) as (
      select term_id, term_id, preference from account_taxonomy_preferences where account_id=$1
      union
      select e.root_id, r.subject_term_id, e.preference
        from taxonomy_term_relations r join expanded e on r.object_term_id=e.term_id
       where r.relation_type='broader'
    ), matches as (
      select a.opportunity_id, e.preference, t.preferred_label
        from expanded e
        join opportunity_taxonomy_terms a on a.term_id=e.term_id and a.certainty<>'rejected'
        join taxonomy_terms t on t.id=e.root_id
    )`;

/** An opportunity matches when an included or preferred term covers it and no excluded term does. */
export function preferenceMatchPredicate(alias = "o"): string {
  if (!/^[a-z][a-z0-9_]*$/i.test(alias)) throw new Error("Invalid SQL alias for preference matching");
  return `exists (select 1 from matches m where m.opportunity_id=${alias}.id and m.preference in ('include','prefer'))
       and not exists (select 1 from matches m where m.opportunity_id=${alias}.id and m.preference='exclude')`;
}

type ItemRow = {
  id: string; title: string; organization_name: string | null; deadline: string | null; reason: string | null;
  type: string; fee_status: string; fee_cents: number | null; fee_currency: string | null; prize: string | null;
};

const FACTS = "o.type,o.fee_status,o.fee_cents,o.fee_currency,o.prize";

const item = (row: ItemRow, fallback: string): WeeklyDigestItem => ({
  opportunityId: row.id,
  title: row.title,
  organizationName: row.organization_name ?? "Organization",
  deadline: row.deadline,
  reason: row.reason ?? fallback,
  type: row.type,
  feeStatus: row.fee_status,
  feeCents: row.fee_cents,
  feeCurrency: row.fee_currency,
  prize: row.prize,
});

export type WeeklyDigestOptions = {
  /**
   * Optional creator-fit ordering (scope creator_fit). Reorders items inside
   * "new for you" and "closing soon" only; which items appear, and every
   * reason, stay rule-based.
   */
  creatorFit?: CreatorFitRanking;
  /** The digest's idempotency key; when set with creatorFit, its worth is recorded in shadow. */
  digestKey?: string;
};

/**
 * Build one account's digest from its own discipline and genre preferences.
 * Preferences cover narrower terms (as in browse), exclusions always win, and
 * opportunities already in the account's Tracker are left out of discovery
 * sections. Matching is deterministic; every item carries its reason.
 */
export async function buildWeeklyDigest(
  pool: Pool,
  accountId: string,
  perSection = 6,
  options: WeeklyDigestOptions = {},
): Promise<WeeklyDigest> {
  const matched = `
    ${PREFERENCE_MATCH_CTE}
    select o.id,o.title,coalesce(org.data->>'name',o.organization_id) organization_name,o.deadline_date::text deadline,${FACTS},
           (select 'Because you chose ' || m.preferred_label from matches m
             where m.opportunity_id=o.id and m.preference in ('include','prefer')
             order by m.preference='prefer' desc, m.preferred_label limit 1) reason
      from opportunities o
      left join radar_organizations org on org.id=o.organization_id
     where o.publication_state='published' and o.status in (${OPEN})
       and ${preferenceMatchPredicate("o")}
       and not exists (select 1 from tracked_opportunities t where t.account_id=$1 and t.opportunity_id=o.id)`;
  const newForYou = await pool.query<ItemRow>(
    `${matched}
       and o.created_at > now()-interval '7 days'
       and (o.deadline_date is null or o.deadline_date >= current_date)
     order by o.created_at desc, o.id limit $2`,
    [accountId, perSection],
  );
  const shown = newForYou.rows.map((row) => row.id);
  const closingSoon = await pool.query<ItemRow>(
    `${matched}
       and o.deadline_kind in ('exact','fixed')
       and o.deadline_date between current_date and current_date+14
       and not (o.id = any($3::text[]))
     order by o.deadline_date, o.id limit $2`,
    [accountId, perSection, shown],
  );
  const yourDeadlines = await pool.query<ItemRow>(
    `select o.id,o.title,coalesce(org.data->>'name',o.organization_id) organization_name,o.deadline_date::text deadline,${FACTS},
            'You saved this' reason
       from tracked_opportunities t
       join opportunities o on o.id=t.opportunity_id
       left join radar_organizations org on org.id=o.organization_id
      where t.account_id=$1 and t.status in (${PRE_SUBMISSION})
        and o.publication_state='published' and o.deadline_kind in ('exact','fixed')
        and o.deadline_date between current_date and current_date+21
      order by o.deadline_date, o.id limit $2`,
    [accountId, perSection],
  );
  const planning = await weeklyDigestPlanning(pool, accountId);
  const profile = await pool
    .query<{ given_name: string | null }>("select nullif(trim(given_name),'') given_name from creator_profiles where account_id=$1", [accountId])
    .catch(() => ({ rows: [] as { given_name: string | null }[] }));
  const digest: WeeklyDigest = {
    recipientName: profile.rows[0]?.given_name ?? null,
    newForYou: newForYou.rows.map((row) => item(row, "Matches your practice")),
    closingSoon: closingSoon.rows.map((row) => item(row, "Matches your practice")),
    yourDeadlines: yourDeadlines.rows.map((row) => item(row, "You saved this")),
    ...(planning ? { planning } : {}),
  };
  return options.creatorFit
    ? orderDigestByCreatorFit(pool, accountId, digest, options.creatorFit, options.digestKey)
    : digest;
}

/**
 * Saved applications still being prepared, with their exact deadlines, and the
 * open obligations and deadlines ahead. Obligations are read only once the
 * obligation ledger exists.
 */
export async function weeklyDigestPlanning(pool: Pool, accountId: string, upcomingLimit = 40): Promise<WeeklyDigestPlanning | undefined> {
  const applications = await pool.query<{ opportunity_id: string; title: string; deadline: string | null }>(
    `select o.id opportunity_id,o.title,
            case when o.deadline_kind in ('exact','fixed') and o.deadline_date >= current_date then o.deadline_date::text end deadline
       from tracked_opportunities t join opportunities o on o.id=t.opportunity_id
      where t.account_id=$1 and t.status in (${PRE_SUBMISSION}) and o.publication_state='published'
        and (o.deadline_date is null or o.deadline_date >= current_date)
      order by o.deadline_date nulls last, o.id limit 200`,
    [accountId],
  );
  if (!applications.rows.length) return undefined;
  const ledger = await pool.query<{ ready: boolean }>("select to_regclass('public.creator_obligations') is not null as ready");
  const obligations = ledger.rows[0]?.ready
    ? (
        await pool.query<{ id: string; opportunity_id: string; title: string; label: string; due_on: string }>(
          `select ob.id::text id,o.id opportunity_id,o.title,ob.label,ob.due_on::text due_on
             from creator_obligations ob
             join tracked_opportunities t on t.id=ob.tracked_opportunity_id
             join opportunities o on o.id=t.opportunity_id
            where ob.account_id=$1 and ob.state='open' and ob.due_on >= current_date
            order by ob.due_on,ob.position,ob.id limit $2`,
          [accountId, upcomingLimit],
        )
      ).rows
    : [];
  const upcoming: WeeklyDigestPlanItem[] = [
    ...obligations.map((row) => ({
      kind: "obligation" as const,
      id: row.id,
      opportunityId: row.opportunity_id,
      title: row.title,
      label: row.label,
      dueOn: row.due_on,
    })),
    ...applications.rows
      .filter((row) => row.deadline)
      .map((row) => ({
        kind: "deadline" as const,
        id: row.opportunity_id,
        opportunityId: row.opportunity_id,
        title: row.title,
        label: "Application deadline",
        dueOn: row.deadline!,
      })),
  ]
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn) || (a.kind === b.kind ? 0 : a.kind === "obligation" ? -1 : 1) || a.id.localeCompare(b.id))
    .slice(0, upcomingLimit);
  return {
    upcoming,
    applications: applications.rows.map((row) => ({ opportunityId: row.opportunity_id, title: row.title, deadline: row.deadline })),
  };
}

type FitFactsRow = {
  id: string; discipline: string | null; genres: string[] | null; location: string | null; country_code: string | null;
};

/** Never throws: any failure returns the digest in its rule-based order. */
async function orderDigestByCreatorFit(
  pool: Pool,
  accountId: string,
  digest: WeeklyDigest,
  ranking: CreatorFitRanking,
  digestKey: string | undefined,
): Promise<WeeklyDigest> {
  try {
    const creator = await loadCreatorFitProfile(pool, accountId);
    if (!hasDeclaredPractice(creator)) return digest;
    if (digestKey) await recordDigestWorthSending(ranking, digestKey, creator, digest);
    const discovery = [...digest.newForYou, ...digest.closingSoon];
    if (!discovery.length) return digest;
    const facts = await pool.query<FitFactsRow>(
      "select id,discipline,genres,location,country_code from opportunities where id = any($1::text[])",
      [discovery.map((entry) => entry.opportunityId)],
    );
    const byId = new Map(facts.rows.map((row) => [row.id, row]));
    const fit = await assessCreatorFit(
      ranking,
      accountId,
      creator,
      discovery.map((entry) => {
        const row = byId.get(entry.opportunityId);
        return {
          opportunityId: entry.opportunityId,
          title: entry.title,
          type: entry.type,
          organizationName: entry.organizationName,
          discipline: row?.discipline,
          genres: row?.genres ?? [],
          location: row?.location,
          countryCode: row?.country_code,
          feeStatus: entry.feeStatus,
          prize: entry.prize,
          deadline: entry.deadline,
        };
      }),
    );
    if (!fit.size) return digest;
    const idOf = (entry: WeeklyDigestItem) => entry.opportunityId;
    return {
      ...digest,
      newForYou: orderByCreatorFit(digest.newForYou, idOf, fit),
      closingSoon: orderByCreatorFit(digest.closingSoon, idOf, fit),
    };
  } catch (error) {
    ranking.onError?.(error);
    return digest;
  }
}

export const weeklyDigestIsEmpty = (digest: WeeklyDigest) =>
  !digest.newForYou.length && !digest.closingSoon.length && !digest.yourDeadlines.length && !digest.planning?.upcoming.length;
