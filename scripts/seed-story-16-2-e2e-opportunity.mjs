import { Pool } from "pg";

const connectionString = process.env.DISPOSABLE_CREATOR_DATABASE_URL;
if (!connectionString) throw new Error("DISPOSABLE_CREATOR_DATABASE_URL is required");
const databaseName = new URL(connectionString).pathname.slice(1);
if (!/^missa_story_16_2_[a-z0-9_]+$/iu.test(databaseName)) {
  throw new Error("Refusing to seed a non-disposable Story 16.2 database");
}

const pool = new Pool({ connectionString, max: 1 });
const sourceId = "story-16-2-e2e-source";
const opportunityId = "opp_story-16-2-e2e";
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("delete from opportunities where id='story-16-2-e2e-opportunity'");
  await client.query(
    `insert into opportunity_sources(id,name,url,kind,active,last_checked_at,last_successful_fetch_at,last_processed_at)
     values($1,'Story 16.2 browser fixture','https://example.invalid/story-16-2-opportunity','organization-website',true,now(),now(),now())
     on conflict(id) do update set url=excluded.url,kind=excluded.kind,active=true,last_checked_at=now(),last_successful_fetch_at=now(),last_processed_at=now()`,
    [sourceId],
  );
  await client.query(
    `insert into opportunities(id,slug,title,source_id,status,publication_state,type,deadline_kind,fee_status,submission_url,submission_state,source_checked_at,processing_succeeded_at,last_changed_at)
     values($1,'story-16-2-browser-fixture','Story 16.2 Browser Fixture',$2,'open','reviewable','contest','rolling','no-fee','https://example.invalid/story-16-2-submit','available',now(),now(),now())
     on conflict(id) do update set publication_state='reviewable',status='open',source_id=excluded.source_id,deadline_kind='rolling',submission_url=excluded.submission_url,submission_state='available',source_checked_at=now(),processing_succeeded_at=now(),updated_at=now()`,
    [opportunityId, sourceId],
  );
  await client.query(
    `insert into opportunity_source_evidence(id,opportunity_id,source_id,kind,name,url,checked_at,processing_succeeded_at,organization_confirmed,destination_reconciled)
     values('story-16-2-e2e-evidence',$1,$2,'official','Official call','https://example.invalid/story-16-2-opportunity',now(),now(),true,true)
     on conflict(id) do update set checked_at=now(),processing_succeeded_at=now(),organization_confirmed=true,destination_reconciled=true`,
    [opportunityId, sourceId],
  );
  await client.query(
    `insert into opportunity_contents(opportunity_id,input_version,builder_version,content,review_status,review_score,reviewed_at)
     values($1,'story-16-2','story-16-2','{}'::jsonb,'approved',100,now())
     on conflict(opportunity_id) do update set review_status='approved',review_score=100,reviewed_at=now(),updated_at=now()`,
    [opportunityId],
  );
  await client.query("update opportunities set publication_state='published',updated_at=now() where id=$1", [opportunityId]);
  const ada = await client.query("select id,data->>'userId' as user_id from radar_accounts where lower(email)=lower('ada@example.com') limit 1");
  if (ada.rows[0]?.user_id) {
    await client.query(
      `insert into tracked_opportunities(id,account_id,opportunity_id,status,revision)
       values('tracked_story-16-2-e2e-ada',$1,$2,'interested',1)
       on conflict(account_id,opportunity_id) do update set status='interested',revision=tracked_opportunities.revision+1,updated_at=now()`,
      [ada.rows[0].id, opportunityId],
    );
    const now = new Date();
    const candidate = {
      id: "story-16-2-e2e-email-candidate",
      userId: ada.rows[0].user_id,
      provider: "story-16-2-fixture",
      providerMessageId: "story-16-2-e2e-message",
      receivedAt: now.toISOString(),
      senderDomain: "journal.example",
      subject: "Your submission is now in review",
      bodyExcerpt: "Thank you. Your submission is now with our review panel.",
      bodyHash: "story-16-2-private-fixture",
      attachmentMetadata: [],
      classification: "ambiguous",
      state: "pending",
      candidates: [{ opportunityId, title: "Story 16.2 Browser Fixture", organizationName: "Fixture Journal", confidence: "possible", reasons: ["title match"] }],
      proposedStatus: "in-review",
      confidence: "possible",
      warnings: ["ambiguous_match"],
      evidenceReasons: ["private fixture evidence"],
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      sourceMode: "forwarding",
    };
    await client.query(
      `insert into radar_email_candidates(id,user_id,provider,provider_message_id,state,data,revision)
       values($1,$2,$3,$4,'pending',$5::jsonb,1)
       on conflict(id) do update set user_id=excluded.user_id,state='pending',data=excluded.data,revision=radar_email_candidates.revision+1`,
      [candidate.id, candidate.userId, candidate.provider, candidate.providerMessageId, JSON.stringify(candidate)],
    );
  }
  await client.query("COMMIT");
  console.log(`Seeded ${opportunityId} in ${databaseName}`);
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  client.release();
  await pool.end();
}
