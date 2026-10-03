import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { SMS_REMINDER_PLANS } from "./creatorEntitlements.js";

export type SmsStatus = "queued" | "sent" | "delivered" | "failed" | "suppressed" | "skipped";

/** A failed text is retried until it has been attempted this many times. */
export const SMS_MAX_ATTEMPTS = 3;
/** Kinds that never count towards an account's monthly reminder limit. */
export const SMS_CAP_EXEMPT_KINDS: readonly string[] = ["verification", "admin_test"];
/** platform_settings key for the switch that stops every outgoing text. */
export const SMS_PAUSE_SETTING = "sms.paused";

type Queryable = Pick<Pool, "query">;

async function relationExists(db: Queryable, name: string): Promise<boolean> {
  const result = await db.query<{ present: boolean }>("select to_regclass($1) is not null as present", [`public.${name}`]);
  return Boolean(result.rows[0]?.present);
}

/** True once migration 0087 is applied; every text path checks this first. */
export async function smsLedgerReady(db: Queryable): Promise<boolean> {
  return relationExists(db, "sms_messages");
}

const iso = (value: Date | string | null | undefined) => (value ? new Date(value).toISOString() : undefined);
const sentStatuses = "('queued','sent','delivered')";
const utcDayStart = "(date_trunc('day', now() at time zone 'UTC') at time zone 'UTC')";
const utcMonthStart = "(date_trunc('month', now() at time zone 'UTC') at time zone 'UTC')";

// ---------------------------------------------------------------------------
// Pause switch
// ---------------------------------------------------------------------------

export type SmsPauseState = Readonly<{ paused: boolean; updatedAt?: string; updatedBy?: string }>;

/** Whether a platform admin has paused all texts. Not paused before migration 0087. */
export async function readSmsPause(db: Queryable): Promise<SmsPauseState> {
  if (!(await relationExists(db, "platform_settings"))) return { paused: false };
  const result = await db.query<{ value: { paused?: unknown } | null; updated_at: Date | null; updated_by: string | null }>(
    "select value, updated_at, updated_by from platform_settings where key=$1",
    [SMS_PAUSE_SETTING],
  );
  const row = result.rows[0];
  if (!row) return { paused: false };
  return {
    paused: row.value?.paused === true,
    ...(iso(row.updated_at) ? { updatedAt: iso(row.updated_at) } : {}),
    ...(row.updated_by ? { updatedBy: row.updated_by } : {}),
  };
}

export async function writeSmsPause(db: Queryable, paused: boolean, updatedBy: string): Promise<SmsPauseState> {
  await db.query(
    `insert into platform_settings (key, value, updated_at, updated_by) values ($1, $2::jsonb, now(), $3)
     on conflict (key) do update set value=excluded.value, updated_at=excluded.updated_at, updated_by=excluded.updated_by`,
    [SMS_PAUSE_SETTING, JSON.stringify({ paused }), updatedBy],
  );
  return readSmsPause(db);
}

// ---------------------------------------------------------------------------
// Ledger
// ---------------------------------------------------------------------------

export type SmsReservationInput = Readonly<{
  accountId: string | null;
  idempotencyKey: string;
  kind: string;
  toPhone: string;
  /** Texts per account per calendar month (UTC), for kinds that are not exempt. */
  monthlyLimit: number;
  /** Texts across Missa per UTC day, for every kind. */
  dailyGlobalLimit: number;
}>;

export type SmsReservation =
  | Readonly<{ outcome: "reserved"; id: string; attempt: number }>
  | Readonly<{ outcome: "duplicate"; id: string; status: SmsStatus }>
  | Readonly<{ outcome: "limited"; id: string; reason: string }>;

/**
 * Claims the right to send one text. Under a single ledger lock it replays an
 * earlier send with the same key, re-opens a failed one that has attempts
 * left, and checks the monthly and daily limits before writing a queued row.
 * A text stopped by a limit is written as skipped with the reason, so it is
 * visible to admins and never retried.
 */
