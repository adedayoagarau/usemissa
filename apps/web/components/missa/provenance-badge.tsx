"use client";

import { BadgeCheck, Link2, PenLine } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Provenance } from "@/lib/creator-portfolio-schema";
import styles from "./profile-badges.module.css";
import { useSp } from "@/components/missa/spelling";

const ICON = { confirmed: BadgeCheck, linked: Link2, added: PenLine };

/** Plain-language source for a Track record entry (PRODUCT.md principle 2). */
export function provenanceCopy(
  provenance: Provenance,
  creator: string,
  organization?: string,
  /** Puts Missa's own words in the reader's spelling; names are left alone. */
  s: (text: string) => string = (text) => text,
) {
  const fallback = s("The organization");
  const org = organization?.trim() || fallback;
  if (provenance === "confirmed")
    return {
      label: "Confirmed",
      title: `Confirmed by ${org}`,
      body: `${org} recorded this outcome on Missa.`,
    };
  if (provenance === "linked")
    return {
      label: "Linked",
      title: "Linked to a directory profile",
      body: `${creator} matched this to ${org === fallback ? s("an organization") : org} in the Missa directory. It has not been confirmed by them.`,
    };
  return {
    label: `Added by ${creator}`,
    title: `Added by ${creator}`,
    body: `${creator} listed this. ${s("No organization has confirmed it.")}`,
  };
}

export function ProvenanceBadge({
  provenance,
  creator,
  organization,
  className,
}: {
  provenance: Provenance;
  creator: string;
  organization?: string;
  className?: string;
}) {
  const sp = useSp();
  const copy = provenanceCopy(provenance, creator, organization, sp);
  const Icon = ICON[provenance];
  return (
    <Popover>
      <PopoverTrigger
        className={cn(styles.badge, className)}
        data-tone={provenance}
        aria-label={`${copy.label}. What this means`}
      >
        <Icon aria-hidden="true" />
        {copy.label}
      </PopoverTrigger>
      <PopoverContent align="start" className={styles.popover}>
        <PopoverHeader>
          <PopoverTitle>{copy.title}</PopoverTitle>
          <PopoverDescription>{copy.body}</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  );
}
