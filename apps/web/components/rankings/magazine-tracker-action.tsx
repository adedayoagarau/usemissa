"use client";

import Link from "next/link";
import { BookmarkPlus, ExternalLink } from "lucide-react";
import { SaveToTrackerButton } from "@/components/save-to-tracker-button";
import { Button } from "@/components/ui/button";

type ActiveMagazineOpportunity = {
  id: string;
  title: string;
  deadline: string | null;
  status: string;
  detailUrl: string | null;
  officialWebsite: string | null;
};

interface MagazineTrackerActionProps {
  magazineName: string;
  magazineSlug: string;
  activeOpportunity?: ActiveMagazineOpportunity | null;
  signedIn: boolean;
  returnTo: string;
  compact?: boolean;
}

export function MagazineTrackerAction({
  magazineName,
  magazineSlug,
  activeOpportunity,
  signedIn,
  returnTo,
  compact = false,
}: MagazineTrackerActionProps) {
  if (signedIn && activeOpportunity?.id && activeOpportunity.status === "open") {
    return (
      <SaveToTrackerButton
        opportunityId={activeOpportunity.id}
        compact={compact}
        signedIn={signedIn}
        returnTo={returnTo}
        opportunityTitle={activeOpportunity.title || magazineName}
        label="Add to My Tracker"
        pendingLabel="Adding..."
      />
    );
  }

  return (
    <Button
      nativeButton={false}
      type="button"
      variant="outline"
      size={compact ? "icon-sm" : "sm"}
      aria-label={`Review open calls for ${magazineName}`}
      render={<Link href={`/journal/${encodeURIComponent(magazineSlug)}#profile-opportunities`} />}
    >
      {activeOpportunity?.officialWebsite ? (
        <ExternalLink aria-hidden="true" />
      ) : (
        <BookmarkPlus aria-hidden="true" />
      )}
      {compact ? null : "Review open calls"}
    </Button>
  );
}
