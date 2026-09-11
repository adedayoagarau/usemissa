import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import nextEnv from "@next/env";
import { creatorPoolFor, updateCanonicalTrackerStatus } from "@missa/radar-adapters";

nextEnv.loadEnvConfig(fileURLToPath(new URL("../../apps/web/", import.meta.url)), true, { info() {}, error() {} });
const pool = creatorPoolFor(process.env.DATABASE_URL);
const account = `legacy-snapshot-test-${randomUUID()}`;
const tracked = `legacy-tracked-${randomUUID()}`;
const work = `legacy-work-${randomUUID()}`;
const file = `legacy-file-${randomUUID()}`;
try {
  await pool.query("insert into radar_accounts(id,email,data) values($1,$2,$3)", [account, `${account}@example.invalid`, JSON.stringify({ id: account })]);
  const call = (await pool.query("select id from opportunities where publication_state='published' and status in ('open','closing-soon','deadline-extended') order by id limit 1")).rows[0];
  assert(call);
  await pool.query("insert into creator_library_works(id,account_id,title,description,metadata) values($1,$2,$3,$4,$5)", [work, account, "Legacy work", "Description", JSON.stringify({})]);
  await pool.query("insert into creator_library_files(id,account_id,work_id,storage_key,name) values($1,$2,$3,$4,$5)", [file, account, work, `legacy/${file}`, "Legacy.pdf"]);
  await pool.query("insert into tracked_opportunities(id,account_id,opportunity_id,status,work_id) values($1,$2,$3,'saved',$4)", [tracked, account, call.id, work]);
  const event = await updateCanonicalTrackerStatus(process.env.DATABASE_URL, account, call.id, "submitted", { expectedRevision: 1, occurredOn: new Date().toISOString().slice(0, 10), source: "user" });
  assert.equal(event?.tracked.myStatus, "submitted");
  const version = (await pool.query("select materials from application_material_versions where account_id=$1 and tracked_opportunity_id=$2", [account, tracked])).rows[0];
  assert(version);
  assert.equal(version.materials.works[0].title, "Legacy work");
  assert.equal(version.materials.files[0].name, "Legacy.pdf");
  console.log("PASS: legacy tracker submission preserves immutable application materials.");
} finally {
  await pool.query("delete from tracked_opportunities where account_id=$1", [account]);
  await pool.query("delete from creator_library_files where account_id=$1", [account]);
  await pool.query("delete from radar_accounts where id=$1", [account]);
  await pool.end();
}
