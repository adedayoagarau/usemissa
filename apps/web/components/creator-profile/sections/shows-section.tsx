import { ArrowUpRight } from "lucide-react";
import { ShowKindTag } from "@/components/missa/addon-badges";
import { cn } from "@/lib/utils";
import {
  SHOW_KIND_LABELS,
  groupShowsByYear,
  visibleShows,
} from "@/lib/creator-profile-addons";
import styles from "./addons.module.css";
import { Heading, SectionHead, profileStyles, safeHref } from "./shared";
import type { AddonSectionDefinition, AddonSectionProps } from "./types";

/** A CV-style history, newest year first. A show with a link links out. */
function ShowsSection({ id, portfolio, level }: AddonSectionProps) {
  const shows = visibleShows(portfolio);
  const years = groupShowsByYear(shows);
  return (
    <section
      id={id}
      className={profileStyles.section}
      aria-label="Shows and performances"
    >
      <SectionHead
        level={level}
        title="Shows and performances"
        count={shows.length}
      />
      <ol className={styles.years}>
        {years.map((group) => (
          <li key={group.year || "undated"} className={styles.year}>
            <Heading
              level={level + 1}
              className={cn(styles.yearLabel, "font-mono")}
            >
              {group.label}
            </Heading>
            <ul className={styles.shows}>
              {group.shows.map((show, index) => {
                const href = safeHref(show.url);
                const kind = SHOW_KIND_LABELS[show.kind];
                return (
                  <li
                    key={show.id ?? `${group.year}-${show.title}-${index}`}
                    className={styles.show}
                  >
                    <div className={styles.stack}>
                      <span className={cn(styles.showTitle, "font-heading")}>
                        {href ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer nofollow"
                            className={styles.showLink}
                          >
                            <span className={styles.showLinkText}>
                              {show.title}
                            </span>
                            <ArrowUpRight aria-hidden="true" />
                            <span className="sr-only">
                              {" "}
                              (opens in a new tab)
                            </span>
                          </a>
                        ) : (
                          show.title
                        )}
                      </span>
                      {show.venue.trim() && (
                        <span className={styles.showVenue}>{show.venue}</span>
                      )}
                    </div>
                    {kind && (
                      <ShowKindTag
                        label={kind}
                        className={profileStyles.chip}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}

export const showsSection: AddonSectionDefinition = {
  filled: (portfolio) => visibleShows(portfolio).length > 0,
  Section: ShowsSection,
};
