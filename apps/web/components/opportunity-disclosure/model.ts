import type {
  OpportunityBrowseProjection,
  OpportunityDetailProjection,
} from "@missa/radar-engine";

export type DisclosureTone =
  | "confirmed"
  | "unknown"
  | "warning"
  | "unavailable"
  | "changed";

export type DisclosureValue = {
  label: string;
  value: string;
  tone: DisclosureTone;
  description?: string;
};

export function opportunityTypeLabel(
  type: OpportunityBrowseProjection["type"],
): string {
  if (type === "open-call") return "Open call";
  if (type === "rfp") return "Request for proposals";
  return type
    .replace(/-/gu, " ")
    .replace(/^./u, (character) => character.toUpperCase());
}

export function deadlineDisclosure(
  deadline: OpportunityBrowseProjection["deadline"],
): DisclosureValue {
  if (deadline.kind === "conflicting") {
    return {
      label: "Deadline",
      value: "Needs confirmation",
      tone: "warning",
      description: "Available sources do not agree. Confirm on the official page.",
    };
  }
  if (deadline.kind === "rolling") {
    return { label: "Deadline", value: "Rolling", tone: "confirmed" };
  }
  if (deadline.kind === "until-filled") {
    return { label: "Deadline", value: "Until filled", tone: "confirmed" };
  }
  if (!deadline.date) {
    return {
      label: "Deadline",
      value: "Not listed",
      tone: "unknown",
    };
  }
  const value = new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${deadline.date}T12:00:00Z`));
  return {
    label: deadline.kind === "inferred" ? "Likely deadline" : "Deadline",
    value,
    tone: deadline.kind === "inferred" ? "warning" : "confirmed",
    description:
      deadline.kind === "inferred"
        ? "This date is inferred from available source material."
        : undefined,
  };
}

export function feeDisclosure(
  fee: OpportunityBrowseProjection["fee"],
): DisclosureValue {
  if (fee.status === "no-fee") {
    return { label: "Fee", value: "No fee", tone: "confirmed" };
  }
  if (fee.status === "unknown") {
    return { label: "Fee", value: "Not listed", tone: "unknown" };
  }
  if (fee.amountCents !== undefined && fee.currency) {
    const validCurrency = /^[A-Z]{3}$/u.test(fee.currency);
    const value = validCurrency
      ? new Intl.NumberFormat("en", {
          style: "currency",
          currency: fee.currency,
          maximumFractionDigits: fee.amountCents % 100 === 0 ? 0 : 2,
        }).format(fee.amountCents / 100)
      : `${fee.currency}${(fee.amountCents / 100).toFixed(2)}`;
    return { label: "Application fee", value, tone: "confirmed" };
  }
  return { label: "Fee", value: "Amount not listed", tone: "unknown" };
}

export function locationDisclosure(
  location?: string,
): DisclosureValue {
  return location
    ? { label: "Reach", value: location, tone: "confirmed" }
    : { label: "Reach", value: "Not listed", tone: "unknown" };
}

export function statusDisclosure(
  opportunity: OpportunityBrowseProjection,
): DisclosureValue {
  if (opportunity.status === "closed" || opportunity.status === "archived") {
    return {
      label: "Status",
      value: "Closed",
      tone: "unavailable",
      description: "Kept for reference. Check the organization for a future edition.",
    };
  }
  if (opportunity.status === "deadline-extended") {
    return { label: "Status", value: "Deadline extended", tone: "changed" };
  }
  if (opportunity.status === "closing-soon") {
    return { label: "Status", value: "Closing soon", tone: "warning" };
  }
  if (opportunity.status === "opening-soon") {
    return { label: "Status", value: "Opening soon", tone: "confirmed" };
  }
  return { label: "Status", value: "Open", tone: "confirmed" };
}

export function primaryPracticeLabels(
  opportunity: OpportunityBrowseProjection,
  limit = 2,
): string[] {
  return Array.from(
    new Set(
      [opportunity.discipline, ...opportunity.genres].filter(
        (value): value is string => Boolean(value),
      ),
    ),
  ).slice(0, limit);
}

export function sourceHref(opportunity: OpportunityDetailProjection): string {
  return opportunity.guidelinesUrl ?? opportunity.source.url;
}

export function opportunityInitials(
  opportunity: OpportunityBrowseProjection,
): string {
  return (
    (opportunity.organizationName ?? opportunity.title)
      .split(/\s+/u)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join("") || "M"
  );
}
