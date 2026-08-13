import test from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { createBenchmarkSources } from "../src/adapters/html.js";
import { PostgresShadowRunStore, ensureIngestionV2Schema } from "../src/persistence.js";
import type { ShadowArtifact } from "../src/execution.js";

const databaseUrl = process.env.DATABASE_URL;

test("persists and reads a shadow artifact with Postgres", { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const source = createBenchmarkSources()[0]!;
  const runId = `ingv2_pg_test_${Date.now()}`;
  const artifact: ShadowArtifact = {
    run: { id: runId, sourceId: source.id, trigger: "shadow", mode: "shadow", status: "completed", createdAt: new Date().toISOString() },
    snapshot: { id: `${runId}_snapshot`, runId, sourceId: source.id, url: source.url, finalUrl: source.url, fetchedAt: new Date().toISOString(), statusCode: 200, contentType: "text/html", contentHash: "test-hash", html: "<h1>Postgres smoke</h1>", rendered: false },
    relatedSnapshots: [{ id: `${runId}_detail`, runId, sourceId: source.id, url: "https://example.test/detail", finalUrl: "https://example.test/detail", fetchedAt: new Date().toISOString(), statusCode: 200, contentType: "text/html", contentHash: "detail-hash", html: "<h1>Detail</h1>", rendered: false }],
    extraction: {
      fields: [{ fieldName: "title", rawValue: "Postgres smoke", normalizedValue: "Postgres smoke", confidence: 0.9, provenance: { adapterId: "test", method: "fixture", sourceUrl: source.url, snapshotId: `${runId}_snapshot` } }],
      candidateLinks: [{ url: "https://example.test/apply", title: "Apply" }],
      warnings: [],
    },
    quality: { decision: "review", score: 0.9, reasons: [] },
    published: false,
  };
  try {
    await ensureIngestionV2Schema(pool);
    const store = new PostgresShadowRunStore(pool);
    await store.save(artifact);
    const read = await store.get(runId);
    assert.equal(read?.run.id, runId);
    assert.equal(read?.published, false);
    assert.equal(read?.relatedSnapshots?.length, 1);
    assert.equal(read?.quality?.decision, "review");
    assert.equal(read?.extraction.fields[0]?.normalizedValue, "Postgres smoke");
  } finally {
    await pool.query("delete from missa_ingestion_v2_runs where id = $1", [runId]).catch(() => undefined);
    await pool.end();
  }
});
