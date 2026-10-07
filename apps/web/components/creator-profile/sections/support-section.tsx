import { ArrowUpRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  SUPPORT_LEAVES_MISSA,
  supportNote,
} from "@/lib/creator-profile-addons";
import styles from "./addons.module.css";
import { SectionHead, hostname, profileStyles, safeHref } from "./shared";
import type { AddonSectionDefinition, AddonSectionProps } from "./types";

/**
 * One link to a patronage or tip page. It leaves Missa, so the section says so
 * in words and the link says it opens in a new tab.
 */
function SupportSection({ id, portfolio, name, level }: AddonSectionProps) {
  const { support } = portfolio;
  const href = safeHref(support.url);
  if (!href) return null;
  const host = hostname(href);
  const note = supportNote(support.note);
  return (
    <section id={id} className={profileStyles.section} aria-label="Support">
      <SectionHead level={level} title="Support" />
      <div className={styles.support}>
        <div className={styles.stack}>
          <p className={cn(styles.supportLabel, "font-heading")}>
            {support.label.trim() || `Support ${name}`}
          </p>
          {note && <p className={styles.note}>{note}</p>}
          <p className={styles.leaves}>
            Opens {host} in a new tab. {SUPPORT_LEAVES_MISSA}
          </p>
        </div>
        <a
          href={href}
          target="_blank"
          rel="noreferrer nofollow"
          className={cn(
            buttonVariants({ variant: "outline" }),
            styles.supportLink,
            "h-auto min-h-11 py-2 text-left whitespace-normal",
          )}
        >
          Support on {host}
          <ArrowUpRight aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>
    </section>
  );
}

export const supportSection: AddonSectionDefinition = {
  filled: (portfolio) => Boolean(safeHref(portfolio.support.url)),
  Section: SupportSection,
};
