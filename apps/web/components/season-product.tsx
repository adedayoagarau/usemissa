"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarRange, CheckCircle2, Clock3, Hourglass, ListChecks, RefreshCw, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DateConfidenceBadge,
  FeeBadge,
  formatFee,
  UrgencyBadge,
} from "@/components/missa/deadline-badges";
import { UpgradeHint } from "@/components/missa/upgrade-hint";
import { formatShortDate } from "@/lib/deadline-moment";
import {
  comingBack,
  feeBudget,
  laterTarget,
  seasonCrunchWeeks,
  thisWeeksThree,
  trackerItemHref,
  type SeasonCall,
  type SeasonForecast,
  type SeasonMatchingCalls,
  type SeasonObligation,
  type SeasonTier,
  type WeekAction,
} from "@/lib/season-plan";
import styles from "./season-product.module.css";
import { Sp, useSp } from "@/components/missa/spelling";

/** The capacity response from GET /api/me/planning/capacity. */
type CapacityItem = {
  id: string;
  title: string;
  finishOn: string;
  status: "fits" | "tight" | "does-not-fit";
  cause: string;
  suggestion: "none" | "start-now" | "move-target" | "add-hours" | "drop-or-defer";
  opportunityId: string;
  trackedOpportunityId: string;
  finishBasis: "personal-target" | "deadline";
  startBy?: { startOn: string; reason: string; feasible: boolean };
};
type CapacityReport =
  | { status: "locked" }
  | { status: "needs-hours" }
  | { status: "ready"; weeklyHours: number; items: CapacityItem[]; undated: Array<{ opportunityId: string; title: string }> };
type CapacityState = { phase: "loading" } | { phase: "error"; message: string } | { phase: "loaded"; report: CapacityReport };

const PREFERENCES_HREF = "/inbox#notification-preferences-title";
const PRACTICE_PREFERENCES_HREF = "/profile?section=preferences";
const FREE_WEEKS = 8;
const SEASON_WEEKS = 26;

const CAPACITY_LABELS: Record<CapacityItem["status"], string> = {
  fits: "Fits",
  tight: "Tight",
  "does-not-fit": "Does not fit",
};

export type SeasonProductProps = {
  today: string;
  initialCalls: SeasonCall[];
  initialObligations: SeasonObligation[];
  initialTiers: Record<string, SeasonTier[]>;
  initialForecasts: SeasonForecast[];
  /** Open calls that match the creator's preferences; null when they could not be read. */
  initialMatching?: SeasonMatchingCalls | null;
  initialFeatures: { capacityPlanning: boolean; seasonPlan: boolean };
  initialWeeklyHours: number | null;
  /** True when the plan data could not be read; the page still renders. */
  unavailable?: boolean;
};

export function SeasonProduct({
  today,
  initialCalls,
  initialObligations,
  initialTiers,
  initialForecasts,
  initialMatching = null,
  initialFeatures,
  initialWeeklyHours,
  unavailable = false,
}: SeasonProductProps) {
  const [calls, setCalls] = useState(initialCalls);
  const now = useMemo(() => new Date(`${today}T12:00:00Z`), [today]);
  const short = useCallback((date: string) => formatShortDate(date, now), [now]);

  const actions = useMemo(() => thisWeeksThree({ calls, obligations: initialObligations, today }), [calls, initialObligations, today]);
  const weeks = useMemo(
    () =>
      seasonCrunchWeeks(
        calls,
        today,
        initialFeatures.seasonPlan ? SEASON_WEEKS : FREE_WEEKS,
        initialMatching?.hasPreferences ? initialMatching.deadlines : [],
      ),
    [calls, today, initialFeatures.seasonPlan, initialMatching],
  );
  const budget = useMemo(
    () => feeBudget({ calls, tiersByOpportunity: new Map(Object.entries(initialTiers)), today }),
    [calls, initialTiers, today],
  );
  const returning = useMemo(() => comingBack(initialForecasts, today), [initialForecasts, today]);

  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        <h1 className="font-heading">Season</h1>
        <p>What to do this week, how busy the coming weeks look, what entry fees are ahead, and which calls are likely to come back.</p>
      </header>

      {unavailable ? (
        <Alert className={styles.notice}>
          <AlertTitle>Your season plan could not load</AlertTitle>
          <AlertDescription>
            Your Tracker and Calendar still have every date. Try this page again in a moment.
          </AlertDescription>
        </Alert>
      ) : null}

      <ThisWeek actions={actions} short={short} />
      <CapacityCheck
        enabled={initialFeatures.capacityPlanning}
        weeklyHours={initialWeeklyHours}
        calls={calls}
        short={short}
        onCallChanged={(next) => setCalls((current) => current.map((call) => (call.opportunityId === next.opportunityId ? next : call)))}
      />
      <CrunchWeeks
        weeks={weeks}
        full={initialFeatures.seasonPlan}
        matching={initialMatching ? (initialMatching.hasPreferences ? "shown" : "needs-preferences") : "unavailable"}
        short={short}
      />
      <FeeBudgetSection budget={budget} short={short} />
      <ComingBack rows={returning} short={short} />
    </main>
  );
}

