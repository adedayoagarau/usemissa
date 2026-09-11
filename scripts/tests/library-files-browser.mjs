import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import nextEnv from '@next/env';
import pg from 'pg';
import {chromium} from 'playwright';
import {createSessionToken} from '@missa/radar-engine';
nextEnv.loadEnvConfig(fileURLToPath(new URL('../../apps/web/',import.meta.url)),true,{info(){},error(){}});
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL}),id=`library-file-${randomUUID()}`,email=`${id}@example.invalid`,browser=await chromium.launch();
try{
  await pool.query('insert into radar_accounts(id,email,data) values($1,$2,$3)',[id,email,JSON.stringify({id,email,userId:id,active:true})]);
  const context=await browser.newContext({baseURL:'http://localhost:3100'});await context.addCookies([{name:'missa_session',value:createSessionToken(id,process.env.MISSA_SESSION_SECRET,new Date()),url:'http://localhost:3100'}]);const page=await context.newPage();
  const key=`library-file-${randomUUID()}`,body=Buffer.from('missa local private file test');
  const upload=await page.request.post('/api/me/library/files',{headers:{'Idempotency-Key':key},multipart:{file:{name:'statement.txt',mimeType:'text/plain',buffer:body}}});assert.equal(upload.status(),201);const saved=await upload.json();assert.equal(saved.filename,'statement.txt');assert.equal(saved.byteLength,body.length);
  const replay=await page.request.post('/api/me/library/files',{headers:{'Idempotency-Key':key},multipart:{file:{name:'statement.txt',mimeType:'text/plain',buffer:body}}});assert.equal(replay.status(),201,'retry returns the same committed file');assert.equal((await replay.json()).id,saved.id);
  const bytes=await page.request.get(`/api/me/library/files/${encodeURIComponent(saved.id)}`);assert.equal(bytes.status(),200);assert.equal(await bytes.text(),body.toString());
  const deletion=await page.request.delete(`/api/me/library/files/${encodeURIComponent(saved.id)}`,{headers:{'Idempotency-Key':`delete-${randomUUID()}`},data:{expectedRevision:saved.revision}});assert.equal(deletion.status(),200);assert.equal((await page.request.get(`/api/me/library/files/${encodeURIComponent(saved.id)}`)).status(),404);
  console.log('PASS: local private Library upload, idempotent retry, owner-only byte retrieval and deletion.');
}finally{await browser.close();await pool.query('delete from outbox_events where correlation_id in (select correlation_id from workspace_command_receipts where actor_account_id=$1) or correlation_id in (select correlation_id from audit_events where account_id=$1)',[id]);await pool.query('delete from audit_events where account_id=$1',[id]);await pool.query('delete from workspace_command_receipts where actor_account_id=$1',[id]);await pool.query('delete from radar_accounts where id=$1',[id]);await pool.end();}
