import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  AdminPageFrame,
  DataAreaHeader,
  LifecycleTable,
  NumberGrid,
  ProvenanceNote,
  SectionHeading,
  SourceHealthTable,
  WarningList,
} from "@/components/platform-admin";
import { getPlatformAdminView } from "@/lib/platformAdmin";

export default async function PlatformAdminRadarPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const area = await getPlatformAdminView("radar");
  const focus = (await searchParams).focus;
  const data = area.data;

  const stages = [
    {
      label: "Due",
      value: data.sourceHealth.summary.stale,
      detail: "past cadence",
      href: "/admin/radar?focus=stale-sources",
      tone: "text-amber-700",
    },
    {
      label: "Checked",
      value: data.sourceHealth.summary.attempted,
      detail: "attempted",
      href: "/admin/radar?focus=source-health",
      tone: "text-foreground",
    },
    {
      label: "Fetched",
      value: data.sourceHealth.summary.successfulFetch,
      detail: "successful fetch",
      href: "/admin/radar?focus=source-health",
      tone: "text-blue-700",
    },
    {
      label: "Processed",
      value: data.sourceHealth.summary.processed,
      detail: "content processed",
      href: "/admin/radar?focus=source-health",
      tone: "text-green-700",
    },
    {
      label: "Review",
      value: data.stats.openVerificationTasks,
      detail: "verification open",
      href: "/admin/radar?focus=verification",
      tone: "text-primary",
    },
  ];

  return (
    <AdminPageFrame>
      <div className="space-y-10">
        <DataAreaHeader
          area={area}
          title="Opportunities"
          description="Opportunity freshness, lifecycle, evidence quality, publication queues, and claim review from the current Missa source store."
        />
        {focus && (
          <p className="rounded-lg border border-primary/30 bg-accent-tint px-4 py-3 text-sm text-accent-deep">
            Focused queue:{" "}
            <span className="font-medium">{focus.replaceAll("-", " ")}</span>.
            The table below remains a read-only view of the same current store.
          </p>
        )}
        <WarningList warnings={area.warnings} />

        <section aria-labelledby="source-stats">
          <SectionHeading eyebrow="Current counts" title="Source statistics" />
          <h2 id="source-stats" className="sr-only">
            Source statistics
          </h2>
          <div className="mt-4">
            <ProvenanceNote area={area} />
            <div className="mt-3">
              <NumberGrid
                items={[
                  {
                    label: "Discovered",
                    value: data.stats.opportunitiesDiscovered,
                    detail: "Canonical, non-duplicate records",
                  },
                  {
                    label: "Open",
                    value: data.stats.opportunitiesOpen,
                    detail: "Open, closing, opening, or extended",
                  },
                  {
                    label: "Claimed",
                    value: data.stats.opportunitiesClaimed,
                    detail: "Claimed by an organization",
                  },
                  {
                    label: "Stale listings",
                    value: data.stats.staleListings,
                    detail: "Uncertain opportunity status",
                    href: "/admin/radar?focus=stale-listings",
                  },
                  {
                    label: "Duplicates",
                    value: data.stats.duplicateRecords,
                    detail: `${Math.round(data.stats.duplicateRate * 100)}% of current opportunity rows`,
                  },
                  {
                    label: "Verification",
                    value: data.stats.openVerificationTasks,
                    detail: "Open compatibility tasks",
                    href: "/admin/radar?focus=verification",
                  },
                  {
                    label: "Alerts",
                    value: data.stats.alertsEmitted,
                    detail: `${data.stats.unreadAlerts} unread in current store`,
                  },
                  {
                    label: "Low trust",
                    value: data.queues.lowTrust,
                    detail: "Derived from trust score < 40",
                  },
                ]}
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="source-pipeline">
          <SectionHeading
            eyebrow="Pipeline"
            title="From source to trusted record"
            description="These stages are intentionally separate: a source can be checked or fetched without producing a publishable record."
          />
          <h2 id="source-pipeline" className="sr-only">
            Source pipeline
          </h2>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {stages.map((stage) => (
              <li key={stage.label}>
                <Link
                  href={stage.href}
                  className="group block min-h-24 border border-border bg-white p-4 transition-colors hover:border-primary/50 hover:bg-muted/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        {stage.label}
                      </p>
                      <p
                        className={`mt-2 font-mono text-2xl tabular-nums ${stage.tone}`}
                      >
                        {stage.value}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {stage.detail}
                      </p>
                    </div>
                    <ArrowRight
                      className="mt-1 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="source-health">
          <SectionHeading
            eyebrow="Opportunities"
            title="Attempted versus successful versus processed"
            description="A successful fetch is not the same as a completed extraction pass. Stale means the source is past its configured cadence."
          />
          <h2 id="source-health" className="sr-only">
            Opportunities
          </h2>
          <div className="mt-4 rounded-xl border border-border bg-muted/20 p-4">
            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4 lg:grid-cols-7">
              <div>
                <dt className="text-muted-foreground">Active</dt>
                <dd className="mt-1 font-mono text-lg">
                  {data.sourceHealth.summary.active}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Attempted</dt>
                <dd className="mt-1 font-mono text-lg">
                  {data.sourceHealth.summary.attempted}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Fetched</dt>
                <dd className="mt-1 font-mono text-lg">
                  {data.sourceHealth.summary.successfulFetch}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Processed</dt>
                <dd className="mt-1 font-mono text-lg">
                  {data.sourceHealth.summary.processed}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Stale</dt>
                <dd className="mt-1 font-mono text-lg text-amber-700">
                  {data.sourceHealth.summary.stale}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Fetch failures</dt>
                <dd className="mt-1 font-mono text-lg">
                  {data.sourceHealth.summary.fetchFailures}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Process failures</dt>
                <dd className="mt-1 font-mono text-lg">
                  {data.sourceHealth.summary.processingFailures}
                </dd>
              </div>
            </dl>
          </div>
          <div className="mt-4">
            <SourceHealthTable rows={data.sourceHealth.rows} />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-4">
          <div>
            <SectionHeading
              title="Lifecycle"
              description="Compatibility opportunity statuses."
            />
            <div className="mt-4">
              <LifecycleTable counts={data.lifecycle} />
            </div>
          </div>
          <div>
            <SectionHeading
              title="Publication view"
              description="Derived from compatibility statuses; not a target publication_state column."
            />
            <div className="mt-4">
              <LifecycleTable label="Publication" counts={data.publication} />
            </div>
          </div>
          <div>
            <SectionHeading
              title="Claim review"
              description="Organization claim request statuses."
            />
            <div className="mt-4">
              <LifecycleTable label="Claims" counts={data.claims} />
            </div>
          </div>
          <div>
            <SectionHeading
              title="Trust quality"
              description="Current trust score bands for canonical opportunities."
            />
            <div className="mt-4">
              <LifecycleTable
                label="Trust quality"
                counts={data.stats.trustDistribution}
              />
            </div>
          </div>
        </section>
      </div>
    </AdminPageFrame>
  );
}
