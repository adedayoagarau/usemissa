import { createHash, createHmac, randomBytes } from "node:crypto";
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
  deadline?: string;
  expectedResponseBy?: string;
};
export type CreatorCalendarEvent = {
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
  connectionId: string;
  provider: CalendarProvider;
  operation: "upsert" | "delete";
  eventId: string;
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

  async leaseSyncJob(
    accountId: string,
  ): Promise<CalendarSyncLease | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const result = await client.query<{
        job_id: string;
        connection_id: string;
        provider: CalendarProvider;
        operation: "upsert" | "delete";
        event_id: string;
        refresh_token_ciphertext: string;
        calendar_id_ciphertext: string;
        provider_event_id_ciphertext: string | null;
      }>(
        `select j.id job_id,c.id connection_id,c.provider,j.operation,j.event_id,c.refresh_token_ciphertext,c.calendar_id_ciphertext,p.provider_event_id_ciphertext from calendar_sync_jobs j join calendar_provider_connections c on c.id=j.connection_id left join calendar_event_projections p on p.connection_id=c.id and p.event_id=j.event_id where c.account_id=$1 and c.status='active' and j.status in ('queued','failed') and (j.next_attempt_at is null or j.next_attempt_at<=now()) order by j.created_at for update of j skip locked limit 1`,
        [accountId],
      );
      const row = result.rows[0];
      if (!row) {
        await client.query("commit");
        return undefined;
      }
      await client.query(
        `update calendar_sync_jobs set status='running',attempt_count=attempt_count+1,lease_until=now()+interval '5 minutes',updated_at=now() where id=$1`,
        [row.job_id],
      );
      await client.query("commit");
      const event =
        row.operation === "upsert"
          ? (
              await this.events(
                accountId,
                new Date("1970-01-01"),
                new Date("2100-01-01"),
              )
            ).find((item) => item.id === row.event_id)
          : undefined;
      return {
        jobId: row.job_id,
        connectionId: row.connection_id,
        provider: row.provider,
        operation: row.operation,
        eventId: row.event_id,
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
        `update calendar_sync_jobs set status='succeeded',lease_until=null,last_error_code=null,updated_at=now() where id=$1`,
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
  async failSyncJob(jobId: string, errorCode: string) {
    await this.query(
      `update calendar_sync_jobs set status='failed',lease_until=null,last_error_code=$2,next_attempt_at=now()+least(interval '1 hour',interval '30 seconds'*power(2,least(attempt_count,7))),updated_at=now() where id=$1`,
      [jobId, errorCode.replace(/[^a-z0-9_-]/gi, "_").slice(0, 80)],
    );
  }

  async events(
    accountId: string,
    from: Date,
    to: Date,
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
      created_at: Date | string;
      updated_at: Date | string;
    }>(
      `select id,title,description,location,start_at,end_at,all_day,color,revision,created_at,updated_at from creator_calendar_events where account_id=$1 and start_at<$3 and end_at>$2 order by start_at,id`,
      [accountId, from, to],
    );
    return result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      ...(row.description ? { description: row.description } : {}),
      ...(row.location ? { location: row.location } : {}),
      startAt: iso(row.start_at),
      endAt: iso(row.end_at),
      allDay: row.all_day,
      color: row.color,
      revision: row.revision,
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at),
    }));
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
    },
  ) {
    const value = calendarInput(input);
    return this.executeOwnerCommand(envelope, async (client) => {
      const row = await client.query<{ revision: number }>(
        `insert into creator_calendar_events(id,account_id,title,description,location,start_at,end_at,all_day,color) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning revision`,
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
    },
  ) {
    const value = calendarInput(input);
    return this.executeOwnerCommand(envelope, async (client) => {
      const current = await client.query<{ revision: number }>(
        `select revision from creator_calendar_events where id=$1 and account_id=$2 for update`,
        [id, envelope.accountId],
      );
      const row = current.rows[0];
      if (!row) throw new CreatorCalendarError("Calendar event not found.");
      if (row.revision !== envelope.expectedRevision)
        throw new CreatorCalendarError(
          "This event changed in another session. Refresh and try again.",
        );
      const updated = await client.query<{ revision: number }>(
        `update creator_calendar_events set title=$3,description=$4,location=$5,start_at=$6,end_at=$7,all_day=$8,color=$9,revision=revision+1,updated_at=now() where id=$1 and account_id=$2 returning revision`,
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
      const current = await client.query<{ revision: number }>(
        `select revision from creator_calendar_events where id=$1 and account_id=$2 for update`,
        [id, envelope.accountId],
      );
      const row = current.rows[0];
      if (!row) throw new CreatorCalendarError("Calendar event not found.");
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
      deadline_date: string | null;
      submitted_at: Date | string | null;
      response_time_days: number | null;
    }>(
      `select t.opportunity_id,o.title,coalesce(org.data->>'name',o.organization_id) organization_name,t.status,o.deadline_date,t.submitted_at,cp.response_time_days
       from tracked_opportunities t join opportunities o on o.id=t.opportunity_id
       left join radar_organizations org on org.id=o.organization_id
       left join opportunity_call_profiles cp on cp.opportunity_id=o.id
       where t.account_id=$1 and o.publication_state='published' order by t.updated_at desc`,
      [accountId],
    );
    return result.rows.map((row) => ({
      opportunityId: row.opportunity_id,
      title: row.title,
      organizationName: row.organization_name ?? undefined,
      myStatus: row.status,
      deadline: row.deadline_date ?? undefined,
      expectedResponseBy:
        row.submitted_at && row.response_time_days
          ? new Date(
              new Date(row.submitted_at).getTime() +
                row.response_time_days * 86_400_000,
            )
              .toISOString()
              .slice(0, 10)
          : undefined,
    }));
  }
}

async function queueCalendarSync(
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
  return {
    title: input.title.trim(),
    description: text(input.description, 4000),
    location: text(input.location, 300),
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    allDay: input.allDay === true,
    color,
  };
}
