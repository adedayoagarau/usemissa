import assert from "node:assert/strict";
import test from "node:test";
import { detectTrackerImportMapping, planTrackerImport, parseTrackerCsv } from "@missa/radar-engine";
import { loadCanonicalTrackerImportStore } from "../src/canonicalTrackerImport.js";

test("canonical import projection plans from published relational opportunities and owner tracker state", async () => {
  const queryable={ query:async (sql:string) => {
    if (sql.includes("from opportunities o")) return { rows:[{ id:"opp_one",title:"River Prize",organization_id:"org_one",organization_name:"River House",source_id:"source_one",source_url:"https://river.test/prize",status:"open",type:"award",genres:[],open_date:null,deadline_date:"2026-10-01",deadline_kind:"fixed",fee_status:"no-fee",fee_cents:0,fee_currency:"USD",prize:null,location:null,simultaneous_allowed:null,guidelines_url:"https://river.test/prize",submission_url:null,created_at:"2026-08-01T00:00:00Z",source_checked_at:"2026-08-02T00:00:00Z",last_changed_at:null }] };
    if (sql.includes("from tracked_opportunities where")) return { rows:[{ id:"tracked_one",opportunity_id:"opp_one",status:"saved",notify:true,submitted_at:null,last_import_id:null,tracked_at:"2026-08-03T00:00:00Z" }] };
    if (sql.includes("from tracked_status_events")) return { rows:[] };
    if (sql.includes("from tracker_manual_entries")) return { rows:[] };
    throw new Error(`Unexpected SQL: ${sql}`);
  }};
  const store=await loadCanonicalTrackerImportStore(queryable as never,"account_one","user_one");
  const parsed=parseTrackerCsv(new TextEncoder().encode("Title,Organization,Status,Source URL\nRiver Prize,River House,Submitted,https://river.test/prize\n"));
  const plan=planTrackerImport(store,"user_one",parsed,detectTrackerImportMapping(parsed.columns));
  assert.equal(plan.rows[0]?.classification,"matched");
  assert.equal(plan.rows[0]?.candidates[0]?.opportunityId,"opp_one");
  assert.equal(plan.rows[0]?.conflict?.current.status,"saved");
});
