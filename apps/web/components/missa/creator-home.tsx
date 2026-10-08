import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  FolderKanban,
  Import,
  LockKeyhole,
  Target,
  BookOpen,
  Search,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { ApplicationStateBadge } from "@/components/missa/application-state-badge";
import { ApplicationRunway } from "@/components/missa/application-runway";
import { StartByDate } from "@/components/missa/start-by-date";
import {
  GoalPaceExplanation,
  HomeCheckIn,
  HomeNextSteps,
  HomeTrackerTabs,
  HomeWeekView,
} from "@/components/missa/creator-home-actions";
import {
  recordHref,
  type CreatorHome as CreatorHomeData,
  type HomeGoalPace,
  type HomeMove,
} from "@/lib/creator-home";
import { PageHeader } from "@/components/missa/page-header";
import { HueTile } from "@/components/missa/hue-tile";

const typeLabel = (value: string) =>
  value === "open-call"
    ? "Open call"
    : value.replaceAll("-", " ").replace(/^./u, (c) => c.toUpperCase());

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
}

/**
 * Creator Home: the creator's week, derived from Tracker state. It names the
 * situation, leads with one move (the page's only Forest action), and lets the
 * creator finish a preparation step or answer a check-in in place. Everything
 * else opens the application record.
 */
export function CreatorHome({
  home,
  displayName,
  today,
  greeting = "Hello",
}: {
  home: CreatorHomeData;
  displayName?: string;
  /** Pre-formatted date for the creator's timezone, e.g. "Saturday, October 3". */
  today: string;
  /** Time-of-day greeting in the creator's timezone, or "Hello". */
  greeting?: string;
}) {
  const firstName = displayName?.trim().split(/\s+/u)[0];
  const firstRun = home.situation === "first-run";
  const [lead, ...also] = home.thisWeek;

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-14 pb-16">
      <PageHeader
        eyebrow={
          <>
            <span>{today}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <LockKeyhole className="size-3.5" aria-hidden="true" />
              Private to you
            </span>
          </>
        }
        title={
          <>
            {firstRun ? "Welcome" : greeting}
            {firstName ? `, ${firstName}.` : "."}
          </>
        }
        description={
          firstRun
            ? "Home fills in as you save calls. Here is what it will do for you."
            : home.summary
        }
        actions={home.pace ? <GoalPace pace={home.pace} /> : undefined}
      />

      {firstRun ? (
        <FirstRun />
      ) : (
        <>
          {lead ? (
            <section
              aria-labelledby="home-lead-title"
              className="flex flex-col gap-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2
                  id="home-lead-title"
                  className="text-2xl font-semibold tracking-tight"
                >
                  {lead.kind === "check-in"
                    ? "While you wait"
                    : "Do this first"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  1 of this week’s {home.thisWeek.length}. Ranked by deadline,
                  start-by date, and what is waiting on you.
                </p>
              </div>
              <LeadMove move={lead} />
            </section>
          ) : (
            <Empty variant="bordered">
              <EmptyHeader>
                <EmptyTitle>
                  <h2>Nothing is pressing this week</h2>
                </EmptyTitle>
                <EmptyDescription>
                  No deadlines close soon and nothing is waiting on you. A good
                  week to look ahead.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Link href="/opportunities" className={buttonVariants()}>
                  Browse opportunities
                  <ArrowRight />
                </Link>
              </EmptyContent>
            </Empty>
          )}

          {also.length ? (
            <section
              aria-labelledby="home-also-title"
              className="flex flex-col gap-4"
            >
              <h2 id="home-also-title" className="text-lg font-semibold">
                Also this week
              </h2>
              <ol className="grid gap-6 md:grid-cols-2">
                {also.map((move, index) => (
                  <SupportingMove
                    key={move.opportunityId}
                    move={move}
                    position={index + 2}
                    total={home.thisWeek.length}
                  />
                ))}
              </ol>
            </section>
          ) : null}

          <section
            aria-labelledby="home-week-title"
            className="flex flex-col gap-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="home-week-title" className="text-lg font-semibold">
                The week ahead
              </h2>
              <p className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="size-2 rounded-xs bg-ochre"
                  />
                  Closes or overdue
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="size-2 rounded-full bg-primary"
                  />
                  Start by
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="size-2 rounded-xs border-2 border-mineral-blue"
                  />
                  Check in
                </span>
              </p>
            </div>
            <HomeWeekView
              week={home.week}
              quietHint={
                lead && lead.kind !== "opening" && lead.kind !== "check-in"
                  ? "A good day to work on what comes first."
                  : "A good day to look ahead."
              }
            />
          </section>

          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <section
              aria-labelledby="home-tracker-title"
              className="flex min-w-0 flex-col gap-3"
            >
              <h2 id="home-tracker-title" className="text-lg font-semibold">
                Your Tracker
              </h2>
              <HomeTrackerTabs
                preparing={home.preparing}
                awaiting={home.awaiting}
                decided={home.recentDecisions}
              />
              <Link
                href="/tracker"
                className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                Open Tracker
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </section>

            <aside aria-label="Suggestions" className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">
                {home.selectedForYou.some((opening) => opening.goalFit)
                  ? "Fits your goal"
                  : "Selected for you"}
              </h2>
              {home.selectedForYou.length ? (
                <>
                  <ul className="flex flex-col gap-3">
                    {home.selectedForYou.map((opening) => (
                      <li key={opening.opportunityId}>
                        <Link
                          href={`/opportunities/${encodeURIComponent(opening.opportunityId)}`}
                          className="flex min-h-16 items-start gap-3 rounded-xl border border-border p-4 text-foreground hover:bg-muted/60"
                        >
                          <span className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="font-heading text-base break-words">
                              {opening.title}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {opening.reason}
                            </span>
                          </span>
                          <ArrowUpRight
                            className="mt-1 size-4 shrink-0"
                            aria-hidden="true"
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/opportunities/for-you"
                    className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    More selected for you
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </>
              ) : home.thisWeek.some((move) => move.kind === "opening") ? (
                // Every current suggestion is already one of this week's moves.
                <Link
                  href="/opportunities/for-you"
                  className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-semibold text-primary underline-offset-4 hover:underline"
                >
                  More selected for you
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Follow a few organizations or disciplines and Missa will
                  suggest calls that fit.{" "}
                  <Link
                    href="/following"
                    className="font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    Choose what to follow
                  </Link>
                </p>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

function GoalPace({ pace }: { pace: HomeGoalPace }) {
  const { goal } = pace;
  const circles = goal.target <= 12;
  return (
    <section
      aria-labelledby="home-goal-title"
      className="flex flex-col gap-4 rounded-xl border border-border p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <h2
          id="home-goal-title"
          className="text-xs font-semibold text-muted-foreground"
        >
          <Link
            href={`/goals?goal=${encodeURIComponent(goal.id)}`}
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            {goal.title}
          </Link>
        </h2>
        {pace.status === "reached" ? (
          <ApplicationStateBadge tone="success">
            Goal reached
          </ApplicationStateBadge>
        ) : pace.status === "on-pace" ? (
          <ApplicationStateBadge tone="success">On pace</ApplicationStateBadge>
        ) : pace.status === "behind" ? (
          <ApplicationStateBadge tone="warning">
            Behind pace
          </ApplicationStateBadge>
        ) : null}
      </div>
      <p className="flex items-baseline gap-2">
        <span className="font-mono text-3xl tabular-nums">{goal.progress}</span>
        <span className="text-sm text-muted-foreground">
          of <span className="font-mono tabular-nums">{goal.target}</span>{" "}
          submitted · by{" "}
          <span className="font-mono tabular-nums">
            {shortDate(goal.endsOn)}
          </span>
        </span>
      </p>
      {circles ? (
        <div
          role="img"
          className="grid max-w-72 grid-cols-6 gap-2"
          aria-label={`${goal.progress} submitted, ${Math.max(0, pace.reachable - goal.progress)} in reach, ${goal.target} in all`}
        >
          {Array.from({ length: goal.target }, (_, index) => {
            const state =
              index < goal.progress
                ? "done"
                : index < pace.reachable
                  ? "reach"
                  : "open";
            return (
              <span
                key={index}
                className={
                  state === "done"
                    ? "aspect-square rounded-full bg-primary"
                    : state === "reach"
                      ? "aspect-square rounded-full border-2 border-dashed border-primary bg-accent-tint"
                      : "aspect-square rounded-full border border-input"
                }
              />
            );
          })}
        </div>
      ) : null}
      {pace.inReach && pace.status !== "reached" ? (
        <p className="text-sm leading-snug">
          {pace.inReach === 1 ? "One call" : `${pace.inReach} calls`} you are
          preparing {pace.inReach === 1 ? "closes" : "close"} before{" "}
          {shortDate(goal.endsOn)}. Submit {pace.inReach === 1 ? "it" : "them"}{" "}
          and you reach{" "}
          <span className="font-mono tabular-nums">{pace.reachable}</span> of{" "}
          <span className="font-mono tabular-nums">{goal.target}</span>.
        </p>
      ) : null}
      <GoalPaceExplanation pace={pace} />
    </section>
  );
}

function LeadMove({ move }: { move: HomeMove }) {
  const preparation =
    move.kind !== "opening" &&
    move.kind !== "check-in" &&
    move.kind !== "ready";
  return (
    <article className="grid gap-8 rounded-xl border border-input p-6 shadow-xs sm:p-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-5">
        <p className="flex flex-wrap items-center gap-2">
          {move.type ? (
            <ApplicationStateBadge tone="neutral">
              {typeLabel(move.type)}
            </ApplicationStateBadge>
          ) : null}
          {move.startBy &&
          (move.kind === "start-passed" ||
            move.kind === "start-today" ||
            move.kind === "start-soon") ? (
            // The start-by label is the state; its trigger explains the date.
            <StartByDate startBy={move.startBy} title={move.title} />
          ) : (
            <ApplicationStateBadge tone={move.tone}>
              {move.badge}
            </ApplicationStateBadge>
          )}
        </p>
        <div className="flex flex-col gap-2">
          <h3 className="font-heading text-2xl leading-tight font-medium tracking-tight break-words sm:text-3xl">
            {move.title}
          </h3>
          {move.organizationName ? (
            <p className="text-sm text-muted-foreground">
              {move.organizationName}
            </p>
          ) : null}
        </div>
        {move.runway ? (
          <ApplicationRunway runway={move.runway} />
        ) : (
          <p className="text-sm">{move.reason}</p>
        )}
        {move.kind === "check-in" ? (
          <HomeCheckIn
            reminder={move.reminder}
            href={move.href}
            title={move.title}
            primary
          />
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Link href={move.href} className={buttonVariants({ size: "lg" })}>
              {move.actionLabel}
              <span className="sr-only">: {move.title}</span>
              <ArrowRight />
            </Link>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3 border-border lg:border-s lg:ps-8">
        {preparation ? (
          <HomeNextSteps
            opportunityId={move.opportunityId}
            title={move.title}
            reasons={move.startBy?.reasons ?? []}
            href={recordHref(move.opportunityId, "prepare")}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            {move.kind === "check-in"
              ? "Not yet moves the check-in a week. Yes opens the record, where you add the answer and the date it came."
              : move.kind === "ready"
                ? "Already sent? Record it with the date so Missa can watch for the response."
                : "Read the requirements and fit before saving it to your Tracker."}
          </p>
        )}
      </div>
    </article>
  );
}

function SupportingMove({
  move,
  position,
  total,
}: {
  move: HomeMove;
  position: number;
  total: number;
}) {
  return (
    <li className="flex min-w-0 flex-col gap-3 rounded-xl border border-border p-6">
      <p className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {position} of {total}
        </span>
        <ApplicationStateBadge tone={move.tone}>
          {move.badge}
        </ApplicationStateBadge>
      </p>
      <h3 className="font-heading text-xl leading-snug font-medium break-words">
        {move.title}
      </h3>
      <p className="text-sm text-muted-foreground">
        {move.organizationName ? `${move.organizationName} · ` : ""}
        {move.reason}
      </p>
      {move.runway ? (
        <ApplicationRunway runway={move.runway} size="compact" />
      ) : null}
      <div className="mt-auto pt-1">
        {move.kind === "check-in" ? (
          <HomeCheckIn
            reminder={move.reminder}
            href={move.href}
            title={move.title}
          />
        ) : (
          <Link
            href={move.href}
            className={buttonVariants({ variant: "outline" })}
          >
            {move.actionLabel}
            <span className="sr-only">: {move.title}</span>
            <ArrowRight />
          </Link>
        )}
      </div>
    </li>
  );
}

function FirstRun() {
  const steps = [
    {
      title: "Save a call you want to apply for",
      body: "Missa keeps its deadline and works out when to start.",
      href: "/opportunities",
      label: "Browse opportunities",
      variant: "default" as const,
      icon: ArrowRight,
      hue: "orange" as const,
      mark: Search,
    },
    {
      title: "Or bring the spreadsheet you keep",
      body: "Import past and current submissions in one go.",
      href: "/import",
      label: "Import a tracker",
      variant: "outline" as const,
      icon: Import,
      hue: "indigo" as const,
      mark: BookOpen,
    },
    {
      title: "Set a submission goal",
      body: "Home will tell you each week whether you are on pace.",
      href: "/goals",
      label: "Set a goal",
      variant: "ghost" as const,
      icon: Target,
      hue: "red" as const,
      mark: Target,
    },
  ];
  return (
    <section aria-labelledby="home-start-title" className="flex flex-col gap-6">
      <h2 id="home-start-title" className="sr-only">
        Your week starts with one saved call
      </h2>
      <ol className="grid gap-6 md:grid-cols-3">
        {steps.map((step, index) => (
          <li
            key={step.href}
            className={`flex flex-col gap-3 rounded-xl border p-7 ${index === 0 ? "border-input shadow-xs" : "border-border"}`}
          >
            <HueTile hue={step.hue} tone={index === 0 ? "solid" : "soft"}>
              <step.mark className="size-4 text-current" aria-hidden="true" />
            </HueTile>
            <h3 className="text-lg font-semibold">{step.title}</h3>
            <p className="text-sm text-muted-foreground">{step.body}</p>
            <Link
              href={step.href}
              className={buttonVariants({
                variant: step.variant,
                className: "mt-auto self-start",
              })}
            >
              {step.label}
              <step.icon />
            </Link>
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-3 rounded-xl border border-dashed border-input bg-muted/40 p-6">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <FolderKanban className="size-4" aria-hidden="true" />
          Once you save a call, this space shows
        </p>
        <p className="flex flex-wrap gap-2">
          <ApplicationStateBadge tone="warning">
            Start-by dates
          </ApplicationStateBadge>
          <ApplicationStateBadge tone="primary">
            Your next step
          </ApplicationStateBadge>
          <ApplicationStateBadge tone="information">
            Check-in reminders
          </ApplicationStateBadge>
          <ApplicationStateBadge tone="success">
            Goal pace
          </ApplicationStateBadge>
        </p>
      </div>
    </section>
  );
}
