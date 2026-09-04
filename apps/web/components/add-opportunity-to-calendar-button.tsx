"use client";

import { CalendarPlus } from "lucide-react";
import type { OpportunityBrowseProjection } from "@missa/radar-engine";
import {
  buildOpportunityDeadlineCalendarHref,
  opportunityDeadlineCalendarFilename,
} from "@/lib/opportunityCalendar";
import styles from "./add-opportunity-to-calendar-button.module.css";

export function AddOpportunityToCalendarButton({
  item,
  className,
  showLabel = false,
}: {
  item: Pick<
    OpportunityBrowseProjection,
    "id" | "title" | "organizationName" | "deadline"
  >;
  className?: string;
  showLabel?: boolean;
}) {
  const href = buildOpportunityDeadlineCalendarHref(item);
  if (!href) return null;

  const label = `Add ${item.title} deadline to calendar`;

  return (
    <a
      href={href}
      download={opportunityDeadlineCalendarFilename(item)}
      className={[styles.button, showLabel && styles.labelled, className].filter(Boolean).join(" ")}
      aria-label={label}
      title={label}
      onClick={(event) => event.stopPropagation()}
    >
      <CalendarPlus aria-hidden="true" />
      {showLabel ? <span>Add to calendar</span> : null}
    </a>
  );
}