function SectionHeading({ id, title, description }: { id: string; title: string; description: string }) {
  return (
    <header className={styles.sectionHeading}>
      <h2 id={id} className="font-heading">{title}</h2>
      <p><Sp>{description}</Sp></p>
    </header>
  );
}

function ThisWeek({ actions, short }: { actions: WeekAction[]; short: (date: string) => string }) {
  return (
    <section className={styles.section} aria-labelledby="season-week">
      <SectionHeading id="season-week" title="This week’s three" description="The most important things to do in the next seven days, from your deadlines and plan steps." />
      {actions.length ? (
        <ol className={styles.actions}>
          {actions.map((action, index) => (
            <li key={action.id} className={styles.action}>
              <span className={styles.actionNumber} aria-hidden="true">{index + 1}</span>
              <div className={styles.actionCopy}>
                <strong>{action.title}</strong>
                <span>
                  {action.detail} ·{" "}
                  {action.daysAway < 0
                    ? `Was due ${short(action.date)}`
                    : action.daysAway === 0
                      ? "Today"
                      : action.daysAway === 1
                        ? "Tomorrow"
                        : short(action.date)}
                </span>
              </div>
              {action.kind === "deadline" ? (
                <UrgencyBadge label={action.daysAway <= 1 ? (action.daysAway === 0 ? "Closes today" : "Closes tomorrow") : `Closes in ${action.daysAway} days`} />
              ) : null}
              <Button variant="ghost" className={styles.rowAction} render={<Link href={action.href} />}>
                Open
                <ArrowRight aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ol>
      ) : (
        <Empty variant="bordered">
          <EmptyHeader>
            <EmptyMedia variant="icon"><ListChecks aria-hidden="true" /></EmptyMedia>
            <EmptyTitle>Nothing due in the next seven days</EmptyTitle>
            <EmptyDescription>Deadlines and plan steps for calls you are preparing appear here as they come up.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" className={styles.rowAction} render={<Link href="/tracker" />}>Open Tracker</Button>
          </EmptyContent>
        </Empty>
      )}
    </section>
  );
}

function CapacityCheck({
  enabled,
  weeklyHours,
  calls,
  short,
  onCallChanged,
}: {
  enabled: boolean;
  weeklyHours: number | null;
  calls: SeasonCall[];
  short: (date: string) => string;
  onCallChanged: (call: SeasonCall) => void;
}) {
  const [state, setState] = useState<CapacityState>({ phase: "loading" });
  const [saving, setSaving] = useState<string>();

  const load = useCallback(async () => {
    setState({ phase: "loading" });
    try {
      const response = await fetch("/api/me/planning/capacity", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Capacity could not load. Try again.");
      setState({ phase: "loaded", report: data as CapacityReport });
    } catch (error) {
      setState({ phase: "error", message: error instanceof Error ? error.message : "Capacity could not load. Try again." });
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [enabled, load]);

  async function moveTarget(item: CapacityItem, target: string) {
    const call = calls.find((entry) => entry.opportunityId === item.opportunityId);
    if (!call) return;
    setSaving(item.id);
    try {
      const response = await fetch(`/api/me/tracker/${encodeURIComponent(call.opportunityId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ personalTargetOn: target, expectedRevision: call.revision }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 409) throw new Error("This call changed in another window. Refresh the page and try again.");
      if (!response.ok) throw new Error(data.error ?? "Your target date could not be saved.");
      const revision = typeof data?.tracked?.revision === "number" ? data.tracked.revision : call.revision + 1;
      onCallChanged({ ...call, revision, personalTargetOn: target });
      toast.success(`Target moved to ${short(target)}.`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Your target date could not be saved.");
    } finally {
      setSaving(undefined);
    }
  }

  return (
    <section className={styles.section} aria-labelledby="season-capacity">
      <SectionHeading id="season-capacity" title="Capacity check" description="Whether each call you are preparing fits the hours you have each week, and what to change when it does not." />
      {!enabled ? (
        <UpgradeHint plan="Pro" benefit="See whether every call fits the hours you have, with a one-tap fix for each one that is tight." />
      ) : state.phase === "loading" ? (
        <div className={styles.skeletons} aria-busy="true" aria-label="Loading capacity">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : state.phase === "error" ? (
        <Alert>
          <AlertTitle>Capacity could not load</AlertTitle>
          <AlertDescription>
            {state.message}{" "}
            <Button variant="link" size="sm" onClick={() => void load()}>
              <RefreshCw aria-hidden="true" /> Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : state.report.status === "locked" ? (
        <UpgradeHint plan="Pro" benefit="See whether every call fits the hours you have, with a one-tap fix for each one that is tight." />
      ) : state.report.status === "needs-hours" ? (
        <Empty variant="bordered">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Hourglass aria-hidden="true" /></EmptyMedia>
            <EmptyTitle>How many hours a week do you have?</EmptyTitle>
            <EmptyDescription>
              {weeklyHours === null
                ? "Tell Missa the hours you can give applications each week, and it will check every call against them."
                : "Add a few hours a week to check your calls against them."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" className={styles.rowAction} render={<Link href={PREFERENCES_HREF} />}>Set weekly hours</Button>
          </EmptyContent>
        </Empty>
      ) : state.report.items.length === 0 ? (
        <Empty variant="bordered">
          <EmptyHeader>
            <EmptyMedia variant="icon"><CheckCircle2 aria-hidden="true" /></EmptyMedia>
            <EmptyTitle>No dated calls in preparation</EmptyTitle>
            <EmptyDescription>Calls you are preparing with a deadline or target date appear here with how well they fit.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <p className={styles.meta}>Checked against {state.report.weeklyHours} hours a week.</p>
          <ul className={styles.capacityList}>
            {state.report.items.map((item) => {
              const call = calls.find((entry) => entry.opportunityId === item.opportunityId);
              const target = item.status === "fits" ? null : laterTarget(item.finishOn, call?.deadline);
              return (
                <li key={item.id} className={styles.capacityItem}>
                  <div className={styles.capacityCopy}>
                    <strong>{item.title}</strong>
                    <span>
                      {item.finishBasis === "personal-target" ? "Your target" : "Deadline"} {short(item.finishOn)} · {item.cause}
                    </span>
                    {item.startBy ? <span>Start by {short(item.startBy.startOn)}. {item.startBy.reason}</span> : null}
                  </div>
                  <span className={styles.capacityStatus}>
                    {item.status === "fits" ? <CheckCircle2 aria-hidden="true" /> : <Clock3 aria-hidden="true" />}
                    <UrgencyBadge label={CAPACITY_LABELS[item.status]} urgent={item.status !== "fits"} />
                  </span>
                  {item.status !== "fits" ? (
                    <div className={styles.fixes} role="group" aria-label={`Fixes for ${item.title}`}>
                      {target ? (
                        <Button variant="outline" className={styles.rowAction} disabled={saving === item.id} onClick={() => void moveTarget(item, target)}>
                          {saving === item.id ? "Saving…" : `Set target to ${short(target)}`}
                        </Button>
                      ) : null}
                      <Button variant="ghost" className={styles.rowAction} render={<Link href={trackerItemHref(item.opportunityId)} />}>
                        Open in Tracker
                      </Button>
                      <Button variant="ghost" className={styles.rowAction} render={<Link href={PREFERENCES_HREF} />}>
                        Adjust weekly hours
                      </Button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {state.report.undated.length ? (
            <p className={styles.meta}>
              Not checked, because they have no date yet: {state.report.undated.map((item) => item.title).join(", ")}.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}

function weekLabel(weekStart: string, short: (date: string) => string) {
  return `Week of ${short(weekStart)}`;
}

function deadlineCount(count: number) {
  return `${count} ${count === 1 ? "deadline" : "deadlines"}`;
}

function matchingCount(count: number) {
  return `${count} matching open ${count === 1 ? "call" : "calls"}`;
}

const MATCHING_LABEL = "Open calls that match you";

function CrunchWeeks({
  weeks,
  full,
  matching,
  short,
}: {
  weeks: ReturnType<typeof seasonCrunchWeeks>;
  full: boolean;
  /** Whether the second series is shown, needs preferences first, or could not be read. */
  matching: "shown" | "needs-preferences" | "unavailable";
  short: (date: string) => string;
}) {
  const showMatching = matching === "shown";
  const total = weeks.reduce((sum, week) => sum + week.count, 0);
  const matchingTotal = showMatching ? weeks.reduce((sum, week) => sum + week.matchingCount, 0) : 0;
  const max = Math.max(3, ...weeks.map((week) => Math.max(week.count, showMatching ? week.matchingCount : 0)));
  const busy = weeks.filter((week) => week.crunch);
  const summary = (week: (typeof weeks)[number], separator: string) =>
    [
      weekLabel(week.weekStart, short),
      deadlineCount(week.count),
      ...(showMatching ? [matchingCount(week.matchingCount)] : []),
      ...(week.crunch ? ["Busy week"] : []),
    ].join(separator);
  return (
    <section className={styles.section} aria-labelledby="season-crunch">
      <SectionHeading
        id="season-crunch"
        title="Crunch weeks"
        description={`Deadlines per week for the next ${weeks.length} weeks, across calls you are preparing. Weeks with three or more are marked busy.${showMatching ? " Open calls that match your preferences are shown beside them." : ""}`}
      />
      {matching === "needs-preferences" ? (
        <p className={styles.meta}>
          Choose what you make to see open calls that match you here.{" "}
          <Button variant="link" size="sm" className={styles.rowAction} render={<Link href={PRACTICE_PREFERENCES_HREF} />}>
            Set your preferences
          </Button>
        </p>
      ) : null}
      {total === 0 && matchingTotal === 0 ? (
        <Empty variant="bordered">
          <EmptyHeader>
            <EmptyMedia variant="icon"><CalendarRange aria-hidden="true" /></EmptyMedia>
            <EmptyTitle>No deadlines in the next {weeks.length} weeks</EmptyTitle>
            <EmptyDescription>Save calls to your Tracker and their deadlines fill in here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <p className={styles.meta}>
            {busy.length
              ? `${busy.length} busy ${busy.length === 1 ? "week" : "weeks"} ahead: ${busy.map((week) => short(week.weekStart)).join(", ")}.`
              : "No week has three or more deadlines."}
            {showMatching
              ? ` ${matchingTotal} open ${matchingTotal === 1 ? "call matches" : "calls match"} you and ${matchingTotal === 1 ? "is" : "are"} not in your Tracker.`
              : ""}
          </p>
          <div className={styles.strip} role="img" aria-label={`Deadlines per week: ${weeks.map((week) => summary(week, ", ")).join("; ")}`}>
            {weeks.map((week, index) => (
              <div key={week.weekStart} className={styles.bar} data-crunch={week.crunch} title={summary(week, " · ")}>
                <span className={styles.barValue} aria-hidden="true">{week.count || ""}</span>
                <span className={styles.barTrack} aria-hidden="true">
                  <span className={styles.barFill} style={{ height: `${(week.count / max) * 100}%` }} />
                  {showMatching ? (
                    <span className={styles.barMatching} data-empty={week.matchingCount === 0} style={{ height: `${(week.matchingCount / max) * 100}%` }} />
                  ) : null}
                </span>
                <span className={styles.barLabel} aria-hidden="true">
                  {index === 0 || index % 4 === 0 ? short(week.weekStart) : ""}
                </span>
              </div>
            ))}
          </div>
          <p className={styles.legend}>
            <span><i className={styles.swatch} aria-hidden="true" /> Deadlines that week, solid</span>
            <span><i className={`${styles.swatch} ${styles.swatchBusy}`} aria-hidden="true" /> Busy week, three or more</span>
            {showMatching ? (
              <span><i className={`${styles.swatch} ${styles.swatchMatching}`} aria-hidden="true" /> {MATCHING_LABEL}, striped</span>
            ) : null}
          </p>
          <Collapsible>
            <CollapsibleTrigger render={<Button variant="link" size="sm" className={styles.rowAction} />}>Show as a table</CollapsibleTrigger>
            <CollapsibleContent>
              <Table>
                <TableCaption>Deadlines per week{showMatching ? ", with open calls that match you" : ""}</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Week</TableHead>
                    <TableHead>Deadlines</TableHead>
                    {showMatching ? <TableHead>{MATCHING_LABEL}</TableHead> : null}
                    <TableHead>Busy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weeks.map((week) => (
                    <TableRow key={week.weekStart}>
                      <TableCell>{weekLabel(week.weekStart, short)}</TableCell>
                      <TableCell>{week.count}</TableCell>
                      {showMatching ? <TableCell>{week.matchingCount}</TableCell> : null}
                      <TableCell>{week.crunch ? "Busy week" : "No"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CollapsibleContent>
          </Collapsible>
        </>
      )}
      {!full ? (
        <UpgradeHint plan="Pro" benefit={`See all ${SEASON_WEEKS} weeks ahead to plan your whole season.`} />
      ) : null}
    </section>
  );
}

function FeeBudgetSection({ budget, short }: { budget: ReturnType<typeof feeBudget>; short: (date: string) => string }) {
  return (
    <section className={styles.section} aria-labelledby="season-fees">
      <SectionHeading id="season-fees" title="Fee budget" description="Entry fees for calls you are preparing with a deadline this month or next, at the fee that applies today." />
      {budget.lines.length === 0 ? (
        <Empty variant="bordered">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Wallet aria-hidden="true" /></EmptyMedia>
            <EmptyTitle>No fees due this month or next</EmptyTitle>
            <EmptyDescription>Calls you are preparing with a deadline in the next two months appear here with their entry fee.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          {budget.totals.length ? (
            <dl className={styles.totals}>
              {budget.totals.map((total) => (
                <div key={total.currency} className={styles.totalGroup}>
                  <div>
                    <dt>This month</dt>
                    <dd className="font-heading">{formatFee(total.thisMonthCents, total.currency)}</dd>
                  </div>
                  <div>
                    <dt>Next month</dt>
                    <dd className="font-heading">{formatFee(total.nextMonthCents, total.currency)}</dd>
                  </div>
                  {total.savingsCents > 0 ? (
                    <div>
                      <dt>You can still save</dt>
                      <dd className="font-heading">{formatFee(total.savingsCents, total.currency)}</dd>
                    </div>
                  ) : null}
                </div>
              ))}
            </dl>
          ) : null}
          {budget.unknownCount ? (
            <p className={styles.meta}>
              {budget.unknownCount === 1 ? "One call does not publish its fee" : `${budget.unknownCount} calls do not publish their fee`}, so the totals leave {budget.unknownCount === 1 ? "it" : "them"} out.
            </p>
          ) : null}
          <ul className={styles.feeList}>
            {budget.lines.map((line) => (
              <li key={line.opportunityId} className={styles.feeItem}>
                <div className={styles.capacityCopy}>
                  <Link href={trackerItemHref(line.opportunityId)} className={styles.titleLink}>{line.title}</Link>
                  <span>
                    Deadline {short(line.deadline)}
                    {line.tierLabel ? ` · ${line.tierLabel} fee` : ""}
                  </span>
                  {line.savingsCents && line.savingsUntil ? (
                    <span>Save {formatFee(line.savingsCents, line.currency)} by submitting by {short(line.savingsUntil)}.</span>
                  ) : null}
                </div>
                {line.feeCents === undefined ? (
                  <span className={styles.meta}>Fee not published</span>
                ) : (
                  <FeeBadge cents={line.feeCents} currency={line.currency} />
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function ComingBack({ rows, short }: { rows: ReturnType<typeof comingBack>; short: (date: string) => string }) {
  const sp = useSp();
  return (
    <section className={styles.section} aria-labelledby="season-returning">
      <SectionHeading id="season-returning" title="Coming back" description="Calls you track or whose organization you follow that have closed, with when Missa expects them to return. These dates are predictions from past cycles." />
      {rows.length === 0 ? (
        <Empty variant="bordered">
          <EmptyHeader>
            <EmptyMedia variant="icon"><RefreshCw aria-hidden="true" /></EmptyMedia>
            <EmptyTitle>No predictions yet</EmptyTitle>
            <EmptyDescription>When a call you follow has run for a few cycles, Missa predicts when it will return and shows it here.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" className={styles.rowAction} render={<Link href="/following" />}>See who you follow</Button>
          </EmptyContent>
        </Empty>
      ) : (
        <ul className={styles.feeList}>
          {rows.map((row) => (
            <li key={row.opportunityId} className={styles.feeItem}>
              <div className={styles.capacityCopy}>
                <Link href={`/opportunities/${encodeURIComponent(row.opportunityId)}`} className={styles.titleLink}>{row.title}</Link>
                <span>
                  {row.label} {short(row.nextDate)}
                  {row.label === "Predicted to open" && row.forecast.expectedOpenEnd && row.forecast.expectedOpenEnd !== row.nextDate
                    ? ` to ${short(row.forecast.expectedOpenEnd)}`
                    : ""}
                  {" · "}
                  {row.relation === "tracked" ? "In your Tracker" : `You follow ${row.organizationName ?? sp("this organization")}`}
                </span>
              </div>
              <DateConfidenceBadge state="predicted" label={`Predicted from ${row.forecast.basedOnCycles} cycles`} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
