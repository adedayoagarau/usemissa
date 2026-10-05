import type { HomeRunway } from "@/lib/creator-home";

function shortDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

/**
 * Time left against the work Missa estimates for one application: the slipped
 * days (Ochre) or the slack before the start-by date (Lichen), then the work
 * window (Forest), with today marked. Every part is also stated in text, and
 * the whole is labelled for assistive technology. Static: never animates.
 */
export function ApplicationRunway({
  runway,
  size = "default",
}: {
  runway: HomeRunway;
  size?: "default" | "compact";
}) {
  const span = Math.max(1, runway.daysLeft + runway.behindDays);
  const late = (runway.behindDays / span) * 100;
  const slack = (runway.slackDays / span) * 100;
  const status = runway.behindDays
    ? `${runway.behindDays} ${runway.behindDays === 1 ? "day" : "days"} behind`
    : runway.slackDays
      ? `${runway.slackDays} ${runway.slackDays === 1 ? "day" : "days"} of slack`
      : "Start today";
  const summary = `${status}. Start by ${shortDate(runway.startBy)}, closes ${shortDate(runway.deadline)}. Missa estimates about ${runway.workDays} days of work and lead time, with ${runway.daysLeft} days left.`;
  return (
    <figure className="m-0 flex flex-col gap-2" aria-label={summary}>
      <div
        aria-hidden="true"
        className={`relative flex w-full overflow-hidden rounded-full bg-accent-tint ${size === "compact" ? "h-1.5" : "h-3"}`}
      >
        {late ? (
          <span className="h-full bg-ochre" style={{ width: `${late}%` }} />
        ) : null}
        {slack ? (
          <span
            className="h-full bg-lichen-tint"
            style={{ width: `${slack}%` }}
          />
        ) : null}
        <span className="h-full flex-1 bg-primary/80" />
        {size === "default" ? (
          <span
            className="absolute inset-y-0 w-0.5 bg-foreground"
            style={{ insetInlineStart: `${late}%` }}
          />
        ) : null}
      </div>
      {size === "default" ? (
        <figcaption className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            Start by{" "}
            <span className="font-mono tabular-nums">
              {shortDate(runway.startBy)}
            </span>
          </span>
          <span
            className={
              runway.behindDays
                ? "font-semibold text-ochre-deep"
                : "font-semibold text-foreground"
            }
          >
            Today · {status}
          </span>
          <span>
            Closes{" "}
            <span className="font-mono tabular-nums">
              {shortDate(runway.deadline)}
            </span>
          </span>
        </figcaption>
      ) : null}
    </figure>
  );
}
