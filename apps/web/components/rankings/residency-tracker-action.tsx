"use client";

import Link from "next/link";
import { ExternalLink, Building } from "lucide-react";
import { SaveToTrackerButton } from "@/components/save-to-tracker-button";
import { Button } from "@/components/ui/button";

interface ResidencyTrackerActionProps {
  residencyName: string;
  residencySlug: string;
  opportunityId?: string | null;
  applicationUrl?: string | null;
  signedIn?: boolean;
  returnTo?: string;
  compact?: boolean;
}

export function ResidencyTrackerAction({
  residencyName,
  residencySlug,
  opportunityId,
  applicationUrl,
  signedIn = false,
  returnTo = "/rankings/residencies",
  compact = false,
}: ResidencyTrackerActionProps) {
  if (signedIn && opportunityId) {
    return (
      <SaveToTrackerButton
        opportunityId={opportunityId}
        compact={compact}
        signedIn={signedIn}
        returnTo={returnTo}
        opportunityTitle={`${residencyName} Fellowship`}
        label="Add to Tracker"
        pendingLabel="Saving..."
      />
    );
  }

  if (applicationUrl) {
    return (
      <a
        href={applicationUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors shadow-sm"
        aria-label={`Apply to ${residencyName}`}
      >
        <ExternalLink className="h-3.5 w-3.5 text-primary" />
        {!compact && <span>Apply Now</span>}
      </a>
    );
  }

  return (
    <Button
      nativeButton={false}
      type="button"
      variant="outline"
      size={compact ? "icon-sm" : "sm"}
      aria-label={`View details and calls for ${residencyName}`}
      className="gap-1.5 min-h-9 text-xs"
      render={<Link href={`/residency/${encodeURIComponent(residencySlug)}`} />}
    >
      <Building className="h-3.5 w-3.5 text-muted-foreground" />
      {!compact && <span>View Program</span>}
    </Button>
  );
}
