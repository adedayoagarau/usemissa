import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import type { Pool } from 'pg';
import { PostgresCreatorProfileRepository } from '../src/creatorProfileRepository.js';

test('portfolio snapshots, ownership, revisions, media privacy and legacy draft migration',async()=>{
 const db=new PGlite();
 try {
  await db.exec(`create table radar_accounts(id text primary key,data jsonb not null);create table handles(subject_id text,subject_type text,state text);
    insert into radar_accounts values('a','{"userId":"user-a"}'),('b','{"userId":"user-b"}');
    create table creator_portfolio_drafts(account_id text primary key references radar_accounts(id) on delete cascade,draft_data jsonb not null,updated_at timestamptz default now());
    insert into creator_portfolio_drafts(account_id,draft_data) values('a','{"name":"Legacy draft"}');`);
  const migration=await readFile(new URL('../../../db/migrations/0041_creator_portfolios.sql',import.meta.url),'utf8');
  await db.exec(migration);await db.exec(migration);
  const client={query:(sql:string,params?:unknown[])=>db.query(sql,params),release(){}};
  const pool={...client,connect:async()=>client} as unknown as Pool;
  const repo=new PostgresCreatorProfileRepository(pool);
  assert.deepEqual((await repo.portfolioState('a')).draft,{name:'Legacy draft'});
  assert.equal(await repo.publicPortfolio('user-a'),undefined);
  let rev=await repo.writePortfolio('a',{name:'Version one'},0);
  assert.equal(rev,1);
  await assert.rejects(repo.writePortfolio('a',{name:'Stale overwrite'},0));
  await assert.rejects(repo.publishPortfolio('a',rev,[],{name:'Version one'}));
  await db.exec(`insert into handles values('user-a','user','claimed');`);
  const media='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const foreign='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  await repo.addPortfolioMedia('a',media,'image/png',Buffer.from([1,2,3]));
  const orphan='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  await repo.addPortfolioMedia('a',orphan,'image/png',Buffer.from([7,8,9]));
  await repo.addPortfolioMedia('b',foreign,'image/png',Buffer.from([4,5,6]));
  assert.equal(await repo.portfolioMedia(media),undefined);
  assert.equal(await repo.portfolioMedia(media,'b'),undefined);
  assert.ok(await repo.portfolioMedia(media,'a'));
  assert.equal(await repo.ownPortfolioMedia('a',[foreign]),false);
  await assert.rejects(repo.publishPortfolio('a',rev,[foreign],{name:'Version one'}));
  await repo.publishPortfolio('a',rev,[media],{name:'Version one'});
  assert.equal(await repo.deletePortfolioMedia(media,'a'),'published');
  assert.equal(await repo.deletePortfolioMedia(orphan,'a'),'deleted');
  assert.deepEqual(await repo.publicPortfolio('user-a'),{name:'Version one'});
  await db.exec(`update radar_accounts set data=jsonb_set(data,'{active}','false'::jsonb) where id='a'`);
  assert.equal(await repo.publicPortfolio('user-a'),undefined);
  await db.exec(`update radar_accounts set data=jsonb_set(data,'{active}','true'::jsonb) where id='a'`);
  assert.ok(await repo.portfolioMedia(media));
  rev=await repo.writePortfolio('a',{name:'Unpublished edit'},rev);
  assert.deepEqual(await repo.publicPortfolio('user-a'),{name:'Version one'});
  const results=await Promise.allSettled([repo.writePortfolio('a',{name:'Tab one'},rev),repo.writePortfolio('a',{name:'Tab two'},rev)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  await assert.rejects(repo.publishPortfolio('a',rev,[],{name:'Version one'}));
  await repo.unpublishPortfolio('a');
  assert.equal(await repo.publicPortfolio('user-a'),undefined);
  assert.equal(await repo.portfolioMedia(media),undefined);
  assert.ok(await repo.portfolioMedia(media,'a'));
  assert.ok((await repo.portfolioState('a')).draft);
  await db.exec(`delete from radar_accounts where id='a'`);
  assert.equal(await repo.portfolioMedia(media,'a'),undefined);
 } finally {await db.close();}
});

test("accepted outcomes list only this account’s acceptances with the organization name", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create table radar_accounts(id text primary key,data jsonb not null);
    create table radar_organizations(id text primary key,data jsonb not null);
    create table entities(id text primary key,organization_id text,name text not null);
    create table programs(id text primary key,entity_id text not null,name text not null);
    create table open_calls(id text primary key,program_id text not null,title text not null);
    create table submission_paths(id text primary key,open_call_id text not null);
    create table submissions(id text primary key,submission_path_id text not null,submitter_account_id text not null);
    create table works(id text primary key,submission_id text not null,title text not null);
    create table decisions(id text primary key,work_id text not null,outcome text not null,decided_at timestamptz not null default now());
    insert into radar_accounts values('a','{}'),('b','{}');
    insert into radar_organizations values('org','{"name":"The Quiet Review"}');
    insert into entities values('ent','org','Quiet Review Ltd');
    insert into programs values('prog','ent','Poetry');
    insert into open_calls values('call','prog','Spring reading period');
    insert into submission_paths values('path','call');
    insert into submissions values('s1','path','a'),('s2','path','b');
    insert into works values('w1','s1','Tidal glossary'),('w2','s1','Neap'),('w3','s2','Someone else');
    insert into decisions values('d1','w1','accepted','2026-03-02'),('d2','w2','declined','2026-03-02'),('d3','w3','accepted','2026-03-02');`);
    const client = {
      query: (sql: string, params?: unknown[]) => db.query(sql, params),
      release() {},
    };
    const repo = new PostgresCreatorProfileRepository({
      ...client,
      connect: async () => client,
    } as unknown as Pool);
    const outcomes = await repo.acceptedOutcomes("a");
    assert.deepEqual(
      outcomes.map((o) => [
        o.outcomeId,
        o.workTitle,
        o.organizationName,
        o.callTitle,
      ]),
      [["d1", "Tidal glossary", "The Quiet Review", "Spring reading period"]],
    );
    assert.match(outcomes[0]!.decidedAt, /^2026-03-02/);
    assert.deepEqual(await repo.acceptedOutcomes("nobody"), []);
  } finally {
    await db.close();
  }
});
