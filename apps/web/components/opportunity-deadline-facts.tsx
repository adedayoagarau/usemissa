import Link from "next/link";
import { CalendarClock, Flag } from "lucide-react";
import type { OpportunityDeadlineFacts } from "@missa/radar-engine";
import { DateConfidenceBadge, FeeBadge, UrgencyBadge } from "@/components/missa/deadline-badges";
import { DeadlineLocalTime } from "@/components/deadline-local-time";
import {
  deadlineConfidenceView,
  feeTierViews,
  forecastLine,
  stageViews,
  type DeadlineFactsDeadline,
} from "@/lib/deadline-facts-view";
import { describeDeadline, formatShortDate } from "@/lib/deadline-moment";
import { cn } from "@/lib/utils";
import styles from "./opportunity-deadline-facts.module.css";

/** "Oct 8, 2026", read as a calendar date (no time-zone shift). */
function formatLongDate(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);
}

/**
 * The deadline as a fact: the date (in Fragment Mono), the close moment in the
 * source's zone and the viewer's, whether the date is confirmed, predicted,
 * changed or needs checking, when Missa last checked, and the previous date
 * when the organization moved it.
 */
export function DeadlineFactSummary({
  deadline,
  facts,
  className,
}: {
  deadline: DeadlineFactsDeadline;
  facts?: OpportunityDeadlineFacts;
  className?: string;
}) {
  const moment = describeDeadline({ kind: deadline.kind, date: deadline.date, time: deadline.time, timezone: deadline.timezone });
  const confidence = deadlineConfidenceView(facts);
  const forecastDate = !deadline.date && facts?.provenance.state === "predicted" ? facts.forecast?.expectedClose : undefined;
  const dateText = deadline.date
    ? formatLongDate(deadline.date)
    : forecastDate
      ? `Around ${formatShortDate(forecastDate)}`
      : moment.label;
  return (
    <div className={cn(styles.summary, className)}>
      <span className={styles.summaryLine}>
        <span className={deadline.date || forecastDate ? "font-mono tabular-nums" : undefined}>{dateText}</span>
        {confidence && (deadline.date || confidence.state !== "confirmed") ? <DateConfidenceBadge state={confidence.state} /> : null}
      </span>
      {moment.closesSource ? (
        <span className={styles.meta}>
          Closes <span className="font-mono tabular-nums">{moment.closesSource}</span>
        </span>
      ) : null}
      <DeadlineLocalTime date={deadline.date} time={deadline.time} timezone={deadline.timezone} className={styles.meta} />
      {confidence?.previously ? <span className={styles.meta}>{confidence.previously}</span> : null}
      {confidence?.lastChecked ? <span className={styles.meta}>{confidence.lastChecked}</span> : null}
    </div>
  );
}

/**
 * Fee tiers, stages and the reopening forecast. Renders nothing when the
 * record has none of them; the main deadline stays in the facts card.
 */
export function OpportunityDeadlineFactsSection({
  deadline,
  facts,
  correctionHref,
}: {
  deadline: DeadlineFactsDeadline;
  facts?: OpportunityDeadlineFacts;
  /** Where "Suggest a correction" goes: the report flow on this page, or log in. */
  correctionHref: string;
}) {
  if (!facts) return null;
  const tiers = feeTierViews(facts.tiers);
  const stages = stageViews(facts.stages);
  const forecast = forecastLine(facts.forecast, deadline);
  if (!tiers.length && !stages.length && !forecast) return null;

  return (
    <section className={styles.section} aria-labelledby="deadline-facts-title">
      <h2 id="deadline-facts-title" className="font-sans">
        Dates and fees
      </h2>

      {forecast ? (
        <p className={styles.forecast}>
          <CalendarClock aria-hidden="true" />
          <span>{forecast}</span>
          <DateConfidenceBadge state="predicted" />
        </p>
      ) : null}

      {tiers.length ? (
        <div className={styles.group}>
          <h3>Fee tiers</h3>
          <ol className={styles.tierList}>
            {tiers.map((tier) => (
              <li key={tier.id} className={styles.tierRow} data-current={tier.current ? "true" : undefined}>
                <span className={styles.tierLabel}>
                  {tier.label}
                  {tier.current ? <span className={styles.currentText}>Open now</span> : null}
                </span>
                <span className={styles.tierDate}>
                  <span className="font-mono tabular-nums">{tier.dateLabel}</span>
                  {tier.moment.closesSource ? (
                    <span className={styles.meta}>
                      Closes <span className="font-mono tabular-nums">{tier.moment.closesSource}</span>
                    </span>
                  ) : null}
                </span>
                <span className={styles.tierBadges}>
                  <FeeBadge cents={tier.feeCents} currency={tier.feeCurrency} />
                  {tier.moment.state === "open" ? (
                    <UrgencyBadge label={tier.moment.shortLabel} urgent={tier.moment.urgent} />
                  ) : (
                    <span className={styles.meta}>{tier.moment.label}</span>
                  )}
                  {tier.probable ? <span className={styles.meta}>From the source page; not yet confirmed</span> : null}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {stages.length ? (
        <div className={styles.group}>
          <h3>Stages</h3>
          <ol className={styles.timeline}>
            {stages.map((stage) => (
              <li key={stage.id} className={styles.stage} data-past={stage.past ? "true" : undefined}>
                <span className={styles.stageDate}>
                  <span className="font-mono tabular-nums">{stage.dateLabel}</span>
                </span>
                <span className={styles.stageBody}>
                  <span className={styles.stageLabel}>{stage.label}</span>
                  {stage.timeLabel ? (
                    <span className={styles.meta}>
                      <span className="font-mono tabular-nums">{stage.timeLabel}</span>
                    </span>
                  ) : null}
                  {stage.past ? <span className={styles.meta}>Passed</span> : null}
                  {stage.probable ? <span className={styles.meta}>Expected date</span> : null}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <Link className={styles.correction} href={correctionHref}>
        <Flag aria-hidden="true" />
        Suggest a correction
      </Link>
    </section>
  );
}
