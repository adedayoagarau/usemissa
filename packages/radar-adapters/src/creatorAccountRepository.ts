import { hashPassword, verifyPassword, type Account, type OrgMembership, type OrgRole } from "@missa/radar-engine";
import type { Pool, PoolClient } from "pg";
import { randomUUID } from "node:crypto";
import { CreatorRepositoryBase } from "./creatorRepository.js";

type AccountRow = { id: string; email: string; data: Account };
type MembershipRow = { account_id: string; organization_id: string; role: string; data: Partial<OrgMembership> };
export type CreatorSignupIdentity = Readonly<{ givenName: string; familyName?: string; usesSingleName: boolean; displayName: string }>;

const ROLES = new Set<OrgRole>(["member", "admin", "owner", "team-admin", "program-manager", "reviewer", "finance", "legal", "viewer", "guest"]);

function accountFromRow(row: AccountRow): Account {
  return { ...row.data, id: row.id, email: row.email };
}

async function ensureCreatorProductRows(client: Pick<PoolClient, "query">, account: Account): Promise<void> {
  if (!account.userId) return;
  const displayName = account.displayName?.trim().slice(0, 120)
    || account.email.split("@")[0]?.slice(0, 120)
    || "Missa creator";
  await client.query(
    "insert into creator_profiles (account_id,user_id,display_name) values ($1,$2,$3) on conflict (account_id) do nothing",
    [account.id, account.userId, displayName],
  );
  await client.query("insert into opportunity_preferences (account_id) values ($1) on conflict (account_id) do nothing", [account.id]);
  await client.query("insert into notification_preferences (account_id) values ($1) on conflict (account_id) do nothing", [account.id]);
  await client.query("insert into creator_product_states (account_id) values ($1) on conflict (account_id) do nothing", [account.id]).catch(() => undefined);
}

export class CreatorAccountProvisionError extends Error {
  constructor(readonly code: "inactive" | "identity-conflict" | "verification-required" | "account-exists") { super(code); }
}

export class PostgresCreatorAccountRepository extends CreatorRepositoryBase {
  constructor(private readonly database: Pool) { super(database); }

  async account(accountId: string): Promise<Account | undefined> {
    const result = await this.query<AccountRow>("select id, email, data from radar_accounts where id = $1", [accountId]);
    return result.rows[0] ? accountFromRow(result.rows[0]) : undefined;
  }

  async accountByAuthIdentity(provider: "neon-auth", authUserId: string): Promise<Account | undefined> {
    const result = await this.query<AccountRow>(
      "select id, email, data from radar_accounts where data->>'authProvider' = $1 and data->>'authUserId' = $2 limit 1",
      [provider, authUserId],
    );
    return result.rows[0] ? accountFromRow(result.rows[0]) : undefined;
  }

  async accountByEmail(email: string): Promise<Account | undefined> {
    const result = await this.query<AccountRow>("select id, email, data from radar_accounts where lower(email) = lower($1) limit 1", [email]);
    return result.rows[0] ? accountFromRow(result.rows[0]) : undefined;
  }

  async memberships(accountId: string): Promise<OrgMembership[]> {
    const result = await this.query<MembershipRow>(
      "select account_id, organization_id, role, data from radar_memberships where account_id = $1 order by organization_id",
      [accountId],
    );
    return result.rows.flatMap((row) => {
      if (!ROLES.has(row.role as OrgRole)) return [];
      return [{
        accountId: row.account_id,
        organizationId: row.organization_id,
        role: row.role as OrgRole,
        grantedAt: row.data.grantedAt ?? new Date(0).toISOString(),
      }];
    });
  }

  async authenticatePassword(email: string, password: string): Promise<Account | undefined> {
    const account = await this.accountByEmail(email.trim().toLowerCase());
    if (!account || account.active === false || !verifyPassword(password, account.passwordHash)) return undefined;
    return account;
  }

