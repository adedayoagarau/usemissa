import { BadgeCheck, Banknote, Clock3, HandHeart, type LucideIcon } from "lucide-react";
import type { MagazineRankingRow } from "@missa/radar-adapters";
import { cn } from "@/lib/utils";

interface MagazineCitizenshipBadgesProps {
  ranking?: Pick<
    MagazineRankingRow,
    | "genre"
    | "medianResponseDays"
    | "regularFeeCents"
    | "contributorPayCents"
    | "formatEthicsScore"
  > | null;
  compact?: boolean;
  className?: string;
}

type CitizenshipBadge = {
  key: string;
  label: string;
  title: string;
  icon: LucideIcon;
};

function hasWriterFirstPay(
  ranking: NonNullable<MagazineCitizenshipBadgesProps["ranking"]>,
): boolean {
  if (ranking.genre === "poetry") return ranking.contributorPayCents >= 5000;
  return ranking.contributorPayCents >= 10000;
}

export function MagazineCitizenshipBadges({
  ranking,
  compact = false,
  className,
}: MagazineCitizenshipBadgesProps) {
  if (!ranking) return null;

  const badges = [
    ranking.medianResponseDays != null && ranking.medianResponseDays <= 30
      ? {
          key: "fast",
          label: "Lightning responder",
          title: `${ranking.medianResponseDays}-day median response time`,
          icon: Clock3,
        }
      : null,
    hasWriterFirstPay(ranking)
      ? {
          key: "payer",
          label: "Writer-first payer",
          title:
            ranking.genre === "poetry"
              ? "Verified pay meets the $50 poetry threshold"
              : "Verified pay meets the $100 prose threshold",
          icon: Banknote,
        }
      : null,
    ranking.regularFeeCents === 0
      ? {
          key: "fee-free",
          label: "Fee-free champion",
          title: "Regular submissions have a verified $0 fee",
          icon: BadgeCheck,
        }
      : null,
    ranking.formatEthicsScore >= 4.5
      ? {
          key: "debut",
          label: "Debut booster",
          title:
            "Format and ethics evidence includes strong debut or emerging-writer support",
          icon: HandHeart,
        }
      : null,
  ].filter((badge): badge is CitizenshipBadge => Boolean(badge));

  if (!badges.length) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {badges.map((badge) => {
        const Icon = badge.icon;
        return (
          <span
            key={badge.key}
            title={badge.title}
            className={cn(
              "inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-xs font-medium text-foreground",
              compact && "px-1.5 py-0 text-[10px]",
            )}
          >
            <Icon className="size-3" aria-hidden="true" />
            <span>{badge.label}</span>
          </span>
        );
      })}
    </div>
  );
}
