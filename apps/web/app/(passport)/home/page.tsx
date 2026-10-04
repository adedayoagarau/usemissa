import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { MyStatus } from "@missa/radar-engine";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { getEngine } from "@/lib/engine";
import { ApplicationWorkspaceRepository } from "@/lib/application-workspace";
import { CreatorReminderRepository } from "@/lib/creator-reminders";
import { CreatorRecommendationRepository } from "@/lib/creator-recommendations";
import { listGoals } from "@/lib/goal-engine";
import {
  buildCreatorHome,
  greetingFor,
  type HomeApplication,
  type HomeGoal,
  type HomeOpening,
  type HomeReminder,
} from "@/lib/creator-home";
import { CreatorHome } from "@/components/missa/creator-home";

export const metadata = { title: "Home" };

/**
 * Creator Home, derived from Tracker state. Each source is optional: a
 * failure in one hides that section rather than the page.
 */
export default async function HomePage() {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(
    cookieStore.get(SESSION_COOKIE)?.value,
  );
  if (!session) redirect("/login?next=/home");
  const accountId = session.account.id;
  const relational = Boolean(process.env.DATABASE_URL);

  const [applications, reminders, goals, openings] = await Promise.all([
    relational
      ? new ApplicationWorkspaceRepository().list(accountId).catch(() => [])
      : legacyApplications(session.account.userId),
    relational
      ? new CreatorReminderRepository().list(accountId).catch(() => [])
      : Promise.resolve([]),
    relational ? listGoals(accountId).catch(() => []) : Promise.resolve([]),
    relational
      ? new CreatorRecommendationRepository()
          .feed(accountId, { mode: "now" })
          .then((feed) =>
            feed.items.slice(0, 4).map<HomeOpening>((item) => ({
              opportunityId: item.id,
              title: item.title,
              reason: item.reasons[0]?.label ?? "Matches what you follow",
              goalFit: item.reasons.some((reason) => reason.kind === "goal"),
            })),
          )
          .catch(() => [])
      : Promise.resolve([]),
  ]);

  const home = buildCreatorHome({
    applications: (applications as HomeApplication[]).map((application) => ({
      ...application,
      updatedAt: new Date(application.updatedAt).toISOString(),
      submittedAt: application.submittedAt
        ? new Date(application.submittedAt).toISOString()
        : null,
    })),
    // Home plans around preparation, deadline, and response reminders; a
    // deadline-day reminder counts as a deadline reminder.
    reminders: reminders.flatMap<HomeReminder>((reminder) => {
      const kind =
        reminder.kind === "deadline-day"
          ? "deadline"
          : reminder.kind === "preparation" ||
              reminder.kind === "deadline" ||
              reminder.kind === "response"
            ? reminder.kind
            : null;
      return kind
        ? [
            {
              id: reminder.id,
              revision: reminder.revision,
              opportunityId: reminder.opportunityId,
              kind,
              dueAt: reminder.dueAt
                ? new Date(reminder.dueAt).toISOString()
                : null,
              state: reminder.state,
            },
          ]
        : [];
    }),
    goals: (goals as Array<Record<string, unknown>>)
      .filter((goal) => goal.state === "active")
      .map<HomeGoal>((goal) => ({
        id: String(goal.id),
        title: String(goal.title),
        target: Number(goal.target),
        progress: Number(goal.progress ?? 0),
        endsOn: String(goal.ends_on),
        startsOn: goal.starts_on ? String(goal.starts_on) : undefined,
      })),
    openings,
  });

  // The creator's own timezone, from what they have already told Missa.
  const timeZone =
    reminders.find((reminder) => reminder.timezone)?.timezone ??
    (goals as Array<Record<string, unknown>>)
      .map((goal) => goal.timezone)
      .find(
        (value): value is string =>
          typeof value === "string" && value.length > 0,
      );
  const now = new Date();
  let today: string;
  try {
    today = new Intl.DateTimeFormat("en", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone,
    }).format(now);
  } catch {
    today = new Intl.DateTimeFormat("en", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(now);
  }

  return (
    <CreatorHome
      home={home}
      displayName={session.account.displayName}
      today={today}
      greeting={greetingFor(now, timeZone)}
    />
  );
}

/** Demo world without account storage: the legacy Radar tracker. */
async function legacyApplications(
  userId: string | undefined,
): Promise<HomeApplication[]> {
  if (!userId) return [];
  const radar = await getEngine();
  return Object.values(radar.getTracker(userId).pipeline)
    .flat()
    .map((item) => ({
      opportunityId: item.opportunityId,
      title: item.title,
      organizationName: item.organizationName ?? "",
      type: item.type,
      myStatus: item.myStatus as MyStatus,
      deadline: item.deadline ?? null,
      deadlineKind: item.deadlineKind,
      submittedAt: null,
      updatedAt: new Date().toISOString(),
      preparationTotal: 0,
      preparationDone: 0,
      preparationItems: [],
    }));
}
