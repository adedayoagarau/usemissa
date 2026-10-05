import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { Pool } from "pg";
import {
  missaPostgresPoolConfig,
  pgRankingDb,
  runMagazineIndexUpdate,
} from "@missa/radar-adapters";
import {
  cronAuthorized,
  magazineIndexAutoPublish,
} from "@/lib/magazineIndexSchedule";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Monthly Vercel Cron target (apps/web/vercel.json). Refreshes the index's
 * sources, recomputes the latest complete ranking year, and publishes only
 * when MISSA_RANKINGS_AUTO_PUBLISH=1. A new ranking year starts on its own
 * once Garstang posts that year's tables.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (!cronAuthorized(request, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  }

  const pool = new Pool(missaPostgresPoolConfig(connectionString, "creator"));
  try {
    const publish = magazineIndexAutoPublish();
    const result = await runMagazineIndexUpdate(pgRankingDb(pool), {
      trigger: "cron",
      publish,
    });
    if (result.status === "published") revalidateTag("magazine-rankings", "max");
    return NextResponse.json(
      {
        runId: result.runId,
        status: result.status,
        rankingYears: result.rankingYears,
        refreshed: result.refresh.filter((r) => r.outcome === "accepted").length,
        rejected: result.refresh.filter((r) => r.outcome === "rejected").length,
        error: result.error,
      },
      { status: result.status === "failed" ? 500 : 200 },
    );
  } finally {
    await pool.end();
  }
}
