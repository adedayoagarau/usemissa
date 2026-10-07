import { NextResponse } from "next/server";
export { plannerIncluded } from "@/lib/writing-plan-access";
import { getSessionAccount } from "@/lib/auth";
import {
  getWritingRepository,
  type WritingRepository,
} from "@/lib/writing-repository";

/** Shared by the writing routes: private responses, the session and the repository. */

export const headers = { "Cache-Control": "private, no-store" };

export function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers });
}

export async function writingSession(
  request: Request,
): Promise<
  | { response: NextResponse }
  | { accountId: string; repository: WritingRepository }
> {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session) return { response: json({ error: "Not authenticated" }, 401) };
  const repository = getWritingRepository();
  if (!repository) {
    return {
      response: json(
        {
          error: "Saving to your account is not available here.",
          unavailable: true,
        },
        503,
      ),
    };
  }
  return { accountId: session.account.id, repository };
}

/** Reads a small JSON body; undefined when it is missing, too large or not JSON. */
export async function smallJson(request: Request): Promise<unknown> {
  if (Number(request.headers.get("content-length") ?? 0) > 64_000)
    return undefined;
  return request.json().catch(() => undefined);
}

export const PLANNER_LOCKED = {
  error: "Cards, plotlines and the corkboard are part of Plus.",
  locked: "writingPlanner",
};
