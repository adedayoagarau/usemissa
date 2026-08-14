import { Pool, type PoolClient } from "pg";
import {
  HANDLE_CLAIM_ACCESS_MODE,
  handleReleaseDecision,
  HANDLE_RENAME_INTERVAL_DAYS,
  normalizeHandle,
  registrableDomainLabel,
  renameAllowed,
  type HandleClaimAccessMode,
} from "@missa/radar-engine";
import { waitlistClaimAccess } from "./waitlistInvites.js";

export const HANDLE_UNAVAILABLE_MESSAGE = "This handle is unavailable.";
export const HANDLE_CLAIM_WINDOW_MESSAGE =
  "Handle claiming is not open for this account yet.";
export const HANDLE_RENAME_TOO_SOON_MESSAGE =
  "You can rename your handle once every 30 days.";
export const PUBLICATION_CLAIM_HOLD_MESSAGE =
  "This name may belong to a publication. We will verify that claim before changing the reserved name.";

type HandleState = "claimed" | "reserved" | "blocked";
type SubjectType = "user" | "organization" | "directory_profile";

interface HandleRow {
  handle_key: string;
  display_handle: string;
  subject_type: SubjectType;
  subject_id: string;
  state: HandleState;
  derivation: "user-chosen" | "name" | "domain" | "both" | "manual";
  reserved_from_profile_id: string | null;
  claimed_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface ResolvedHandleRow extends HandleRow {
  resolution: "canonical" | "alias";
}

export interface UserHandle {
  handleKey: string;
  displayHandle: string;
  state: "claimed";
  claimedAt: string | null;
}

export type HandleClaimState =
  | "claimed"
  | "already-claimed"
  | "invalid"
  | "unavailable"
  | "claim-window-closed"
  | "publication-claim"
  | "namespace-unavailable";

export interface HandleClaimResult {
  state: HandleClaimState;
  handle?: UserHandle;
}

export type HandleRenameState =
  | "renamed"
  | "invalid"
  | "unavailable"
  | "not-found"
  | "rename-too-soon"
  | "publication-claim"
  | "namespace-unavailable";

export interface HandleRenameResult {
  state: HandleRenameState;
  handle?: UserHandle;
  retryAt?: string;
}

export interface ResolvedHandle {
  resolution: "canonical" | "alias";
  handleKey: string;
  displayHandle: string;
  subjectType: SubjectType;
  subjectId: string;
  state: HandleState;
  reservedFromProfileId: string | null;
  claimedAt: string | null;
}

export class HandleNamespaceUnavailableError extends Error {
  constructor() {
    super("The handle namespace is not available.");
    this.name = "HandleNamespaceUnavailableError";
  }
}

/** Shared claim-time gate; this never falls back to an email or model guess. */
export function normalizeUserHandleInput(input: string): string | null {
  return normalizeHandle(displayHandleForInput(input));
}

function createPool(connectionString: string): Pool {
  return new Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 5_000,
  });
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

function asIsoDate(value: Date | string | null): string | null {
  return value ? new Date(value).toISOString() : null;
}

function toUserHandle(row: HandleRow): UserHandle {
  return {
    handleKey: row.handle_key,
    displayHandle: row.display_handle,
    state: "claimed",
    claimedAt: asIsoDate(row.claimed_at),
  };
}

function toResolvedHandle(row: ResolvedHandleRow): ResolvedHandle {
  return {
    resolution: row.resolution,
    handleKey: row.handle_key,
    displayHandle: row.display_handle,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    state: row.state,
    reservedFromProfileId: row.reserved_from_profile_id,
    claimedAt: asIsoDate(row.claimed_at),
  };
}

function displayHandleForInput(input: string): string {
  return input.trim().replace(/^@/u, "");
}

async function namespaceTablesAvailable(client: PoolClient): Promise<boolean> {
  const result = await client.query<{
    handles: string | null;
    aliases: string | null;
  }>(
    `select
       to_regclass('public.handles') as handles,
       to_regclass('public.handle_aliases') as aliases`,
  );
  return Boolean(result.rows[0]?.handles && result.rows[0]?.aliases);
}

export async function handleNamespaceAvailable(
  connectionString: string,
): Promise<boolean> {
  const pool = createPool(connectionString);
  try {
    const result = await pool.query<{
      handles: string | null;
      aliases: string | null;
    }>(
      `select to_regclass('public.handles') as handles,
              to_regclass('public.handle_aliases') as aliases`,
    );
    return Boolean(result.rows[0]?.handles && result.rows[0]?.aliases);
  } finally {
    await pool.end();
  }
}

