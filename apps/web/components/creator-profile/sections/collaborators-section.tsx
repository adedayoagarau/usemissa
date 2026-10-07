import { SectionHead, profileStyles as styles } from "./shared";
import type { AddonSectionDefinition, AddonSectionProps } from "./types";

/**
 * Placeholder from the add-on foundation. The stream that owns this add-on
 * replaces the body; the exported definition and its two members stay.
 */
function CollaboratorsSection({ id, portfolio, level }: AddonSectionProps) {
  const titles = portfolio.collaborators.map((item) => item.name);
  return (
    <section id={id} className={styles.section} aria-label="Collaborators">
      <SectionHead level={level} title="Collaborators" />
      <ul>
        {titles.map((title, index) => (
          <li key={index}>{title}</li>
        ))}
      </ul>
    </section>
  );
}

export const collaboratorsSection: AddonSectionDefinition = {
  filled: (portfolio) => portfolio.collaborators.length > 0,
  Section: CollaboratorsSection,
};
