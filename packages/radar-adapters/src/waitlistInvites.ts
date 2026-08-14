import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import {
  inviteeClaimWindowOpen,
  registrableDomainLabel,
  HANDLE_CLAIM_ACCESS_MODE,
  HANDLE_CLAIM_INVITEE_WINDOW_DAYS,
  type HandleClaimAccessMode,
} from "@missa/radar-engine";

export const FREE_MAIL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "aol.com",
  "mail.com",
  "gmx.com",
  "gmx.de",
  "yandex.com",
  "yandex.ru",
  "mail.ru",
  "zoho.com",
  "fastmail.com",
  "hey.com",
  "qq.com",
  "163.com",
  "126.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "proton.me",
  "protonmail.com",
  "protonmail.ch",
  "icloud.com",
  "me.com",
  "mac.com",
] as const;

const FREE_MAIL_DOMAIN_SET = new Set<string>(FREE_MAIL_DOMAINS);

export interface WaitlistInviteSignup {
  id: string;
  email: string;
  createdAt: Date | string;
}

export interface PreparedWaitlistInvite {
  id: string;
  waitlistSignupId: string;
  email: string;
  rawToken: string;
  expiresAt: string;
}

export interface WaitlistInviteDeliveryResult {
  id: string;
  waitlistSignupId: string;
  email: string;
  status: "sent" | "revoked";
  expiresAt: string;
  reason?: string;
}

export type InviteRedemptionState =
  | "redeemed"
  | "already-used"
  | "expired"
  | "revoked"
  | "not-found"
  | "unavailable";

export interface InviteRedemptionResult {
  state: InviteRedemptionState;
  redeemedAt?: string;
  protectedUntil?: string;
}

export interface WaitlistPublicationMatch {
  waitlistSignupId: string;
  emailDomain: string;
  matchedProfileId: string;
  matchedProfileName: string;
  reservedHandle: string | null;
  status: "matched" | "no-reserved-handle";
}

export interface WaitlistPublicationMatchReport {
  available: boolean;
  generatedAt: string;
  source: string;
  warnings: string[];
  freeMailDomains: readonly string[];
  rows: WaitlistPublicationMatch[];
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Invite priority is the waitlist's creation order, with id as a stable tie-breaker. */
export function orderWaitlistSignups(
  signups: readonly WaitlistInviteSignup[],
): WaitlistInviteSignup[] {
  return [...signups].sort((left, right) => {
    const created =
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    return created || left.id.localeCompare(right.id);
  });
}

function emailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return null;
  const domain = email
    .slice(at + 1)
    .trim()
    .toLowerCase()
    .replace(/\.$/u, "");
  return domain && !domain.includes("@") ? domain : null;
}

export function isFreeMailDomain(domain: string): boolean {
  return FREE_MAIL_DOMAIN_SET.has(domain.trim().toLowerCase());
}

function databaseUnavailableError(): Error {
  return new Error("The waitlist invite tables are not available.");
}

async function inviteTablesAvailable(client: PoolClient): Promise<boolean> {
  const result = await client.query<{
    invites: string | null;
    signups: string | null;
  }>(`
    select
      to_regclass('public.waitlist_invites') as invites,
      to_regclass('public.waitlist_signups') as signups
  `);
  return Boolean(result.rows[0]?.invites && result.rows[0]?.signups);
}

export async function previewWaitlistInviteCandidates(
  connectionString: string,
  limit = 100,
): Promise<WaitlistInviteSignup[]> {
  const pool = new Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 5_000,
  });
  try {
    const result = await pool.query<{
      id: string;
      email: string;
      created_at: Date | string;
    }>(
      `select s.id, s.email, s.created_at
         from waitlist_signups s
        where not exists (
          select 1 from waitlist_invites i
           where i.waitlist_signup_id = s.id
             and i.state in ('sent', 'redeemed')
        )
        order by s.created_at asc, s.id asc
        limit $1`,
      [Math.min(Math.max(limit, 1), 10_000)],
    );
    return orderWaitlistSignups(
      result.rows.map((row) => ({
        id: row.id,
        email: row.email,
        createdAt: row.created_at,
      })),
    );
  } finally {
    await pool.end();
  }
}

