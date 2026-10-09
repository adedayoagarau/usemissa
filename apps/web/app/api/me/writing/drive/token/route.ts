import { driveSession, json } from "../_shared";
import { driveAccessToken, driveConfig } from "@/lib/writing-google-drive";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const session = await driveSession(request, true);
  if ("response" in session) return session.response;
  try {
    const token = await driveAccessToken(session.accountId),
      c = driveConfig();
    return json({ accessToken: token, pickerKey: c.pickerKey, appId: c.appId });
  } catch {
    return json({ error: "Reconnect Google Drive and try again." }, 409);
  }
}
