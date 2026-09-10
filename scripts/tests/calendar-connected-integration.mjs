import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import nextEnv from '@next/env';
import {PostgresCreatorCalendarRepository,creatorCommandEnvelope} from '@missa/radar-adapters';
import {creatorTestDatabase} from './creator-test-database.mjs';
nextEnv.loadEnvConfig(fileURLToPath(new URL('../../apps/web/',import.meta.url)),true,{info(){},error(){}});
const db=await creatorTestDatabase(process.env.DATABASE_URL,['opportunity_call_profiles','creator_calendar_events','calendar_provider_connections','calendar_sync_jobs']),repo=new PostgresCreatorCalendarRepository(db.pool);
try{
  await db.pool.query("insert into radar_accounts(id,email,data) values('calendar-owner','calendar@example.invalid','{}')");
  await db.pool.query("insert into opportunities select (jsonb_populate_record(null::opportunities,to_jsonb(o)||'{\"id\":\"calendar-call\",\"slug\":\"calendar-call\",\"deadline_date\":\"2026-11-01\",\"deadline_kind\":\"exact\",\"publication_state\":\"suppressed\"}'::jsonb)).* from public.opportunities o limit 1");
  await db.pool.query("insert into tracked_opportunities(id,account_id,opportunity_id,status) values('calendar-tracked','calendar-owner','calendar-call','saved')");
  let rows=await repo.trackerItems('calendar-owner');assert.equal(rows.length,1,'private application remains after public suppression');assert.equal(rows[0].deadline,'2026-11-01');assert.equal(rows[0].deadlineKind,'exact');assert.deepEqual(await repo.trackerItems('other-owner'),[]);
  await db.pool.query("update tracked_opportunities set status='accepted',submitted_at=now() where id='calendar-tracked'");rows=await repo.trackerItems('calendar-owner');assert.equal(rows[0].deadline,undefined,'completed application stops deadline');assert.equal(rows[0].expectedResponseBy,undefined,'completed application stops response estimate');
  await db.pool.query("update tracked_opportunities set status='saved' where id='calendar-tracked'");assert.equal((await repo.trackerItems('calendar-owner'))[0].deadline,'2026-11-01','correction restores deadline');
  const event={id:'work-session',title:'Prepare my application',purpose:'preparation',opportunityId:'calendar-call',startAt:'2026-11-01T09:00:00Z',endAt:'2026-11-01T10:00:00Z'};
  const command=creatorCommandEnvelope('calendar-owner','calendar-event.create',randomUUID(),event,1);await repo.createEvent(command,event);assert((await repo.createEvent(command,event)).replayed,'retried save is exactly once');
  let personal=await repo.events('calendar-owner',new Date('2026-01-01'),new Date('2027-01-01'));assert.equal(personal.length,1);assert.equal(personal[0].opportunityId,'calendar-call');assert.equal(personal[0].purpose,'preparation');
  const {purpose,opportunityId,...legacy}=event;await repo.updateEvent(creatorCommandEnvelope('calendar-owner','calendar-event.update',randomUUID(),legacy,personal[0].revision),event.id,legacy);personal=await repo.events('calendar-owner',new Date('2026-01-01'),new Date('2027-01-01'));assert.equal(personal[0].opportunityId,'calendar-call','legacy update preserves application connection');assert.equal(personal[0].purpose,'preparation');
  const cleared={...event,opportunityId:null};await repo.updateEvent(creatorCommandEnvelope('calendar-owner','calendar-event.update',randomUUID(),cleared,personal[0].revision),event.id,cleared);assert.equal((await repo.events('calendar-owner',new Date('2026-01-01'),new Date('2027-01-01')))[0].opportunityId,undefined,'explicit unlink is supported');
  const foreign={...event,id:'foreign-session'};await assert.rejects(repo.createEvent(creatorCommandEnvelope('other-owner','calendar-event.create',randomUUID(),foreign,1),foreign),'cannot connect another account application');
  console.log('PASS: private calendar continuity, ownership, exact date metadata, completed stages and correction.');
}finally{await db.cleanup();}
