import { Badge } from "@/components/ui/badge";
import type { HomeTone } from "@/lib/creator-home";

const VARIANT = {
  warning: "warning",
  information: "information",
  primary: "accent",
  success: "success",
  neutral: "outline",
} as const satisfies Record<
  HomeTone,
  "warning" | "information" | "accent" | "success" | "outline"
>;

/**
 * A creator's personal application state ("Check-in due", "On track",
 * "1 day behind", "Not selected"). The label always states the meaning, so the
 * tone never carries it alone. Declined and withdrawn stay neutral. Static
 * metadata: never animates.
 */
export function ApplicationStateBadge({
  tone,
  children,
}: {
  tone: HomeTone;
  children: React.ReactNode;
}) {
  return <Badge variant={VARIANT[tone]}>{children}</Badge>;
}
