// Copy only missing, account-owned legacy records. Never overwrite or delete either source.
import {fileURLToPath} from 'node:url';
import nextEnv from '@next/env';
import pg from 'pg';
nextEnv.loadEnvConfig(fileURLToPath(new URL('../apps/web/',import.meta.url)),true,{info(){},error(){}});
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL}),client=await pool.connect();
try{
 await client.query('begin');
 const missing=(await client.query(`select count(*)::int n from radar_tracked r join radar_accounts a on a.data->>'userId'=r.user_id where not exists(select 1 from opportunities o where o.id=r.opportunity_id)`)).rows[0].n;
 if(missing)throw new Error(`${missing} legacy saved calls need identity reconciliation before cutover.`);
 const duplicates=(await client.query(`select count(*)::int n from (select data->>'userId' from radar_accounts where data->>'userId' is not null group by 1 having count(*)>1) a`)).rows[0].n;
 if(duplicates)throw new Error('User/account identity requires reconciliation before cutover.');
 const plan=(await client.query(`select (select count(*) from radar_tracked r join radar_accounts a on a.data->>'userId'=r.user_id where not exists(select 1 from tracked_opportunities t where t.account_id=a.id and t.opportunity_id=r.opportunity_id)) applications,(select count(*) from radar_library_works w join radar_accounts a on a.data->>'userId'=w.user_id where not exists(select 1 from creator_library_works c where c.id=w.id)) works,(select count(*) from radar_library_files f join radar_accounts a on a.data->>'userId'=f.user_id where not exists(select 1 from creator_library_files c where c.id=f.id)) files,(select count(*) from radar_saved_answers s join radar_accounts a on a.data->>'userId'=s.user_id where not exists(select 1 from creator_saved_answers c where c.id=s.id)) reusable_texts`)).rows[0];
 console.log('Missing owned records:',plan);
 if(!process.argv.includes('--apply')){await client.query('rollback');}
 else{
  await client.query(`insert into creator_library_files(id,account_id,storage_key,name,mime_type,size_bytes,created_at,updated_at)
   select f.id,a.id,f.data->>'storageKey',f.data->>'filename',f.data->>'contentType',(f.data->>'byteLength')::integer,(f.data->>'createdAt')::timestamptz,(f.data->>'createdAt')::timestamptz
   from radar_library_files f join radar_accounts a on a.data->>'userId'=f.user_id on conflict(id) do nothing`);
  await client.query(`insert into creator_library_works(id,account_id,title,description,metadata,created_at,updated_at)
   select w.id,a.id,w.data->>'title',w.data->>'description',w.data,(w.data->>'createdAt')::timestamptz,(w.data->>'updatedAt')::timestamptz
   from radar_library_works w join radar_accounts a on a.data->>'userId'=w.user_id on conflict(id) do nothing`);
  await client.query(`insert into creator_saved_answers(id,account_id,label,answer,created_at,updated_at)
   select s.id,a.id,s.data->>'name',s.data->>'body',(s.data->>'createdAt')::timestamptz,(s.data->>'updatedAt')::timestamptz
   from radar_saved_answers s join radar_accounts a on a.data->>'userId'=s.user_id on conflict(id) do nothing`);
  const broken=(await client.query(`select count(*)::int n from radar_tracked r join radar_accounts a on a.data->>'userId'=r.user_id where r.data->>'workId' is not null and not exists(select 1 from creator_library_works w where w.id=r.data->>'workId' and w.account_id=a.id)`)).rows[0].n;
  if(broken)throw new Error('A linked legacy Work could not be preserved; cutover rolled back.');
  const inserted=await client.query(`insert into tracked_opportunities(id,account_id,opportunity_id,status,tracked_at,updated_at,notify,work_id)
   select 'legacy-'||md5(a.id||':'||r.opportunity_id),a.id,r.opportunity_id,r.data->>'myStatus',(r.data->>'trackedAt')::timestamptz,(r.data->>'trackedAt')::timestamptz,coalesce((r.data->>'notify')::boolean,true),r.data->>'workId'
   from radar_tracked r join radar_accounts a on a.data->>'userId'=r.user_id on conflict(account_id,opportunity_id) do nothing returning id`);
  const ids=inserted.rows.map(r=>r.id);
  await client.query(`insert into tracked_status_events(id,tracked_opportunity_id,account_id,to_status,source,created_at,occurred_on,evidence)
   select md5(t.id||':'||e.ordinality)::uuid,t.id,t.account_id,e.value->>'to',coalesce(e.value->>'source','user'),(e.value->>'at')::timestamptz,left(e.value->>'at',10)::date,jsonb_build_object('migration','legacy-application-continuity','originalEvent',e.value)
   from tracked_opportunities t join radar_accounts a on a.id=t.account_id join radar_tracked r on r.user_id=a.data->>'userId' and r.opportunity_id=t.opportunity_id cross join lateral jsonb_array_elements(coalesce(r.data->'events','[]')) with ordinality e
   where t.id=any($1::text[]) on conflict(id) do nothing`,[ids]);
  await client.query(`update tracked_opportunities t set submitted_at=(select min(e.created_at) from tracked_status_events e where e.tracked_opportunity_id=t.id and e.to_status='submitted') where t.id=any($1::text[]) and t.status not in ('saved','interested','preparing','draft-started','ready-to-submit')`,[ids]);
  const remaining=(await client.query(`select count(*)::int n from radar_tracked r join radar_accounts a on a.data->>'userId'=r.user_id where not exists(select 1 from tracked_opportunities t where t.account_id=a.id and t.opportunity_id=r.opportunity_id)`)).rows[0].n;
  if(remaining)throw new Error('Some saved records remain outside the canonical tracker.');
  await client.query('commit');console.log('Continuity verified: all owned saved records and linked Works preserved. Legacy source retained.');
 }
}catch(e){await client.query('rollback');throw e;}finally{client.release();await pool.end();}
