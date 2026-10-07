import { SectionHead, profileStyles as styles } from "./shared";
import type { AddonSectionDefinition, AddonSectionProps } from "./types";

/**
 * Placeholder from the add-on foundation. The stream that owns this add-on
 * replaces the body; the exported definition and its two members stay.
 */
function ServicesSection({ id, portfolio, level }: AddonSectionProps) {
  const titles = portfolio.services.map((item) => item.title);
  return (
    <section id={id} className={styles.section} aria-label="Services">
      <SectionHead level={level} title="Services" />
      <ul>
        {titles.map((title, index) => (
          <li key={index}>{title}</li>
        ))}
      </ul>
    </section>
  );
}

export const servicesSection: AddonSectionDefinition = {
  filled: (portfolio) => portfolio.services.length > 0,
  Section: ServicesSection,
};
