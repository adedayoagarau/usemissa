import { SectionHead, profileStyles as styles } from "./shared";
import type { AddonSectionDefinition, AddonSectionProps } from "./types";

/**
 * Placeholder from the add-on foundation. The stream that owns this add-on
 * replaces the body; the exported definition and its two members stay.
 */
function BookingSection({ id, portfolio, level }: AddonSectionProps) {
  const titles = portfolio.booking.files.map((file) => file.label);
  return (
    <section id={id} className={styles.section} aria-label="Booking kit">
      <SectionHead level={level} title="Booking kit" />
      <ul>
        {titles.map((title, index) => (
          <li key={index}>{title}</li>
        ))}
      </ul>
    </section>
  );
}

export const bookingSection: AddonSectionDefinition = {
  filled: (portfolio) =>
    portfolio.booking.files.length > 0 ||
    Boolean(
      portfolio.booking.shortBio.trim() || portfolio.booking.longBio.trim(),
    ),
  Section: BookingSection,
};
