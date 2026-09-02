import type { PoolClient } from 'pg';

export interface WorkspaceCommandEnvelope {
  actorAccountId: string;
  organizationId?: string;
  ownerAccountId?: string;
  commandType: string;
  idempotencyKey: string;
  requestHash: string;
  expectedRevision?: number;
  correlationId: string;
  causationId?: string;
}

export interface WorkspaceCommandResult {
  resourceType: string;
  resourceId: string;
  revision: number;
  receiptId: string;
  /** True only when this result came from a previously committed command receipt. */
  replayed: boolean;
  data?: Record<string, unknown>;
}

export interface WorkspaceTransactionRunner {
  transaction<T>(work: (transaction: WorkspaceTransaction) => Promise<T>): Promise<T>;
}

export interface WorkspaceTransaction {
  readonly client: Pick<PoolClient, 'query'>;
}

export interface TenantScopedWorkspaceQueries {
  findOrganizationResource(
    organizationId: string,
    resourceType: string,
    resourceId: string,
  ): Promise<Record<string, unknown> | undefined>;
}