export async function prepareWaitlistInvites(input: {
  connectionString: string;
  limit?: number;
  expiresInDays?: number;
  now?: Date;
}): Promise<PreparedWaitlistInvite[]> {
  const pool = new Pool({
    connectionString: input.connectionString,
    max: 1,
    connectionTimeoutMillis: 5_000,
  });
  const client = await pool.connect();
  const now = input.now ?? new Date();
  const expiresInDays = Math.min(Math.max(input.expiresInDays ?? 14, 1), 90);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 10_000);
  try {
    await client.query("begin");
    if (!(await inviteTablesAvailable(client)))
      throw databaseUnavailableError();
    const rows = await client.query<{
      id: string;
      email: string;
      created_at: Date | string;
    }>(
      `select s.id, s.email, s.created_at
         from waitlist_signups s
        where not exists (
          select 1 from waitlist_invites i
           where i.waitlist_signup_id = s.id
             and i.state in ('sent', 'redeemed')
        )
        order by s.created_at asc, s.id asc
        limit $1
        for update of s skip locked`,
      [limit],
    );
    const ordered = orderWaitlistSignups(
      rows.rows.map((row) => ({
        id: row.id,
        email: row.email,
        createdAt: row.created_at,
      })),
    );
    const prepared: PreparedWaitlistInvite[] = [];
    for (const signup of ordered) {
      const rawToken = generateInviteToken();
      const expiresAt = new Date(
        now.getTime() + expiresInDays * 24 * 60 * 60 * 1000,
      );
      const id = `invite_${randomUUID()}`;
      await client.query(
        `insert into waitlist_invites
           (id, waitlist_signup_id, token_hash, state, sent_at, expires_at)
         values ($1, $2, $3, 'sent', $4, $5)`,
        [id, signup.id, hashInviteToken(rawToken), now, expiresAt],
      );
      prepared.push({
        id,
        waitlistSignupId: signup.id,
        email: signup.email,
        rawToken,
        expiresAt: expiresAt.toISOString(),
      });
    }
    await client.query("commit");
    return prepared;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

export async function revokeWaitlistInvite(
  connectionString: string,
  inviteId: string,
): Promise<void> {
  const pool = new Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 5_000,
  });
  try {
    await pool.query(
      `update waitlist_invites
          set state = 'revoked'
        where id = $1 and state = 'sent'`,
      [inviteId],
    );
  } finally {
    await pool.end();
  }
}

export async function sendWaitlistInvites(input: {
  connectionString: string;
  limit?: number;
  expiresInDays?: number;
  now?: Date;
  deliver: (invite: PreparedWaitlistInvite) => Promise<void>;
}): Promise<WaitlistInviteDeliveryResult[]> {
  const prepared = await prepareWaitlistInvites(input);
  const results: WaitlistInviteDeliveryResult[] = [];
  for (const invite of prepared) {
    try {
      await input.deliver(invite);
      results.push({
        id: invite.id,
        waitlistSignupId: invite.waitlistSignupId,
        email: invite.email,
        status: "sent",
        expiresAt: invite.expiresAt,
      });
    } catch (error) {
      await revokeWaitlistInvite(input.connectionString, invite.id);
      results.push({
        id: invite.id,
        waitlistSignupId: invite.waitlistSignupId,
        email: invite.email,
        status: "revoked",
        expiresAt: invite.expiresAt,
        reason: error instanceof Error ? error.message : "Delivery failed",
      });
    }
  }
  return results;
}

