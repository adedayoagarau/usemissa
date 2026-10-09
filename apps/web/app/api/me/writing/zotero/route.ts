import { boundedZoteroText, zoteroSameOrigin } from "@/lib/writing-zotero-body";
import { getSessionAccount } from "@/lib/auth";
import { json } from "../_shared";
import {
  getWritingConnection,
  saveWritingConnection,
  deleteWritingConnection,
} from "@/lib/writing-connections";
import { zoteroCredential, zoteroPage } from "@/lib/writing-zotero";
import {
  zoteroItems,
  ZoteroFailure,
  verifyZoteroCredential,
} from "@/lib/writing-zotero-provider";
async function account(request: Request) {
  return (await getSessionAccount(request.headers.get("cookie")))?.account.id;
}
function failed(error: unknown) {
  return json(
    {
      error:
        error instanceof ZoteroFailure
          ? error.message
          : "Zotero is unavailable here. Try again later.",
    },
    error instanceof ZoteroFailure ? error.status : 503,
  );
}
export async function GET(request: Request) {
  const id = await account(request);
  if (!id) return json({ error: "Not authenticated" }, 401);
  try {
    const saved = await getWritingConnection(id, "zotero");
    if (!saved) return json({ connected: false, sources: [], nextStart: null });
    const credential = zoteroCredential(JSON.parse(saved));
    if (!credential)
      return json({ error: "Reconnect Zotero to continue." }, 409);
    const url = new URL(request.url);
    if (url.searchParams.get("status") === "1")
      return json({ connected: true, userId: credential.userId });
    const start = zoteroPage(url.searchParams.get("start"));
    if (start === null) return json({ error: "Page is not valid." }, 400);
    const search = url.searchParams.get("q") ?? "";
    if (search.length > 200) return json({ error: "Search is too long." }, 400);
    return json({
      connected: true,
      ...(await zoteroItems(credential, search, start)),
    });
  } catch (error) {
    return failed(error);
  }
}
export async function POST(request: Request) {
  const id = await account(request);
  if (!id) return json({ error: "Not authenticated" }, 401);
  if (!zoteroSameOrigin(request))
    return json({ error: "Request origin is not valid." }, 403);
  if (Number(request.headers.get("content-length") ?? 0) > 2048)
    return json({ error: "Connection details are too large." }, 413);
  let raw: string;
  try {
    raw = await boundedZoteroText(request.body, 2048);
  } catch {
    return json({ error: "Connection details are too large." }, 413);
  }
  if (raw.length > 2048)
    return json({ error: "Connection details are too large." }, 413);
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return json({ error: "Connection details are not valid." }, 400);
  }
  const credential = zoteroCredential(data);
  if (!credential)
    return json(
      { error: "Enter your numeric Zotero user ID and dedicated API key." },
      400,
    );
  try {
    await verifyZoteroCredential(credential);
    await saveWritingConnection(id, "zotero", JSON.stringify(credential));
    return json({ connected: true, userId: credential.userId });
  } catch (error) {
    return failed(error);
  }
}
export async function DELETE(request: Request) {
  const id = await account(request);
  if (!id) return json({ error: "Not authenticated" }, 401);
  if (!zoteroSameOrigin(request))
    return json({ error: "Request origin is not valid." }, 403);
  try {
    await deleteWritingConnection(id, "zotero");
    return json({ connected: false });
  } catch (error) {
    return failed(error);
  }
}
