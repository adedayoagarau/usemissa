import "server-only";
import { boundedZoteroText } from "./writing-zotero-body";
import { zoteroSource } from "./writing-zotero";
export type ZoteroCredentials = { userId: string; apiKey: string };
export class ZoteroFailure extends Error {
  constructor(public status: number) {
    super(
      "Zotero could not be reached. Check your connection and read permissions, then try again.",
    );
  }
}
export async function zoteroItems(
  credentials: ZoteroCredentials,
  search: string,
  start: number,
  fetcher: typeof fetch = fetch,
) {
  const url = new URL(
    `https://api.zotero.org/users/${credentials.userId}/items/top`,
  );
  url.searchParams.set("limit", "25");
  url.searchParams.set("start", String(start));
  url.searchParams.set("format", "json");
  url.searchParams.set("include", "data");
  url.searchParams.set(
    "itemType",
    "journalArticle || book || report || webpage",
  );
  url.searchParams.set("sort", "title");
  if (search) url.searchParams.set("q", search);
  let response: Response;
  try {
    response = await fetcher(url, {
      headers: {
        "Zotero-API-Key": credentials.apiKey,
        "Zotero-API-Version": "3",
      },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new ZoteroFailure(502);
  }
  if (!response.ok)
    throw new ZoteroFailure(
      response.status === 403 ? 403 : response.status === 429 ? 429 : 502,
    );
  if (Number(response.headers.get("content-length") ?? 0) > 2000000)
    throw new ZoteroFailure(502);
  const reader = response.body?.getReader();
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  if (!reader) throw new ZoteroFailure(502);
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    bytes += part.value.byteLength;
    if (bytes > 2000000) {
      await reader.cancel();
      throw new ZoteroFailure(502);
    }
    chunks.push(part.value);
  }
  const merged = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  let data: unknown;
  try {
    data = JSON.parse(new TextDecoder().decode(merged));
  } catch {
    throw new ZoteroFailure(502);
  }
  if (!Array.isArray(data) || data.length > 25) throw new ZoteroFailure(502);
  return {
    sources: data
      .map((item) => zoteroSource(item, credentials.userId))
      .filter((source) => source !== null),
    nextStart: data.length === 25 ? start + 25 : null,
  };
}
/** /keys/current keeps the secret in a header and verifies identity/least privilege. */
export async function verifyZoteroCredential(
  credentials: ZoteroCredentials,
  fetcher: typeof fetch = fetch,
) {
  let response: Response;
  try {
    response = await fetcher("https://api.zotero.org/keys/current", {
      headers: {
        "Zotero-API-Key": credentials.apiKey,
        "Zotero-API-Version": "3",
      },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new ZoteroFailure(502);
  }
  if (!response.ok)
    throw new ZoteroFailure(response.status === 403 ? 403 : 502);
  const raw = await boundedZoteroText(response.body, 32000);
  if (raw.length > 32000) throw new ZoteroFailure(502);
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new ZoteroFailure(502);
  }
  if (
    String(data.userID) !== credentials.userId ||
    data.access?.user?.library !== true
  )
    throw new ZoteroFailure(403);
  const user = data.access.user,
    groups = data.access.groups;
  if (
    user.write === true ||
    user.notes === true ||
    user.files === true ||
    (groups && Object.keys(groups).length > 0)
  )
    throw new ZoteroFailure(403);
}
