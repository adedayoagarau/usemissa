"use client";

import { BadgeCheck, Clock3 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import badges from "./profile-badges.module.css";
import styles from "./collaboration-badge.module.css";

/**
 * Where a credit to another creator stands. Confirmed means both sides list
 * each other on Missa: the server read the other creator's published profile
 * and found this one on it. Awaiting is for the owner only, in the studio; a
 * visitor never sees a credit that is still waiting.
 */
export type CollaborationState = "confirmed" | "awaiting";

/** The plain-language rule a mark explains, for the popover and for tests. */
export function collaborationCopy(
  state: CollaborationState,
  person: string,
  creator: string,
) {
  if (state === "confirmed")
    return {
      label: "Confirmed",
      title: `${person} confirmed this`,
      body: `${creator} credits ${person}, and ${person} credits ${creator} back on Missa. A credit shows only when both do, and it stops showing if either removes the other.`,
    };
  return {
    label: "Awaiting confirmation",
    title: `Waiting for ${person}`,
    body: `This credit shows on your profile once ${person} credits you back. Until then only you can see it.`,
  };
}

export function CollaborationBadge({
  state,
  person,
  creator,
  className,
}: {
  state: CollaborationState;
  /** The person credited. */
  person: string;
  /** The creator whose profile this is. */
  creator: string;
  className?: string;
}) {
  const copy = collaborationCopy(state, person, creator);
  const Icon = state === "confirmed" ? BadgeCheck : Clock3;
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          badges.badge,
          styles.target,
          state === "awaiting" && styles.awaiting,
          className,
        )}
        data-tone={state}
        aria-label={`${copy.label}. What this means`}
      >
        <Icon aria-hidden="true" />
        {copy.label}
      </PopoverTrigger>
      <PopoverContent align="start" className={badges.popover}>
        <PopoverHeader>
          <PopoverTitle>{copy.title}</PopoverTitle>
          <PopoverDescription>{copy.body}</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  );
}
