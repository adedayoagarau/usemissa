import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { listCanonicalTrackedOpportunities } from "@missa/radar-adapters";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { getEngine } from "@/lib/engine";
import { getWorkspaceEngine } from "@/lib/workspaceEngine";
import {
  TrackerProduct,
  type TrackerHostedSubmission,
  type TrackerProductItem,
  type TrackerProductLayout,
  type TrackerProductView,
} from "@/components/tracker-product";

type SearchParams = Record<string, string | string[] | undefined>;

const trackerViews = new Set<TrackerProductView>([
  "active",
  "submissions",
  "calendar",
  "works",
  "types",
  "organizations",
  "archive",
]);

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function safeView(value: string): TrackerProductView {
  return trackerViews.has(value as TrackerProductView)
    ? (value as TrackerProductView)
    : "active";
}

function safeLayout(value: string): TrackerProductLayout {
  return value === "board" ? "board" : "actions";
}

export default async function TrackerPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(
    cookieStore.get(SESSION_COOKIE)?.value,
  );
  if (!session?.account.userId) redirect("/login?next=/tracker");

  const raw = searchParams ? await searchParams : {};
  const userId = session.account.userId;
  const radar = await getEngine();
  const initialItems: TrackerProductItem[] =
    process.env.MISSA_OPPORTUNITY_REPOSITORY?.trim() === "postgres" &&
    process.env.DATABASE_URL
      ? await listCanonicalTrackedOpportunities(
          process.env.DATABASE_URL,
          session.account.id,
        )
      : Object.values(radar.getTracker(userId).pipeline)
          .flat()
          .map((item) => ({
            opportunityId: item.opportunityId,
            title: item.title,
            organizationName: item.organizationName,
            type: item.type,
            opportunityStatus: item.opportunityStatus,
            myStatus: item.myStatus,
            deadline: item.deadline,
            deadlineKind: item.deadlineKind,
            daysToDeadline: item.daysToDeadline,
            expectedResponseBy: item.expectedResponseBy,
            daysOverdue: item.daysOverdue,
            isManual: item.isManual,
            manualId: item.manualId,
            notes: item.notes,
            workId: item.workId,
            workTitle: item.workTitle,
            importId: item.importId,
          }));

  const workspace = await getWorkspaceEngine();
  const hostedSubmissions: TrackerHostedSubmission[] = [
    ...workspace.store.submissions.values(),
  ]
    .filter(
      (submission) => submission.submitterAccountId === session.account.id,
    )
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .map((submission) => {
      const path = workspace.store.submissionPaths.get(
        submission.submissionPathId,
      );
      const call = path
        ? workspace.store.openCalls.get(path.openCallId)
        : undefined;
      const program = call
        ? workspace.store.programs.get(call.programId)
        : undefined;
      const entity = program
        ? workspace.store.entities.get(program.entityId)
        : undefined;
      const organization = entity
        ? radar.store.organizations.get(entity.organizationId)
        : undefined;
      const decisions = workspace.decisionsForSubmission(
        entity?.organizationId ?? "",
        submission.id,
      );
      return {
        id: submission.id,
        title: call?.title ?? "Submission",
        organizationName:
          organization?.name ?? entity?.name ?? "Organization not listed",
        status: submission.status,
        submittedAt: submission.submittedAt,
        category: submission.category,
        radarOpportunityId: call?.radarOpportunityId,
        works: workspace.worksForSubmission(submission.id).map((work) => ({
          id: work.id,
          title: work.title,
          outcome: decisions.find((decision) => decision.workId === work.id)
            ?.outcome,
        })),
        paymentStatus: submission.paymentStatus,
      };
    });

  const works = radar
    .library(userId)
    .works.map((work) => ({ id: work.id, title: work.title }));

  return (
    <TrackerProduct
      initialItems={initialItems}
      hostedSubmissions={hostedSubmissions}
      works={works}
      userId={userId}
      initialView={safeView(first(raw.view))}
      initialLayout={safeLayout(first(raw.layout))}
      initialQuery={first(raw.q).slice(0, 200)}
      initialImportId={first(raw.import).slice(0, 240)}
    />
  );
}
