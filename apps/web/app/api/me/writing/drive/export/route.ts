import { createHash } from "node:crypto";
import { z } from "zod";
import { driveSession, json } from "../_shared";
import { driveAccessToken, uploadDriveCopy } from "@/lib/writing-google-drive";
import { boundedWritingJson } from "@/lib/writing-studio-data";
import { parseWritingDocument } from "@/lib/writing-document";
import {
  exportDocx,
  exportFilename,
  inspectWritingExport,
} from "@/lib/writing-export";
export const runtime = "nodejs";
export const maxDuration = 60;
const input = z.object({
  operationId: z.string().uuid(),
  document: z.string().max(2000000),
  title: z.string().max(200),
  flattenCanvas: z.boolean(),
});
export async function POST(request: Request) {
  const session = await driveSession(request, true);
  if ("response" in session) return session.response;
  const parsed = input.safeParse(await boundedWritingJson(request, 2300000));
  if (!parsed.success)
    return json({ error: "This writing copy could not be prepared." }, 400);
  const doc = parseWritingDocument(parsed.data.document);
  if (!doc) return json({ error: "This writing document is unreadable." }, 400);
  const report = inspectWritingExport(doc, "docx", parsed.data.flattenCanvas);
  if (report.errors.length)
    return json({ error: report.errors.join(" ") }, 400);
  try {
    const bytes = await exportDocx(doc, {
      title: parsed.data.title || "Untitled",
      author: "",
      language: "en",
      preset: "article",
      flattenCanvas: parsed.data.flattenCanvas,
    });
    if (bytes.length > 10 * 1024 * 1024)
      return json({ error: "This copy is larger than 10 MB." }, 400);
    const file = await uploadDriveCopy(
      session.accountId,
      await driveAccessToken(session.accountId),
      parsed.data.operationId,
      `${exportFilename(parsed.data.title)}.docx`,
      bytes,
      createHash("sha256")
        .update(
          JSON.stringify({
            document: parsed.data.document,
            title: parsed.data.title,
            flattenCanvas: parsed.data.flattenCanvas,
            preset: "article",
          }),
        )
        .digest("hex"),
    );
    return json({ file }, 201);
  } catch {
    return json(
      {
        error:
          "The Drive copy could not be confirmed. Retry to check the same file; your Missa draft is kept.",
      },
      502,
    );
  }
}
