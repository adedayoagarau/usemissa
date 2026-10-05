import { intermediaryUrlSqlPattern } from "@missa/radar-engine";

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

/**
 * True when a listing links to the organization itself: its guidelines, its
 * own submission page, its website, or the page on its site that the
 * official-site resolver (officialSiteResolver.ts) confirmed names the call.
 * Intermediaries' pages (Submittable, ArtConnect, …) never count.
 */
export function organizationLinkSql(alias = "o"): string {
  if (!/^[a-z][a-z0-9_]*$/i.test(alias)) {
    throw new Error("Invalid SQL alias for canonical Opportunity projection");
  }
  const pattern = intermediaryUrlSqlPattern();
  const own = (column: string) => `(${column} ~* '^https?://' and ${column} !~* '${pattern}')`;
  return `(${own(`${alias}.guidelines_url`)} or ${own(`${alias}.submission_url`)}`
    + ` or exists (select 1 from gary_profiles listed_profile where listed_profile.id = ${alias}.organization_id and ${own("listed_profile.website_url")})`
    + ` or exists (select 1 from radar_organizations listed_org where listed_org.id = ${alias}.organization_id and ${own("coalesce(listed_org.data->>'website_url', listed_org.data->>'websiteUrl', listed_org.data->>'website')")})`
    + ` or exists (select 1 from opportunity_source_evidence listed_site where listed_site.opportunity_id = ${alias}.id and listed_site.kind = 'official-site' and ${own("listed_site.url")}))`;
}

/**
 * Public and linked to the organization itself (organizationLinkSql). A
 * listing whose only known link is an intermediary's is kept off discovery
 * pages until the organization's own page is found. Creator-owned views
 * (tracker, calendar) keep canonicalPublicOpportunityPredicate so saved items
 * stay.
 */
export function canonicalListedOpportunityPredicate(alias = "o"): string {
  return `(${canonicalPublicOpportunityPredicate(alias)} and ${organizationLinkSql(alias)})`;
}
