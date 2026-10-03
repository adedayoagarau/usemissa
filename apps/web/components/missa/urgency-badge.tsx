import { Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Time-sensitive deadline state ("3 days left", "Due today"). Studio
 * badge-10 structure (icon + label) with Missa Ochre warning tokens; the
 * label always states the time, so colour never carries the meaning alone.
 * Static metadata: never animates.
 */
export function UrgencyBadge({ children }: { children: React.ReactNode }) {
  return (
    <Badge variant="warning">
      <Clock3 aria-hidden="true" />
      {children}
    </Badge>
  );
}
