import type { Pool } from "pg";

export type WeeklyDigestItem = {
  opportunityId: string;
  title: string;
  organizationName: string;
  deadline: string | null;
  /** Plain-language reason the item is here, shown beside it in the email. */
  reason: string;
};

export type WeeklyDigest = {
  newForYou: WeeklyDigestItem[];
  closingSoon: WeeklyDigestItem[];
  yourDeadlines: WeeklyDigestItem[];
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
const OPEN = "'open','closing-soon','deadline-extended'";

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

type ItemRow = { id: string; title: string; organization_name: string | null; deadline: string | null; reason: string | null };

const item = (row: ItemRow, fallback: string): WeeklyDigestItem => ({
  opportunityId: row.id,
  title: row.title,
  organizationName: row.organization_name ?? "Organization",
  deadline: row.deadline,
  reason: row.reason ?? fallback,
});

/**
 * Build one account's digest from its own discipline and genre preferences.
 * Preferences cover narrower terms (as in browse), exclusions always win, and
 * opportunities already in the account's Tracker are left out of discovery
 * sections. Matching is deterministic; every item carries its reason.
 */
export async function buildWeeklyDigest(pool: Pool, accountId: string, perSection = 6): Promise<WeeklyDigest> {
  const matched = `
    with recursive expanded(root_id, term_id, preference) as (
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
    )
    select o.id,o.title,coalesce(org.data->>'name',o.organization_id) organization_name,o.deadline_date::text deadline,
           (select 'Because you chose ' || m.preferred_label from matches m
             where m.opportunity_id=o.id and m.preference in ('include','prefer')
             order by m.preference='prefer' desc, m.preferred_label limit 1) reason
      from opportunities o
      left join radar_organizations org on org.id=o.organization_id
     where o.publication_state='published' and o.status in (${OPEN})
       and exists (select 1 from matches m where m.opportunity_id=o.id and m.preference in ('include','prefer'))
       and not exists (select 1 from matches m where m.opportunity_id=o.id and m.preference='exclude')
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
    `select o.id,o.title,coalesce(org.data->>'name',o.organization_id) organization_name,o.deadline_date::text deadline,
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
  return {
    newForYou: newForYou.rows.map((row) => item(row, "Matches your practice")),
    closingSoon: closingSoon.rows.map((row) => item(row, "Matches your practice")),
    yourDeadlines: yourDeadlines.rows.map((row) => item(row, "You saved this")),
  };
}

export const weeklyDigestIsEmpty = (digest: WeeklyDigest) =>
  !digest.newForYou.length && !digest.closingSoon.length && !digest.yourDeadlines.length;
