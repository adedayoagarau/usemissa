import pg from 'pg';

const { Pool } = pg;
let poolInstance: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!poolInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set');
    }
    poolInstance = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
    });
  }
  return poolInstance;
}

export interface SubmissionCapStatus {
  hasCap: boolean;
  capType?: 'free_submissions_pool' | 'total_submissions_cap' | 'daily_quota' | 'monthly_quota';
  limitCount?: number;
  currentCount?: number;
  remaining?: number;
  isExhausted?: boolean;
  fallbackFeeCents?: number | null;
  allowed: boolean;
  reason?: string;
}

/**
 * Check if a submission opportunity has an active volume/free cap.
 */
export async function checkOpportunitySubmissionCap(
  opportunityId: string,
  feePaid = false
): Promise<SubmissionCapStatus> {
  if (!process.env.DATABASE_URL) {
    return { hasCap: false, allowed: true };
  }

  try {
    const pool = getPool();
    const res = await pool.query<{
      id: string;
      cap_type: 'free_submissions_pool' | 'total_submissions_cap' | 'daily_quota' | 'monthly_quota';
      limit_count: number;
      current_count: number;
      fallback_fee_cents: number | null;
      resets_at: Date | string | null;
    }>(
      `SELECT id, cap_type, limit_count, current_count, fallback_fee_cents, resets_at
       FROM opportunity_submission_caps
       WHERE opportunity_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [opportunityId]
    );

    if (res.rows.length === 0) {
      return { hasCap: false, allowed: true };
    }

    const cap = res.rows[0];
    const remaining = Math.max(0, cap.limit_count - cap.current_count);
    const isExhausted = remaining <= 0;

    if (isExhausted) {
      if (cap.cap_type === 'total_submissions_cap' || cap.cap_type === 'daily_quota') {
        return {
          hasCap: true,
          capType: cap.cap_type,
          limitCount: cap.limit_count,
          currentCount: cap.current_count,
          remaining: 0,
          isExhausted: true,
          allowed: false,
          reason: 'This submission call has reached its maximum entry capacity and is now closed.',
        };
      }

      if (cap.cap_type === 'free_submissions_pool') {
        if (!feePaid && cap.fallback_fee_cents && cap.fallback_fee_cents > 0) {
          return {
            hasCap: true,
            capType: cap.cap_type,
            limitCount: cap.limit_count,
            currentCount: cap.current_count,
            remaining: 0,
            isExhausted: true,
            fallbackFeeCents: cap.fallback_fee_cents,
            allowed: false,
            reason: `The free submission cap of ${cap.limit_count} has been reached. Submissions now require a $${(cap.fallback_fee_cents / 100).toFixed(2)} reading fee.`,
          };
        }
      }
    }

    return {
      hasCap: true,
      capType: cap.cap_type,
      limitCount: cap.limit_count,
      currentCount: cap.current_count,
      remaining,
      isExhausted,
      fallbackFeeCents: cap.fallback_fee_cents,
      allowed: true,
    };
  } catch (error) {
    console.error('[SUBMISSION_CAP_CHECK_ERROR]', error);
    return { hasCap: false, allowed: true };
  }
}

/**
 * Increment the submission count against the cap and auto-close the call if total limit is reached.
 */
export async function recordSubmissionAgainstCap(opportunityId: string): Promise<void> {
  if (!process.env.DATABASE_URL) return;

  try {
    const pool = getPool();
    const updated = await pool.query<{
      id: string;
      cap_type: string;
      limit_count: number;
      current_count: number;
    }>(
      `UPDATE opportunity_submission_caps
       SET current_count = current_count + 1,
           cap_reached_at = CASE WHEN current_count + 1 >= limit_count THEN now() ELSE cap_reached_at END,
           updated_at = now()
       WHERE opportunity_id = $1
       RETURNING id, cap_type, limit_count, current_count`,
      [opportunityId]
    );

    if (updated.rows.length > 0) {
      const cap = updated.rows[0];
      // If total entry cap is reached, auto-close the opportunity
      if (cap.current_count >= cap.limit_count && (cap.cap_type === 'total_submissions_cap' || cap.cap_type === 'daily_quota')) {
        await pool.query(
          `UPDATE opportunities
           SET status = 'closed', last_changed_at = now(), updated_at = now()
           WHERE id = $1`,
          [opportunityId]
        );
        await pool.query(
          `UPDATE opportunity_call_windows
           SET current = false, updated_at = now()
           WHERE opportunity_id = $1`,
          [opportunityId]
        );
      }
    }
  } catch (error) {
    console.error('[SUBMISSION_CAP_INCREMENT_ERROR]', error);
  }
}
