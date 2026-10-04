import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import {
  CreatorRepositoryBase,
  type CreatorCommandEnvelope,
  type CreatorReceipt,
} from "./creatorRepository.js";
import {
  decryptCalendarCredential,
  encryptCalendarCredential,
} from "./calendarCredentialCrypto.js";
import { canonicalPublicOpportunityPredicate } from "./canonicalOpportunityProjection.js";
import { expectedResponse } from "./trackerResponseDates.js";
import { creatorPlan, planIncludes, type CreatorPlan } from "./creatorEntitlements.js";
import { recalculateObligationChainsIn, shiftObligationsWithDeadline } from "./creatorObligationMutations.js";

export type CreatorCalendarTokenState = {
  active: boolean;
  version?: number;
  revision?: number;
  issuedAt?: string;
};
export type CreatorCalendarTokenResult = {
  token: string;
  state: Required<CreatorCalendarTokenState>;
  receipt: CreatorReceipt;
};
export type CreatorCalendarItem = {
  opportunityId: string;
  title: string;
  organizationName?: string;
  myStatus: string;
  oppStatus?: string;
  openDate?: string;
  deadline?: string;
  deadlineKind?: string;
  deadlineTime?: string;
  deadlineTimezone?: string;
  expectedResponseBy?: string;
};
export type CreatorCalendarEvent = {
  opportunityId?: string;
  purpose?: string;
  id: string;
  title: string;
  description?: string;
  location?: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  color: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  syncStatus?: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  syncError?: string;
  syncNextAttemptAt?: string;
  previousDeadline?: string;
  deadlineChangedAt?: string;
  deadlineReconciliationStatus?: "current" | "needs-review" | "dismissed";
};
export class CreatorCalendarError extends Error {}
export type CalendarProvider = "google" | "microsoft";
export type CalendarConnectionView = {
  provider: CalendarProvider;
  status: string;
  syncPolicy: string;
  revision: number;
  consentedAt: string;
  lastSyncAt?: string;
};
export type CalendarSyncLease = {
  jobId: string;
  accountId: string;
  connectionId: string;
  provider: CalendarProvider;
  operation: "upsert" | "delete";
  eventId: string;
  /** 1-based attempt number this lease represents. */
  attempt: number;
  refreshToken: string;
  calendarId: string;
  providerEventId?: string;
  event?: CreatorCalendarEvent;
};
const stateHash = (value: string) =>
  createHmac(
    "sha256",
    process.env.MISSA_SESSION_SECRET || "local-session-secret",
  )
    .update(value)
    .digest("hex");

/** Deliveries per job before it is terminally failed (about two hours of backoff). */
export const CALENDAR_SYNC_MAX_ATTEMPTS = 8;
/** A running job whose lease is older than this is presumed abandoned. */
export const CALENDAR_SYNC_LEASE_SECONDS = 300;
const calendarErrorCode = (value: string) =>
  value.replace(/[^a-z0-9_-]/gi, "_").slice(0, 80) || "provider_failed";

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
const iso = (value: Date | string) => new Date(value).toISOString();

export class PostgresCreatorCalendarRepository extends CreatorRepositoryBase {
  constructor(pool: Pool) {
    super(pool);
  }

