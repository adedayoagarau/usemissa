import type { Metadata } from "next";
import { cookies } from "next/headers";

import {
  HomepageFuturePrototype,
  type TrackerBoardRecord,
} from "@/components/design-system/homepage-future";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { getEngine } from "@/lib/engine";
import { resolvePublicAccessMode } from "@/lib/publicAccess";

export const metadata: Metadata = {
  title: "Gateway + Opportunity Finder · Missa design review",
  description:
    "A local-only homepage design review with a live public Opportunity Finder.",
  robots: { index: false, follow: false },
};

function firstSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HomepageFuturePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const accessMode = resolvePublicAccessMode(firstSearchParam(params.access));

  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(
    cookieStore.get(SESSION_COOKIE)?.value,
  );

  let tracker: TrackerBoardRecord[] = [];
  if (session?.account.userId) {
    try {
      const engine = await getEngine();
      const view = engine.getTracker(session.account.userId);
      tracker = [
        ...view.pipeline.planning,
        ...view.pipeline.submitted,
        ...view.pipeline["in-progress"],
      ]
        .filter((item) => !item.isManual)
        .sort((left, right) => {
          if (left.deadline && right.deadline) {
            return left.deadline.localeCompare(right.deadline);
          }
          return left.deadline ? -1 : right.deadline ? 1 : 0;
        })
        .map((item) => ({
          id: item.opportunityId,
          title: item.title,
          organizationName: item.organizationName,
          statusLabel: item.myStatus,
          deadline: item.deadline,
          deadlineKind: item.deadlineKind,
          daysToDeadline: item.daysToDeadline,
          href: `/opportunities/${item.opportunityId}`,
        }));
    } catch {
      tracker = [];
    }
  }

  return (
    <HomepageFuturePrototype accessMode={accessMode} tracker={tracker} />
  );
}
