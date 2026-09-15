"use client";

import { CreatorOnboarding } from "@/components/creator-onboarding";

export function CreatorOnboardingPreview() {
  return (
    <CreatorOnboarding
      preview
      initialDisplayName="Ayo"
      handleNamespaceReady
      handleClaimingOpen
    />
  );
}
