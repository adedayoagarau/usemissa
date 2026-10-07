"use client";
import { useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type {
  PortfolioData,
  PortfolioWork,
} from "@/lib/creator-portfolio-schema";
import {
  filterAnnouncement,
  filterWorks,
  groupWorksBySeries,
  seriesKeys,
  seriesSummary,
  workFilters,
  type WorkFilter,
} from "@/lib/creator-work-media";
import { cn } from "@/lib/utils";
import {
  Heading,
  SectionHead,
  profileStyles as styles,
} from "../sections/shared";
import { WorkCard, type OpenWork } from "./work-card";
import type { Player } from "./use-audio-player";
import cx from "./work-media.module.css";

/**
 * The "Selected work" section: a format filter built from what the work holds
 * (plus Series when one exists), and the cards, with works that share a series
 * grouped under its heading and a plate count.
 */
export function WorkSection({
  id,
  works,
  total,
  lens,
  level,
  onOpen,
  player,
}: {
  id?: string;
  works: PortfolioWork[];
  total: number;
  lens: PortfolioData["lens"];
  level: number;
  onOpen: OpenWork;
  player: Player;
}) {
  const headings = useId();
  const [filter, setFilter] = useState<WorkFilter | "All">("All");
  const filters = useMemo(() => workFilters(works), [works]);
  const keys = useMemo(() => seriesKeys(works), [works]);
  // The works may change under a chosen filter (the studio preview); fall back
  // to everything rather than show an empty section.
  const active = filter === "All" || filters.includes(filter) ? filter : "All";
  const shown = filterWorks(works, active);
  const segments = groupWorksBySeries(shown, keys);
  return (
    <section id={id} className={styles.section} aria-label="Selected work">
      <SectionHead level={level} title="Selected work" count={total}>
        {filters.length > 0 && (
          <div
            role="group"
            aria-label="Filter work by format"
            className={styles.filter}
          >
            {(["All", ...filters] as const).map((option) => (
              <Button
                key={option}
                type="button"
                variant="ghost"
                aria-pressed={active === option}
                onClick={() => setFilter(option)}
              >
                {option === "All" ? "All work" : option}
              </Button>
            ))}
          </div>
        )}
      </SectionHead>
      <p className="sr-only" aria-live="polite">
        {filterAnnouncement(active, shown.length)}
      </p>
      <div className={cx.stack}>
        {segments.map((segment, at) => {
          const grid = (
            <ol
              className={styles.works}
              // Plates in a series sit three across; only the visual lens keeps
              // its own columns inside a series.
              data-lens={segment.series && lens !== "visual" ? undefined : lens}
            >
              {segment.works.map((work, position) => (
                <li key={work.id ?? `${work.title}-${position}`}>
                  <WorkCard
                    work={work}
                    index={works.indexOf(work)}
                    level={segment.series ? level + 2 : level + 1}
                    onOpen={onOpen}
                    player={player}
                    lens={lens}
                  />
                </li>
              ))}
            </ol>
          );
          if (!segment.series) return <div key={`loose-${at}`}>{grid}</div>;
          const heading = `${headings}-${at}`;
          return (
            <section
              key={segment.series.toLocaleLowerCase()}
              aria-labelledby={heading}
              className={cx.series}
            >
              <div className={cx.seriesHead}>
                <Heading
                  id={heading}
                  level={level + 1}
                  className={cn(cx.seriesTitle, "font-heading")}
                >
                  {segment.series}
                </Heading>
                <span className={cn(cx.seriesMeta, "font-mono")}>
                  {seriesSummary(segment.works)}
                </span>
              </div>
              {grid}
            </section>
          );
        })}
      </div>
    </section>
  );
}
