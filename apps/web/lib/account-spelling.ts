import { resolveSpelling, type Spelling } from './spelling';

type Queryable = {
  query: (text: string, values: unknown[]) => Promise<{ rows: unknown[] }>;
};

/**
 * Each account's spelling from the country on its creator profile: UK for UK
 * accounts, US otherwise. One query for a whole batch of emails; any account
 * missing from the map, or a failed lookup, reads US spelling.
 */
export async function accountSpellings(db: Queryable, accountIds: readonly string[]): Promise<Map<string, Spelling>> {
  const spellings = new Map<string, Spelling>();
  const ids = [...new Set(accountIds)].filter(Boolean);
  if (!ids.length) return spellings;
  try {
    const { rows } = await db.query('select account_id, country_code from creator_profiles where account_id = any($1::text[])', [ids]);
    for (const row of rows as Array<{ account_id: string; country_code: string | null }>) {
      spellings.set(row.account_id, resolveSpelling({ accountCountry: row.country_code }));
    }
  } catch {
    // US spelling for everyone in this batch.
  }
  return spellings;
}
