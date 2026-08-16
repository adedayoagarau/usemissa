import { NextResponse } from "next/server";

import { resumeAccountDeletion } from "@/lib/account-deletion";
import { getAccountDeletionQueue } from "@/lib/account-deletion-queue";

const headers = { "Cache-Control": "no-store" };

async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503, headers },
    );
  if (request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers },
    );
  const queue = getAccountDeletionQueue();
  if (!queue || !(await queue.available()))
    return NextResponse.json(
      { error: "Account deletion queue is not available" },
      { status: 503, headers },
    );
  const deletion = await queue.claimNext();
  if (!deletion) return NextResponse.json({ status: "idle" }, { headers });
  if (deletion.stage === "prepared") {
    await queue.fail(
      deletion.id,
      "Authentication removal requires the signed-in deletion request.",
    );
    return NextResponse.json(
      { status: "needs-authentication", id: deletion.id },
      { status: 409, headers },
    );
  }
  try {
    const result = await resumeAccountDeletion(deletion, queue);
    return NextResponse.json(
      { status: "completed", id: deletion.id, ...result },
      { headers },
    );
  } catch {
    return NextResponse.json(
      { status: "retry", id: deletion.id },
      { status: 503, headers },
    );
  }
}

export const GET = run;
export const POST = run;