  async state(accountId: string): Promise<CreatorCalendarTokenState> {
    const result = await this.query<{
      version: number;
      revision: number;
      issued_at: Date | string;
    }>(
      `select version, revision, issued_at from calendar_feed_tokens where account_id=$1 and status='active' order by version desc limit 1`,
      [accountId],
    );
    const row = result.rows[0];
    return row
      ? {
          active: true,
          version: row.version,
          revision: row.revision,
          issuedAt: iso(row.issued_at),
        }
      : { active: false };
  }
  async connections(accountId: string): Promise<CalendarConnectionView[]> {
    const result = await this.query<{
      provider: CalendarProvider;
      status: string;
      sync_policy: string;
      revision: number;
      consented_at: Date | string;
      last_sync_at: Date | string | null;
    }>(
      `select provider,status,sync_policy,revision,consented_at,last_sync_at from calendar_provider_connections where account_id=$1 and status<>'revoked' order by provider`,
      [accountId],
    );
    return result.rows.map((row) => ({
      provider: row.provider,
      status: row.status,
      syncPolicy: row.sync_policy,
      revision: row.revision,
      consentedAt: iso(row.consented_at),
      ...(row.last_sync_at ? { lastSyncAt: iso(row.last_sync_at) } : {}),
    }));
  }
  async createOAuthState(
    accountId: string,
    provider: CalendarProvider,
    redirectUri: string,
  ) {
    const state = randomBytes(32).toString("base64url"),
      verifier = randomBytes(48).toString("base64url"),
      challenge = createHash("sha256").update(verifier).digest("base64url"),
      encrypted = encryptCalendarCredential(verifier);
    await this.query(
      `insert into calendar_oauth_states(account_id,provider,state_hash,pkce_verifier_ciphertext,redirect_uri,expires_at) values($1,$2,$3,$4,$5,now()+interval '10 minutes')`,
      [
        accountId,
        provider,
        stateHash(state),
        encrypted.ciphertext,
        redirectUri,
      ],
    );
    return { state, codeChallenge: challenge };
  }
  async consumeOAuthState(
    accountId: string,
    provider: CalendarProvider,
    state: string,
  ) {
    const result = await this.query<{
      id: string;
      pkce_verifier_ciphertext: string;
      redirect_uri: string;
    }>(
      `update calendar_oauth_states set consumed_at=now() where account_id=$1 and provider=$2 and state_hash=$3 and consumed_at is null and expires_at>now() returning id,pkce_verifier_ciphertext,redirect_uri`,
      [accountId, provider, stateHash(state)],
    );
    const row = result.rows[0];
    if (!row)
      throw new CreatorCalendarError(
        "Calendar authorization expired. Please reconnect.",
      );
    return {
      codeVerifier: decryptCalendarCredential(row.pkce_verifier_ciphertext),
      redirectUri: row.redirect_uri,
    };
  }
  async connectProvider(
    accountId: string,
    input: {
      provider: CalendarProvider;
      providerSubject: string;
      refreshToken: string;
      calendarId: string;
      scopes: string[];
    },
  ) {
    const encryptedToken = encryptCalendarCredential(input.refreshToken),
      encryptedCalendar = encryptCalendarCredential(input.calendarId),
      subject = createHmac(
        "sha256",
        process.env.MISSA_CALENDAR_TOKEN_KEY || "local-calendar-key-change-me",
      )
        .update(`${input.provider}:${input.providerSubject}`)
        .digest("hex");
    const connection = await this.query<{ id: string }>(
      `insert into calendar_provider_connections(account_id,provider,provider_subject_hash,calendar_id_ciphertext,refresh_token_ciphertext,token_key_version,granted_scopes) values($1,$2,$3,$4,$5,$6,$7) on conflict (account_id,provider) where status<>'revoked' do update set provider_subject_hash=excluded.provider_subject_hash,calendar_id_ciphertext=excluded.calendar_id_ciphertext,refresh_token_ciphertext=excluded.refresh_token_ciphertext,token_key_version=excluded.token_key_version,granted_scopes=excluded.granted_scopes,status='active',revision=calendar_provider_connections.revision+1,consented_at=now(),updated_at=now() returning id`,
      [
        accountId,
        input.provider,
        subject,
        encryptedCalendar.ciphertext,
        encryptedToken.ciphertext,
        encryptedToken.keyVersion,
        input.scopes,
      ],
    );
    const connectionId = connection.rows[0]!.id;
    // Reconnecting after a lost connection gives exhausted and parked jobs a
    // fresh set of attempts against the new credential.
    await this.query(
      `update calendar_sync_jobs set status='queued',attempt_count=0,lease_until=null,next_attempt_at=null,last_error_code=null,updated_at=now() where connection_id=$1 and (status in ('failed','queued') or (status='running' and (lease_until is null or lease_until<now())))`,
      [connectionId],
    );
    await this.query(
      `insert into calendar_sync_jobs(connection_id,event_id,operation,dedupe_key) select $1,id,'upsert','bootstrap:'||id||':'||revision from creator_calendar_events where account_id=$2 on conflict(connection_id,dedupe_key) do nothing`,
      [connectionId, accountId],
    );
  }
  async revokeProvider(accountId: string, provider: CalendarProvider) {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const current = await client.query<{ refresh_token_ciphertext: string }>(
        `select refresh_token_ciphertext from calendar_provider_connections where account_id=$1 and provider=$2 and status<>'revoked' for update`,
        [accountId, provider],
      );
      const row = current.rows[0];
      if (!row) {
        await client.query("rollback");
        return undefined;
      }
      await client.query(
        `update calendar_provider_connections set status='revoked',revoked_at=now(),refresh_token_ciphertext='',calendar_id_ciphertext=null,sync_cursor_ciphertext=null,revision=revision+1,updated_at=now() where account_id=$1 and provider=$2 and status<>'revoked'`,
        [accountId, provider],
      );
      await client.query("commit");
      return decryptCalendarCredential(row.refresh_token_ciphertext);
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Leases the next due provider sync job. Without an account it drains due
   * work across every account (the scheduled creator tick); with one it only
   * touches that creator's jobs (the in-app sync request).
   *
   * A job is due when it is queued, when a retryable failure's backoff has
   * elapsed, or when a previous worker died mid-delivery and its lease has
   * expired. Jobs that have used CALENDAR_SYNC_MAX_ATTEMPTS stay failed until
   * the creator retries them or reconnects the provider.
   */
  async leaseSyncJob(
    accountId?: string,
  ): Promise<CalendarSyncLease | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      // A killed worker can leave its last permitted attempt "running" for
      // ever; close it out so the event shows a failure instead of "Syncing".
      await client.query(
        `update calendar_sync_jobs j set status='failed',lease_until=null,next_attempt_at=null,last_error_code='lease_expired',updated_at=now()
           from calendar_provider_connections c
          where c.id=j.connection_id and ($1::text is null or c.account_id=$1)
            and j.status='running' and (j.lease_until is null or j.lease_until<now()) and j.attempt_count>=$2`,
        [accountId ?? null, CALENDAR_SYNC_MAX_ATTEMPTS],
      );
      const result = await client.query<{
        job_id: string;
        account_id: string;
        connection_id: string;
        provider: CalendarProvider;
        operation: "upsert" | "delete";
        event_id: string;
        attempt_count: number;
        refresh_token_ciphertext: string;
        calendar_id_ciphertext: string;
        provider_event_id_ciphertext: string | null;
      }>(
        `select j.id job_id,c.account_id,c.id connection_id,c.provider,j.operation,j.event_id,j.attempt_count,c.refresh_token_ciphertext,c.calendar_id_ciphertext,p.provider_event_id_ciphertext
           from calendar_sync_jobs j
           join calendar_provider_connections c on c.id=j.connection_id
           left join calendar_event_projections p on p.connection_id=c.id and p.event_id=j.event_id and p.status<>'deleted'
          where ($1::text is null or c.account_id=$1) and c.status='active' and j.attempt_count<$2
            and ((j.status in ('queued','failed') and (j.next_attempt_at is null or j.next_attempt_at<=now()))
              or (j.status='running' and (j.lease_until is null or j.lease_until<now())))
          order by j.created_at for update of j skip locked limit 1`,
        [accountId ?? null, CALENDAR_SYNC_MAX_ATTEMPTS],
      );
      const row = result.rows[0];
      if (!row) {
        await client.query("commit");
        return undefined;
      }
      await client.query(
        `update calendar_sync_jobs set status='running',attempt_count=attempt_count+1,lease_until=now()+make_interval(secs => $2),updated_at=now() where id=$1`,
        [row.job_id, CALENDAR_SYNC_LEASE_SECONDS],
      );
      await client.query("commit");
      const event =
        row.operation === "upsert"
          ? (
              await this.events(
                row.account_id,
                new Date("1970-01-01"),
                new Date("2100-01-01"),
              )
            ).find((item) => item.id === row.event_id)
          : undefined;
      return {
        jobId: row.job_id,
        accountId: row.account_id,
        connectionId: row.connection_id,
        provider: row.provider,
        operation: row.operation,
        eventId: row.event_id,
        attempt: row.attempt_count + 1,
        refreshToken: decryptCalendarCredential(row.refresh_token_ciphertext),
        calendarId: decryptCalendarCredential(row.calendar_id_ciphertext),
        ...(row.provider_event_id_ciphertext
          ? {
              providerEventId: decryptCalendarCredential(
                row.provider_event_id_ciphertext,
              ),
            }
          : {}),
        ...(event ? { event } : {}),
      };
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
  async completeSyncJob(lease: CalendarSyncLease, providerEventId?: string) {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      if (lease.operation === "upsert" && providerEventId && lease.event) {
        const encrypted = encryptCalendarCredential(providerEventId);
        await client.query(
          `insert into calendar_event_projections(connection_id,event_id,provider_event_id_ciphertext,source_revision,status) values($1,$2,$3,$4,'active') on conflict(connection_id,event_id) do update set provider_event_id_ciphertext=excluded.provider_event_id_ciphertext,source_revision=excluded.source_revision,status='active',updated_at=now()`,
          [
            lease.connectionId,
            lease.eventId,
            encrypted.ciphertext,
            lease.event.revision,
          ],
        );
      } else if (lease.operation === "delete") {
        await client.query(
          `update calendar_event_projections set status='deleted',updated_at=now() where connection_id=$1 and event_id=$2`,
          [lease.connectionId, lease.eventId],
        );
      }
      await client.query(
        `update calendar_sync_jobs set status='succeeded',lease_until=null,next_attempt_at=null,last_error_code=null,updated_at=now() where id=$1`,
        [lease.jobId],
      );
      await client.query(
        `update calendar_provider_connections set last_sync_at=now(),updated_at=now() where id=$1`,
        [lease.connectionId],
      );
      await client.query("commit");
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
  /**
   * Records a failed delivery. Retries back off exponentially (one minute,
   * doubling, capped at one hour); once the job has used CALENDAR_SYNC_MAX_ATTEMPTS it is
   * terminally failed and the event shows "Sync failed" with a Retry action.
   */
  async failSyncJob(
    jobId: string,
    errorCode: string,
  ): Promise<{ terminal: boolean }> {
    const result = await this.query<{ terminal: boolean }>(
      `update calendar_sync_jobs
          set status='failed',lease_until=null,last_error_code=$2,
              next_attempt_at=case when attempt_count>=$3 then null
                else now()+least(interval '1 hour',interval '30 seconds'*power(2,least(attempt_count,7))) end,
              updated_at=now()
        where id=$1 and status='running'
        returning attempt_count>=$3 as terminal`,
      [jobId, calendarErrorCode(errorCode), CALENDAR_SYNC_MAX_ATTEMPTS],
    );
    return { terminal: result.rows[0]?.terminal === true };
  }

  /**
   * The provider rejected the stored refresh token (revoked consent, expired
   * grant). Mark the connection as errored so the calendar shows "Connection
   * lost" with Reconnect, and put the job back in the queue without spending
   * an attempt: it runs again once the creator reconnects.
   */
  async requireCalendarReconnect(
    lease: Pick<CalendarSyncLease, "jobId" | "connectionId">,
    errorCode = "reconnect_required",
  ) {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await client.query(
        `update calendar_provider_connections set status='error',revision=revision+1,updated_at=now() where id=$1 and status='active'`,
        [lease.connectionId],
      );
      await client.query(
        `update calendar_sync_jobs set status='queued',lease_until=null,next_attempt_at=null,last_error_code=$2,attempt_count=greatest(attempt_count-1,0),updated_at=now() where id=$1 and status='running'`,
        [lease.jobId, calendarErrorCode(errorCode)],
      );
      await client.query("commit");
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Persists a refresh token the provider rotated during an access-token
   * refresh (Microsoft rotates on every refresh). Encrypted exactly like the
   * token stored at connect time; a revoked connection is never resurrected.
   */
  async rotateCalendarRefreshToken(connectionId: string, refreshToken: string) {
    if (!refreshToken) return { rotated: false };
    const encrypted = encryptCalendarCredential(refreshToken);
    const result = await this.query(
      `update calendar_provider_connections set refresh_token_ciphertext=$2,token_key_version=$3,updated_at=now() where id=$1 and status<>'revoked'`,
      [connectionId, encrypted.ciphertext, encrypted.keyVersion],
    );
    return { rotated: result.rowCount === 1 };
  }

  async retryCalendarSync(accountId: string, eventId: string) {
    const result = await this.query<{ id: string }>(
      `update calendar_sync_jobs j
          set status='queued',lease_until=null,last_error_code=null,next_attempt_at=now(),attempt_count=0,updated_at=now()
        where j.id = (
          select j2.id
            from calendar_sync_jobs j2
            join calendar_provider_connections c on c.id=j2.connection_id
           where c.account_id=$1 and j2.event_id=$2 and j2.status='failed'
           order by j2.updated_at desc limit 1
        )
      returning id`,
      [accountId, eventId],
    );
    return { queued: result.rowCount === 1 };
  }

  /**
   * Events overlapping the range. `excludePurposes` leaves out rows the
   * caller shows from their own source, such as the provider export mirror
   * (PROVIDER_MIRROR_PURPOSES), which the in-app Calendar reads from the
   * obligation, stage, tier and forecast tables instead.
   */
  async events(
    accountId: string,
    from: Date,
    to: Date,
    options: { excludePurposes?: readonly string[] } = {},
  ): Promise<CreatorCalendarEvent[]> {
    const result = await this.query<{
      id: string;
      title: string;
      description: string | null;
      location: string | null;
      start_at: Date | string;
      end_at: Date | string;
      all_day: boolean;
      color: string;
      revision: number;
      opportunity_id: string | null;
      purpose: string;
      created_at: Date | string;
      updated_at: Date | string;
      sync_status: "queued" | "running" | "succeeded" | "failed" | "cancelled" | null;
      sync_error: string | null;
      sync_next_attempt_at: Date | string | null;
      previous_source_deadline_date: string | null;
      deadline_changed_at: Date | string | null;
      deadline_reconciliation_status: "current" | "needs-review" | "dismissed";
    }>(
      `select e.id,e.title,e.description,e.location,e.start_at,e.end_at,e.all_day,e.color,e.revision,e.opportunity_id,e.purpose,e.created_at,e.updated_at,e.previous_source_deadline_date,e.deadline_changed_at,e.deadline_reconciliation_status,
         sync.status as sync_status,sync.last_error_code as sync_error,sync.next_attempt_at as sync_next_attempt_at
       from creator_calendar_events e
       left join lateral (select j.status,j.last_error_code,j.next_attempt_at from calendar_sync_jobs j join calendar_provider_connections c on c.id=j.connection_id and c.account_id=e.account_id where j.event_id=e.id order by j.updated_at desc limit 1) sync on true
       where e.account_id=$1 and e.start_at<$3 and e.end_at>$2 and not (e.purpose=any($4::text[])) order by e.start_at,e.id`,
      [accountId, from, to, [...(options.excludePurposes ?? [])]],
    );
    return result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      ...(row.description ? { description: row.description } : {}),
      ...(row.location ? { location: row.location } : {}),
      opportunityId: row.opportunity_id ?? undefined,
      purpose: row.purpose,
      startAt: iso(row.start_at),
      endAt: iso(row.end_at),
      allDay: row.all_day,
      color: row.color,
      revision: row.revision,
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at),
      ...(row.sync_status ? { syncStatus: row.sync_status } : {}),
      ...(row.sync_error ? { syncError: row.sync_error } : {}),
      ...(row.sync_next_attempt_at ? { syncNextAttemptAt: iso(row.sync_next_attempt_at) } : {}),
      ...(row.previous_source_deadline_date ? { previousDeadline: row.previous_source_deadline_date } : {}),
      ...(row.deadline_changed_at ? { deadlineChangedAt: iso(row.deadline_changed_at) } : {}),
      deadlineReconciliationStatus: row.deadline_reconciliation_status,
    }));
  }

  async ensureOpportunityDeadline(accountId: string, opportunityId: string) {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const source = await client.query<{
        tracked_id: string;
        title: string;
        deadline_date: string | null;
        deadline_kind: string | null;
      }>(
        `select t.id tracked_id,o.title,o.deadline_date::text deadline_date,o.deadline_kind
           from tracked_opportunities t join opportunities o on o.id=t.opportunity_id
          where t.account_id=$1 and t.opportunity_id=$2 for update of t`,
        [accountId, opportunityId],
      );
      const row = source.rows[0];
      if (!row || !row.deadline_date || !["exact", "fixed"].includes(row.deadline_kind ?? "")) {
        await client.query("commit");
        return { status: "no-deadline" as const };
      }
      const eventId = `deadline:${row.tracked_id}`;
      const inserted = await client.query<{ id: string; revision: number }>(
        `insert into creator_calendar_events
           (id,account_id,title,description,start_at,end_at,all_day,color,opportunity_id,purpose,source_deadline_date)
         values ($1,$2,$3,'Official opportunity deadline',$4::date,$4::date+interval '1 day',true,'ochre',$5,'official-deadline',$4::date)
         on conflict (account_id,opportunity_id) where purpose='official-deadline'
         do update set title=excluded.title,start_at=excluded.start_at,end_at=excluded.end_at,
           previous_source_deadline_date=case when creator_calendar_events.source_deadline_date is distinct from excluded.source_deadline_date then creator_calendar_events.source_deadline_date else creator_calendar_events.previous_source_deadline_date end,
           source_deadline_date=excluded.source_deadline_date,
           deadline_changed_at=case when creator_calendar_events.source_deadline_date is distinct from excluded.source_deadline_date then now() else creator_calendar_events.deadline_changed_at end,
           deadline_reconciliation_status=case when creator_calendar_events.source_deadline_date is distinct from excluded.source_deadline_date then 'needs-review' else creator_calendar_events.deadline_reconciliation_status end,
           revision=case when creator_calendar_events.start_at<>excluded.start_at then creator_calendar_events.revision+1 else creator_calendar_events.revision end,
           updated_at=case when creator_calendar_events.start_at<>excluded.start_at then now() else creator_calendar_events.updated_at end
         returning id,revision`,
        [eventId, accountId, row.title, row.deadline_date, opportunityId],
      );
      const savedEventId = inserted.rows[0]!.id;
      await queueCalendarSync(client, accountId, savedEventId, "upsert", inserted.rows[0]!.revision);
      await client.query("commit");
      return { status: "added" as const, eventId: savedEventId };
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async ensureGoalDate(accountId: string, goalId: string) {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const source = await client.query<{ title: string; ends_on: string }>(
        `select title,ends_on::text from creator_goals where id=$1 and account_id=$2 for update`,
        [goalId, accountId],
      );
      const goal = source.rows[0];
      if (!goal) throw new Error("Goal not found.");
      const eventId = `goal:${goalId}`;
      const inserted = await client.query<{ id: string; revision: number }>(
        `insert into creator_calendar_events
           (id,account_id,title,description,start_at,end_at,all_day,color,purpose)
         values ($1,$2,$3,'Goal date',$4::date,$4::date+interval '1 day',true,'forest','goal-date')
         on conflict (id) do update set title=excluded.title,start_at=excluded.start_at,end_at=excluded.end_at,
           revision=case when creator_calendar_events.start_at<>excluded.start_at then creator_calendar_events.revision+1 else creator_calendar_events.revision end,
           updated_at=case when creator_calendar_events.start_at<>excluded.start_at then now() else creator_calendar_events.updated_at end
         returning id,revision`,
        [eventId, accountId, goal.title, goal.ends_on],
      );
      await queueCalendarSync(client, accountId, inserted.rows[0]!.id, "upsert", inserted.rows[0]!.revision);
      await client.query("commit");
      return { status: "added" as const, eventId: inserted.rows[0]!.id };
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async resolveDeadlineReconciliation(
    accountId: string,
    eventId: string,
    action: "move-preparation" | "keep-preparation",
  ) {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const official = await client.query<{
        opportunity_id: string | null;
        start_at: Date;
        previous_source_deadline_date: string | null;
        source_deadline_date: string | null;
        deadline_reconciliation_status: string;
      }>(
        `select opportunity_id,start_at,previous_source_deadline_date::text previous_source_deadline_date,
                source_deadline_date::text source_deadline_date,deadline_reconciliation_status
           from creator_calendar_events
          where id=$1 and account_id=$2 and purpose='official-deadline' for update`,
        [eventId, accountId],
      );
      const row = official.rows[0];
      if (!row) throw new CreatorCalendarError("Calendar deadline not found.");
      if (row.deadline_reconciliation_status !== "needs-review" || !row.previous_source_deadline_date || !row.opportunity_id) {
        await client.query("commit");
        return { status: "already-resolved" as const, moved: 0, obligationsMoved: 0 };
      }
      let moved = 0;
      let obligationsMoved = 0;
      if (action === "move-preparation") {
        const shifted = await client.query<{ id: string; revision: number }>(
          `update creator_calendar_events preparation
              set start_at = preparation.start_at + (official.start_at - official.previous_source_deadline_date::date),
                  end_at = preparation.end_at + (official.start_at - official.previous_source_deadline_date::date),
                  revision = preparation.revision + 1,
                  updated_at = now()
             from creator_calendar_events official
            where official.id=$1 and preparation.account_id=$2
              and preparation.opportunity_id=official.opportunity_id
              and preparation.purpose='preparation'
           returning preparation.id,preparation.revision`,
          [eventId, accountId],
        );
        moved = shifted.rowCount ?? 0;
        for (const event of shifted.rows) await queueCalendarSync(client, accountId, event.id, "upsert", event.revision);
        // One review covers both: planned steps that do not already follow
        // the new deadline move by the same number of days.
        if (row.source_deadline_date)
          obligationsMoved = await shiftObligationsWithDeadline(
            client,
            accountId,
            row.opportunity_id,
            row.previous_source_deadline_date,
            row.source_deadline_date,
          );
      }
      await client.query(
        `update creator_calendar_events
            set deadline_reconciliation_status='dismissed', updated_at=now()
          where id=$1 and account_id=$2`,
        [eventId, accountId],
      );
      await client.query("commit");
      return { status: "resolved" as const, moved, obligationsMoved };
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Scheduled counterpart to ensureOpportunityDeadline: official deadlines
   * follow the source even when nobody re-saves the opportunity. A moved date
   * updates the event, flags it for review, queues the provider update and
   * writes one Inbox notice. A removed deadline or closed call keeps the last
   * known event as history and only notifies. Notices go to applications still
   * in preparation; submitted ones are updated silently.
   */
  async reconcileOfficialDeadlines(accountId?: string, limit = 200) {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const changed = await client.query<{
        id: string;
        account_id: string;
        opportunity_id: string;
        tracked_id: string;
        title: string;
        previous: string | null;
        next: string;
        notify: boolean;
      }>(
        `select e.id,e.account_id,e.opportunity_id,t.id tracked_id,o.title,e.source_deadline_date::text previous,o.deadline_date::text next,
                t.status in (${PRE_SUBMISSION}) notify
           from creator_calendar_events e
           join opportunities o on o.id=e.opportunity_id
           join tracked_opportunities t on t.account_id=e.account_id and t.opportunity_id=e.opportunity_id
          where e.purpose='official-deadline' and ($1::text is null or e.account_id=$1)
            and o.deadline_date is not null and o.deadline_kind in ('exact','fixed')
            and e.source_deadline_date is distinct from o.deadline_date
          order by e.id for update of e skip locked limit $2`,
        [accountId ?? null, limit],
      );
      const plans = new Map<string, CreatorPlan>();
      for (const row of changed.rows) {
        const updated = await client.query<{ revision: number }>(
          `update creator_calendar_events
              set title=$2,start_at=$3::date,end_at=$3::date+interval '1 day',
                  previous_source_deadline_date=source_deadline_date,source_deadline_date=$3::date,
                  deadline_changed_at=now(),deadline_reconciliation_status='needs-review',
                  revision=revision+1,updated_at=now()
            where id=$1 returning revision`,
          [row.id, row.title, row.next],
        );
        await queueCalendarSync(client, row.account_id, row.id, "upsert", updated.rows[0]!.revision);
        if (row.notify)
          await insertDeadlineNotice(client, row, {
            kind: "deadline-changed",
            title: `Deadline changed: ${row.title}`,
            body: row.previous
              ? `The official deadline moved from ${row.previous} to ${row.next}. Your calendar and deadline reminders now use the new date.`
              : `The official deadline is now ${row.next}. Your calendar and deadline reminders now use this date.`,
            dedupeKey: `deadline-changed:${row.id}:${row.next}`,
          });
        // On plans with start-by planning the chain moves with the deadline
        // now, by each step's buffer policy, with its own was/now notice.
        // Other plans keep their steps until the creator reviews the change.
        if (!plans.has(row.account_id)) plans.set(row.account_id, await creatorPlan(client, row.account_id));
        if (planIncludes(plans.get(row.account_id)!, "startByPlanning"))
          await recalculateObligationChainsIn(client, { accountId: row.account_id, trackedOpportunityId: row.tracked_id });
      }

      const unconfirmed = await client.query<{
        id: string;
        account_id: string;
        opportunity_id: string;
        title: string;
        known: string | null;
        closed: boolean;
      }>(
        `select e.id,e.account_id,e.opportunity_id,o.title,e.source_deadline_date::text known,
                ${OPEN_DEADLINE_CLOSED} closed
           from creator_calendar_events e
           join opportunities o on o.id=e.opportunity_id
           join tracked_opportunities t on t.account_id=e.account_id and t.opportunity_id=e.opportunity_id
          where e.purpose='official-deadline' and ($1::text is null or e.account_id=$1)
            and t.status in (${PRE_SUBMISSION})
            and (${OPEN_DEADLINE_CLOSED} or o.publication_state in ('suppressed','withdrawn')
                 or o.deadline_date is null or o.deadline_kind not in ('exact','fixed'))
            and not exists (select 1 from creator_inbox_alerts a where a.account_id=e.account_id and a.dedupe_key=
                  case when ${OPEN_DEADLINE_CLOSED} then 'call-closed:'||e.id
                       else 'deadline-unconfirmed:'||e.id||':'||coalesce(e.source_deadline_date::text,'none') end)
          order by e.id limit $2`,
        [accountId ?? null, limit],
      );
      let notices = 0;
      for (const row of unconfirmed.rows) {
        const known = row.known ? ` Your calendar keeps the last known date, ${row.known}.` : "";
        notices += await insertDeadlineNotice(
          client,
          row,
          row.closed
            ? {
                kind: "call-closed",
                title: `Closed: ${row.title} is no longer accepting submissions`,
                body: `The official source now shows this call as closed.${known}`,
                dedupeKey: `call-closed:${row.id}`,
              }
            : {
                kind: "deadline-changed",
                title: `Deadline needs checking: ${row.title}`,
                body: `The official source no longer shows a confirmed deadline.${known} Check the official page before relying on it.`,
                dedupeKey: `deadline-unconfirmed:${row.id}:${row.known ?? "none"}`,
              },
        );
      }
      await client.query("commit");
      return { refreshed: changed.rowCount ?? 0, unconfirmedNotices: notices };
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async createEvent(
    envelope: CreatorCommandEnvelope,
    input: {
      id: string;
      title: unknown;
      description?: unknown;
      location?: unknown;
      startAt: unknown;
      endAt: unknown;
      allDay?: unknown;
      color?: unknown;
      opportunityId?: unknown;
      purpose?: unknown;
    },
  ) {
    const value = calendarInput(input);
    return this.executeOwnerCommand(envelope, async (client) => {
      await validateCalendarApplication(
        client,
        envelope.accountId,
        value.opportunityId,
      );
      const row = await client.query<{ revision: number }>(
        `insert into creator_calendar_events(id,account_id,title,description,location,start_at,end_at,all_day,color,opportunity_id,purpose) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning revision`,
        [
          input.id,
          envelope.accountId,
          value.title,
          value.description ?? null,
          value.location ?? null,
          value.startAt,
          value.endAt,
          value.allDay,
          value.color,
          value.opportunityId ?? null,
          value.purpose,
        ],
      );
      await queueCalendarSync(
        client,
        envelope.accountId,
        input.id,
        "upsert",
        row.rows[0]!.revision,
      );
      return {
        resourceType: "calendar-event",
        resourceId: input.id,
        revision: row.rows[0]!.revision,
      };
    });
  }

  async updateEvent(
    envelope: CreatorCommandEnvelope,
    id: string,
    input: {
      title: unknown;
      description?: unknown;
      location?: unknown;
      startAt: unknown;
      endAt: unknown;
      allDay?: unknown;
      color?: unknown;
      opportunityId?: unknown;
      purpose?: unknown;
    },
  ) {
    const value = calendarInput(input);
    return this.executeOwnerCommand(envelope, async (client) => {
      const current = await client.query<{ revision: number; purpose: string }>(
        `select revision,purpose from creator_calendar_events where id=$1 and account_id=$2 for update`,
        [id, envelope.accountId],
      );
      const row = current.rows[0];
      if (!row) throw new CreatorCalendarError("Calendar event not found.");
      assertPersonalEvent(row.purpose);
      if (row.revision !== envelope.expectedRevision)
        throw new CreatorCalendarError(
          "This event changed in another session. Refresh and try again.",
        );
      await validateCalendarApplication(
        client,
        envelope.accountId,
        value.opportunityId,
      );
      const updated = await client.query<{ revision: number }>(
        `update creator_calendar_events set title=$3,description=$4,location=$5,start_at=$6,end_at=$7,all_day=$8,color=$9,opportunity_id=case when $12::boolean then $10 else opportunity_id end,purpose=case when $13::boolean then $11 else purpose end,revision=revision+1,updated_at=now() where id=$1 and account_id=$2 returning revision`,
        [
          id,
          envelope.accountId,
          value.title,
          value.description ?? null,
          value.location ?? null,
          value.startAt,
          value.endAt,
          value.allDay,
          value.color,
          value.opportunityId ?? null,
          value.purpose,
          input.opportunityId !== undefined,
          input.purpose !== undefined,
        ],
      );
      await queueCalendarSync(
        client,
        envelope.accountId,
        id,
        "upsert",
        updated.rows[0]!.revision,
      );
      return {
        resourceType: "calendar-event",
        resourceId: id,
        revision: updated.rows[0]!.revision,
      };
    });
  }

  async deleteEvent(envelope: CreatorCommandEnvelope, id: string) {
    return this.executeOwnerCommand(envelope, async (client) => {
      const current = await client.query<{ revision: number; purpose: string }>(
        `select revision,purpose from creator_calendar_events where id=$1 and account_id=$2 for update`,
        [id, envelope.accountId],
      );
      const row = current.rows[0];
      if (!row) throw new CreatorCalendarError("Calendar event not found.");
      assertPersonalEvent(row.purpose);
      if (row.revision !== envelope.expectedRevision)
        throw new CreatorCalendarError(
          "This event changed in another session. Refresh and try again.",
        );
      await queueCalendarSync(
        client,
        envelope.accountId,
        id,
        "delete",
        row.revision + 1,
      );
      await client.query(
        `delete from creator_calendar_events where id=$1 and account_id=$2`,
        [id, envelope.accountId],
      );
      return {
        resourceType: "calendar-event",
        resourceId: id,
        revision: row.revision + 1,
      };
    });
  }

  async trackerItems(accountId: string): Promise<CreatorCalendarItem[]> {
    return this.itemsForAccount(accountId);
  }

  async issue(
    envelope: CreatorCommandEnvelope,
  ): Promise<CreatorCalendarTokenResult> {
    const token = randomBytes(32).toString("base64url");
    let state!: Required<CreatorCalendarTokenState>;
    const receipt = await this.executeOwnerCommand(envelope, async (client) => {
      await client.query(`select pg_advisory_xact_lock(hashtext($1))`, [
        `calendar:${envelope.accountId}`,
      ]);
      const active = await client.query(
        `select id from calendar_feed_tokens where account_id=$1 and status='active' limit 1 for update`,
        [envelope.accountId],
      );
      if (active.rows[0])
        throw new CreatorCalendarError(
          "An active calendar feed already exists. Rotate it instead.",
        );
      const current = await client.query<{ version: number }>(
        `select version from calendar_feed_tokens where account_id=$1 order by version desc limit 1`,
        [envelope.accountId],
      );
      const version = (current.rows[0]?.version ?? 0) + 1;
      const inserted = await client.query<{
        id: string;
        revision: number;
        issued_at: Date | string;
      }>(
        `insert into calendar_feed_tokens (account_id,token_hash,status,version) values ($1,$2,'active',$3) returning id,revision,issued_at`,
        [envelope.accountId, hashToken(token), version],
      );
      const row = inserted.rows[0]!;
      state = {
        active: true,
        version,
        revision: row.revision,
        issuedAt: iso(row.issued_at),
      };
      return {
        resourceType: "calendar-feed-token",
        resourceId: row.id,
        revision: row.revision,
      };
    });
    if (receipt.replayed)
      throw new CreatorCalendarError(
        "Calendar token issue already completed; issue a new link.",
      );
    return { token, state, receipt };
  }

  async rotate(
    envelope: CreatorCommandEnvelope,
  ): Promise<CreatorCalendarTokenResult> {
    const token = randomBytes(32).toString("base64url");
    let state!: Required<CreatorCalendarTokenState>;
    const receipt = await this.executeOwnerCommand(envelope, async (client) => {
      await client.query(`select pg_advisory_xact_lock(hashtext($1))`, [
        `calendar:${envelope.accountId}`,
      ]);
      const current = await client.query<{
        id: string;
        version: number;
        revision: number;
      }>(
        `select id,version,revision from calendar_feed_tokens where account_id=$1 and status='active' order by version desc limit 1 for update`,
        [envelope.accountId],
      );
      const row = current.rows[0];
      if (!row)
        throw new CreatorCalendarError("No active calendar feed exists.");
      if (row.revision !== envelope.expectedRevision)
        throw new CreatorCalendarError(
          "Calendar feed changed in another session. Refresh and try again.",
        );
      await client.query(
        `update calendar_feed_tokens set status='rotated',rotated_at=now(),revision=revision+1,updated_at=now() where id=$1`,
        [row.id],
      );
      const inserted = await client.query<{
        id: string;
        revision: number;
        issued_at: Date | string;
      }>(
        `insert into calendar_feed_tokens (account_id,token_hash,status,version) values ($1,$2,'active',$3) returning id,revision,issued_at`,
        [envelope.accountId, hashToken(token), row.version + 1],
      );
      const next = inserted.rows[0]!;
      state = {
        active: true,
        version: row.version + 1,
        revision: next.revision,
        issuedAt: iso(next.issued_at),
      };
      return {
        resourceType: "calendar-feed-token",
        resourceId: next.id,
        revision: next.revision,
      };
    });
    if (receipt.replayed)
      throw new CreatorCalendarError(
        "Calendar token rotation already completed; rotate again for a new link.",
      );
    return { token, state, receipt };
  }

  async revoke(envelope: CreatorCommandEnvelope): Promise<CreatorReceipt> {
    return this.executeOwnerCommand(envelope, async (client) => {
      await client.query(`select pg_advisory_xact_lock(hashtext($1))`, [
        `calendar:${envelope.accountId}`,
      ]);
      const current = await client.query<{ id: string; revision: number }>(
        `select id,revision from calendar_feed_tokens where account_id=$1 and status='active' order by version desc limit 1 for update`,
        [envelope.accountId],
      );
      const row = current.rows[0];
      if (!row)
        throw new CreatorCalendarError("No active calendar feed exists.");
      if (row.revision !== envelope.expectedRevision)
        throw new CreatorCalendarError(
          "Calendar feed changed in another session. Refresh and try again.",
        );
      const updated = await client.query<{ revision: number }>(
        `update calendar_feed_tokens set status='revoked',revoked_at=now(),revision=revision+1,updated_at=now() where id=$1 returning revision`,
        [row.id],
      );
      return {
        resourceType: "calendar-feed-token",
        resourceId: row.id,
        revision: updated.rows[0]!.revision,
      };
    });
  }

  async itemsForToken(
    userId: string,
    token: string,
  ): Promise<CreatorCalendarItem[] | undefined> {
    const owner = await this.query<{ account_id: string }>(
      `select t.account_id from calendar_feed_tokens t join creator_profiles p on p.account_id=t.account_id where t.token_hash=$1 and t.status='active' and p.user_id=$2 limit 1`,
      [hashToken(token), userId],
    );
    const accountId = owner.rows[0]?.account_id;
    if (!accountId) return undefined;
    return this.itemsForAccount(accountId);
  }

  private async itemsForAccount(
    accountId: string,
  ): Promise<CreatorCalendarItem[]> {
    const result = await this.query<{
      opportunity_id: string;
      title: string;
      organization_name: string | null;
      status: string;
      opp_status: string;
      open_date: string | null;
      deadline_date: string | null;
      deadline_kind: string;
      deadline_time: Date | string | null;
      deadline_timezone: string | null;
      submitted_at: Date | string | null;
      response_time_days: number | null;
    }>(
      `select t.opportunity_id,o.title,coalesce(org.data->>'name',o.organization_id) organization_name,t.status,o.status as opp_status,o.open_date::text as open_date,o.deadline_date::text as deadline_date,o.deadline_kind,o.deadline_time,o.deadline_timezone,t.submitted_at,cp.response_time_days
       from tracked_opportunities t join opportunities o on o.id=t.opportunity_id
       left join radar_organizations org on org.id=o.organization_id
       left join opportunity_call_profiles cp on cp.opportunity_id=o.id
       where t.account_id=$1 and ${canonicalPublicOpportunityPredicate("o")} order by t.updated_at desc`,
      [accountId],
    );
    return result.rows.map((row) => ({
      opportunityId: row.opportunity_id,
      title: row.title,
      organizationName: row.organization_name ?? undefined,
      myStatus: row.status,
      oppStatus: row.opp_status,
      openDate: row.open_date ?? undefined,
      deadline: [
        "interested",
        "saved",
        "preparing",
        "draft-started",
        "ready-to-submit",
      ].includes(row.status)
        ? (row.deadline_date ?? undefined)
        : undefined,
      deadlineKind: row.deadline_kind,
      ...(row.deadline_time ? { deadlineTime: iso(row.deadline_time) } : {}),
      ...(row.deadline_timezone ? { deadlineTimezone: row.deadline_timezone } : {}),
      expectedResponseBy: expectedResponse(row.status, row.submitted_at, row.response_time_days)?.expectedResponseBy,
    }));
  }
}

/**
 * Keep one 'personal-target' calendar event per tracked call in step with
 * tracked_opportunities.personal_target_on: create or move it when a date is
 * set, remove it when the target is cleared. Runs in the caller's transaction
 * and queues the provider sync like any other event write.
 */
export async function mirrorPersonalTarget(
  client: PoolClient,
  target: { accountId: string; trackedOpportunityId: string; opportunityId: string; title: string; personalTargetOn: string | null },
): Promise<{ status: "saved" | "removed" | "unchanged"; eventId: string }> {
  const eventId = `personal-target:${target.trackedOpportunityId}`;
  if (target.personalTargetOn === null) {
    const removed = await client.query<{ revision: number }>(
      "delete from creator_calendar_events where id=$1 and account_id=$2 returning revision",
      [eventId, target.accountId],
    );
    if (!removed.rows[0]) return { status: "unchanged", eventId };
    await queueCalendarSync(client, target.accountId, eventId, "delete", removed.rows[0].revision + 1);
    return { status: "removed", eventId };
  }
  const saved = await client.query<{ revision: number }>(
    `insert into creator_calendar_events
       (id,account_id,title,description,start_at,end_at,all_day,color,opportunity_id,purpose)
     values ($1,$2,$3,'Your own target date, ahead of the official deadline',$4::date,$4::date+interval '1 day',true,'sage',$5,'personal-target')
     on conflict (id) do update set title=excluded.title,start_at=excluded.start_at,end_at=excluded.end_at,
       revision=case when creator_calendar_events.start_at<>excluded.start_at or creator_calendar_events.title<>excluded.title then creator_calendar_events.revision+1 else creator_calendar_events.revision end,
       updated_at=case when creator_calendar_events.start_at<>excluded.start_at or creator_calendar_events.title<>excluded.title then now() else creator_calendar_events.updated_at end
     returning revision`,
    [eventId, target.accountId, `Target: ${target.title}`.slice(0, 200), target.personalTargetOn, target.opportunityId],
  );
  await queueCalendarSync(client, target.accountId, eventId, "upsert", saved.rows[0]!.revision);
  return { status: "saved", eventId };
}

const PRE_SUBMISSION = "'interested','saved','preparing','draft-started','ready-to-submit'";
// A call that closes after its deadline passes is expected; only an early or
// undated closure is news worth an Inbox notice.
const OPEN_DEADLINE_CLOSED =
  "(o.status in ('closed','archived') and (o.deadline_date is null or o.deadline_date>=current_date))";

async function insertDeadlineNotice(
  client: PoolClient,
  row: { account_id: string; opportunity_id: string },
  notice: { kind: string; title: string; body: string; dedupeKey: string },
) {
  const inserted = await client.query(
    `insert into creator_inbox_alerts(id,account_id,opportunity_id,kind,title,body,reason,dedupe_key,delivery_eligibility,action_href)
     values($1,$2,$3,$4,$5,$6,'You saved this opportunity.',$7,'in-app',$8)
     on conflict (account_id,dedupe_key) do nothing`,
    [
      randomUUID(),
      row.account_id,
      row.opportunity_id,
      notice.kind,
      notice.title,
      notice.body,
      notice.dedupeKey,
      `/tracker?view=saved&application=${encodeURIComponent(row.opportunity_id)}`,
    ],
  );
  return inserted.rowCount ?? 0;
}

/**
 * Purposes of the rows mirrored for the Google and Microsoft export from plan
 * steps, stages, fee-tier closes and forecasts (calendarProviderMirror.ts).
 * They are owned by their source, never edited as personal events, and left
 * out of the in-app Calendar, which shows the sources themselves.
 */
export const PROVIDER_MIRROR_PURPOSES = ["plan-step", "stage", "tier-close", "forecast"] as const;
export type ProviderMirrorPurpose = (typeof PROVIDER_MIRROR_PURPOSES)[number];

function assertPersonalEvent(purpose: string) {
  if ((PROVIDER_MIRROR_PURPOSES as readonly string[]).includes(purpose))
    throw new CreatorCalendarError("This date comes from your plan or the call. Change it in the Tracker.");
}

/** Queues provider sync for one event on each of the account's active connections. */
export async function queueCalendarSync(
  client: PoolClient,
  accountId: string,
  eventId: string,
  operation: "upsert" | "delete",
  revision: number,
) {
  await client.query(
    `insert into calendar_sync_jobs(connection_id,event_id,operation,dedupe_key) select id,$2,$3,$3||':'||$2||':'||$4 from calendar_provider_connections where account_id=$1 and status='active' on conflict(connection_id,dedupe_key) do nothing`,
    [accountId, eventId, operation, revision],
  );
}

function calendarInput(input: {
  title: unknown;
  description?: unknown;
  location?: unknown;
  startAt: unknown;
  endAt: unknown;
  allDay?: unknown;
  color?: unknown;
  opportunityId?: unknown;
  purpose?: unknown;
}) {
  if (
    typeof input.title !== "string" ||
    !input.title.trim() ||
    input.title.trim().length > 200
  )
    throw new CreatorCalendarError(
      "Event title must be between 1 and 200 characters.",
    );
  const startAt = new Date(String(input.startAt)),
    endAt = new Date(String(input.endAt));
  if (
    !Number.isFinite(startAt.getTime()) ||
    !Number.isFinite(endAt.getTime()) ||
    endAt <= startAt
  )
    throw new CreatorCalendarError("Choose a valid event start and end.");
  const text = (value: unknown, max: number) =>
    typeof value === "string" && value.trim()
      ? value.trim().slice(0, max)
      : undefined;
  const colors = new Set(["ink", "sage", "blue", "ochre", "rose"]);
  const color =
    typeof input.color === "string" && colors.has(input.color)
      ? input.color
      : "ink";
  const purpose = input.purpose ?? "personal";
  if (
    typeof purpose !== "string" ||
    !["personal", "preparation", "attendance", "unavailable", "official-deadline", "personal-target"].includes(purpose)
  )
    throw new CreatorCalendarError("Choose a type of time.");
  return {
    opportunityId: text(input.opportunityId, 200),
    purpose,
    title: input.title.trim(),
    description: text(input.description, 4000),
    location: text(input.location, 300),
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    allDay: input.allDay === true,
    color,
  };
}

async function validateCalendarApplication(
  client: PoolClient,
  accountId: string,
  opportunityId?: string,
) {
  if (
    opportunityId &&
    !(
      await client.query(
        "select id from tracked_opportunities where account_id=$1 and opportunity_id=$2",
        [accountId, opportunityId],
      )
    ).rowCount
  )
    throw new CreatorCalendarError("Choose one of your saved applications.");
}
