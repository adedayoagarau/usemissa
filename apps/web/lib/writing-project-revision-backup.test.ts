import assert from "node:assert/strict";
import { test } from "node:test";
import { collectProjectRevisionBackup } from "./writing-project-revision-backup.ts";
const empty = {version:1,comments:[],suggestions:[],cuttings:[]};
const notes = {...empty,cuttings:[{id:"cut",text:"Keep me",createdAt:"2026-10-09"}]};
const fetcher = (revision:number,data:unknown) => (async()=>Response.json({record:{revision,data}})) as typeof fetch;
test("whole-project backup includes account notes on a second device", async()=> {
 const result = await collectProjectRevisionBackup(["piece"],"account",()=>null,fetcher(2,notes));
 assert.deepEqual(JSON.parse(result.piece!),notes);
});
test("backup blocks divergent notes rather than dropping either copy", async()=> {
 await assert.rejects(collectProjectRevisionBackup(["piece"],"account",()=>JSON.stringify(empty),fetcher(2,notes)),/Device and account revision notes differ/);
});
test("backup retains unsynced local notes when account revision is absent",async()=>{
 const raw=JSON.stringify(notes);
 assert.equal((await collectProjectRevisionBackup(["piece"],"account",()=>raw,fetcher(0,empty))).piece,raw);
});
test("backup fails closed on unavailable account or corrupt local notes",async()=>{
 await assert.rejects(collectProjectRevisionBackup(["piece"],"account",()=>null,(async()=>new Response(null,{status:503})) as typeof fetch),/Retry online/);
 await assert.rejects(collectProjectRevisionBackup(["piece"],"account",()=>"broken",fetcher(2,notes)));
});
