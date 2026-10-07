import { SectionHead, profileStyles as styles } from "./shared";
import type { AddonSectionDefinition, AddonSectionProps } from "./types";

/**
 * Placeholder from the add-on foundation. The stream that owns this add-on
 * replaces the body; the exported definition and its two members stay.
 */
function ShowsSection({ id, portfolio, level }: AddonSectionProps) {
  const titles = portfolio.shows.map((item) => item.title);
  return (
    <section
      id={id}
      className={styles.section}
      aria-label="Shows and performances"
    >
      <SectionHead level={level} title="Shows and performances" />
      <ul>
        {titles.map((title, index) => (
          <li key={index}>{title}</li>
        ))}
      </ul>
    </section>
  );
}

export const showsSection: AddonSectionDefinition = {
  filled: (portfolio) => portfolio.shows.length > 0,
  Section: ShowsSection,
};
