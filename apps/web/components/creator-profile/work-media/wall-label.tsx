import type { PortfolioWork } from "@/lib/creator-portfolio-schema";
import { wallLabelDetails } from "@/lib/creator-work-media";
import { cn } from "@/lib/utils";
import cx from "./work-media.module.css";

type LabelWork = Pick<
  PortfolioWork,
  "title" | "year" | "medium" | "size" | "edition"
>;

/**
 * The caption a gallery prints beside a work: the title in italics and the
 * year, then medium, size and edition, each only when the creator gave it.
 */
export function WallLabel({
  work,
  className,
}: {
  work: LabelWork;
  className?: string;
}) {
  const details = wallLabelDetails(work);
  const year = work.year.trim();
  return (
    <p className={cn(cx.wallLabel, className)}>
      <span>
        <em className={cn(cx.wallLabelTitle, "font-heading")}>{work.title}</em>
        {year && `, ${year}`}
      </span>
      {details.length > 0 && <span>{details.join(" · ")}</span>}
    </p>
  );
}

/** Only the second line of a wall label, for a card whose title is already set. */
export function WallLabelDetails({
  work,
  className,
}: {
  work: Pick<PortfolioWork, "medium" | "size" | "edition">;
  className?: string;
}) {
  const details = wallLabelDetails(work);
  if (details.length === 0) return null;
  return <p className={cn(cx.wallLabel, className)}>{details.join(" · ")}</p>;
}
