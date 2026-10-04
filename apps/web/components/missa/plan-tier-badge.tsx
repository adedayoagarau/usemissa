import type { PlanTier } from "@missa/radar-adapters";
import { Badge } from "@/components/ui/badge";

export const PLAN_TIER_LABELS: Record<PlanTier, string> = {
  long_shot: "Long shot",
  good_fit: "Good fit",
  likely: "Likely",
};

const VARIANTS: Record<PlanTier, "outline" | "secondary" | "default"> = {
  long_shot: "outline",
  good_fit: "secondary",
  likely: "default",
};

/**
 * Where a magazine sits in a submission plan, from its odds score: a long
 * shot, a good fit or a likely acceptance. Static; never animates.
 */
export function PlanTierBadge({ tier }: { tier: PlanTier }) {
  return <Badge variant={VARIANTS[tier]}>{PLAN_TIER_LABELS[tier]}</Badge>;
}
