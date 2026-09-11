"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Clock3, Percent, Send, Users } from "lucide-react";
import type { MagazineRankingRow, MagazineTelemetrySummary } from "@missa/radar-adapters";
import { ReportResponseDialog } from "@/components/rankings/report-response-dialog";

interface JournalTelemetryPanelProps {
  profileId: string;
  magazineName: string;
  telemetry: MagazineTelemetrySummary;
  ranking?: Pick<MagazineRankingRow, "medianResponseDays" | "turnaroundScore"> | null;
}

function metricValue(value: number | null, suffix = "") {
  return value == null ? "Not enough data" : `${value}${suffix}`;
}

function latestLabel(value: string | null) {
  if (!value) return "No community report yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recent community report available";
  return `Latest report ${new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)}`;
}

export function JournalTelemetryPanel({
  profileId,
  magazineName,
  telemetry,
  ranking,
}: JournalTelemetryPanelProps) {
  const [summary, setSummary] = React.useState(telemetry);

  const responseDistribution = [
    { label: "<30d", reports: summary.distribution.under30 },
    { label: "31-60d", reports: summary.distribution.days31To60 },
    { label: "61-90d", reports: summary.distribution.days61To90 },
    { label: "90d+", reports: summary.distribution.days90Plus },
  ];
  const outcomeRows = [
    { label: "Acceptances", value: summary.outcomes.accepted },
    { label: "Personal rejections", value: summary.outcomes.personalRejections },
    { label: "Form rejections", value: summary.outcomes.formRejections },
    { label: "Withdrawals", value: summary.outcomes.withdrawn },
    { label: "Pending reports", value: summary.outcomes.pending },
  ];
  const communityMedian =
    summary.medianResponseDays ?? ranking?.medianResponseDays ?? null;
  const totalDistributionReports = responseDistribution.reduce(
    (sum, item) => sum + item.reports,
    0,
  );

  return (
    <section
      className="mt-10 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5"
      aria-labelledby="journal-telemetry-heading"
    >
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Response telemetry
          </p>
          <h2
            id="journal-telemetry-heading"
            className="mt-1 text-2xl font-semibold tracking-tight text-foreground"
          >
            What writers are hearing back
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Community reports are shown as current evidence, not as a promise
            about this editor&apos;s next decision.
          </p>
        </div>
        <ReportResponseDialog
          profileId={profileId}
          magazineName={magazineName}
          onSuccess={(newMedianDays, nextSummary) => {
            if (nextSummary) {
              setSummary(nextSummary);
              return;
            }
            if (newMedianDays == null) return;
            setSummary((current) => ({
              ...current,
              medianResponseDays: newMedianDays,
            }));
          }}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-background p-3">
          <Clock3 className="size-4 text-primary" aria-hidden="true" />
          <p className="mt-2 text-xs text-muted-foreground">Median response</p>
          <strong className="text-lg text-foreground">
            {metricValue(communityMedian, " days")}
          </strong>
        </div>
        <div className="rounded-lg border border-border bg-background p-3">
          <Clock3 className="size-4 text-primary" aria-hidden="true" />
          <p className="mt-2 text-xs text-muted-foreground">90th percentile</p>
          <strong className="text-lg text-foreground">
            {metricValue(summary.p90ResponseDays, " days")}
          </strong>
        </div>
        <div className="rounded-lg border border-border bg-background p-3">
          <Percent className="size-4 text-primary" aria-hidden="true" />
          <p className="mt-2 text-xs text-muted-foreground">Acceptance rate</p>
          <strong className="text-lg text-foreground">
            {metricValue(summary.acceptanceRate, "%")}
          </strong>
        </div>
        <div className="rounded-lg border border-border bg-background p-3">
          <Users className="size-4 text-primary" aria-hidden="true" />
          <p className="mt-2 text-xs text-muted-foreground">Community sample</p>
          <strong className="text-lg text-foreground">
            {summary.sampleSize} reports
          </strong>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(16rem,0.75fr)]">
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">
              Response distribution
            </h3>
            <span className="text-xs text-muted-foreground">
              {totalDistributionReports} timed reports
            </span>
          </div>
          {totalDistributionReports > 0 ? (
            <div className="mt-3 h-56" role="img" aria-label="Response distribution by days waited">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={responseDistribution} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: "var(--muted)" }}
                    contentStyle={{
                      background: "var(--card)",
                      borderColor: "var(--border)",
                      borderRadius: "var(--radius-md)",
                    }}
                  />
                  <Bar
                    dataKey="reports"
                    fill="var(--primary)"
                    radius={[6, 6, 0, 0]}
                    name="Reports"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-3 rounded-lg bg-muted p-4 text-sm leading-6 text-muted-foreground">
              No timed response reports yet. The ranked turnaround score will
              appear here once writers submit dated outcomes.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-background p-3">
          <div className="flex items-center gap-2">
            <Send className="size-4 text-primary" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-foreground">
              Outcome telemetry
            </h3>
          </div>
          <dl className="mt-3 space-y-2">
            {outcomeRows.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
              >
                <dt className="text-xs text-muted-foreground">{item.label}</dt>
                <dd className="font-mono text-sm font-semibold text-foreground">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            {latestLabel(summary.latestReportAt)}
          </p>
        </div>
      </div>
    </section>
  );
}
