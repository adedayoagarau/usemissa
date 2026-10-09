import { parseRevisionTools, revisionToolsKey } from "./writing-revision-tools.ts";

/** Whole-project backup cannot silently choose between divergent private notes. */
export async function collectProjectRevisionBackup(
  pieceIds: string[],
  accountKey: string,
  read: (key: string) => string | null,
  fetcher: typeof fetch = fetch,
): Promise<Record<string, string | null>> {
  const rows = await Promise.all(pieceIds.map(async id => {
    const response = await fetcher(`/api/me/writing/tools/revisions/${encodeURIComponent(id)}`, {
      cache: "no-store", signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error("Account revision notes could not be checked. Retry online before downloading a whole-project backup.");
    const result = await response.json();
    if (!Number.isSafeInteger(result.record?.revision) || result.record.revision < 0)
      throw new Error("Account revision notes could not be checked. Retry before downloading a whole-project backup.");
    const account = parseRevisionTools(JSON.stringify(result.record.data));
    // Read after the request so notes changed while it was pending are retained.
    const raw = read(revisionToolsKey(accountKey, id));
    const local = raw === null ? null : parseRevisionTools(raw);
    if (local && result.record.revision > 0 && JSON.stringify(local) !== JSON.stringify(account))
      throw new Error("Device and account revision notes differ. Open Revise for the affected pieces, keep or download both copies, then retry the whole-project backup.");
    return [id, raw ?? JSON.stringify(account)] as const;
  }));
  return Object.fromEntries(rows);
}
