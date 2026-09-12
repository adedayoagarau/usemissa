"use client";

import type { ReactNode } from "react";
import { captureProductEvent } from "@/components/analytics-provider";

export function OfficialDestinationLink({
  children,
  className,
  href,
  opportunityId,
  surface,
}: {
  children: ReactNode;
  className?: string;
  href: string;
  opportunityId: string;
  surface: "detail-sticky" | "mobile-dock";
}) {
  return (
    <a
      className={className}
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() =>
        captureProductEvent("application.official_destination_opened", {
          opportunity_id: opportunityId,
          surface,
        })
      }
    >
      {children}
    </a>
  );
}
