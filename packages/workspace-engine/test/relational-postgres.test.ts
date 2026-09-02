import assert from 'node:assert/strict';
import test from 'node:test';
import { Pool } from 'pg';
import { RelationalWorkspace, workspaceRequestHash } from '../src/relationalWorkspace.js';
import { WorkspaceConflictError, WorkspaceIdempotencyReuseError } from '../src/errors.js';
import type { WorkspaceCommandEnvelope } from '../src/repositories/contracts.js';

const databaseUrl = process.env.DISPOSABLE_WORKSPACE_DATABASE_URL;
if (databaseUrl) {
  const databaseName = new URL(databaseUrl).pathname.slice(1);
  if (!/^missa_story_16_1_[a-z0-9_]+$/i.test(databaseName)) throw new Error('Real-Postgres tests require an explicitly disposable missa_story_16_1_* database');
}

test('relational Team-to-Delivery path is tenant-safe, concurrent, idempotent, and atomic', { skip: !databaseUrl }, async () => {
  const poolA=new Pool({connectionString:databaseUrl});
  const poolB=new Pool({connectionString:databaseUrl});
  const workspaceA=new RelationalWorkspace(poolA);
  const workspaceB=new RelationalWorkspace(poolB);
  const suffix=Date.now().toString(36);
  const orgA=`org_a_${suffix}`,orgB=`org_b_${suffix}`,actor=`actor_${suffix}`,reviewer=`reviewer_${suffix}`,owner=`owner_${suffix}`;
  const envelope=(commandType:string,key:string,payload:unknown,extra:Partial<WorkspaceCommandEnvelope>={}):WorkspaceCommandEnvelope=>({actorAccountId:actor,organizationId:orgA,commandType,idempotencyKey:key,requestHash:workspaceRequestHash(payload),correlationId:`corr_${key}`,...extra});
  try {
    await poolA.query("insert into radar_accounts (id,email,data) values ($1,$2,'{}'),($3,$4,'{}'),($5,$6,'{}')",[actor,`${actor}@example.invalid`,reviewer,`${reviewer}@example.invalid`,owner,`${owner}@example.invalid`]);
    await poolA.query("insert into radar_organizations (id,data) values ($1,'{}'),($2,'{}')",[orgA,orgB]);
    const duplicate = await Promise.all([
      workspaceA.createEntity(envelope('entity.create','team',{name:'Team'}),{name:'Team'}),
      workspaceB.createEntity(envelope('entity.create','team',{name:'Team'}),{name:'Team'}),
    ]);
    const team=duplicate.find((item)=>!item.replayed)!;
    const replay=duplicate.find((item)=>item.replayed)!;
    assert.equal(team.replayed,false);
    assert.deepEqual({...replay,replayed:false},team);
    assert.equal(replay.replayed,true);
    await assert.rejects(()=>workspaceA.createEntity(envelope('entity.create','team',{name:'Changed'}),{name:'Changed'}),WorkspaceIdempotencyReuseError);
    const program=await workspaceA.createProgram(envelope('program.create','program',{entityId:team.resourceId}),{entityId:team.resourceId,name:'Program'});
    const callA=await workspaceA.createOpenCall(envelope('open_call.create','call-a',{programId:program.resourceId}),{programId:program.resourceId,title:'A'});
    const callB=await workspaceA.createOpenCall(envelope('open_call.create','call-b',{programId:program.resourceId}),{programId:program.resourceId,title:'B'});
    const independent=await Promise.all([
      workspaceA.setOpenCallStatus(envelope('open_call.publish','publish-a',{id:callA.resourceId},{expectedRevision:1}),callA.resourceId,'published'),
      workspaceB.setOpenCallStatus(envelope('open_call.publish','publish-b',{id:callB.resourceId},{expectedRevision:1}),callB.resourceId,'published'),
    ]);
    assert.deepEqual(independent.map((item)=>item.revision),[2,2]);
    const same=await Promise.allSettled([
      workspaceA.setOpenCallStatus(envelope('open_call.close','close-a-1',{id:callA.resourceId},{expectedRevision:2}),callA.resourceId,'closed'),
      workspaceB.setOpenCallStatus(envelope('open_call.close','close-a-2',{id:callA.resourceId},{expectedRevision:2}),callA.resourceId,'closed'),
    ]);
    assert.equal(same.filter((item)=>item.status==='fulfilled').length,1);
    assert.equal(same.filter((item)=>item.status==='rejected' && item.reason instanceof WorkspaceConflictError).length,1);
    assert.equal(await workspaceA.findOrganizationResource(orgB,'open_call',callA.resourceId),undefined);
    await assert.rejects(()=>workspaceB.setOpenCallStatus(envelope('open_call.close','cross-call',{id:callB.resourceId},{organizationId:orgB,expectedRevision:2}),callB.resourceId,'closed'),(error:unknown)=>error instanceof WorkspaceConflictError && error.currentRevision===null);
    const path=await workspaceA.createSubmissionPath(envelope('submission_path.create','path',{openCallId:callB.resourceId}),{openCallId:callB.resourceId,categories:['Visual art'],fields:[{id:'statement',type:'text',label:'Statement',required:true,order:0}]});
    const storedPath=await poolA.query<{categories:string[];fields:Array<{id:string}>}>('select categories,fields from submission_paths where id=$1',[path.resourceId]);
    assert.deepEqual(storedPath.rows[0],{categories:['Visual art'],fields:[{id:'statement',type:'text',label:'Statement',required:true,order:0}]});
    const submissionPayload={submissionPathId:path.resourceId,works:[{title:'One',fileUrl:'https://blob.invalid/missa/submissions/owner/one'},{title:'Two',fileUrls:['https://blob.invalid/missa/submissions/owner/two']}],answers:{statement:'Private answer'},category:'Visual art',paymentStatus:'paid' as const,paymentSessionId:'cs_test_private',feeCents:2500};
    const submission=await workspaceA.finalizeSubmission(envelope('submission.finalize','submission',submissionPayload,{actorAccountId:owner,organizationId:undefined,ownerAccountId:owner}),submissionPayload);
    const retained=await poolA.query<{answers:Record<string,string>;category:string;payment_status:string;payment_session_id:string;fee_cents:number}>('select answers,category,payment_status,payment_session_id,fee_cents from submissions where id=$1',[submission.resourceId]);
    assert.deepEqual(retained.rows[0],{answers:{statement:'Private answer'},category:'Visual art',payment_status:'paid',payment_session_id:'cs_test_private',fee_cents:2500});
    const works=await poolA.query<{id:string;file_url:string|null;file_urls:string[]|null}>('select id,file_url,file_urls from works where submission_id=$1 order by "order"',[submission.resourceId]);
    assert.equal(works.rows[0]!.file_url,'https://blob.invalid/missa/submissions/owner/one');
    assert.deepEqual(works.rows[1]!.file_urls,['https://blob.invalid/missa/submissions/owner/two']);
    const round=await workspaceA.createReviewRound(envelope('review_round.create','round',{openCallId:callB.resourceId}),{openCallId:callB.resourceId,name:'Jury'});
    const assignment=await workspaceA.assignReviewer(envelope('review_assignment.create','assignment',{reviewRoundId:round.resourceId,submissionId:submission.resourceId,reviewerAccountId:reviewer}),{reviewRoundId:round.resourceId,submissionId:submission.resourceId,reviewerAccountId:reviewer});
    const completed=await workspaceA.completeReview(envelope('review.complete','review',{assignmentId:assignment.resourceId},{actorAccountId:reviewer,expectedRevision:1}),assignment.resourceId,{score:91,notes:'Private review'});
    assert.equal(completed.revision,2);
    await assert.rejects(()=>workspaceA.completeReview(envelope('review.complete','review-again',{assignmentId:assignment.resourceId},{actorAccountId:reviewer,expectedRevision:2}),assignment.resourceId,{score:80}),/not found/i);
    const recommendation=await poolA.query<{score:number}>('select score from review_recommendations where review_assignment_id=$1',[assignment.resourceId]);
    assert.equal(recommendation.rows[0]!.score,91);
    const decision1=await workspaceA.recordDecision(envelope('decision.record','decision-1',{workId:works.rows[0]!.id,outcome:'accepted'}),{workId:works.rows[0]!.id,outcome:'accepted'});
    await workspaceA.recordDecision(envelope('decision.record','decision-2',{workId:works.rows[1]!.id,outcome:'declined'}),{workId:works.rows[1]!.id,outcome:'declined'});
    const summary=await poolA.query<{status:string}>('select status from submissions where id=$1',[submission.resourceId]);
    assert.equal(summary.rows[0]!.status,'partially-accepted');
    const delivery=await workspaceA.createDeliveryTask(envelope('delivery.create','delivery',{workId:works.rows[0]!.id}),{workId:works.rows[0]!.id});
    for (const [type,resourceId] of [['entity',team.resourceId],['program',program.resourceId],['open_call',callB.resourceId],['submission_path',path.resourceId],['submission',submission.resourceId],['work',works.rows[0]!.id],['review_round',round.resourceId],['review_assignment',assignment.resourceId],['decision',decision1.resourceId],['delivery_task',delivery.resourceId]] as const) {
      assert.equal(await workspaceA.findOrganizationResource(orgB,type,resourceId),undefined,`${type} must be tenant-safe`);
    }
    await assert.rejects(()=>workspaceA.finalizeSubmission(envelope('submission.finalize','payment-reuse',submissionPayload,{actorAccountId:owner,organizationId:undefined,ownerAccountId:owner}),submissionPayload));
    assert.ok(decision1.receiptId);
    const failing=new RelationalWorkspace(poolA,()=>{throw new Error('injected');});
    const failedId=`failed_${suffix}`;
    await assert.rejects(()=>failing.createEntity(envelope('entity.create','failed',{id:failedId}),{id:failedId,name:'Rollback'}),/injected/);
    const residue=await poolA.query<{count:string}>(`select
      (select count(*) from entities where id=$1)+(select count(*) from audit_events where target_id=$1)+(select count(*) from outbox_events where aggregate_id=$1)+(select count(*) from workspace_command_receipts where idempotency_key='failed') count`,[failedId]);
    assert.equal(Number(residue.rows[0]!.count),0);
    const privatePayloads=await poolA.query<{body:string}>("select detail::text body from audit_events where correlation_id like 'corr_%' union all select payload::text from outbox_events where correlation_id like 'corr_%'");
    assert.ok(privatePayloads.rows.every(({body})=>!/(answer|notes|email|https?:)/i.test(body)));
  } finally {
    await poolA.end(); await poolB.end();
  }
});
