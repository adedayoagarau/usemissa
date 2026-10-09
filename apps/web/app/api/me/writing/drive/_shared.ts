import { getSessionAccount } from "@/lib/auth";
import {
  writingDriveMutationOrigin,
  driveConfigured,
} from "@/lib/writing-google-drive";
export const noStore = { "Cache-Control": "private, no-store" };
export const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: noStore });
export async function driveSession(request: Request, mutation = false) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session)
    return {
      response: json({ error: "Sign in to connect Google Drive." }, 401),
    };
  if (mutation && !writingDriveMutationOrigin(request))
    return {
      response: json({ error: "Open Missa before using Google Drive." }, 403),
    };
  if (!driveConfigured())
    return {
      response: json({ error: "Google Drive is not available here yet." }, 503),
    };
  return { accountId: session.account.id };
}
