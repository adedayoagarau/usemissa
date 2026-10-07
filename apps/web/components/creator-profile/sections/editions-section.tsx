"use client";
/* eslint-disable @next/next/no-img-element -- Owned portfolio media is served through an authorization-gated route. */
import { useState } from "react";
import { EditionAvailability } from "@/components/missa/addon-badges";
import { cn } from "@/lib/utils";
import type { PortfolioEdition } from "@/lib/creator-portfolio-schema";
import {
  editionAvailability,
  editionDetails,
  editionEnquiry,
  editionSizeLabel,
  visibleEditions,
} from "@/lib/creator-profile-addons";
import styles from "./addons.module.css";
import { EnquireButton, Heading, SectionHead, profileStyles } from "./shared";
import type { AddonSectionDefinition, AddonSectionProps } from "./types";

/**
 * The picture sits on a mat so the whole print shows, never cropped. With no
 * picture, or one that fails to load, the plate is type only: the medium and
 * the title, never an empty box.
 */
function EditionPlate({ edition }: { edition: PortfolioEdition }) {
  const [failed, setFailed] = useState(false);
  const details = editionDetails(edition);
  if (!edition.image || failed) {
    return (
      <div aria-hidden="true" className={cn(styles.plate, styles.typePlate)}>
        <div className={styles.typeInner}>
          <span className={cn(styles.typeLabel, "font-mono")}>
            {edition.medium.trim() || "Edition"}
          </span>
          <span className={cn(styles.typeTitle, "font-heading")}>
            {edition.title}
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className={styles.plate}>
      <img
        src={edition.image}
        alt={details ? `${edition.title}, ${details}` : edition.title}
        loading="lazy"
        decoding="async"
        // A picture that failed before the page hydrated never fires onError,
        // so look at it once it is attached as well.
        ref={(image) => {
          if (image?.complete && image.naturalWidth === 0) setFailed(true);
        }}
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function EditionsSection({
  id,
  portfolio,
  level,
  canContact,
}: AddonSectionProps) {
  const editions = visibleEditions(portfolio);
  return (
    <section id={id} className={profileStyles.section} aria-label="Editions">
      <SectionHead level={level} title="Editions">
        <p className={styles.intro}>
          {canContact
            ? "Prints and multiples, by enquiry. There is no checkout."
            : "Prints and multiples. There is no checkout."}
        </p>
      </SectionHead>
      <ul className={styles.rows}>
        {editions.map((edition, index) => {
          const availability = editionAvailability(edition);
          const size = editionSizeLabel(edition);
          const details = editionDetails(edition);
          const enquiry = editionEnquiry(edition);
          const soldOut = availability?.state === "sold-out";
          return (
            <li key={edition.id ?? `${edition.title}-${index}`}>
              <article
                className={cn(styles.edition, soldOut && styles.soldOut)}
              >
                <EditionPlate edition={edition} />
                <div className={styles.stack}>
                  <Heading
                    level={level + 1}
                    className={cn(styles.rowTitle, "font-heading")}
                  >
                    {edition.title}
                  </Heading>
                  {details && (
                    <p className={cn(styles.meta, "font-mono")}>{details}</p>
                  )}
                  {edition.note.trim() && (
                    <p className={styles.note}>{edition.note}</p>
                  )}
                </div>
                {(availability || size || canContact) && (
                  <div className={styles.aside}>
                    {availability ? (
                      <EditionAvailability
                        availability={availability}
                        className={profileStyles.chip}
                      />
                    ) : (
                      size && <span className={styles.asideText}>{size}</span>
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

export const editionsSection: AddonSectionDefinition = {
  filled: (portfolio) => visibleEditions(portfolio).length > 0,
  Section: EditionsSection,
};
