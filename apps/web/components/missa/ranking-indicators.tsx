import { ArrowDown, ArrowUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import styles from "./ranking-indicators.module.css";

export function RankingTierBadge({ tier, children }: { tier: string; children?: React.ReactNode }) {
  const number = tier.match(/tier[ _-]?([1-4])/i)?.[1] ?? "4";
  const label = tier
    .replace(/ \(.*\)/, "")
    .replace(/^tier[ _-]?([1-4])$/i, "Tier $1");
  return <Badge className={styles.tier} data-tier={number}>{children ?? label}</Badge>;
}

export function RankingMovement({ delta }: { delta: number | null | undefined }) {
  if (delta == null || delta === 0) return null;
  const Icon = delta > 0 ? ArrowUp : ArrowDown;
  return <span className={styles.movement} data-direction={delta > 0 ? "up" : "down"} aria-label={`${Math.abs(delta)} places ${delta > 0 ? "up" : "down"} since last year`}><Icon aria-hidden="true" />{Math.abs(delta)}</span>;
}
