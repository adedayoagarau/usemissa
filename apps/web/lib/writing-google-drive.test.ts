import assert from "node:assert/strict";
import { test } from "node:test";
import {
  boundedDriveBytes,
  downloadDriveWriting,
  DOCX_MIME,
  GOOGLE_DOC_MIME,
  validDriveFileId,
  writingDriveMutationOrigin,
} from "./writing-google-drive";
test("Drive downloads Docs through export, DOCX through media, with no arbitrary host", async () => {
  for (const mime of [GOOGLE_DOC_MIME, DOCX_MIME, "text/plain"]) {
    const calls: string[] = [];
    const fetcher = (async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push(String(url));
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        "Bearer token",
      );
      return calls.length === 1
        ? Response.json({
            mimeType: mime,
            name: "My writing",
            capabilities: { canDownload: true },
          })
        : new Response("safe bytes");
    }) as typeof fetch;
    const result = await downloadDriveWriting(
      "token",
      "selected_file",
      fetcher,
    );
    assert.equal(result.name, "My writing");
    assert.equal(result.mime, mime === "text/plain" ? "text/plain" : DOCX_MIME);
    assert.ok(
      calls.every((url) => url.startsWith("https://www.googleapis.com/")),
    );
    assert.ok(
      calls[1]!.includes(mime === GOOGLE_DOC_MIME ? "/export?" : "alt=media"),
    );
  }
});
test("Drive download refuses unsupported, locked, oversized and bad IDs", async () => {
  assert.equal(validDriveFileId("https://evil.test"), false);
  await assert.rejects(() => downloadDriveWriting("token", "bad/url"));
  for (const metadata of [
    { mimeType: "application/pdf" },
    { mimeType: DOCX_MIME, capabilities: { canDownload: false } },
    { mimeType: DOCX_MIME, size: 100000000 },
  ]) {
    await assert.rejects(() =>
      downloadDriveWriting("token", "selected_file", (async () =>
        Response.json(metadata)) as typeof fetch),
    );
  }
  await assert.rejects(() =>
    boundedDriveBytes(
      new Response("huge", { headers: { "content-length": "999" } }),
      3,
    ),
  );
  let canceled = false;
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(4));
    },
    cancel() {
      canceled = true;
    },
  });
  await assert.rejects(() => boundedDriveBytes(new Response(stream), 3));
  assert.equal(canceled, true);
});

test("Drive mutations require same-origin scheme and Host", () => {
  const request = (origin?: string) =>
    new Request("https://internal.missa/api", {
      headers: { host: "usemissa.com", ...(origin ? { origin } : {}) },
    });
  assert.equal(
    writingDriveMutationOrigin(request("https://usemissa.com")),
    true,
  );
  for (const origin of [
    undefined,
    "null",
    "https://evil.test",
    "http://usemissa.com",
  ])
    assert.equal(writingDriveMutationOrigin(request(origin)), false);
});
