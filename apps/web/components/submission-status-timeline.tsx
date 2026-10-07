import type { SubmissionStatusTimeline } from "@missa/workspace-engine";
import { SubmissionStageBadge } from "@/components/missa/operations-badges";

function formatDate(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

/**
 * The submitter-facing journey for one hosted submission. Steps come from
 * the organization's own announcements and recorded decisions; nothing here
 * is inferred, and no reader, score or note is ever rendered.
 */
export function SubmissionStatusTimeline({ timeline, organizationName, compact = false }: { timeline: SubmissionStatusTimeline; organizationName?: string; compact?: boolean }) {
  return (
    <section aria-labelledby="submission-status-timeline-title" className="rounded-xl border border-border bg-card p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">Where this stands</p>
          <h2 id="submission-status-timeline-title" className="mt-1 font-heading text-xl font-medium text-foreground">
            {timeline.summary}
          </h2>
          {organizationName ? <p className="mt-1 text-sm text-muted-foreground">Updated only when {organizationName} records a decision or announces a stage.</p> : null}
        </div>
        <SubmissionStageBadge step={timeline.current.id} label={timeline.current.label} />
      </header>
      <ol className="mt-5 grid gap-0" aria-label="Submission journey">
        {timeline.steps.map((step, index) => {
          const last = index === timeline.steps.length - 1;
          const date = formatDate(step.at);
          return (
            <li key={step.id} className="grid grid-cols-[20px_minmax(0,1fr)] gap-3" data-state={step.state}>
              <div className="flex flex-col items-center">
                <span
                  aria-hidden="true"
                  className={`mt-1 size-3 rounded-full border-2 ${step.state === "complete" ? "border-primary bg-primary" : step.state === "current" ? "border-primary bg-background" : "border-border bg-background"}`}
                />
                {last ? null : <span aria-hidden="true" className={`w-px flex-1 ${step.state === "complete" ? "bg-primary" : "bg-border"}`} />}
              </div>
              <div className={compact ? "pb-3" : "pb-5"}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <strong className={`text-sm ${step.state === "upcoming" ? "font-medium text-muted-foreground" : "font-semibold text-foreground"}`}>{step.label}</strong>
                  {date ? <time dateTime={step.at} className="font-mono text-xs text-muted-foreground">{date}</time> : null}
                  <span className="sr-only">{step.state === "complete" ? "Complete" : step.state === "current" ? "Current" : "Not yet reached"}</span>
                </div>
                {step.detail && !compact ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.detail}</p> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
