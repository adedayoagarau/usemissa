import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { eventDateParts } from "@/lib/creator-profile";
import {
  longDateLabel,
  teachingEnquiry,
  teachingPlaces,
  upcomingTeaching,
} from "@/lib/creator-profile-addons";
import styles from "./addons.module.css";
import { EnquireButton, Heading, SectionHead, profileStyles } from "./shared";
import type { AddonSectionDefinition, AddonSectionProps } from "./types";

/**
 * Workshops and classes still to come. Places left show only when the creator
 * states them, and a full session turns the request into a question about the
 * next one.
 */
function TeachingSection({
  id,
  portfolio,
  level,
  today,
  canContact,
}: AddonSectionProps) {
  const sessions = upcomingTeaching(portfolio.teaching, today);
  return (
    <section id={id} className={profileStyles.section} aria-label="Teaching">
      <SectionHead level={level} title="Teaching" />
      <ul className={styles.rows}>
        {sessions.map((session, index) => {
          const parts = eventDateParts({ date: session.date, time: "" });
          const places = teachingPlaces(session.places);
          const enquiry = teachingEnquiry(session);
          return (
            <li key={session.id ?? `${session.title}-${index}`}>
              <article className={styles.session}>
                {session.date && parts.day ? (
                  <time dateTime={session.date} className={styles.date}>
                    <span className="sr-only">
                      {longDateLabel(session.date)}
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(styles.dateMonth, "font-mono")}
                    >
                      {parts.month} {session.date.slice(0, 4)}
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(styles.dateDay, "font-heading")}
                    >
                      {parts.day}
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(styles.dateWeekday, "font-mono")}
                    >
                      {parts.weekday}
                    </span>
                  </time>
                ) : (
                  <p className={cn(styles.date, styles.dateUnknown)}>
                    Date not confirmed
                  </p>
                )}
                <div className={styles.stack}>
                  <Heading
                    level={level + 1}
                    className={cn(styles.rowTitle, "font-heading")}
                  >
                    {session.title}
                  </Heading>
                  {session.place.trim() && (
                    <p className={styles.place}>
                      <MapPin aria-hidden="true" />
                      {session.place}
                    </p>
                  )}
                  {session.note.trim() && (
                    <p className={styles.note}>{session.note}</p>
                  )}
                </div>
                {(places || canContact) && (
                  <div className={styles.aside}>
                    {places && (
                      <span
                        className={cn(
                          styles.asideText,
                          places.tone === "few" && styles.placesFew,
                        )}
                      >
                        {places.label}
                      </span>
                    )}
                    <EnquireButton
                      canContact={canContact}
                      request={{
                        topic: enquiry.topic,
                        message: enquiry.message,
                      }}
                    >
                      {enquiry.label}
                      <span className="sr-only">{enquiry.hiddenSuffix}</span>
                    </EnquireButton>
                  </div>
                )}
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export const teachingSection: AddonSectionDefinition = {
  filled: (portfolio, today) =>
    upcomingTeaching(portfolio.teaching, today).length > 0,
  Section: TeachingSection,
};
