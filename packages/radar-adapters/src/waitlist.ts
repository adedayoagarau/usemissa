import { randomUUID } from "node:crypto";
import { Pool } from "pg";

export async function createWaitlistSignup(input: {
  connectionString: string;
  email: string;
  source?: string;
  campaign?: Record<string, string>;
}): Promise<{ accepted: boolean; id: string }> {
  const pool = new Pool({ connectionString: input.connectionString, max: 1, connectionTimeoutMillis: 3_000 });
  const id = `waitlist_${randomUUID()}`;

  try {
    const result = await pool.query<{ id: string }>(
      `insert into waitlist_signups (id, email, source, campaign)
       values ($1, lower($2), $3, $4::jsonb)
       on conflict (email) do nothing
       returning id`,
      [id, input.email, input.source?.slice(0, 500) ?? "/waitlist", JSON.stringify(input.campaign ?? {})],
    );

    return { accepted: true, id: result.rows[0]?.id ?? id };
  } finally {
    await pool.end();
  }
}
