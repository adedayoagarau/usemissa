import { Badge } from "@/components/ui/badge";

/** Public release state, shared with the canonical wordmark. */
export function BetaBadge() {
  return (
    <Badge
      variant="outline"
      className="border-current text-current motion-reduce:transition-none"
    >
      Beta
    </Badge>
  );
}
