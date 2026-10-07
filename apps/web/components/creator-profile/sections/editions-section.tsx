import { SectionHead, profileStyles as styles } from "./shared";
import type { AddonSectionDefinition, AddonSectionProps } from "./types";

/**
 * Placeholder from the add-on foundation. The stream that owns this add-on
 * replaces the body; the exported definition and its two members stay.
 */
function EditionsSection({ id, portfolio, level }: AddonSectionProps) {
  const titles = portfolio.editions.map((item) => item.title);
  return (
    <section id={id} className={styles.section} aria-label="Editions">
      <SectionHead level={level} title="Editions" />
      <ul>
        {titles.map((title, index) => (
          <li key={index}>{title}</li>
        ))}
      </ul>
    </section>
  );
}

export const editionsSection: AddonSectionDefinition = {
  filled: (portfolio) => portfolio.editions.length > 0,
  Section: EditionsSection,
};