export async function redeemWaitlistInvite(input: {
  connectionString: string;
  accountId: string;
  token?: string | null;
  waitlistEmail?: string | null;
  now?: Date;
}): Promise<InviteRedemptionResult> {
  const pool = new Pool({
    connectionString: input.connectionString,
    max: 1,
    connectionTimeoutMillis: 5_000,
  });
  const client = await pool.connect();
  const now = input.now ?? new Date();
  type InviteRow = {
    id: string;
    state: "sent" | "redeemed" | "expired" | "revoked";
    expires_at: Date | string;
    redeemed_at: Date | string | null;
  };
  try {
    await client.query("begin");
    if (!(await inviteTablesAvailable(client)))
      throw databaseUnavailableError();
    const token = input.token?.trim();
    let invite: InviteRow | undefined;
    if (token) {
      const result = await client.query<InviteRow>(
        `select id, state, expires_at, redeemed_at
           from waitlist_invites
          where token_hash = $1
          for update`,
        [hashInviteToken(token)],
      );
      invite = result.rows[0];
    } else if (input.waitlistEmail?.trim()) {
      const result = await client.query<InviteRow>(
        `select i.id, i.state, i.expires_at, i.redeemed_at
           from waitlist_invites i
           join waitlist_signups s on s.id = i.waitlist_signup_id
          where lower(s.email) = lower($1)
            and i.state = 'sent'
          order by s.created_at asc, i.expires_at desc, i.id asc
          limit 1
          for update of i`,
        [input.waitlistEmail.trim()],
      );
      invite = result.rows[0];
    }

    if (!invite) {
      await client.query("commit");
      return { state: "not-found" };
    }
    if (invite.state === "redeemed") {
      await client.query("commit");
      return { state: "already-used" };
    }
    if (invite.state === "revoked") {
      await client.query("commit");
      return { state: "revoked" };
    }
    if (
      invite.state === "expired" ||
      new Date(invite.expires_at).getTime() <= now.getTime()
    ) {
      await client.query(
        `update waitlist_invites set state = 'expired' where id = $1 and state = 'sent'`,
        [invite.id],
      );
      await client.query("commit");
      return { state: "expired" };
    }

    await client.query(
      `update waitlist_invites
          set state = 'redeemed', redeemed_at = $2, redeemed_by_account_id = $3
        where id = $1 and state = 'sent'`,
      [invite.id, now, input.accountId],
    );
    await client.query("commit");
    const protectedUntil = new Date(
      now.getTime() + HANDLE_CLAIM_INVITEE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    return { state: "redeemed", redeemedAt: now.toISOString(), protectedUntil };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

export async function waitlistClaimAccess(input: {
  connectionString: string;
  accountId: string;
  now?: Date;
  accessMode?: HandleClaimAccessMode;
}): Promise<{ allowed: boolean; protectedUntil?: string }> {
  if ((input.accessMode ?? HANDLE_CLAIM_ACCESS_MODE) === "open")
    return { allowed: true };
  const pool = new Pool({
    connectionString: input.connectionString,
    max: 1,
    connectionTimeoutMillis: 5_000,
  });
  try {
    const available = await pool.query<{ present: string | null }>(
      "select to_regclass('public.waitlist_invites') as present",
    );
    if (!available.rows[0]?.present) return { allowed: false };
    const result = await pool.query<{ redeemed_at: Date | string }>(
      `select redeemed_at
         from waitlist_invites
        where redeemed_by_account_id = $1 and state = 'redeemed'
        order by redeemed_at desc
        limit 1`,
      [input.accountId],
    );
    const redeemedAt = result.rows[0]?.redeemed_at;
    const allowed = inviteeClaimWindowOpen({
      redeemedAt,
      now: input.now,
      accessMode: input.accessMode,
    });
    return allowed
      ? {
          allowed: true,
          protectedUntil: new Date(
            new Date(redeemedAt).getTime() +
              HANDLE_CLAIM_INVITEE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
          ).toISOString(),
        }
      : { allowed: false };
  } finally {
    await pool.end();
  }
}

export async function readWaitlistPublicationMatchReport(
  connectionString: string,
): Promise<WaitlistPublicationMatchReport> {
  const generatedAt = new Date().toISOString();
  const pool = new Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 5_000,
  });
  try {
    const tables = await pool.query<{
      signups: string | null;
      profiles: string | null;
      handles: string | null;
    }>(`
      select
        to_regclass('public.waitlist_signups') as signups,
        to_regclass('public.gary_profiles') as profiles,
        to_regclass('public.handles') as handles
    `);
    const tableState = tables.rows[0];
    if (!tableState?.signups || !tableState.profiles) {
      return {
        available: false,
        generatedAt,
        source: "waitlist_signups + gary_profiles + handles",
        warnings: ["The waitlist or Gary profile table is not available."],
        freeMailDomains: FREE_MAIL_DOMAINS,
        rows: [],
      };
    }
    const [signups, profiles, reserved] = await Promise.all([
      pool.query<{ id: string; email: string }>(
        "select id, email from waitlist_signups order by created_at asc, id asc",
      ),
      pool.query<{
        id: string;
        name: string;
        normalized_website_url: string | null;
      }>("select id, name, normalized_website_url from gary_profiles"),
      tableState.handles
        ? pool.query<{
            handle_key: string;
            reserved_from_profile_id: string | null;
          }>(
            "select handle_key, reserved_from_profile_id from handles where state = 'reserved'",
          )
        : Promise.resolve({
            rows: [] as {
              handle_key: string;
              reserved_from_profile_id: string | null;
            }[],
          }),
    ]);
    const profileByDomain = new Map<string, { id: string; name: string }[]>();
    for (const profile of profiles.rows) {
      if (!profile.normalized_website_url) continue;
      const domain = registrableDomainLabel(profile.normalized_website_url);
      if (!domain) continue;
      const list = profileByDomain.get(domain) ?? [];
      list.push({ id: profile.id, name: profile.name });
      profileByDomain.set(domain, list);
    }
    const reservedByProfile = new Map<string, string>();
    for (const row of reserved.rows) {
      if (row.reserved_from_profile_id)
        reservedByProfile.set(row.reserved_from_profile_id, row.handle_key);
    }
    const rows: WaitlistPublicationMatch[] = [];
    for (const signup of signups.rows) {
      const domain = emailDomain(signup.email);
      if (!domain || isFreeMailDomain(domain)) continue;
      const matches =
        profileByDomain.get(registrableDomainLabel(domain) ?? domain) ?? [];
      for (const profile of matches) {
        const reservedHandle = reservedByProfile.get(profile.id) ?? null;
        rows.push({
          waitlistSignupId: signup.id,
          emailDomain: domain,
          matchedProfileId: profile.id,
          matchedProfileName: profile.name,
          reservedHandle,
          status: reservedHandle ? "matched" : "no-reserved-handle",
        });
      }
    }
    return {
      available: true,
      generatedAt,
      source: "waitlist_signups + gary_profiles + handles",
      warnings: tableState.handles
        ? []
        : [
            "handles is not available; matches cannot be connected to reserved handles.",
          ],
      freeMailDomains: FREE_MAIL_DOMAINS,
      rows,
    };
  } catch {
    return {
      available: false,
      generatedAt,
      source: "waitlist_signups + gary_profiles + handles",
      warnings: ["The publication-match report could not be read."],
      freeMailDomains: FREE_MAIL_DOMAINS,
      rows: [],
    };
  } finally {
    await pool.end();
  }
}
