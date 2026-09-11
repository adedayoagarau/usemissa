import { NextResponse } from "next/server";
import { tickGoals } from "@/lib/goal-engine";
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET)
    return NextResponse.json(
      { error: "Scheduler unavailable" },
      { status: 503 },
    );
  if (
    request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await tickGoals());
}
