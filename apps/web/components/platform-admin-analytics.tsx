"use client";

import Link from "next/link";
import type { AdminArea } from "@/lib/platformAdmin";
import type { PlatformAdminAnalyticsData } from "@/lib/platformAdminViews";
import {
  activationRate,
  biggestJourneyDrop,
  trackingHealth,
} from "@/lib/platformAnalyticsInsights";
import { cn } from "@/lib/utils";
import { MaturityBadge, WarningList } from "./platform-admin";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { buttonVariants } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

function SectionHeading({ title, detail }: { title: string; detail: string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
        {detail}
      </p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number | string;
  detail: string;
}) {
  return (
    <div className="border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-2xl text-foreground tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

function EmptyState({ children }: { children: string }) {
  return (
    <p className="px-4 py-10 text-center text-xs text-muted-foreground">
      {children}
    </p>
  );
}

function segmentCount(data: PlatformAdminAnalyticsData, key: string) {
  return (
    data.durable.segments.find((segment) => segment.key === key)?.accounts ?? 0
  );
}

function formatDate(value?: string) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function userLabel(email: string | undefined, accountId: string) {
  if (email) return email;
  return accountId.length > 16
    ? `${accountId.slice(0, 8)}…${accountId.slice(-4)}`
    : accountId;
}

const segmentActions: Record<string, string> = {
  "searched-no-save":
    "Review search relevance and the clarity of Save actions.",
  "saved-no-prepare":
    "Check whether the saved-opportunity workspace explains the next step.",
  "prepared-no-export": "Review preparation friction and export failures.",
  "new-accounts":
    "Compare signups with activation to judge onboarding quality.",
  "newly-activated":
    "Inspect which first opportunities helped these creators activate.",
  activated: "Track whether activated creators return and progress to Apply.",
  returning: "Look for the repeated workflows that make Missa valuable.",
};

export default function PlatformAdminAnalytics({
  area,
}: {
  area: AdminArea<PlatformAdminAnalyticsData>;
}) {
  const { data } = area;
  const newAccounts = segmentCount(data, "new-accounts");
  const newlyActivated = segmentCount(data, "newly-activated");
  const returning = segmentCount(data, "returning");
  const activation = activationRate(newlyActivated, newAccounts);
  const largestDrop = biggestJourneyDrop(data.durable.journeyFunnel);
  const tracking = trackingHealth(
    data.durable.available,
    data.durable.summary.last24h,
    data.durable.quality.unregisteredEvents,
    data.durable.quality.authorityMismatches,
  );
  const backendNeedsAttention =
    data.backend.failedWorkers > 0 ||
    data.backend.queueAttention > 0 ||
    data.backend.staleSources > 0;

  return (
    <div className="max-w-full min-w-0 space-y-6">
      <header>
        <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Platform Admin · Product
        </p>
        <h1 className="mt-2 font-heading text-4xl font-medium tracking-tight text-foreground">
          Analytics
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          See who is using Missa, where creators stop in the journey, and
          whether the tracking and backend systems can be trusted.
        </p>
        <div
          className="mt-4 flex flex-wrap items-center gap-2"
          aria-label="Analytics date range"
        >
          {[7, 30, 90].map((days) => (
            <Link
              key={days}
              href={`/admin/analytics?days=${days}`}
              className={cn(
                buttonVariants({
                  variant:
                    data.durable.windowDays === days ? "default" : "outline",
                  size: "sm",
                }),
              )}
            >
              {days} days
            </Link>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <MaturityBadge maturity={area.provenance.maturity} />
          <span>Source: {area.provenance.source}</span>
          <span>Freshness: {area.provenance.freshness}</span>
        </div>
      </header>
      <WarningList warnings={area.warnings} />

      <Tabs defaultValue="overview">
        <TabsList
          variant="line"
          className="max-w-full overflow-x-auto"
          aria-label="Analytics views"
        >
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="journey">Journey</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="data">Data quality</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8 pt-5">
          <section aria-label="Key product metrics">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Active users"
                value={data.durable.summary.uniqueAccounts}
                detail={`Authenticated accounts seen in ${data.durable.windowDays} days`}
              />
              <MetricCard
                label="New accounts"
                value={newAccounts}
                detail="Successful signups in this period"
              />
              <MetricCard
                label="Activation rate"
                value={activation === null ? "—" : `${activation}%`}
                detail="New accounts that saved an opportunity within 14 days"
              />
              <MetricCard
                label="Returning users"
                value={returning}
                detail="Accounts active on at least two days"
              />
            </div>
          </section>

          <section aria-label="What needs attention" className="space-y-4">
            <SectionHeading
              title="What needs attention"
              detail="Start here. These are the clearest product or operational signals in the selected period."
            />
            <div className="grid gap-3 lg:grid-cols-3">
              <Alert>
                <AlertTitle>
                  {largestDrop
                    ? `${largestDrop.from} → ${largestDrop.to}`
                    : "Journey needs more data"}
                </AlertTitle>
                <AlertDescription>
                  {largestDrop
                    ? `${largestDrop.lost} people or sessions did not reach the next step (${largestDrop.conversion}% continued). Open Journey to investigate.`
                    : "There are not enough consecutive journey events to identify a drop-off yet."}
                </AlertDescription>
              </Alert>
              <Alert
                variant={tracking === "Healthy" ? "default" : "destructive"}
              >
                <AlertTitle>Tracking: {tracking}</AlertTitle>
                <AlertDescription>
                  {tracking === "Healthy"
                    ? `${data.durable.summary.last24h} events arrived in the last 24 hours with no contract mismatch.`
                    : "Open Data quality to see missing, unregistered, or incorrectly sourced events."}
                </AlertDescription>
              </Alert>
              <Alert
                variant={backendNeedsAttention ? "destructive" : "default"}
              >
                <AlertTitle>
                  Backend:{" "}
                  {backendNeedsAttention
                    ? "Needs attention"
                    : data.backend.workerStatus}
                </AlertTitle>
                <AlertDescription>
                  {backendNeedsAttention
                    ? `${data.backend.failedWorkers} failed workers, ${data.backend.queueAttention} queued items needing attention, and ${data.backend.staleSources} stale sources.`
                    : `${data.backend.runningWorkers} workers running; no failed workers, blocked queue items, or stale sources observed.`}
                </AlertDescription>
              </Alert>
            </div>
          </section>

          <section
            className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"
            aria-label="Activity and guide"
          >
            <div>
              <SectionHeading
                title="Activity over time"
                detail="Daily first-party events show whether usage is growing, falling, or interrupted."
              />
              <div className="mt-4 border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Day UTC</TableHead>
                      <TableHead className="text-end">Events</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.durable.daily.slice(-14).map((item) => (
                      <TableRow key={item.day}>
                        <TableCell className="font-mono text-xs">
                          {item.day}
                        </TableCell>
                        <TableCell className="text-end font-mono tabular-nums">
                          {item.count}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {data.durable.daily.length === 0 ? (
                  <EmptyState>
                    No daily activity is available for this period.
                  </EmptyState>
                ) : null}
              </div>
            </div>
            <div>
              <SectionHeading
                title="How to use this page"
                detail="A short weekly review is enough to make this dashboard useful."
              />
              <ol className="mt-4 divide-y divide-border border border-border bg-card text-sm">
                <li className="p-4">
                  <strong className="font-medium">
                    1. Check the overview.
                  </strong>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Confirm users and events are active, then read the attention
                    cards.
                  </p>
                </li>
                <li className="p-4">
                  <strong className="font-medium">
                    2. Find the affected people.
                  </strong>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Use Users and Journey to see who stopped and at which step.
                  </p>
                </li>
                <li className="p-4">
                  <strong className="font-medium">
                    3. Rule out system trouble.
                  </strong>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Use System and Data quality before treating a fall as a
                    product problem.
                  </p>
                </li>
              </ol>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="users" className="space-y-6 pt-5">
          <SectionHeading
            title="Recent user activity"
            detail="Authenticated accounts active in this window. Email is shown only when the account record is available; anonymous sessions are excluded."
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard
              label="Active users"
              value={data.durable.summary.uniqueAccounts}
              detail="Accounts with at least one event"
            />
            <MetricCard
              label="Activated creators"
              value={segmentCount(data, "activated")}
              detail="Accounts that saved an opportunity"
            />
            <MetricCard
              label="Returning creators"
              value={returning}
              detail="Active on two or more days"
            />
          </div>
          <div className="overflow-x-auto border border-border bg-card">
            {data.durable.users.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Segment</TableHead>
                    <TableHead>Furthest step</TableHead>
                    <TableHead>Last activity</TableHead>
                    <TableHead className="text-end">Days</TableHead>
                    <TableHead className="text-end">Events</TableHead>
                    <TableHead>Latest action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.durable.users.map((user) => (
                    <TableRow key={user.accountId}>
                      <TableCell>
                        <p className="max-w-56 truncate font-medium">
                          {userLabel(user.email, user.accountId)}
                        </p>
                        {user.email ? (
                          <p className="font-mono text-[10px] text-muted-foreground">
                            {userLabel(undefined, user.accountId)}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>{user.segment}</TableCell>
                      <TableCell>{user.journeyStage}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                        {formatDate(user.lastSeenAt)}
                      </TableCell>
                      <TableCell className="text-end font-mono tabular-nums">
                        {user.activeDays}
                      </TableCell>
                      <TableCell className="text-end font-mono tabular-nums">
                        {user.events}
                      </TableCell>
                      <TableCell>
                        <p className="font-mono text-xs">
                          {user.latestEventName}
                        </p>
                        {user.latestPath ? (
                          <p className="max-w-56 truncate text-[10px] text-muted-foreground">
                            {user.latestPath}
                          </p>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState>
                No authenticated user activity is available for this period.
              </EmptyState>
            )}
          </div>
          <Alert>
            <AlertTitle>How segments are assigned</AlertTitle>
            <AlertDescription>
              New means a recent signup; Activated means a Save was recorded;
              Returning means activity on multiple days. These labels describe
              observed behavior only—they do not infer identity, eligibility, or
              intent.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="journey" className="space-y-8 pt-5">
          <section>
            <SectionHeading
              title="Creator journey"
              detail="Discover → Evaluate → Save → Prepare → Apply → Confirm → Track → Outcome. Apply means an official destination opened; only a user record or provider receipt can confirm submission."
            />
            {largestDrop ? (
              <Alert className="mt-4">
                <AlertTitle>
                  Biggest observed drop: {largestDrop.from} → {largestDrop.to}
                </AlertTitle>
                <AlertDescription>
                  {largestDrop.lost} people or sessions did not continue.{" "}
                  {largestDrop.conversion}% reached the next step.
                </AlertDescription>
              </Alert>
            ) : null}
            <div className="mt-4 overflow-x-auto border border-border bg-card">
              {data.durable.journeyFunnel.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stage</TableHead>
                      <TableHead className="text-end">
                        People or sessions
                      </TableHead>
                      <TableHead className="text-end">
                        From prior stage
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.durable.journeyFunnel.map((stage) => (
                      <TableRow key={stage.key}>
                        <TableCell className="font-medium">
                          {stage.label}
                        </TableCell>
                        <TableCell className="text-end font-mono tabular-nums">
                          {stage.actors}
                        </TableCell>
                        <TableCell className="text-end font-mono text-muted-foreground tabular-nums">
                          {stage.conversionFromPrevious === null
                            ? "—"
                            : `${stage.conversionFromPrevious}%`}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState>
                  No complete journey events are available for this period.
                </EmptyState>
              )}
            </div>
          </section>
          <section>
            <SectionHeading
              title="Behavioral segments"
              detail="Use these cohorts to decide which part of the experience to inspect next."
            />
            <div className="mt-4 divide-y divide-border border border-border bg-card">
              {data.durable.segments.length ? (
                data.durable.segments.map((segment) => (
                  <div
                    key={segment.key}
                    className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-start"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {segment.label}
                      </p>
                      <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                        {segment.definition}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-foreground">
                        Next:{" "}
                        {segmentActions[segment.key] ??
                          "Inspect the associated events and recent users."}
                      </p>
                    </div>
                    <span className="font-mono text-lg text-foreground tabular-nums">
                      {segment.accounts}
                    </span>
                  </div>
                ))
              ) : (
                <EmptyState>
                  No authenticated behavior is available for segmentation.
                </EmptyState>
              )}
            </div>
          </section>
          <section>
            <SectionHeading
              title="Week-one retention"
              detail="Accounts returning 7–13 days after their first authenticated event. Incomplete cohorts are excluded."
            />
            <div className="mt-4 border border-border bg-card">
              {data.durable.retention.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cohort week</TableHead>
                      <TableHead className="text-end">Accounts</TableHead>
                      <TableHead className="text-end">Returned</TableHead>
                      <TableHead className="text-end">Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.durable.retention.map((cohort) => (
                      <TableRow key={cohort.cohortWeek}>
                        <TableCell className="font-mono text-xs">
                          {cohort.cohortWeek}
                        </TableCell>
                        <TableCell className="text-end font-mono tabular-nums">
                          {cohort.accounts}
                        </TableCell>
                        <TableCell className="text-end font-mono tabular-nums">
                          {cohort.returnedWeekOne}
                        </TableCell>
                        <TableCell className="text-end font-mono tabular-nums">
                          {cohort.rate === null ? "—" : `${cohort.rate}%`}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState>
                  No mature retention cohorts are available yet.
                </EmptyState>
              )}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="system" className="space-y-8 pt-5">
          <section>
            <SectionHeading
              title="Backend health"
              detail="Operational signals that can explain missing data or a broken user journey."
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Worker status"
                value={data.backend.workerStatus}
                detail={`${data.backend.runningWorkers} running · ${data.backend.failedWorkers} failed`}
              />
              <MetricCard
                label="Queue attention"
                value={data.backend.queueAttention}
                detail="Items blocked, failed, or needing review"
              />
              <MetricCard
                label="Stale sources"
                value={data.backend.staleSources}
                detail="Opportunity sources beyond freshness bounds"
              />
              <MetricCard
                label="Durable tables"
                value={`${data.backend.deployedTables}/${data.backend.observedTables}`}
                detail="Expected tables observed as deployed"
              />
            </div>
            {data.backend.lastHeartbeatAt ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Last worker heartbeat:{" "}
                {formatDate(data.backend.lastHeartbeatAt)}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/admin/operations"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Open operations
              </Link>
              <Link
                href="/admin/system"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Open system details
              </Link>
            </div>
          </section>
          <section>
            <SectionHeading
              title="Tracking health"
              detail="Check this before interpreting a fall in usage as a product problem."
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Status"
                value={tracking}
                detail="Ledger availability, recency, and contract checks"
              />
              <MetricCard
                label="Last 24 hours"
                value={data.durable.summary.last24h}
                detail="Recorded first-party events"
              />
              <MetricCard
                label="Unregistered"
                value={data.durable.quality.unregisteredEvents}
                detail="Events absent from the tracking plan"
              />
              <MetricCard
                label="Authority mismatches"
                value={data.durable.quality.authorityMismatches}
                detail="Server-only events received from a browser"
              />
            </div>
          </section>
        </TabsContent>

        <TabsContent value="data" className="space-y-8 pt-5">
          <section>
            <SectionHeading
              title="Analytics quality"
              detail="These checks tell you when the dashboard is incomplete or cannot be trusted."
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Missing actor"
                value={data.durable.quality.missingActor}
                detail="No account or anonymous session identifier"
              />
              <MetricCard
                label="Anonymous events"
                value={data.durable.quality.anonymousEvents}
                detail="Session-scoped; excluded from retention"
              />
              <MetricCard
                label="Unregistered events"
                value={data.durable.quality.unregisteredEvents}
                detail="Absent from the tracking plan"
              />
              <MetricCard
                label="Authority mismatches"
                value={data.durable.quality.authorityMismatches}
                detail="Server-only events received from a browser"
              />
            </div>
          </section>
          <section className="grid gap-6 lg:grid-cols-2">
            <div>
              <SectionHeading
                title="Events by name"
                detail="The exact actions received by the first-party ledger."
              />
              <div className="mt-4 divide-y divide-border border border-border bg-card">
                {data.durable.byEvent.length ? (
                  data.durable.byEvent.map((item) => (
                    <div
                      key={item.eventName}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <span className="truncate font-mono text-xs text-foreground">
                        {item.eventName}
                      </span>
                      <span className="font-mono text-sm text-muted-foreground tabular-nums">
                        {item.count}
                      </span>
                    </div>
                  ))
                ) : (
                  <EmptyState>
                    No durable product events were recorded.
                  </EmptyState>
                )}
              </div>
            </div>
            <div>
              <SectionHeading
                title="Acquisition"
                detail="Bounded campaign, referrer, and device values; raw URLs and personal identifiers are excluded."
              />
              <div className="mt-4 border border-border bg-card">
                {data.durable.dimensions.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dimension</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead className="text-end">People</TableHead>
                        <TableHead className="text-end">Events</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.durable.dimensions.map((row) => (
                        <TableRow key={`${row.dimension}:${row.value}`}>
                          <TableCell>{row.dimension}</TableCell>
                          <TableCell className="max-w-48 truncate font-mono text-xs">
                            {row.value}
                          </TableCell>
                          <TableCell className="text-end font-mono tabular-nums">
                            {row.actors}
                          </TableCell>
                          <TableCell className="text-end font-mono tabular-nums">
                            {row.events}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <EmptyState>
                    No acquisition dimensions are available.
                  </EmptyState>
                )}
              </div>
            </div>
          </section>
          <section
            className="border border-dashed border-border bg-card p-4"
            aria-label="Metric boundaries"
          >
            <h2 className="text-sm font-semibold text-foreground">
              Metric boundaries
            </h2>
            <ul className="mt-3 grid gap-2 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
              {data.definitions.map((definition) => (
                <li key={definition} className="border-s-2 border-border ps-3">
                  {definition}
                </li>
              ))}
            </ul>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
