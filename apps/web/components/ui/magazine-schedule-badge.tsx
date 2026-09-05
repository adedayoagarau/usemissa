import type { MagazineScheduleResult } from "@missa/radar-adapters";
import { Badge } from "./badge";
import { cn } from "@/lib/utils";
import styles from "./magazine-schedule-badge.module.css";

export interface MagazineScheduleBadgeProps {
  schedule?: MagazineScheduleResult | null;
  className?: string;
}

export function MagazineScheduleBadge({
  schedule,
  className,
}: MagazineScheduleBadgeProps) {
  if (!schedule || schedule.state === "unknown") {
    return null;
  }

  const stateClass = styles[schedule.state] || styles.unknown;

  return (
    <Badge
      variant="outline"
      className={cn(styles.badge, stateClass, className)}
      title={schedule.detailLabel || schedule.badgeLabel}
    >
      {schedule.badgeLabel}
    </Badge>
  );
}