  /** Reconcile creator aggregates only at an explicit authentication boundary. */
  async ensureProductData(account: Account): Promise<void> {
    const client = await this.database.connect();
    try {
      await client.query("BEGIN");
      await client.query("select id from radar_accounts where id=$1 for update", [account.id]);
      await ensureCreatorProductRows(client, account);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async updatePassword(accountId: string, newPassword: string): Promise<boolean> {
    const client = await this.database.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query<AccountRow>("select id, email, data from radar_accounts where id = $1 for update", [accountId]);
      if (!existing.rows[0]) {
        await client.query("ROLLBACK");
        return false;
      }
      const account = accountFromRow(existing.rows[0]);
      if (account.active === false) {
        await client.query("ROLLBACK");
        return false;
      }
      const updated: Account = {
        ...account,
        passwordHash: hashPassword(newPassword),
      };
      await client.query("update radar_accounts set data = $2::jsonb, updated_at = now() where id = $1", [accountId, JSON.stringify(updated)]);
      const receiptId = randomUUID();
      await client.query(
        "insert into audit_events (account_id, action, target_type, target_id, detail, correlation_id) values ($1, 'account.password_reset', 'account', $1, $2::jsonb, $3)",
        [accountId, JSON.stringify({ receiptId, method: "password_reset" }), receiptId]
      );
      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  /** Deactivate an account while retaining append-only audit history and owned records. */
  async closeAccount(accountId: string): Promise<boolean> {
    const client = await this.database.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query<AccountRow>("select id, email, data from radar_accounts where id=$1 for update", [accountId]);
      if (!existing.rows[0]) { await client.query("ROLLBACK"); return false; }
      const account = accountFromRow(existing.rows[0]);
      if (account.active === false) { await client.query("COMMIT"); return true; }
      const closed = { ...account, active: false };
      await client.query("update radar_accounts set data=$2::jsonb, updated_at=now() where id=$1", [accountId, JSON.stringify(closed)]);
      await client.query("insert into audit_events (account_id,action,target_type,target_id,detail,correlation_id) values ($1,'account.closed','account',$1,$2::jsonb,$3)", [accountId, JSON.stringify({ reason: "creator-request" }), randomUUID()]);
      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally { client.release(); }
  }

  async provisionPasswordAccount(input: { email: string; password: string } & CreatorSignupIdentity): Promise<{ account: Account; created: true }> {
    const email = input.email.trim().toLowerCase();
    const client = await this.database.connect();
    try {
      await client.query("BEGIN");
      await client.query("select pg_advisory_xact_lock(hashtext($1))", [`email:${email}`]);
      const existing = await client.query("select id from radar_accounts where lower(email)=lower($1) for update", [email]);
      if (existing.rows[0]) throw new CreatorAccountProvisionError("account-exists");
      const accountId = `acct_${randomUUID()}`;
      const userId = `user_${randomUUID()}`;
      const now = new Date().toISOString();
      const account: Account = { id: accountId, email, passwordHash: hashPassword(input.password), userId, isAdmin: false, createdAt: now, displayName: input.displayName, givenName: input.givenName, familyName: input.familyName, usesSingleName: input.usesSingleName, active: true };
      await client.query("insert into radar_accounts (id,email,data) values ($1,$2,$3::jsonb)", [accountId, email, JSON.stringify(account)]);
      await client.query("insert into creator_profiles (account_id,user_id,display_name,given_name,family_name,uses_single_name) values ($1,$2,$3,$4,$5,$6)", [accountId, userId, input.displayName, input.givenName, input.familyName ?? null, input.usesSingleName]);
      await client.query("insert into opportunity_preferences (account_id) values ($1)", [accountId]);
      await client.query("insert into notification_preferences (account_id) values ($1)", [accountId]);
      await client.query("insert into creator_product_states (account_id) values ($1) on conflict (account_id) do nothing", [accountId]).catch(() => undefined);
      const receiptId = randomUUID();
      await client.query(`insert into workspace_command_receipts (id,scope_type,scope_id,actor_account_id,command_type,idempotency_key,request_hash,result,correlation_id) values ($1,'owner',$2,$2,'account.password-signup',$3,$3,$4::jsonb,$5)`, [receiptId, accountId, email, JSON.stringify({ resourceType: "account", resourceId: accountId, revision: 1, receiptId, replayed: false }), receiptId]);
      await client.query("insert into audit_events (account_id,action,target_type,target_id,detail,correlation_id) values ($1,'account.provisioned','account',$1,$2::jsonb,$3)", [accountId, JSON.stringify({ receiptId, revision: 1, method: "password" }), receiptId]);
      await client.query("insert into outbox_events (topic,aggregate_type,aggregate_id,payload,event_key,correlation_id) values ('account.provisioned','account',$1,$2::jsonb,$3,$3)", [accountId, JSON.stringify({ resourceId: accountId, revision: 1 }), receiptId]);
      await client.query("COMMIT");
      return { account, created: true };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async provisionNeonAccount(input: {
    authUserId: string;
    email: string;
    displayName: string;
    passwordHash: string;
    emailVerified: boolean;
  } & Partial<CreatorSignupIdentity>): Promise<{ account: Account; created: boolean }> {
    const client = await this.database.connect();
    try {
      await client.query("BEGIN");
      await client.query("select pg_advisory_xact_lock(hashtext($1)), pg_advisory_xact_lock(hashtext($2))", [`auth:${input.authUserId}`, `email:${input.email}`]);
      const mapped = await client.query<AccountRow>("select id,email,data from radar_accounts where data->>'authProvider'='neon-auth' and data->>'authUserId'=$1 for update", [input.authUserId]);
      if (mapped.rows[0]) {
        const account = accountFromRow(mapped.rows[0]);
        if (account.active === false) throw new CreatorAccountProvisionError("inactive");
        await ensureCreatorProductRows(client, account);
        await client.query("COMMIT");
        return { account, created: false };
      }
      const existing = await client.query<AccountRow>("select id,email,data from radar_accounts where lower(email)=lower($1) for update", [input.email]);
      if (existing.rows[0]) {
        const account = accountFromRow(existing.rows[0]);
        if (account.authUserId && account.authUserId !== input.authUserId) throw new CreatorAccountProvisionError("identity-conflict");
        if (!input.emailVerified) throw new CreatorAccountProvisionError("verification-required");
        const linked: Account = { ...account, authProvider: "neon-auth", authUserId: input.authUserId };
        await client.query("update radar_accounts set data=$2::jsonb, updated_at=now() where id=$1", [account.id, JSON.stringify(linked)]);
        await ensureCreatorProductRows(client, linked);
        await client.query("COMMIT");
        return { account: linked, created: false };
      }

      const accountId = `acct_${randomUUID()}`;
      const userId = `user_${randomUUID()}`;
      const now = new Date().toISOString();
      const account: Account = {
        id: accountId, email: input.email, passwordHash: input.passwordHash,
        authProvider: "neon-auth", authUserId: input.authUserId, userId,
        isAdmin: false, createdAt: now, displayName: input.displayName,
        givenName: input.givenName, familyName: input.familyName, usesSingleName: input.usesSingleName, active: true,
      };
      await client.query("insert into radar_accounts (id,email,data) values ($1,$2,$3::jsonb)", [accountId, input.email, JSON.stringify(account)]);
      await client.query("insert into creator_profiles (account_id,user_id,display_name,given_name,family_name,uses_single_name) values ($1,$2,$3,$4,$5,$6)", [accountId, userId, input.displayName, input.givenName ?? null, input.familyName ?? null, input.usesSingleName ?? false]);
      await client.query("insert into opportunity_preferences (account_id) values ($1)", [accountId]);
      await client.query("insert into notification_preferences (account_id) values ($1)", [accountId]);
      await client.query("insert into creator_product_states (account_id) values ($1) on conflict (account_id) do nothing", [accountId]).catch(() => undefined);
      const receiptId = randomUUID();
      await client.query(
        `insert into workspace_command_receipts
          (id,scope_type,scope_id,actor_account_id,command_type,idempotency_key,request_hash,result,correlation_id)
         values ($1,'owner',$2,$2,'account.provision',$3,$3,$4::jsonb,$5)`,
        [receiptId, accountId, input.authUserId, JSON.stringify({ resourceType: "account", resourceId: accountId, revision: 1, receiptId, replayed: false }), receiptId],
      );
      await client.query("insert into audit_events (account_id,action,target_type,target_id,detail,correlation_id) values ($1,'account.provisioned','account',$1,$2::jsonb,$3)", [accountId, JSON.stringify({ receiptId, revision: 1 }), receiptId]);
      await client.query("insert into outbox_events (topic,aggregate_type,aggregate_id,payload,event_key,correlation_id) values ('account.provisioned','account',$1,$2::jsonb,$3,$3)", [accountId, JSON.stringify({ resourceId: accountId, revision: 1 }), receiptId]);
      await client.query("COMMIT");
      return { account, created: true };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateOnboardingProfile(accountId: string, input: CreatorSignupIdentity & { countryCode: string; countryName: string; city?: string; timezone: string }): Promise<void> {
    const client = await this.database.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query<AccountRow>("select id,email,data from radar_accounts where id=$1 for update", [accountId]);
      const row = current.rows[0];
      if (!row) throw new CreatorAccountProvisionError("identity-conflict");
      const updated: Account = { ...accountFromRow(row), displayName: input.displayName, givenName: input.givenName, familyName: input.familyName, usesSingleName: input.usesSingleName };
      await client.query("update radar_accounts set data=$2::jsonb, updated_at=now() where id=$1", [accountId, JSON.stringify(updated)]);
      const profileUpdate = await client.query(
        `update creator_profiles set display_name=$2, given_name=$3, family_name=$4,
           uses_single_name=$5, country_code=$6, city=$7, timezone=$8,
           location=concat_ws(', ', nullif($7, ''), $9), revision=revision+1, updated_at=now()
         where account_id=$1`,
        [accountId, input.displayName, input.givenName, input.familyName ?? null, input.usesSingleName, input.countryCode, input.city ?? null, input.timezone, input.countryName],
      );
      if (profileUpdate.rowCount !== 1) throw new CreatorAccountProvisionError("identity-conflict");
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally { client.release(); }
  }
}
