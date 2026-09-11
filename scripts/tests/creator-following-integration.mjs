import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import nextEnv from "@next/env";
import { creatorPoolFor, creatorCommandEnvelope } from "@missa/radar-adapters";
import { creatorTestDatabase } from "./creator-test-database.mjs";
nextEnv.loadEnvConfig(
  fileURLToPath(new URL("../../apps/web/", import.meta.url)),
  true,
  { info() {}, error() {} },
);
const db = await creatorTestDatabase(process.env.DATABASE_URL, [
  "programs",
  "entities",
  "gary_profiles",
  "radar_organizations",
  "opportunity_url_observations",
  "organization_follows",
  "creator_program_follows",
  "creator_follow_editions",
]);
process.env.DATABASE_URL = db.connectionString;
const { CreatorFollowingRepository, tickCreatorFollowing } =
  await import("../../apps/web/lib/creator-following.ts");
const repo = new CreatorFollowingRepository(),
  account = `following-${randomUUID()}`,
  org = "test-organization",
  program = "test-program",
  call = "test-call";
const envelope = (kind, id, revision = 1, key = randomUUID()) =>
  creatorCommandEnvelope(
    account,
    "following.test",
    key,
    { kind, id },
    revision,
  );
const alerts = async () =>
  (
    await db.pool.query(
      "select * from creator_inbox_alerts where account_id=$1",
      [account],
    )
  ).rows;
