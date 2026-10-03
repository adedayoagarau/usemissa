import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  FolderKanban,
  Import,
  Library,
  LockKeyhole,
  Target,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type {
  CreatorHome as CreatorHomeData,
  HomeRow,
} from "@/lib/creator-home";

/**
 * Creator Home: one calm summary of Tracker state. It never edits anything
 * itself; every move and row opens the application record in Tracker.
 */
export function CreatorHome({
  home,
  displayName,
  today,
}: {
  home: CreatorHomeData;
  displayName?: string;
  /** Pre-formatted date for the creator's timezone, e.g. "Saturday, October 3". */
  today: string;
}) {
  const firstName = displayName?.trim().split(/\s+/u)[0];
  const empty = home.counts.tracked === 0;

  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-12 pb-12">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="space-y-2">
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{today}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <LockKeyhole className="size-3.5" aria-hidden="true" />
              Private to you
            </span>
          </p>
          <h1 className="font-heading text-4xl leading-tight font-medium tracking-tight sm:text-5xl">
            {firstName ? `Hello, ${firstName}.` : "Hello."}
          </h1>
          <p className="max-w-xl text-base text-muted-foreground">
            {empty
              ? "Save a call you want to apply for and Missa will keep its deadline, preparation, and reminders together."
              : "What your Tracker says matters this week."}
          </p>
        </div>
        {!empty ? (
          <dl className="flex gap-8 text-sm">
            <div>
              <dt className="text-muted-foreground">In your Tracker</dt>
              <dd className="font-mono text-2xl tabular-nums">
                {home.counts.active}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Awaiting responses</dt>
              <dd className="font-mono text-2xl tabular-nums">
                {home.counts.awaiting}
              </dd>
            </div>
          </dl>
        ) : null}
      </header>

      {empty ? (
        <Empty variant="bordered" size="spacious">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderKanban aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Your week starts with one saved call</EmptyTitle>
            <EmptyDescription>
              Browse open calls, or bring in the spreadsheet you already keep.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/opportunities" className={buttonVariants()}>
                Browse opportunities
                <ArrowRight />
              </Link>
              <Link
                href="/import"
                className={buttonVariants({ variant: "outline" })}
              >
                <Import />
                Import a tracker
              </Link>
            </div>
          </EmptyContent>
        </Empty>
      ) : (
        <section aria-labelledby="home-week-title" className="space-y-6">
          <div className="space-y-1">
            <h2
              id="home-week-title"
              className="text-2xl font-semibold tracking-tight"
            >
              This week’s three
            </h2>
            <p className="text-sm text-muted-foreground">
              Ranked by deadline, start-by date, and what is waiting on you.
            </p>
          </div>
          {home.thisWeek.length ? (
            <ol className="grid gap-6 md:grid-cols-3">
              {home.thisWeek.map((move, index) => (
                <li
                  key={move.opportunityId}
                  className="flex min-w-0 flex-col gap-4 rounded-xl border border-border p-6"
                >
                  <span
                    className="font-mono text-sm text-muted-foreground tabular-nums"
                    aria-hidden="true"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="font-heading text-xl leading-snug font-medium break-words">
                      {move.title}
                    </h3>
                    {move.organizationName ? (
                      <p className="text-sm text-muted-foreground">
                        {move.organizationName}
                      </p>
                    ) : null}
                  </div>
                  <p
                    className={
                      move.attention
                        ? "text-sm font-medium text-ochre-deep"
                        : "text-sm text-foreground"
                    }
                  >
                    {move.reason}
                  </p>
                  <Link
                    href={move.href}
                    className={buttonVariants({
                      variant: index === 0 ? "default" : "outline",
                    })}
                  >
                    {move.actionLabel}
                    <span className="sr-only">: {move.title}</span>
                    <ArrowRight />
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <Empty variant="bordered">
              <EmptyHeader>
                <EmptyTitle>Nothing is pressing this week</EmptyTitle>
                <EmptyDescription>
                  No deadlines close soon and nothing is waiting on you. A good
                  week to look ahead.
                </EmptyDescription>
              </EmptyHeader>
              <Link
                href="/opportunities"
                className={buttonVariants({ variant: "outline" })}
              >
                Browse opportunities
                <ArrowRight />
              </Link>
            </Empty>
          )}
        </section>
      )}

      {!empty ? (
        <div className="grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-12">
            <HomeList
              id="home-closing"
              title="Closing this week"
              rows={home.closingThisWeek}
              empty="No saved call closes in the next seven days."
            />
            <HomeList
              id="home-preparing"
              title="Preparing"
              rows={home.preparing}
              empty="Nothing in preparation. Start a saved call from your Tracker."
            />
            <HomeList
              id="home-awaiting"
              title="Awaiting responses"
              rows={home.awaiting}
              empty="Nothing is waiting on a response."
            />
            {home.recentDecisions.length ? (
              <HomeList
                id="home-decisions"
                title="Recent decisions"
                rows={home.recentDecisions}
                empty=""
              />
            ) : null}
          </div>

          <aside className="space-y-12" aria-label="Goals and suggestions">
            <section aria-labelledby="home-goals-title" className="space-y-4">
              <h2 id="home-goals-title" className="text-lg font-semibold">
                Goals
              </h2>
              {home.goals.length ? (
                <ul className="space-y-6">
                  {home.goals.map((goal) => (
                    <li key={goal.id} className="space-y-2">
                      <Link
                        href={`/goals?goal=${encodeURIComponent(goal.id)}`}
                        className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
                      >
                        {goal.title}
                      </Link>
                      <p className="flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
                        <span>
                          <span className="font-mono tabular-nums">
                            {goal.progress} of {goal.target}
                          </span>{" "}
                          submitted
                        </span>
                        <span className="font-mono tabular-nums">
                          by{" "}
                          {new Intl.DateTimeFormat("en", {
                            day: "numeric",
                            month: "short",
                            timeZone: "UTC",
                          }).format(
                            new Date(`${goal.endsOn.slice(0, 10)}T12:00:00Z`),
                          )}
                        </span>
                      </p>
                      <Progress
                        value={Math.min(
                          100,
                          (goal.progress / Math.max(1, goal.target)) * 100,
                        )}
                        aria-label={`${goal.progress} of ${goal.target} submitted for ${goal.title}`}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <Link
                  href="/goals"
                  className="flex min-h-11 items-center gap-2 text-sm text-primary"
                >
                  <Target className="size-4" aria-hidden="true" />
                  Set a submission goal
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              )}
            </section>

            {home.selectedForYou.length ? (
              <section
                aria-labelledby="home-selected-title"
                className="space-y-4"
              >
                <h2 id="home-selected-title" className="text-lg font-semibold">
                  Selected for you
                </h2>
                <ul className="divide-y divide-border border-y border-border">
                  {home.selectedForYou.map((opening) => (
                    <li key={opening.opportunityId}>
                      <Link
                        href={`/opportunities/${encodeURIComponent(opening.opportunityId)}`}
                        className="flex min-h-14 items-start gap-3 py-3 text-sm hover:text-primary"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium break-words">
                            {opening.title}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {opening.reason}
                          </span>
                        </span>
                        <ArrowUpRight
                          className="mt-0.5 size-4 shrink-0"
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/opportunities/for-you"
                  className="inline-flex min-h-11 items-center gap-2 text-sm text-primary"
                >
                  More selected for you
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </section>
            ) : null}

            <nav aria-label="Your workspace" className="space-y-1">
              {[
                { href: "/tracker", label: "Tracker", icon: FolderKanban },
                { href: "/calendar", label: "Calendar", icon: CalendarDays },
                { href: "/library", label: "Library", icon: Library },
              ].map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex min-h-11 items-center gap-3 text-sm text-foreground hover:text-primary"
                >
                  <Icon
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  {label}
                  <ArrowRight className="ms-auto size-4" aria-hidden="true" />
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function HomeList({
  id,
  title,
  rows,
  empty,
}: {
  id: string;
  title: string;
  rows: HomeRow[];
  empty: string;
}) {
  return (
    <section aria-labelledby={`${id}-title`} className="space-y-4">
      <h2
        id={`${id}-title`}
        className="flex items-baseline gap-2 text-lg font-semibold"
      >
        {title}
        {rows.length ? (
          <span className="font-mono text-sm font-normal text-muted-foreground tabular-nums">
            {rows.length}
          </span>
        ) : null}
      </h2>
      {rows.length ? (
        <ul className="divide-y divide-border border-y border-border">
          {rows.map((row) => (
            <li key={row.opportunityId}>
              <Link
                href={row.href}
                className="flex min-h-16 items-center gap-3 py-3 hover:text-primary"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-heading text-base break-words">
                    {row.title}
                  </span>
                  <span
                    className={
                      row.attention
                        ? "block text-sm font-medium text-ochre-deep"
                        : "block text-sm text-muted-foreground"
                    }
                  >
                    {row.organizationName ? `${row.organizationName} · ` : ""}
                    {row.detail}
                  </span>
                </span>
                <ArrowRight
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}
