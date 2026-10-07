import { SectionHead, profileStyles as styles } from "./shared";
import type { AddonSectionDefinition, AddonSectionProps } from "./types";

/**
 * Placeholder from the add-on foundation. The stream that owns this add-on
 * replaces the body; the exported definition and its two members stay.
 */
function TeachingSection({ id, portfolio, level }: AddonSectionProps) {
  const titles = portfolio.teaching.map((item) => item.title);
  return (
    <section id={id} className={styles.section} aria-label="Teaching">
      <SectionHead level={level} title="Teaching" />
      <ul>
        {titles.map((title, index) => (
          <li key={index}>{title}</li>
        ))}
      </ul>
    </section>
  );
}

export const teachingSection: AddonSectionDefinition = {
  filled: (portfolio) => portfolio.teaching.length > 0,
  Section: TeachingSection,
};
