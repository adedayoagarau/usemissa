import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Calm upgrade copy for a feature the creator's plan does not include. It
 * says what the person gets, never what they lose, and never uses alarm
 * treatment (positioning: upgrade prompts follow the product's calm register).
 */
export function UpgradeHint({
  plan,
  benefit,
  className,
}: {
  /** The plan that includes the feature. */
  plan: "Plus" | "Pro";
  /** What the creator gets, e.g. "Start-by dates that move with the deadline." */
  benefit: string;
  className?: string;
}) {
  return (
    <p className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground", className)}>
      <span>
        {benefit} Included with {plan}.
      </span>
      <Button variant="link" size="sm" render={<Link href="/plan" />}>
        See {plan}
      </Button>
    </p>
  );
}
