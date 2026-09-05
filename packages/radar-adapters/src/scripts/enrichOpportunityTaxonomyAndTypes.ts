import { Pool } from "pg";

export interface TaxonomyEnrichmentStats {
  totalEvaluated: number;
  typeReclassified: number;
  identityEnriched: number;
  queerCount: number;
  bipocCount: number;
  womenCount: number;
  disabilityCount: number;
  emergingCount: number;
  translationCount: number;
  craftCount: number;
}

export async function enrichOpportunityTaxonomyAndTypes(pool: Pool): Promise<TaxonomyEnrichmentStats> {
  const stats: TaxonomyEnrichmentStats = {
    totalEvaluated: 0,
    typeReclassified: 0,
    identityEnriched: 0,
    queerCount: 0,
    bipocCount: 0,
    womenCount: 0,
    disabilityCount: 0,
    emergingCount: 0,
    translationCount: 0,
    craftCount: 0,
  };

  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT o.id, o.title, o.type, o.opportunity_type_id, o.genres, o.search_document,
             coalesce(org.data->>'name', '') as org_name
      FROM opportunities o
      LEFT JOIN radar_organizations org ON org.id = o.organization_id
    `);

    stats.totalEvaluated = res.rows.length;
    console.log(`[enrichTaxonomy] Evaluating ${stats.totalEvaluated} opportunities for type & identity enrichment...`);

    const updates: Array<{
      id: string;
      newType: string;
      newTypeId: string | null;
      newGenres: string[];
      newSearchDoc: string;
    }> = [];

    for (const row of res.rows) {
      let typeChanged = false;
      let tagsChanged = false;

      let currentType: string = (row.type || "").trim().toLowerCase();
      let currentTypeId: string = (row.opportunity_type_id || "").trim().toLowerCase();
      const currentGenres: string[] = Array.isArray(row.genres) ? [...row.genres] : [];
      let searchDoc: string = (row.search_document || "").toLowerCase();
      const combinedText = `${row.title} ${row.org_name} ${searchDoc}`.toLowerCase();

      // 1. Reclassify ambiguous opportunity types (e.g. "open-call", "other", or empty)
      let targetType = currentType;
      if (!targetType || targetType === "open-call" || targetType === "other") {
        if (/\b(residency|artist-in-residence|air program|creative retreat|fellow in residence)\b/i.test(combinedText)) {
          targetType = "residency";
        } else if (/\b(fellowship|mentorship program|scholarship)\b/i.test(combinedText)) {
          targetType = "fellowship";
        } else if (/\b(grant|funding|project grant|emergency fund|artist grant|relief fund)\b/i.test(combinedText)) {
          targetType = "grant";
        } else if (/\b(contest|prize|competition|award|poetry prize|fiction contest|short story prize|annual award)\b/i.test(combinedText)) {
          targetType = "contest";
        } else if (/\b(exhibition|biennial|triennial|gallery call|juried show|curatorial proposal|solo show|group show|open call for artists|call for artists|art submissions)\b/i.test(combinedText)) {
          targetType = "exhibition";
        } else if (/\b(magazine|journal|literary review|periodical|chapbook|anthology|call for submissions?:? (poetry|fiction|prose|work)|poems?|poetry for|fiction for|issue\s+\d+|publication)\b/i.test(combinedText)) {
          targetType = "magazine";
        } else if (/\b(job|employment|hiring|internship|curator role|editorial position|faculty|stage manager)\b/i.test(combinedText)) {
          targetType = "job";
        } else if (/\b(commission|public art|mural proposal|site-specific installation)\b/i.test(combinedText)) {
          targetType = "commission";
        } else if (/\b(festival|conference|symposium|summit)\b/i.test(combinedText)) {
          targetType = "festival";
        }
      }

      if (targetType !== currentType) {
        typeChanged = true;
      }

      // Map targetType to valid opportunity_type_id
      let targetTypeId = targetType;
      if (targetType === "magazine") targetTypeId = "publication";
      else if (targetType === "contest") targetTypeId = "competition";
      else if (targetType === "commission" || targetType === "public_art") targetTypeId = "open-call";
      else if (targetType === "job" || targetType === "other") targetTypeId = "open-call";

      if (targetTypeId !== currentTypeId) {
        typeChanged = true;
      }

      // 2. Identity & thematic taxonomy enrichment
      const newGenresSet = new Set(currentGenres);
      const searchTermsToAdd: string[] = [];

      // A. Queer / LGBTQ+
      if (/\b(queer|lgbt|lgbtq|lgbtqia|transgender|trans\s+writers?|trans\s+artists?|non-binary|gender-expansive|two-spirit|gay|lesbian)\b/i.test(combinedText)) {
        if (!newGenresSet.has("LGBTQ+") && !newGenresSet.has("Queer")) {
          newGenresSet.add("LGBTQ+");
          newGenresSet.add("Queer");
          tagsChanged = true;
        }
        if (!searchDoc.includes("queer") || !searchDoc.includes("lgbtq")) {
          searchTermsToAdd.push("queer lgbtq lgbtqia lgbt");
          tagsChanged = true;
        }
        stats.queerCount++;
      }

      // B. BIPOC / Creators of Color
      if (/\b(bipoc|black\s+writers?|black\s+artists?|indigenous|native\s+american|first\s+nations|latinx|latine|hispanic|asian\s+american|aapi|writers\s+of\s+color|artists\s+of\s+color|creators\s+of\s+color|underrepresented)\b/i.test(combinedText)) {
        if (!newGenresSet.has("BIPOC") && !newGenresSet.has("Writers of Color")) {
          newGenresSet.add("BIPOC");
          newGenresSet.add("Writers of Color");
          tagsChanged = true;
        }
        if (!searchDoc.includes("bipoc") || !searchDoc.includes("writers of color")) {
          searchTermsToAdd.push("bipoc writers of color artists of color");
          tagsChanged = true;
        }
        stats.bipocCount++;
      }

      // C. Women & Non-Binary
      if (/\b(women|woman|female|non-binary|gender-marginalized|female-identifying|femme|matron|mothers)\b/i.test(combinedText)) {
        if (!newGenresSet.has("Women") && !newGenresSet.has("Non-Binary")) {
          newGenresSet.add("Women");
          newGenresSet.add("Non-Binary");
          tagsChanged = true;
        }
        if (!searchDoc.includes("women") || !searchDoc.includes("non-binary")) {
          searchTermsToAdd.push("women non-binary gender-marginalized");
          tagsChanged = true;
        }
        stats.womenCount++;
      }

      // D. Disability & Neurodivergence
      if (/\b(disabilit|disabled|neurodiverg|autis|deaf|chronically\s+ill|accessibility|accessible\s+to\s+all)\b/i.test(combinedText)) {
        if (!newGenresSet.has("Disability") && !newGenresSet.has("Neurodivergent")) {
          newGenresSet.add("Disability");
          newGenresSet.add("Neurodivergent");
          tagsChanged = true;
        }
        if (!searchDoc.includes("disability") || !searchDoc.includes("accessible")) {
          searchTermsToAdd.push("disability neurodivergent accessible accommodations");
          tagsChanged = true;
        }
        stats.disabilityCount++;
      }

      // E. Emerging / Early Career
      if (/\b(emerging|early-career|debut|first\s+book|first\s+collection|undergraduate|student\s+writers?)\b/i.test(combinedText)) {
        if (!newGenresSet.has("Emerging")) {
          newGenresSet.add("Emerging");
          tagsChanged = true;
        }
        if (!searchDoc.includes("emerging")) {
          searchTermsToAdd.push("emerging early-career debut");
          tagsChanged = true;
        }
        stats.emergingCount++;
      }

      // F. Translation
      if (/\b(translation|translator|translated|multilingual|bilingual)\b/i.test(combinedText)) {
        if (!newGenresSet.has("Translation")) {
          newGenresSet.add("Translation");
          tagsChanged = true;
        }
        if (!searchDoc.includes("translation")) {
          searchTermsToAdd.push("translation literary translation");
          tagsChanged = true;
        }
        stats.translationCount++;
      }

      // G. Craft / Ceramics
      if (/\b(craft|ceramics|ceramic|pottery|textiles|glass|metalwork|woodwork)\b/i.test(combinedText)) {
        if (!newGenresSet.has("Craft") && !newGenresSet.has("Ceramics")) {
          newGenresSet.add("Craft");
          newGenresSet.add("Ceramics");
          tagsChanged = true;
        }
        if (!searchDoc.includes("craft") || !searchDoc.includes("ceramics")) {
          searchTermsToAdd.push("craft ceramics pottery studio craft");
          tagsChanged = true;
        }
        stats.craftCount++;
      }

      if (typeChanged || tagsChanged) {
        if (typeChanged) stats.typeReclassified++;
        if (tagsChanged) stats.identityEnriched++;

        let updatedSearchDoc = searchDoc;
        if (searchTermsToAdd.length > 0) {
          updatedSearchDoc = `${searchDoc} ${searchTermsToAdd.join(" ")}`;
        }
        if (typeChanged && !updatedSearchDoc.includes(targetType)) {
          updatedSearchDoc = `${updatedSearchDoc} ${targetType}`;
        }

        updates.push({
          id: row.id,
          newType: targetType,
          newTypeId: targetTypeId,
          newGenres: Array.from(newGenresSet),
          newSearchDoc: updatedSearchDoc.trim(),
        });
      }
    }

    console.log(`[enrichTaxonomy] Found ${updates.length} opportunities needing type or taxonomy updates. Committing...`);

    // Perform batched updates
    const batchSize = 100;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      await client.query("BEGIN");
      for (const item of batch) {
        await client.query(
          `UPDATE opportunities
           SET type = $1, opportunity_type_id = $2, genres = $3, search_document = $4, updated_at = now()
           WHERE id = $5`,
          [item.newType, item.newTypeId, item.newGenres, item.newSearchDoc, item.id]
        );
      }
      await client.query("COMMIT");
    }

    console.log(`[enrichTaxonomy] Successfully updated ${updates.length} opportunities!`);
  } finally {
    client.release();
  }

  return stats;
}

if (process.argv[1] && /enrichOpportunityTaxonomyAndTypes\.(ts|js)$/.test(process.argv[1])) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  enrichOpportunityTaxonomyAndTypes(pool)
    .then((stats) => {
      console.log("\n=== Taxonomy & Type Enrichment Summary ===");
      console.log(`Total Opportunities Evaluated: ${stats.totalEvaluated}`);
      console.log(`Opportunity Types Reclassified: ${stats.typeReclassified}`);
      console.log(`Opportunities with Enhanced Identity Tags: ${stats.identityEnriched}`);
      console.log(`  • LGBTQ+ / Queer: ${stats.queerCount}`);
      console.log(`  • BIPOC: ${stats.bipocCount}`);
      console.log(`  • Women & Non-Binary: ${stats.womenCount}`);
      console.log(`  • Disability / Accessible: ${stats.disabilityCount}`);
      console.log(`  • Emerging / Debut: ${stats.emergingCount}`);
      console.log(`  • Translation: ${stats.translationCount}`);
      console.log(`  • Craft & Ceramics: ${stats.craftCount}`);
      return pool.end();
    })
    .catch((err) => {
      console.error("[enrichTaxonomy] Error:", err);
      pool.end();
      process.exit(1);
    });
}
