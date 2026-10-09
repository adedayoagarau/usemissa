import { driveSession, json, noStore } from "../_shared";
import {
  driveAccessToken,
  downloadDriveWriting,
} from "@/lib/writing-google-drive";
import { boundedWritingJson } from "@/lib/writing-studio-data";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const session = await driveSession(request, true);
  if ("response" in session) return session.response;
  const body = await boundedWritingJson(request, 1000);
  const fileId =
    body && typeof body === "object" ? Reflect.get(body, "fileId") : undefined;
  if (typeof fileId !== "string")
    return json({ error: "Choose a Google Drive file." }, 400);
  try {
    const file = await downloadDriveWriting(
      await driveAccessToken(session.accountId),
      fileId,
    );
    return new Response(new Uint8Array(file.bytes), {
      headers: {
        ...noStore,
        "Content-Type": file.mime,
        "X-Missa-File-Name": encodeURIComponent(file.name),
      },
    });
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The file could not be imported.",
      },
      400,
    );
  }
}
