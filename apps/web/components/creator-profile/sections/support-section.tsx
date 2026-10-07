import { SectionHead, profileStyles as styles } from "./shared";
import type { AddonSectionDefinition, AddonSectionProps } from "./types";

/**
 * Placeholder from the add-on foundation. The stream that owns this add-on
 * replaces the body; the exported definition and its two members stay.
 */
function SupportSection({ id, portfolio, level }: AddonSectionProps) {
  const titles = [portfolio.support.label || portfolio.support.url];
  return (
    <section id={id} className={styles.section} aria-label="Support">
      <SectionHead level={level} title="Support" />
      <ul>
        {titles.map((title, index) => (
          <li key={index}>{title}</li>
        ))}
      </ul>
    </section>
  );
}

export const supportSection: AddonSectionDefinition = {
  filled: (portfolio) => Boolean(portfolio.support.url),
  Section: SupportSection,
};
