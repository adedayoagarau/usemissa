import { Badge } from "@/components/ui/badge";
import type { PersonHue } from "@/components/missa/person-avatar";

/**
 * A categorical label in one of the twelve hues: a rubric criterion, a
 * category, an opportunity. Colour separates labels from each other; it
 * never carries status, which keeps its own semantic badges.
 */
export type LabelHue = PersonHue;

export function LabelPill({ hue, children, size = "default" }: { hue: LabelHue; children: React.ReactNode; size?: "default" | "compact" }) {
  return (
    <Badge variant={`hue-${hue}`} size={size}>
      {children}
    </Badge>
  );
}
