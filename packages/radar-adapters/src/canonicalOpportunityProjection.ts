/** Public visibility boundary shared by canonical Opportunity enrichments. */
export function canonicalPublicOpportunityPredicate(alias = "o"): string {
  if (!/^[a-z][a-z0-9_]*$/i.test(alias)) {
    throw new Error("Invalid SQL alias for canonical Opportunity projection");
  }
  return `${alias}.publication_state = 'published'`;
}

export function canonicalOpportunityIsPublic(
  publicationState: string | null | undefined,
): boolean {
  return publicationState === "published";
}
