import type { Pool } from "pg";

export type AccountDeletionStatus =
  "pending" | "processing" | "failed" | "completed";
export type AccountDeletionStage =
  | "prepared"
  | "auth-erased"
  | "workspace-erased"
  | "radar-erased"
  | "assets-erased"
  | "completed";

export interface AccountDeletionRequest {
  id: string;
  accountId: string;
  userId?: string;
  authProvider?: string;
  authUserId?: string;
  status: AccountDeletionStatus;
  stage: AccountDeletionStage;
  publicAssetUrls: string[];
  privateAssetRefs: string[];
  retainedSubmissions: number;
  retainedCompletedReviews: number;
  attemptCount: number;
  lastError?: string;
  requestedAt: string;
  updatedAt: string;
  completedAt?: string;
}

type RequestRow = {
  id: string;
  account_id: string;
  user_id: string | null;
  auth_provider: string | null;
  auth_user_id: string | null;
  status: AccountDeletionStatus;
  stage: AccountDeletionStage;
  public_asset_urls: unknown;
  private_asset_refs: unknown;
  retained_submissions: number;
  retained_completed_reviews: number;
  attempt_count: number;
  last_error: string | null;
  requested_at: Date | string;
  updated_at: Date | string;
  completed_at: Date | string | null;
};

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function requestFromRow(row: RequestRow): AccountDeletionRequest {
  return {
    id: row.id,
    accountId: row.account_id,
    ...(row.user_id ? { userId: row.user_id } : {}),
    ...(row.auth_provider ? { authProvider: row.auth_provider } : {}),
    ...(row.auth_user_id ? { authUserId: row.auth_user_id } : {}),
    status: row.status,
    stage: row.stage,
    publicAssetUrls: strings(row.public_asset_urls),
    privateAssetRefs: strings(row.private_asset_refs),
    retainedSubmissions: row.retained_submissions,
    retainedCompletedReviews: row.retained_completed_reviews,
    attemptCount: row.attempt_count,
    ...(row.last_error ? { lastError: row.last_error } : {}),
    requestedAt: new Date(row.requested_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    ...(row.completed_at
      ? { completedAt: new Date(row.completed_at).toISOString() }
      : {}),
  };
}

const SELECT_COLUMNS = `id, account_id, user_id, auth_provider, auth_user_id,
  status, stage, public_asset_urls, private_asset_refs,
  retained_submissions, retained_completed_reviews, attempt_count, last_error,
  requested_at, updated_at, completed_at`;

export class PostgresAccountDeletionQueue {
  constructor(private readonly pool: Pool) {}

  async available(): Promise<boolean> {
    const result = await this.pool.query<{ present: string | null }>(
      "select to_regclass('public.account_deletion_requests') as present",
    );
    return Boolean(result.rows[0]?.present);
  }

  async prepare(input: {
    accountId: string;
    userId?: string;
    authProvider?: string;
    authUserId?: string;
    publicAssetUrls: string[];
    privateAssetRefs: string[];
  }): Promise<AccountDeletionRequest> {
    const result = await this.pool.query<RequestRow>(
      `insert into account_deletion_requests
         (account_id, user_id, auth_provider, auth_user_id, public_asset_urls, private_asset_refs)
       values ($1, $2, $3, $4, $5::jsonb, $6::jsonb)
       on conflict (account_id) do update set
         public_asset_urls = case when account_deletion_requests.status = 'completed' then account_deletion_requests.public_asset_urls else excluded.public_asset_urls end,
         private_asset_refs = case when account_deletion_requests.status = 'completed' then account_deletion_requests.private_asset_refs else excluded.private_asset_refs end,
         updated_at = now()
       returning ${SELECT_COLUMNS}`,
      [
        input.accountId,
        input.userId ?? null,
        input.authProvider ?? null,
        input.authUserId ?? null,
        JSON.stringify(input.publicAssetUrls),
        JSON.stringify(input.privateAssetRefs),
      ],
    );
    return requestFromRow(result.rows[0]!);
  }

  async claimByAccount(
    accountId: string,
  ): Promise<AccountDeletionRequest | undefined> {
    const result = await this.pool.query<RequestRow>(
      `update account_deletion_requests
          set status = 'processing', attempt_count = attempt_count + 1,
              last_error = null, updated_at = now()
        where account_id = $1 and status <> 'completed'
          and (status in ('pending', 'failed') or updated_at < now() - interval '10 minutes')
       returning ${SELECT_COLUMNS}`,
      [accountId],
    );
    return result.rows[0] ? requestFromRow(result.rows[0]) : undefined;
  }

  async claimNext(): Promise<AccountDeletionRequest | undefined> {
    const result = await this.pool.query<RequestRow>(
      `with candidate as (
         select id from account_deletion_requests
          where stage <> 'prepared'
            and (status in ('pending', 'failed')
             or (status = 'processing' and updated_at < now() - interval '10 minutes'))
          order by requested_at asc
          for update skip locked
          limit 1
       )
       update account_deletion_requests request
          set status = 'processing', attempt_count = request.attempt_count + 1,
              last_error = null, updated_at = now()
         from candidate where request.id = candidate.id
       returning ${SELECT_COLUMNS}`,
    );
    return result.rows[0] ? requestFromRow(result.rows[0]) : undefined;
  }

  async advance(
    id: string,
    stage: AccountDeletionStage,
    retained?: { submissions: number; completedReviews: number },
  ): Promise<void> {
    await this.pool.query(
      `update account_deletion_requests
          set stage = $2,
              retained_submissions = coalesce($3, retained_submissions),
              retained_completed_reviews = coalesce($4, retained_completed_reviews),
              updated_at = now()
        where id = $1`,
      [
        id,
        stage,
        retained?.submissions ?? null,
        retained?.completedReviews ?? null,
      ],
    );
  }

  async fail(id: string, message: string): Promise<void> {
    await this.pool.query(
      `update account_deletion_requests
          set status = 'failed', last_error = $2, updated_at = now()
        where id = $1`,
      [id, message.slice(0, 500)],
    );
  }

  async complete(id: string): Promise<void> {
    await this.pool.query(
      `update account_deletion_requests
          set status = 'completed', stage = 'completed', last_error = null,
              completed_at = now(), updated_at = now(), auth_user_id = null
        where id = $1`,
      [id],
    );
  }
}