export async function reserveSmsMessage(pool: Pool, input: SmsReservationInput): Promise<SmsReservation> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext('sms-ledger'))");
    const existing = await client.query<{ id: string; status: SmsStatus; attempts: number; provider_message_id: string | null }>(
      "select id, status, attempts, provider_message_id from sms_messages where idempotency_key=$1 for update",
      [input.idempotencyKey],
    );
    const row = existing.rows[0];
    // Only a send the provider never accepted is retried: once Telnyx has the
    // message, a carrier failure is final and a resend would be billed again.
    if (row && (row.status !== "failed" || row.attempts >= SMS_MAX_ATTEMPTS || row.provider_message_id)) {
      await client.query("commit");
      return { outcome: "duplicate", id: row.id, status: row.status };
    }
    const reason = await limitReason(client, input);
    const id = row?.id ?? `sms_${randomUUID()}`;
    const status: SmsStatus = reason ? "skipped" : "queued";
    if (row) {
      await client.query(
        `update sms_messages set status=$2, error=$3, to_phone=$4, attempts=attempts+1, provider_message_id=null, updated_at=now()
          where id=$1`,
        [id, status, reason, input.toPhone],
      );
    } else {
      await client.query(
        `insert into sms_messages (id, account_id, idempotency_key, kind, to_phone, status, error)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [id, input.accountId, input.idempotencyKey, input.kind, input.toPhone, status, reason],
      );
    }
    await client.query("commit");
    return reason ? { outcome: "limited", id, reason } : { outcome: "reserved", id, attempt: (row?.attempts ?? 0) + 1 };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function limitReason(client: PoolClient, input: SmsReservationInput): Promise<string | null> {
  const daily = await client.query<{ count: number }>(
    `select count(*)::int as count from sms_messages where created_at >= ${utcDayStart} and status in ${sentStatuses}`,
  );
  if ((daily.rows[0]?.count ?? 0) >= input.dailyGlobalLimit) return "Daily limit for all texts reached";
  if (!input.accountId || SMS_CAP_EXEMPT_KINDS.includes(input.kind)) return null;
  const monthly = await client.query<{ count: number }>(
    `select count(*)::int as count from sms_messages
      where account_id=$1 and created_at >= ${utcMonthStart} and status in ${sentStatuses}
        and not (kind = any($2::text[]))`,
    [input.accountId, SMS_CAP_EXEMPT_KINDS],
  );
  return (monthly.rows[0]?.count ?? 0) >= input.monthlyLimit ? "Monthly text limit for this account reached" : null;
}

export type SmsCompletion = Readonly<{
  status: Extract<SmsStatus, "sent" | "delivered" | "failed">;
  providerMessageId?: string | null;
  error?: string | null;
  costAmount?: number | null;
  costCurrency?: string | null;
}>;

/** Records what the provider said about a reserved text. */
export async function completeSmsMessage(db: Queryable, id: string, completion: SmsCompletion): Promise<void> {
  await db.query(
    `update sms_messages set status=$2, provider_message_id=coalesce($3, provider_message_id), error=$4,
            cost_amount=coalesce($5, cost_amount), cost_currency=coalesce($6, cost_currency), updated_at=now()
      where id=$1`,
    [id, completion.status, completion.providerMessageId ?? null, completion.error ?? null, completion.costAmount ?? null, completion.costCurrency ?? null],
  );
}

/**
 * Writes a text that was never attempted (no sender for the destination), so
 * the reason is visible. Keeps an existing row for the same key untouched.
 */
export async function recordSkippedSms(
  db: Queryable,
  input: Readonly<{ accountId: string | null; idempotencyKey: string; kind: string; toPhone: string; reason: string }>,
): Promise<void> {
  await db.query(
    `insert into sms_messages (id, account_id, idempotency_key, kind, to_phone, status, error)
     values ($1, $2, $3, $4, $5, 'skipped', $6) on conflict (idempotency_key) do nothing`,
    [`sms_${randomUUID()}`, input.accountId, input.idempotencyKey, input.kind, input.toPhone, input.reason],
  );
}

export type SmsDeliveryReport = Readonly<{
  providerMessageId: string;
  status: Extract<SmsStatus, "sent" | "delivered" | "failed">;
  error?: string | null;
  costAmount?: number | null;
  costCurrency?: string | null;
}>;

/**
 * Applies a delivery report from the provider webhook. Reports can arrive out
 * of order, so a late "sent" never overwrites a final delivered or failed
 * status. Returns whether a ledger row matched.
 */
export async function applySmsDeliveryReport(db: Queryable, report: SmsDeliveryReport): Promise<boolean> {
  const result = await db.query(
    `update sms_messages
        set status = case when $2 = 'sent' and status in ('delivered','failed') then status else $2 end,
            error = case when $2 = 'failed' then coalesce($3, error) when $2 = 'delivered' then null else error end,
            cost_amount = coalesce($4, cost_amount), cost_currency = coalesce($5, cost_currency), updated_at = now()
      where provider_message_id = $1`,
    [report.providerMessageId, report.status, report.error ?? null, report.costAmount ?? null, report.costCurrency ?? null],
  );
  return (result.rowCount ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Opt-out sync and account settings
// ---------------------------------------------------------------------------

/** SQL true when the account is on a plan with text reminders; plansParam binds SMS_REMINDER_PLANS. */
const smsPlanSql = (accountColumn: string, plansParam: string) => `exists (
  select 1 from creator_plans cp
   where cp.account_id = ${accountColumn} and cp.plan = any(${plansParam}::text[])
     and (cp.expires_at is null or cp.expires_at > now())
)`;

/** A phone replied STOP: every account using that number stops getting texts. */
export async function optOutSmsPhone(db: Queryable, phone: string): Promise<number> {
  const result = await db.query(
    `update notification_preferences
        set sms_enabled=false, sms_opted_out_at=coalesce(sms_opted_out_at, now()), revision=revision+1, updated_at=now()
      where sms_phone=$1 and (sms_enabled or sms_opted_out_at is null)`,
    [phone],
  );
  return result.rowCount ?? 0;
}

/**
 * A phone replied START. Texts turn back on only for verified accounts still on
 * a plan with text reminders; others just lose the opt-out mark.
 */
export async function optInSmsPhone(db: Queryable, phone: string): Promise<number> {
  const plans = await relationExists(db, "creator_plans");
  const result = await db.query(
    `update notification_preferences p
        set sms_enabled = ${plans ? `(p.sms_phone_verified_at is not null and ${smsPlanSql("p.account_id", "$2")})` : "false"},
            sms_opted_out_at=null, revision=revision+1, updated_at=now()
      where p.sms_phone=$1 and p.sms_opted_out_at is not null`,
    plans ? [phone, SMS_REMINDER_PLANS] : [phone],
  );
  return result.rowCount ?? 0;
}

/** Turns texts on or off for a verified phone; turning on clears an earlier opt-out. */
export async function setSmsEnabled(db: Queryable, accountId: string, enabled: boolean): Promise<boolean> {
  const result = await db.query(
    `update notification_preferences
        set sms_enabled=$2, sms_opted_out_at=case when $2 then null else sms_opted_out_at end,
            revision=revision+1, updated_at=now()
      where account_id=$1 and ($2 = false or (sms_phone is not null and sms_phone_verified_at is not null))`,
    [accountId, enabled],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function removeSmsPhone(db: Queryable, accountId: string): Promise<void> {
  await db.query(
    `update notification_preferences
        set sms_enabled=false, sms_phone=null, sms_phone_verified_at=null, sms_opted_out_at=null,
            revision=revision+1, updated_at=now()
      where account_id=$1`,
    [accountId],
  );
}

// ---------------------------------------------------------------------------
// Phone verification
// ---------------------------------------------------------------------------

/** Codes this account asked for within the window, for the hourly limit. */
export async function recentSmsVerificationCount(db: Queryable, accountId: string, windowMinutes = 60): Promise<number> {
  const result = await db.query<{ count: number }>(
    `select count(*)::int as count from sms_phone_verifications
      where account_id=$1 and created_at > now() - make_interval(mins => $2)`,
    [accountId, windowMinutes],
  );
  return result.rows[0]?.count ?? 0;
}

/** Stores a new code for the account; any earlier unused code stops working. */
export async function createSmsVerification(
  db: Queryable,
  input: Readonly<{ accountId: string; phone: string; codeHash: string; ttlMinutes: number }>,
): Promise<string> {
  const id = `smsv_${randomUUID()}`;
  await db.query(
    `update sms_phone_verifications set expires_at=least(expires_at, now())
      where account_id=$1 and consumed_at is null and expires_at > now()`,
    [input.accountId],
  );
  await db.query(
    `insert into sms_phone_verifications (id, account_id, phone, code_hash, expires_at)
     values ($1, $2, $3, $4, now() + make_interval(mins => $5))`,
    [id, input.accountId, input.phone, input.codeHash, input.ttlMinutes],
  );
  return id;
}

/** Withdraws a code whose text could not be sent; it still counts towards the hourly limit. */
export async function expireSmsVerification(db: Queryable, id: string): Promise<void> {
  await db.query("update sms_phone_verifications set expires_at=least(expires_at, now()) where id=$1", [id]);
}

export type SmsVerificationResult =
  | Readonly<{ outcome: "verified"; phone: string }>
  | Readonly<{ outcome: "invalid"; attemptsLeft: number }>
  | Readonly<{ outcome: "expired" | "locked" | "none" }>;

/**
 * Checks a code against the account's newest unused verification. Every wrong
 * code uses one attempt; after maxAttempts the code is locked. A match stores
 * the phone as verified and turns texts on in the same transaction.
 */
export async function confirmSmsVerification(
  pool: Pool,
  accountId: string,
  matches: (verification: Readonly<{ phone: string; codeHash: string }>) => boolean,
  maxAttempts: number,
): Promise<SmsVerificationResult> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const found = await client.query<{ id: string; phone: string; code_hash: string; attempts: number; expired: boolean }>(
      `select id, phone, code_hash, attempts, expires_at <= now() as expired from sms_phone_verifications
        where account_id=$1 and consumed_at is null order by created_at desc limit 1 for update`,
      [accountId],
    );
    const row = found.rows[0];
    let result: SmsVerificationResult;
    if (!row) result = { outcome: "none" };
    else if (row.expired) result = { outcome: "expired" };
    else if (row.attempts >= maxAttempts) result = { outcome: "locked" };
    else if (matches({ phone: row.phone, codeHash: row.code_hash })) {
      await client.query("update sms_phone_verifications set consumed_at=now(), attempts=attempts+1 where id=$1", [row.id]);
      await client.query(
        `update notification_preferences
            set sms_phone=$2, sms_phone_verified_at=now(), sms_enabled=true, sms_opted_out_at=null,
                revision=revision+1, updated_at=now()
          where account_id=$1`,
        [accountId, row.phone],
      );
      result = { outcome: "verified", phone: row.phone };
    } else {
      await client.query("update sms_phone_verifications set attempts=attempts+1 where id=$1", [row.id]);
      const attemptsLeft = Math.max(0, maxAttempts - row.attempts - 1);
      result = attemptsLeft ? { outcome: "invalid", attemptsLeft } : { outcome: "locked" };
    }
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Admin read models
// ---------------------------------------------------------------------------

export type SmsHealthData = Readonly<{
  available: boolean;
  days: number;
  pause: SmsPauseState;
  /** Accepted by the provider, whatever happened next. */
  sent: number;
  delivered: number;
  failed: number;
  /** Stopped before sending by a limit or a missing sender. */
  skipped: number;
  costs: ReadonlyArray<{ currency: string; amount: number }>;
  /** Verified, switched on and on a plan with text reminders. */
  optedIn: number;
  /** Phones that replied STOP and have not opted back in. */
  optedOut: number;
  recentProblems: ReadonlyArray<{ at: string; kind: string; status: SmsStatus; toPhone: string; error: string | null }>;
}>;

export async function readSmsHealth(db: Queryable, options: { days?: number } = {}): Promise<SmsHealthData> {
  const days = options.days ?? 30;
  const pause = await readSmsPause(db);
  const empty: SmsHealthData = { available: false, days, pause, sent: 0, delivered: 0, failed: 0, skipped: 0, costs: [], optedIn: 0, optedOut: 0, recentProblems: [] };
  if (!(await smsLedgerReady(db))) return empty;
  const plans = await relationExists(db, "creator_plans");
  const since = "now() - make_interval(days => $1)";
  const [totals, costs, people, problems] = await Promise.all([
    db.query<{ sent: number; delivered: number; failed: number; skipped: number }>(
      `select count(*) filter (where provider_message_id is not null)::int as sent,
              count(*) filter (where status='delivered')::int as delivered,
              count(*) filter (where status='failed')::int as failed,
              count(*) filter (where status in ('skipped','suppressed'))::int as skipped
         from sms_messages where created_at > ${since}`,
      [days],
    ),
    db.query<{ currency: string | null; amount: string }>(
      `select cost_currency as currency, sum(cost_amount)::text as amount from sms_messages
        where created_at > ${since} and cost_amount is not null group by cost_currency order by 2 desc`,
      [days],
    ),
    db.query<{ opted_in: number; opted_out: number }>(
      `select count(*) filter (where p.sms_enabled and p.sms_phone_verified_at is not null${plans ? ` and ${smsPlanSql("p.account_id", "$1")}` : " and false"})::int as opted_in,
              count(*) filter (where p.sms_opted_out_at is not null)::int as opted_out
         from notification_preferences p`,
      plans ? [SMS_REMINDER_PLANS] : [],
    ),
    db.query<{ updated_at: Date; kind: string; status: SmsStatus; to_phone: string; error: string | null }>(
      `select updated_at, kind, status, to_phone, error from sms_messages
        where created_at > ${since} and status in ('failed','skipped','suppressed')
        order by updated_at desc limit 10`,
      [days],
    ),
  ]);
  const t = totals.rows[0];
  return {
    available: true,
    days,
    pause,
    sent: t?.sent ?? 0,
    delivered: t?.delivered ?? 0,
    failed: t?.failed ?? 0,
    skipped: t?.skipped ?? 0,
    costs: costs.rows.map((row) => ({ currency: (row.currency ?? "USD").toUpperCase(), amount: Number(row.amount) })),
    optedIn: people.rows[0]?.opted_in ?? 0,
    optedOut: people.rows[0]?.opted_out ?? 0,
    recentProblems: problems.rows.map((row) => ({ at: new Date(row.updated_at).toISOString(), kind: row.kind, status: row.status, toPhone: row.to_phone, error: row.error })),
  };
}

export type SmsAccountStatus = Readonly<{
  phone: string | null;
  verifiedAt?: string;
  enabled: boolean;
  optedOutAt?: string;
  planEligible: boolean;
  /** Texts handed to the provider for this account in the last 30 days. */
  sentLast30Days: number;
}>;

/** The text-reminder state of one account, for the admin user profile. */
export async function readSmsAccountStatus(db: Queryable, accountId: string): Promise<SmsAccountStatus | undefined> {
  if (!(await smsLedgerReady(db))) return undefined;
  const plans = await relationExists(db, "creator_plans");
  const result = await db.query<{ sms_phone: string | null; sms_phone_verified_at: Date | null; sms_enabled: boolean; sms_opted_out_at: Date | null; eligible: boolean; sent: number }>(
    `select p.sms_phone, p.sms_phone_verified_at, p.sms_enabled, p.sms_opted_out_at,
            ${plans ? smsPlanSql("$1", "$2") : "false"} as eligible,
            (select count(*)::int from sms_messages m
              where m.account_id=$1 and m.provider_message_id is not null and m.created_at > now() - interval '30 days') as sent
       from notification_preferences p where p.account_id=$1`,
    plans ? [accountId, SMS_REMINDER_PLANS] : [accountId],
  );
  const row = result.rows[0];
  if (!row) return undefined;
  return {
    phone: row.sms_phone,
    ...(iso(row.sms_phone_verified_at) ? { verifiedAt: iso(row.sms_phone_verified_at) } : {}),
    enabled: row.sms_enabled,
    ...(iso(row.sms_opted_out_at) ? { optedOutAt: iso(row.sms_opted_out_at) } : {}),
    planEligible: row.eligible,
    sentLast30Days: row.sent,
  };
}
