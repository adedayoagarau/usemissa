import { Check, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PortfolioAvailability } from "@/lib/creator-portfolio-schema";
import { availabilityLabel, availabilityState } from "@/lib/creator-profile";
import styles from "./profile-badges.module.css";

export function AvailabilityChip({
  item,
  today,
  className,
}: {
  item: Pick<PortfolioAvailability, "label" | "state" | "date">;
  today?: string;
  className?: string;
}) {
  const state = availabilityState(item, today);
  return (
    <span
      className={cn(styles.badge, styles.chip, className)}
      data-tone={state}
    >
      {state === "open" && <Check aria-hidden="true" />}
      {state === "from" && <Clock3 aria-hidden="true" />}
      {availabilityLabel(item, today)}
    </span>
  );
}
