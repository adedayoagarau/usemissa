import { uploadDriveCopy } from "./writing-google-drive";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test, after } from "node:test";
import { creatorPoolFor } from "@missa/radar-adapters";
import {
  sealWritingCredential,
  openWritingCredential,
  saveWritingConnection,
  getWritingConnection,
  deleteWritingConnection,
  createWritingOAuthState,
  consumeWritingOAuthState,
  driveExportFileId,
} from "./writing-connections";
test("authenticated encrypted credential binds account/provider and rejects ciphertext tampering", () => {
  const sealed = sealWritingCredential(
    "account-a",
    "google-drive",
    "private-refresh",
  );
  assert.ok(!sealed.includes("private-refresh"));
  assert.equal(
    openWritingCredential("account-a", "google-drive", sealed),
    "private-refresh",
  );
  assert.throws(() =>
    openWritingCredential("account-b", "google-drive", sealed),
  );
  assert.throws(() => openWritingCredential("account-a", "zotero", sealed));
  const parts = sealed.split(".");
  parts[3] = "bad";
  assert.throws(() =>
    openWritingCredential("account-a", "google-drive", parts.join(".")),
  );
});
const databaseUrl = process.env.DATABASE_URL;
const id = "drive-test-" + randomUUID();
after(async () => {
  if (databaseUrl) {
    const pool = creatorPoolFor(databaseUrl);
    await pool.query("delete from radar_accounts where id=$1", [id]);
    await pool.end();
  }
});
test(
  "real database credentials, OAuth single use and export payload binding",
  { skip: !databaseUrl },
  async () => {
    const pool = creatorPoolFor(databaseUrl!);
    await pool.query(
      "insert into radar_accounts(id,email,data) values($1,$2,'{}'::jsonb)",
      [id, id + "@example.invalid"],
    );
    await saveWritingConnection(id, "google-drive", "refresh");
    assert.equal(await getWritingConnection(id, "google-drive"), "refresh");
    assert.equal(await getWritingConnection("stranger", "google-drive"), null);
    assert.equal(await getWritingConnection(id, "zotero"), null);
    const state = await createWritingOAuthState(
      id,
      "https://missa.test/callback",
      "/doc?entry=writing_test",
    );
    assert.equal(await consumeWritingOAuthState("stranger", state.state), null);
    const consumed = await consumeWritingOAuthState(id, state.state);
    assert.ok(consumed?.verifier);
    assert.equal(consumed?.returnPath, "/doc?entry=writing_test");
    assert.equal(await consumeWritingOAuthState(id, state.state), null);
    const expired = await createWritingOAuthState(
      id,
      "https://missa.test/callback",
    );
    await pool.query(
      "update creator_writing_oauth_states set expires_at=now()-interval '1 minute' where account_id=$1",
      [id],
    );
    assert.equal(await consumeWritingOAuthState(id, expired.state), null);
    const operation = randomUUID();
    assert.equal(
      await driveExportFileId(id, operation, "a".repeat(64), "firstFile"),
      "firstFile",
    );
    assert.equal(
      await driveExportFileId(id, operation, "a".repeat(64), "secondFile"),
      "firstFile",
    );
    await assert.rejects(() =>
      driveExportFileId(id, operation, "b".repeat(64)),
    );
    assert.equal(
      await driveExportFileId("stranger", operation, "a".repeat(64)),
      null,
    );
    const originalFetch = globalThis.fetch;
    const exportOperation = randomUUID();
    let stored = false,
      uploads = 0,
      generated = 0;
    globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
      const path = String(url);
      if (path.includes("generateIds")) {
        generated++;
        return Response.json({ ids: ["stable_drive_file"] });
      }
      if (path.includes("upload/drive")) {
        uploads++;
        const data = new TextDecoder().decode(init!.body as Uint8Array);
        assert.ok(data.includes('"id":"stable_drive_file"'));
        assert.ok(data.includes("DOCX bytes"));
        stored = true;
        return new Response("lost response", { status: 502 });
      }
      return stored
        ? Response.json({
            id: "stable_drive_file",
            name: "Draft.docx",
            appProperties: { missaOperationId: exportOperation },
          })
        : new Response("not found", { status: 404 });
    }) as typeof fetch;
    try {
      await assert.rejects(() =>
        uploadDriveCopy(
          id,
          "test-token",
          exportOperation,
          "Draft.docx",
          new TextEncoder().encode("DOCX bytes"),
          "c".repeat(64),
        ),
      );
      const copy = await uploadDriveCopy(
        id,
        "test-token",
        exportOperation,
        "Draft.docx",
        new TextEncoder().encode("different ZIP timestamps"),
        "c".repeat(64),
      );
      assert.equal(copy.id, "stable_drive_file");
      assert.equal(uploads, 1);
      assert.equal(generated, 1);
      await assert.rejects(() =>
        uploadDriveCopy(
          id,
          "test-token",
          exportOperation,
          "Other.docx",
          new Uint8Array(),
          "d".repeat(64),
        ),
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
    await deleteWritingConnection(id, "google-drive");
    assert.equal(await getWritingConnection(id, "google-drive"), null);
  },
);
