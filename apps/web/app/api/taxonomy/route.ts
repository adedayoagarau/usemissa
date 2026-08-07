import { NextResponse } from "next/server";
import { taxonomyCatalogResponseSchema } from "@missa/contracts";
import { MISSA_TAXONOMY } from "@missa/taxonomy";

/**
 * The runtime catalog seam shared by Passport, Workspace and Radar tooling.
 * The relational graph is seeded from this same package; editors can replace
 * this adapter with the published DB scheme without changing consumers.
 */
export async function GET() {
  const response = taxonomyCatalogResponseSchema.parse({
    scheme: {
      ...MISSA_TAXONOMY.scheme,
    },
    facets: MISSA_TAXONOMY.facets,
    terms: MISSA_TAXONOMY.terms.map((term) => ({
      id: term.id,
      facet: term.facet,
      slug: term.slug,
      preferredLabel: term.preferredLabel,
      description: term.description,
      status: "active",
      selectable: term.selectable,
      culturallySensitive: term.culturallySensitive,
      labels: [
        { languageCode: "en", label: term.preferredLabel, kind: "preferred" },
        ...term.aliases.map((label) => ({ languageCode: "en", label, kind: "alias" as const })),
      ],
      relations: term.broaderTermIds.map((relationTermId) => ({ termId: relationTermId, relationType: "broader" as const, weight: 100 })),
    })),
  });

  return NextResponse.json(response, {
    headers: { "cache-control": "public, max-age=300, stale-while-revalidate=3600" },
  });
}