async function readCanonical(
  client: PoolClient,
  handleKey: string,
  forUpdate = false,
): Promise<HandleRow | undefined> {
  const result = await client.query<HandleRow>(
    `select handle_key, display_handle, subject_type, subject_id, state,
            derivation, reserved_from_profile_id, claimed_at, created_at, updated_at
       from handles
      where handle_key = $1
      ${forUpdate ? "for update" : ""}`,
    [handleKey],
  );
  return result.rows[0];
}

async function readAliasTarget(
  client: PoolClient,
  aliasKey: string,
): Promise<HandleRow | undefined> {
  const result = await client.query<HandleRow>(
    `select h.handle_key, h.display_handle, h.subject_type, h.subject_id, h.state,
            h.derivation, h.reserved_from_profile_id, h.claimed_at,
            h.created_at, h.updated_at
       from handle_aliases a
       join handles h on h.handle_key = a.handle_key
      where a.alias_key = $1`,
    [aliasKey],
  );
  return result.rows[0];
}

async function keyIsOccupied(
  client: PoolClient,
  handleKey: string,
): Promise<boolean> {
  if (await readCanonical(client, handleKey)) return true;
  const result = await client.query<{ present: boolean }>(
    `select exists (select 1 from handle_aliases where alias_key = $1) as present`,
    [handleKey],
  );
  return result.rows[0]?.present === true;
}

async function readVerifiedEmailDomain(
  client: PoolClient,
  accountId: string,
): Promise<string | null> {
  const result = await client.query<{ verified_email_domain: string | null }>(
    `select coalesce(data->>'verifiedEmailDomain', data->>'verified_email_domain')
              as verified_email_domain
       from radar_accounts
      where id = $1`,
    [accountId],
  );
  return result.rows[0]?.verified_email_domain?.trim() || null;
}

async function reservedProfileMatchesVerifiedDomain(
  client: PoolClient,
  handleKey: string,
  verifiedEmailDomain: string | null,
): Promise<boolean> {
  if (!verifiedEmailDomain) return false;
  const result = await client.query<{
    profile_id: string | null;
    normalized_website_url: string | null;
  }>(
    `select h.reserved_from_profile_id as profile_id,
            g.normalized_website_url
       from handles h
       left join gary_profiles g on g.id = h.reserved_from_profile_id
      where h.handle_key = $1 and h.state = 'reserved'`,
    [handleKey],
  );
  const row = result.rows[0];
  if (!row?.profile_id || !row.normalized_website_url) return false;
  const verifiedDomain = registrableDomainLabel(verifiedEmailDomain);
  const profileDomain = registrableDomainLabel(row.normalized_website_url);
  return Boolean(
    verifiedDomain && profileDomain && verifiedDomain === profileDomain,
  );
}

async function lockHandleKeys(
  client: PoolClient,
  keys: readonly string[],
): Promise<void> {
  for (const key of [...new Set(keys)].sort()) {
    // The database arbiter remains the unique constraint. This lock only makes
    // the publication-domain branch and rename bookkeeping deterministic under
    // concurrent requests.
    await client.query(
      "select pg_advisory_xact_lock(hashtextextended($1, 0))",
      [key],
    );
  }
}

export async function readUserHandle(
  connectionString: string,
  userId: string,
): Promise<UserHandle | null> {
  const pool = createPool(connectionString);
  try {
    const available = await pool.query<{ handles: string | null }>(
      `select to_regclass('public.handles') as handles`,
    );
    if (!available.rows[0]?.handles) return null;
    const result = await pool.query<HandleRow>(
      `select handle_key, display_handle, subject_type, subject_id, state,
              derivation, reserved_from_profile_id, claimed_at, created_at, updated_at
         from handles
        where subject_type = 'user' and subject_id = $1 and state = 'claimed'
        limit 1`,
      [userId],
    );
    return result.rows[0] ? toUserHandle(result.rows[0]) : null;
  } finally {
    await pool.end();
  }
}

export async function resolveHandle(
  connectionString: string,
  rawHandle: string,
): Promise<ResolvedHandle | null> {
  const handleKey = normalizeUserHandleInput(rawHandle);
  if (!handleKey) return null;
  const pool = createPool(connectionString);
  try {
    const available = await pool.query<{
      handles: string | null;
      aliases: string | null;
    }>(
      `select to_regclass('public.handles') as handles,
              to_regclass('public.handle_aliases') as aliases`,
    );
    if (!available.rows[0]?.handles || !available.rows[0]?.aliases) return null;
    const canonical = await pool.query<HandleRow>(
      `select handle_key, display_handle, subject_type, subject_id, state,
              derivation, reserved_from_profile_id, claimed_at, created_at, updated_at
         from handles
        where handle_key = $1`,
      [handleKey],
    );
    if (canonical.rows[0]) {
      return toResolvedHandle({
        ...canonical.rows[0],
        resolution: "canonical",
      });
    }
    const alias = await pool.query<HandleRow>(
      `select h.handle_key, h.display_handle, h.subject_type, h.subject_id, h.state,
              h.derivation, h.reserved_from_profile_id, h.claimed_at,
              h.created_at, h.updated_at
         from handle_aliases a
         join handles h on h.handle_key = a.handle_key
        where a.alias_key = $1`,
      [handleKey],
    );
    if (!alias.rows[0]) return null;
    return toResolvedHandle({ ...alias.rows[0], resolution: "alias" });
  } finally {
    await pool.end();
  }
}

