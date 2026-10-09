import { driveSession, json } from "./_shared";
import {
  getWritingConnection,
  deleteWritingConnection,
} from "@/lib/writing-connections";
import { getSessionAccount } from "@/lib/auth";
import { driveConfigured } from "@/lib/writing-google-drive";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session)
    return json({ configured: driveConfigured(), connected: false }, 401);
  try {
    return json({
      configured: driveConfigured(),
      connected: Boolean(
        driveConfigured() &&
        (await getWritingConnection(session.account.id, "google-drive")),
      ),
    });
  } catch {
    return json(
      { error: "Google Drive connection could not be checked." },
      503,
    );
  }
}
export async function DELETE(request: Request) {
  const session = await driveSession(request, true);
  if ("response" in session) return session.response;
  try {
    await deleteWritingConnection(session.accountId, "google-drive");
    return json({ disconnected: true });
  } catch {
    return json({ error: "The connection could not be removed. Retry." }, 503);
  }
}
