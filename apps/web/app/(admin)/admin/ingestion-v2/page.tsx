import IngestionV2Workbench from "@/components/ingestion-v2-workbench";
import { AdminPageFrame, DataAreaHeader } from "@/components/platform-admin";
import type { AdminArea } from "@/lib/platformAdmin";

const area: AdminArea<unknown> = {
  provenance: { maturity: "durable", source: "missa_ingestion_v2_runs and related evidence", freshness: "read on request" },
  data: {},
  warnings: ["v2 is shadow/review-only. Completed runs remain unpublished until a separate promotion contract exists."],
};

export default function IngestionV2Page() {
  return <AdminPageFrame><div className="space-y-8"><DataAreaHeader area={area} title="Ingestion v2" description="A source-aware operator workbench for triaging runs, inspecting evidence, and deciding whether v2 is ready to replace Gary or Radar for a destination." /><IngestionV2Workbench /></div></AdminPageFrame>;
}
