"use client";

import type { ComponentProps } from "react";

import { HomepageHeroPreview } from "@/components/design-system/homepage-hero-preview";

export type HomepageHeroProps = ComponentProps<typeof HomepageHeroPreview>;

/** Shipped homepage entry point for the approved hero composition. */
export function HomepageHero(props: HomepageHeroProps) {
  return <HomepageHeroPreview {...props} />;
}
