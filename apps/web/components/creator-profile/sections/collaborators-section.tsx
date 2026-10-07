import Link from "next/link";
import { CollaborationBadge } from "@/components/missa/collaboration-badge";
import { PersonAvatar } from "@/components/missa/person-avatar";
import { cn } from "@/lib/utils";
import { SectionHead, profileStyles as profile } from "./shared";
import type { AddonSectionDefinition, AddonSectionProps } from "./types";
import styles from "./collaborators-section.module.css";

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

/**
 * Credit for the people who made the work. A person is listed only when both
 * profiles credit each other: the server decides that on every read, and this
 * section also leaves out anything not marked confirmed, so a credit that is
 * still waiting can never reach a visitor even if a caller forgets to filter.
 */
function CollaboratorsSection({
  id,
  portfolio,
  name,
  level,
  mode,
}: AddonSectionProps) {
  const creator = firstName(name);
  const people = portfolio.collaborators.filter((person) => person.confirmed);
  return (
    <section
      id={id}
      className={cn(profile.section, styles.collaborators)}
      aria-label="Collaborators"
    >
      <div className={styles.intro}>
        <SectionHead
          level={level}
          title="Collaborators"
          count={people.length}
        />
        <p>
          People {creator} has made work with. Each one credits {creator} back
          on Missa.
        </p>
      </div>
      <ul className={styles.list}>
        {people.map((person) => (
          <li key={person.id ?? person.handle}>
            <PersonAvatar
              name={person.name}
              identity={person.handle}
              size="lg"
            />
            <span className={styles.text}>
              <span className={styles.name}>
                {mode === "page" ? (
                  <Link href={`/@${person.handle}`}>{person.name}</Link>
                ) : (
                  person.name
                )}
              </span>
              {person.role && (
                <span className={styles.role}>{person.role}</span>
              )}
            </span>
            <CollaborationBadge
              state="confirmed"
              person={person.name}
              creator={creator}
              className={cn(profile.chip, styles.badge)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

export const collaboratorsSection: AddonSectionDefinition = {
  filled: (portfolio) =>
    portfolio.collaborators.some((person) => person.confirmed),
  Section: CollaboratorsSection,
};
