"use client";

import { CreatorOnboarding } from "@/components/creator-onboarding";

export function CreatorOnboardingPreview() {
  return (
    <CreatorOnboarding
      preview
      initialDisplayName="Ayo"
      initialGivenName="Ayo"
      initialUsesSingleName
      initialCountryCode="NG"
      initialCity="Lagos"
      initialTimezone="Africa/Lagos"
      handleNamespaceReady
      handleClaimingOpen
    />
  );
}
