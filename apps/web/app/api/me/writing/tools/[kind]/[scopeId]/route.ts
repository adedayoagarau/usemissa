import { writingSession, json } from "../../../_shared";
import { writingToolKind, parseToolData } from "@/lib/writing-tool-data";
import { isWritingEntryId } from "@/lib/writing";
import { boundedZoteroText, zoteroSameOrigin } from "@/lib/writing-zotero-body";
type Context = { params: Promise<{ kind: string; scopeId: string }> };
async function prepare(request: Request, context: Context) {
  const session = await writingSession(request);
  if ("response" in session) return session;
  const params = await context.params;
  const kind = writingToolKind.safeParse(params.kind);
  if (
    !kind.success ||
    (kind.data === "dictionary"
      ? params.scopeId !== "account"
      : !isWritingEntryId(params.scopeId))
  )
    return {
      response: json({ error: "Writing tool scope is not valid." }, 400),
    };
  return { ...session, kind: kind.data, scopeId: params.scopeId };
}
export async function GET(request: Request, context: Context) {
  const p = await prepare(request, context);
  if ("response" in p) return p.response;
  try {
    const record = await p.repository.getToolRecord(
      p.accountId,
      p.kind,
      p.scopeId,
    );
    return record ? json({ record }) : json({ error: "Piece not found." }, 404);
  } catch {
    return json(
      { error: "Account notes are unavailable. Your device copy is kept." },
      503,
    );
  }
}
export async function PUT(request: Request, context: Context) {
  const p = await prepare(request, context);
  if ("response" in p) return p.response;
  if (!zoteroSameOrigin(request))
    return json({ error: "Request origin is not valid." }, 403);
  let body;
  try {
    body = JSON.parse(await boundedZoteroText(request.body, 1100000));
    if (!Number.isSafeInteger(body.baseRevision) || body.baseRevision < 0)
      throw new Error();
    body.data = parseToolData(p.kind, body.data);
  } catch {
    return json({ error: "Writing tool data or size is not valid." }, 400);
  }
  try {
    const saved = await p.repository.saveToolRecord(
      p.accountId,
      p.kind,
      p.scopeId,
      body.data,
      body.baseRevision,
    );
    return saved.kind === "saved"
      ? json({ record: saved.record })
      : saved.kind === "conflict"
        ? json({ current: saved.current }, 409)
        : json({ error: "Piece not found." }, 404);
  } catch {
    return json(
      { error: "Account save failed. Your device copy is kept." },
      503,
    );
  }
}