try {
  await db.pool.query(
    "insert into radar_accounts(id,email,data) values($1,$2,$3)",
    [
      account,
      `${account}@example.invalid`,
      JSON.stringify({ id: account, userId: account }),
    ],
  );
  await db.pool.query(
    "insert into notification_preferences(account_id) values($1)",
    [account],
  );
  await db.pool.query(
    "insert into radar_organizations(id,data) values($1,$2)",
    [org, JSON.stringify({ id: org, name: "Creative Foundation" })],
  );
  await db.pool.query(
    "insert into entities(id,organization_id,name) values('test-entity',$1,'Creative Foundation')",
    [org],
  );
  await db.pool.query(
    "insert into programs(id,entity_id,name) values($1,'test-entity','Annual Fellowship')",
    [program],
  );
  await db.pool.query(
    `insert into opportunities select (jsonb_populate_record(null::opportunities,to_jsonb(o)||jsonb_build_object('id',$1::text,'organization_id',$2::text,'program_id',$3::text,'title','Annual Fellowship 2026','discipline','writing','genres',jsonb_build_array('poetry'),'status','closed','publication_state','published','deadline_kind','exact','deadline_date',(current_date+30)::text,'edition_label','2026'))).* from public.opportunities o limit 1`,
    [call, org, program],
  );
  await db.pool.query(
    `insert into opportunity_url_observations(id,opportunity_id,program_id,organization_id,source_id,role,url,normalized_url,host,first_party,state,confidence,discovered_at,last_verified_at,extractor_version)
    values('test-evidence',$1,$2,$3,'test-source','guidelines','https://example.invalid/apply','https://example.invalid/apply','example.invalid',true,'verified',1,now(),now(),'test')`,
    [call, program, org],
  );
  const found = await repo.search(account, {
    kind: "program",
    discipline: "poetry",
  });
  assert.equal(found.items[0].id, program);
  assert.equal(
    found.items[0].openCalls,
    0,
    "closed rounds remain discoverable",
  );
  assert.equal(
    (await repo.search(account, { kind: "program", discipline: "music" }))
      .total,
    0,
    "discipline narrows programs",
  );
  const detail = await repo.detail(account, "organization", org);
  assert.equal(detail.programs[0].id, program);
  assert.equal(detail.calls.length, 1);
  const add = envelope("program", program);
  await repo.follow(add, "program", program);
  assert((await repo.follow(add, "program", program)).replayed);
  await repo.follow(envelope("organization", org), "organization", org);
  assert.equal(
    (await repo.search("someone-else", { kind: "program", followed: true }))
      .total,
    0,
    "following stays private",
  );
  assert.equal(
    (await tickCreatorFollowing(account)).delivered,
    0,
    "following a closed round does not announce an opening",
  );
  await db.pool.query("update opportunities set status='open' where id=$1", [
    call,
  ]);
  await Promise.all([
    tickCreatorFollowing(account),
    tickCreatorFollowing(account),
    tickCreatorFollowing(account),
  ]);
  assert.equal(
    (await alerts()).length,
    1,
    "organization and program follows deliver one notice despite concurrent workers",
  );
  assert.equal(
    (await alerts())[0].action_href,
    `/opportunities/${call}`,
    "notification has exact opportunity destination",
  );
  assert.equal(
    (await tickCreatorFollowing(account)).delivered,
    0,
    "same round is not replayed",
  );
  await db.pool.query(
    "update opportunities set edition_label='2027' where id=$1",
    [call],
  );
  assert.equal(
    (await tickCreatorFollowing(account)).delivered,
    1,
    "confirmed new edition has its own notice",
  );
  await db.pool.query(
    "update opportunities set edition_label='2028' where id=$1",
    [call],
  );
  await db.pool.query(
    "update opportunity_url_observations set first_party=false",
  );
  assert.equal(
    (await tickCreatorFollowing(account)).delivered,
    0,
    "third-party evidence is not an opening confirmation",
  );
  await db.pool.query(
    "update opportunity_url_observations set first_party=true",
  );
  await db.pool.query(
    "update notification_preferences set follow_enabled=false where account_id=$1",
    [account],
  );
  assert.equal(
    (await tickCreatorFollowing(account)).delivered,
    0,
    "disabled follow notices respected",
  );
  await db.pool.query(
    "update notification_preferences set follow_enabled=true where account_id=$1",
    [account],
  );
  assert.equal(
    (await tickCreatorFollowing(account)).delivered,
    0,
    "muted rounds are not backfilled later",
  );
  await db.pool.query(
    "update opportunities set publication_state='suppressed' where id=$1",
    [call],
  );
  assert(
    (await repo.detail(account, "program", program)).followed,
    "private follow remains accessible when a public call disappears",
  );
  assert.equal(
    await repo.detail("someone-else", "program", program),
    null,
    "unpublished-only program is not public",
  );
  await assert.rejects(
    repo.unfollow(envelope("program", program, 999), "program", program),
    "stale revision rejected",
  );
  const remove = envelope("program", program);
  await repo.unfollow(remove, "program", program);
  assert((await repo.unfollow(remove, "program", program)).replayed);
  await repo.unfollow(envelope("organization", org), "organization", org);
  await db.pool.query(
    "update opportunities set publication_state='published',edition_label='2029' where id=$1",
    [call],
  );
  assert.equal(
    (await tickCreatorFollowing(account)).delivered,
    0,
    "unfollowing stops future notices",
  );
  await db.pool.query("update opportunities set status='closed' where id=$1", [call]);
  await repo.follow(envelope('program', program), 'program', program);
  await db.pool.query("update opportunities set status='open' where id=$1", [call]);
  const workerOutput = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/run-creator-worker.mjs', '--once', `--account=${account}`], {cwd:fileURLToPath(new URL('../../',import.meta.url)), env:{...process.env,DATABASE_URL:db.connectionString}, stdio:['ignore','pipe','pipe']});
    let output='', errors=''; child.stdout.on('data', b=>output+=b); child.stderr.on('data', b=>errors+=b); child.on('error',reject);
    child.on('exit', code=>code===0?resolve(output):reject(new Error('Background following failed: '+errors.slice(-1500))));
    const timer=setTimeout(()=>{child.kill('SIGTERM');reject(new Error('Worker timed out'));},45000);child.on('exit',()=>clearTimeout(timer));
  });
  assert.match(workerOutput,/"following":\{"processed":1,"delivered":1\}/,'separate process delivered the opening without a browser');
  console.log(
    "PASS: closed-program discovery, discipline, distinct organization detail, private follows, repeat-safe commands, concurrent opening dedupe, official evidence, editions, preferences and unfollow.",
  );
} finally {
  await creatorPoolFor(db.connectionString).end();
  await db.cleanup();
}
