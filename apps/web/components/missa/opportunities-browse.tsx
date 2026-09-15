"use client";

import type { ComponentProps } from "react";

import {
  OpportunitiesBrowseV2Preview,
  type ActiveFiltersState,
} from "@/components/design-system/opportunities-browse-v2-preview";

export type OpportunitiesBrowseProps = ComponentProps<
  typeof OpportunitiesBrowseV2Preview
>;
export type { ActiveFiltersState };

/** Shipped opportunity catalogue entry point. */
export function OpportunitiesBrowse(props: OpportunitiesBrowseProps) {
  return <OpportunitiesBrowseV2Preview {...props} />;
}