export async function claimUserHandle(input: {
  connectionString: string;
  accountId: string;
  userId: string;
  requestedHandle: string;
  now?: Date;
  accessMode?: HandleClaimAccessMode;
}): Promise<HandleClaimResult> {
  const displayHandle = displayHandleForInput(input.requestedHandle);
  const handleKey = normalizeUserHandleInput(displayHandle);
  if (!handleKey) return { state: "invalid" };

  const pool = createPool(input.connectionString);
  const client = await pool.connect();
  const now = input.now ?? new Date();
  try {
    await client.query("begin");
    if (!(await namespaceTablesAvailable(client))) {
      await client.query("rollback");
      return { state: "namespace-unavailable" };
    }
    await lockHandleKeys(client, [handleKey]);

    const currentResult = await client.query<HandleRow>(
      `select handle_key, display_handle, subject_type, subject_id, state,
              derivation, reserved_from_profile_id, claimed_at, created_at, updated_at
         from handles
        where subject_type = 'user' and subject_id = $1 and state <> 'blocked'
        limit 1 for update`,
      [input.userId],
    );
    if (currentResult.rows[0]) {
      await client.query("commit");
      return {
        state: "already-claimed",
        handle: toUserHandle(currentResult.rows[0]),
      };
    }

    const canonical = await readCanonical(client, handleKey);
    if (canonical) {
      if (
        canonical.state === "reserved" &&
        (await reservedProfileMatchesVerifiedDomain(
          client,
          handleKey,
          await readVerifiedEmailDomain(client, input.accountId),
        ))
      ) {
        await client.query("commit");
        return { state: "publication-claim" };
      }
      await client.query("commit");
      return { state: "unavailable" };
    }
    if (await keyIsOccupied(client, handleKey)) {
      await client.query("commit");
      return { state: "unavailable" };
    }

    const access = await waitlistClaimAccess({
      connectionString: input.connectionString,
      accountId: input.accountId,
      now: input.now,
      accessMode: input.accessMode,
    });
    if (!access.allowed) {
      await client.query("commit");
      return { state: "claim-window-closed" };
    }

    await client.query(
      `insert into handles
         (handle_key, display_handle, subject_type, subject_id, state,
          derivation, claimed_at, created_at, updated_at)
       values ($1, $2, 'user', $3, 'claimed', 'user-chosen', $4, $4, $4)`,
      [handleKey, displayHandle, input.userId, now],
    );
    await client.query("commit");
    return {
      state: "claimed",
      handle: {
        handleKey,
        displayHandle,
        state: "claimed",
        claimedAt: now.toISOString(),
      },
    };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    if (isUniqueViolation(error)) return { state: "unavailable" };
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

export async function renameUserHandle(input: {
  connectionString: string;
  accountId: string;
  userId: string;
  requestedHandle: string;
  now?: Date;
}): Promise<HandleRenameResult> {
  const displayHandle = displayHandleForInput(input.requestedHandle);
  const newHandleKey = normalizeUserHandleInput(displayHandle);
  if (!newHandleKey) return { state: "invalid" };

  const pool = createPool(input.connectionString);
  const client = await pool.connect();
  const now = input.now ?? new Date();
  try {
    await client.query("begin");
    if (!(await namespaceTablesAvailable(client))) {
      await client.query("rollback");
      return { state: "namespace-unavailable" };
    }
    const currentResult = await client.query<HandleRow>(
      `select handle_key, display_handle, subject_type, subject_id, state,
              derivation, reserved_from_profile_id, claimed_at, created_at, updated_at
         from handles
        where subject_type = 'user' and subject_id = $1 and state = 'claimed'
        limit 1 for update`,
      [input.userId],
    );
    const current = currentResult.rows[0];
    if (!current) {
      await client.query("rollback");
      return { state: "not-found" };
    }
    if (newHandleKey === current.handle_key) {
      await client.query("commit");
      return { state: "renamed", handle: toUserHandle(current) };
    }
    await lockHandleKeys(client, [current.handle_key, newHandleKey]);

    const lastRename = await client.query<{
      last_renamed_at: Date | string | null;
    }>(
      `select max(a.created_at) as last_renamed_at
         from handle_aliases a
         join handles h on h.handle_key = a.handle_key
        where h.subject_type = 'user' and h.subject_id = $1
          and a.reason = 'rename'`,
      [input.userId],
    );
    const lastRenamedAt = lastRename.rows[0]?.last_renamed_at;
    if (
      !renameAllowed({
        lastRenamedAt,
        now,
        intervalDays: HANDLE_RENAME_INTERVAL_DAYS,
      })
    ) {
      const retryAt = lastRenamedAt
        ? new Date(
            new Date(lastRenamedAt).getTime() +
              HANDLE_RENAME_INTERVAL_DAYS * 24 * 60 * 60 * 1000,
          ).toISOString()
        : undefined;
      await client.query("rollback");
      return { state: "rename-too-soon", ...(retryAt ? { retryAt } : {}) };
    }

    const canonical = await readCanonical(client, newHandleKey);
    if (canonical) {
      if (
        canonical.state === "reserved" &&
        (await reservedProfileMatchesVerifiedDomain(
          client,
          newHandleKey,
          await readVerifiedEmailDomain(client, input.accountId),
        ))
      ) {
        await client.query("commit");
        return { state: "publication-claim" };
      }
      await client.query("commit");
      return { state: "unavailable" };
    }
    if (await keyIsOccupied(client, newHandleKey)) {
      await client.query("commit");
      return { state: "unavailable" };
    }

    // The partial subject index allows a temporary blocked state while the
    // new canonical row is inserted. All operations are in one transaction.
    await client.query(
      `update handles set state = 'blocked', updated_at = $2 where handle_key = $1`,
      [current.handle_key, now],
    );
    await client.query(
      `insert into handles
         (handle_key, display_handle, subject_type, subject_id, state,
          derivation, claimed_at, created_at, updated_at)
       values ($1, $2, 'user', $3, 'claimed', 'user-chosen', $4, $4, $4)`,
      [newHandleKey, displayHandle, input.userId, now],
    );
    await client.query(
      `update handle_aliases set handle_key = $2 where handle_key = $1`,
      [current.handle_key, newHandleKey],
    );
    await client.query(
      `insert into handle_aliases (alias_key, handle_key, reason, created_at)
       values ($1, $2, 'rename', $3)`,
      [current.handle_key, newHandleKey, now],
    );
    await client.query(`delete from handles where handle_key = $1`, [
      current.handle_key,
    ]);
    await client.query("commit");
    return {
      state: "renamed",
      handle: {
        handleKey: newHandleKey,
        displayHandle,
        state: "claimed",
        claimedAt: now.toISOString(),
      },
    };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    if (isUniqueViolation(error)) return { state: "unavailable" };
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

/**
 * Used by a future account-deletion worker. It only removes a deleted user's
 * current row after the explicit traffic/hold policy has returned `eligible`;
 * aliases remain permanent by pointing at a separately retained blocked hold.
 * The worker is intentionally not exposed as a public route.
 */
export type DeletedUserHandlePolicyState =
  "held" | "never-release" | "released" | "not-found";

/** Apply the explicit deletion hold/traffic policy from the handle contract. */
export async function applyDeletedUserHandlePolicy(input: {
  connectionString: string;
  userId: string;
  deletedAt: Date | string;
  publicPageViews: number;
  now?: Date;
}): Promise<{
  state: DeletedUserHandlePolicyState;
  decision: "hold" | "never-release" | "eligible";
}> {
  const decision = handleReleaseDecision({
    deletedAt: input.deletedAt,
    publicPageViews: input.publicPageViews,
    now: input.now,
  });
  const pool = createPool(input.connectionString);
  const now = input.now ?? new Date();
  try {
    const result = await pool.query<{ handle_key: string }>(
      `select handle_key
         from handles
        where subject_type = 'user' and subject_id = $1
          and state in ('claimed', 'blocked')
        limit 1`,
      [input.userId],
    );
    const current = result.rows[0];
    if (!current) return { state: "not-found", decision };

    if (decision === "eligible") {
      const aliases = await pool.query<{ count: string }>(
        `select count(*)::text as count from handle_aliases where handle_key = $1`,
        [current.handle_key],
      );
      // Permanent rename aliases cannot point at a released current row. Keep
      // that namespace key held conservatively when aliases exist.
      if (Number(aliases.rows[0]?.count ?? 0) === 0) {
        await pool.query(`delete from handles where handle_key = $1`, [
          current.handle_key,
        ]);
        return { state: "released", decision };
      }
    }
    await pool.query(
      `update handles set state = 'blocked', updated_at = $2 where handle_key = $1`,
      [current.handle_key, now],
    );
    return {
      state: decision === "never-release" ? "never-release" : "held",
      decision,
    };
  } finally {
    await pool.end();
  }
}

export function handleClaimAccessMode(): HandleClaimAccessMode {
  return HANDLE_CLAIM_ACCESS_MODE;
}
