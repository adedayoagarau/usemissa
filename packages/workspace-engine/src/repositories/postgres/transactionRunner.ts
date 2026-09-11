import type { Pool } from 'pg';
import type { WorkspaceTransaction, WorkspaceTransactionRunner } from '../contracts.js';

export class PostgresWorkspaceTransactionRunner implements WorkspaceTransactionRunner {
  constructor(private readonly pool: Pool) {}

  async transaction<T>(work: (transaction: WorkspaceTransaction) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const result = await work({ client });
      await client.query('commit');
      return result;
    } catch (error) {
      try {
        await client.query('rollback');
      } catch {
        // Preserve the domain/database failure that caused the rollback.
      }
      throw error;
    } finally {
      client.release();
    }
  }
}
