import { cn } from "@/lib/utils";
import type { EditionAvailability as Availability } from "@/lib/creator-profile-addons";
import styles from "./addon-badges.module.css";

/**
 * How many prints of an edition are left, in words ("4 of 12 available",
 * "Sold out"). The label always carries the meaning; the tone is extra.
 */
export function EditionAvailability({
  availability,
  className,
}: {
  availability: Availability;
  className?: string;
}) {
  return (
    <span
      className={cn(styles.badge, className)}
      data-tone={availability.state}
    >
      {availability.label}
    </span>
  );
}

/** The kind of a show or performance (Solo, Group, Premiere, and so on). */
export function ShowKindTag({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return <span className={cn(styles.tag, className)}>{label}</span>;
}
