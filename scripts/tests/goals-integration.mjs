import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(fileURLToPath(new URL('../../apps/web/',import.meta.url)),true,{info(){},error(){}});
const {goalPool,createGoal,listGoals,changeGoal,tickGoals,searchGoalTargets,goalRecommendations}=await import('../../apps/web/lib/goal-engine.ts');
const pool=goalPool(),account=`goal-test-${randomUUID()}`;
try {
 await pool.query('insert into radar_accounts(id,email,data) values($1,$2,$3)',[account,`${account}@example.invalid`,JSON.stringify({id:account})]);
 await pool.query('insert into notification_preferences(account_id) values($1)',[account]);
 const targets=await searchGoalTargets('review');assert(targets.length>0,'real catalogue search');const chosen=targets.find(t=>t.kind==='opportunity');assert(chosen);
 const closed=(await pool.query("select title,id from opportunities where publication_state='published' and status='closed' order by id limit 1")).rows[0];
 if(closed)assert((await searchGoalTargets(closed.title,'opportunity')).some(t=>t.id===closed.id),'closed calls remain selectable');
 const betweenCalls=(await pool.query("select p.id,p.name from gary_profiles p where not exists(select 1 from opportunities o where o.organization_id=p.id and o.publication_state='published' and o.status in ('open','closing-soon','deadline-extended')) order by p.id limit 1")).rows[0];
 assert(betweenCalls);assert((await searchGoalTargets(betweenCalls.name,'organization')).some(t=>t.id===betweenCalls.id),'directory organizations remain selectable between calls');

 const today=new Date().toISOString().slice(0,10);
 const id=await createGoal(account,{requestId:randomUUID(),title:'Integration test',target:3,startsOn:today,endsOn:today,timezone:'UTC',nextStep:'Read guidelines',cadenceDays:7,recommendations:true,targets:[{kind:'opportunity',id:chosen.id}]});
 assert.equal((await listGoals(account))[0].progress,0);
 assert.equal((await listGoals('not-owner')).length,0);
 const tracked=randomUUID();await pool.query("insert into tracked_opportunities(id,account_id,opportunity_id,status) values($1,$2,$3,'submitted')",[tracked,account,chosen.id]);
 for(let i=0;i<2;i++)await pool.query("insert into tracked_status_events(tracked_opportunity_id,account_id,to_status,source) values($1,$2,'submitted','user')",[tracked,account]);
 assert.equal((await listGoals(account))[0].progress,1,'duplicate events count once');
 await pool.query("update creator_goals set discipline='not-a-matching-discipline' where id=$1",[id]);assert.equal((await listGoals(account))[0].progress,0,'discipline narrows counted submissions');await pool.query('update creator_goals set discipline=null where id=$1',[id]);

 await assert.rejects(changeGoal('not-owner',id,1,'pause'));
 await changeGoal(account,id,1,'pause');await assert.rejects(changeGoal(account,id,1,'resume'));
 await changeGoal(account,id,2,'resume');
 await pool.query("update creator_goals set next_check_at=now()-interval '1 minute' where id=$1",[id]);
 await Promise.all([tickGoals(account),tickGoals(account)]);
 assert.equal(Number((await pool.query('select count(*) from creator_inbox_alerts where account_id=$1',[account])).rows[0].count),1,'one notification across concurrent ticks');
 await pool.query('update notification_preferences set reminder_enabled=false where account_id=$1',[account]);await pool.query("update creator_goals set next_check_at=now()-interval '2 minutes' where id=$1",[id]);await tickGoals(account);
 assert.equal(Number((await pool.query('select count(*) from creator_inbox_alerts where account_id=$1',[account])).rows[0].count),1,'opt out respected');
 assert.equal((await goalRecommendations('not-owner',id)).length,0);
 console.log('PASS: catalogue, persistence, ownership, event deduplication, revisions, concurrent scheduling, notification opt-out.');
} finally {await pool.query('delete from radar_accounts where id=$1',[account]);await pool.end();}
