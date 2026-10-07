"use client";
import type { PortfolioData } from "@/lib/creator-portfolio-schema";
import { EditorHead } from "./studio-editors";

/**
 * Placeholder from the add-on foundation. The share-kit stream replaces the
 * body; the exported name and its props stay.
 */
export function SharePanel(_props: {
  draft: PortfolioData;
  /** The claimed handle without the @, empty until the first publish. */
  handle: string;
  published: boolean;
  changedSincePublish: boolean;
  isAccount: boolean;
  onPublish: () => void;
}) {
  return (
    <EditorHead
      title="Share kit"
      lead="A link card, a story image and an event card, made from your profile."
    />
  );
}
