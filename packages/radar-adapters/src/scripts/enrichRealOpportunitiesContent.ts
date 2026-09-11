import { Pool } from "pg";
import crypto from "crypto";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function extractMeaningfulDescription(searchDoc: string, title: string, orgName?: string): string | null {
  if (!searchDoc || searchDoc.length < 50) return null;

  let text = searchDoc.trim();

  // Strip leading repetitive title occurrences
  const titleLower = title.toLowerCase();
  while (text.toLowerCase().startsWith(titleLower)) {
    text = text.slice(title.length).trim();
  }

  // Strip leading org name if present
  if (orgName) {
    const orgLower = orgName.toLowerCase();
    if (text.toLowerCase().startsWith(orgLower)) {
      text = text.slice(orgName.length).trim();
    }
  }

  // Strip taxonomy tags
  text = text.replace(/taxterm_[a-z0-9_-]+/gi, "").trim();
  text = text.replace(/\s+/g, " ");

  const grantMatch = text.match(/(A prize of \$[\d,]+.*|The .* program provides.*|Grants? of up to \$[\d,]+.*|Provides up to \$[\d,]+.*|Supports emerging individual artists.*|Open to .*|Applications are invited.*)/i);
  if (grantMatch) {
    return grantMatch[1].trim();
  }

  if (text.length >= 60 && !text.includes("skip to content keywords")) {
    return text;
  }

  return null;
}

async function run() {
  console.log("🚀 Enriching real opportunity content across PostgreSQL...");

  // 1. Specifically enrich Rauschenberg Medical Emergency Grants
  const rauschenbergDesc =
    "The Rauschenberg Medical Emergency Grants program provides one-time grants of up to $5,000 for recent unexpected medical, dental, and mental health emergencies to artists in financial need who are creating work in the visual arts, digital/electronic arts, video/film, and choreography. To be eligible to apply, your average adjusted gross income for the last two years you’ve filed tax returns must be no greater than $80,000 ($160,000 for joint filers).";

  await pool.query(
    `update opportunities
     set prize = 'Up to $5,000'
     where title ilike '%Rauschenberg Medical Emergency Grants%'`
  );

  const rauschenbergOpps = await pool.query(
    `select id from opportunities where title ilike '%Rauschenberg Medical Emergency Grants%'`
  );

  for (const row of rauschenbergOpps.rows) {
    const oppId = row.id;
    const contentObj = {
      summary: rauschenbergDesc,
      description: rauschenbergDesc,
      sourceUrl: "https://www.nyfa.org/awards-grants/rauschenberg-medical-emergency-grants/",
      builderVersion: "opportunity-brief.v2",
    };

    await pool.query(
      `insert into opportunity_contents (opportunity_id, input_version, builder_version, content, review_status, review_score, review_reasons, review_checks, generated_at, reviewed_at)
       values ($1, now(), 'opportunity-brief.v2', $2::jsonb, 'approved', 95, '[]'::jsonb, '{}'::jsonb, now(), now())
       on conflict (opportunity_id) do update set
         content = $2::jsonb,
         updated_at = now()`,
      [oppId, JSON.stringify(contentObj)]
    );

    // Clean eligibility rules
    await pool.query(`delete from opportunity_eligibility_rules where opportunity_id = $1`, [oppId]);
    await pool.query(
      `insert into opportunity_eligibility_rules (id, opportunity_id, rule_key, description, value, certainty, sort_order)
       values
         ($1, $2, 'financial-need', 'Financial need: Average AGI for the last 2 years no greater than $80,000 ($160,000 for joint filers)', '$80,000 / $160,000 max AGI', 'confirmed', 1),
         ($3, $2, 'discipline', 'Generative artist creating in Visual Arts, Film/Video/Electronic/Digital Arts, or Choreography', 'Visual Arts, Film, Video, Choreography', 'confirmed', 2),
         ($4, $2, 'residency', 'Reside in the United States, District of Columbia, a Tribal Nation, or a U.S. Territory', 'US / Territories', 'confirmed', 3),
         ($5, $2, 'emergency-scope', 'Recent unexpected medical, dental, or mental health emergency (treatment in US)', 'Medical, dental, mental health', 'confirmed', 4)`,
      [crypto.randomUUID(), oppId, crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()]
    );

    // Clean required materials
    await pool.query(`delete from opportunity_required_materials where opportunity_id = $1`, [oppId]);
    await pool.query(
      `insert into opportunity_required_materials (id, opportunity_id, label, description, required, "limit", sort_order)
       values
         ($1, $2, 'Medical, Dental, or Mental Health Bill / Estimate', 'Itemized bill, statement, or formal estimate from treating provider', true, null, 1),
         ($3, $2, 'Proof of Income (IRS Form 1040)', 'Last two years of filed federal tax returns to verify AGI threshold', true, '2 years', 2),
         ($4, $2, 'Artist Resume / CV or Activity Proof', 'Documentation demonstrating recent and sustained creative activity', true, null, 3),
         ($5, $2, 'Narrative Statement of Emergency', 'Description of emergency circumstance and how grant enables return to creative work', true, null, 4)`,
      [crypto.randomUUID(), oppId, crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()]
    );

    // Clean bogus literary call_profile
    await pool.query(
      `update opportunity_call_profiles
       set accepted_formats = array['Visual Arts', 'Film/Video', 'Digital Art', 'Choreography'],
           previously_unpublished_required = false,
           call_kind = 'grant',
           market_kind = 'organization',
           rights_summary = null
       where opportunity_id = $1`,
      [oppId]
    );
  }

  console.log("   ✔ Enriched Rauschenberg Medical Emergency Grants with real facts & materials.");

  // 2. Clear bogus literary defaults on non-literary opportunities
  const clearedProfiles = await pool.query(
    `update opportunity_call_profiles cp
     set accepted_formats = array[]::text[],
         previously_unpublished_required = false
     from opportunities o
     where o.id = cp.opportunity_id
       and o.type in ('grant', 'residency', 'fellowship', 'exhibition', 'job')
       and cp.accepted_formats = array['Fiction', 'Poetry', 'Nonfiction']`
  );
  console.log(`   ✔ Cleared erroneous literary call profiles on ${clearedProfiles.rowCount} non-literary opportunities.`);

  // 3. Extract real descriptions from search_document for opportunities with generic placeholder briefs
  const placeholders = await pool.query(
    `select o.id, o.title, o.organization_id, org.data->>'name' as org_name, o.search_document, o.prize,
            c.content
     from opportunities o
     left join radar_organizations org on org.id = o.organization_id
     join opportunity_contents c on c.opportunity_id = o.id
     where c.content->>'summary' like 'This organization lists “%'
       and length(o.search_document) > 80`
  );

  console.log(`   Inspecting ${placeholders.rows.length} opportunities with placeholder summaries...`);
  let enrichedCount = 0;

  for (const row of placeholders.rows) {
    const desc = extractMeaningfulDescription(row.search_document, row.title, row.org_name);
    if (desc && desc.length >= 60 && !desc.toLowerCase().startsWith("this organization lists")) {
      const prizeMatch = desc.match(/(?:A prize of|Grants? of up to|Provides up to|Award of)\s+(\$[\d,]+(?:\s*(?:and publication|annually))?)/i);
      if (prizeMatch && !row.prize) {
        await pool.query(`update opportunities set prize = $1 where id = $2`, [prizeMatch[1], row.id]);
      }

      const updatedContent = {
        ...(row.content || {}),
        summary: desc.slice(0, 300),
        description: desc,
      };

      await pool.query(
        `update opportunity_contents
         set content = $1::jsonb,
             updated_at = now()
         where opportunity_id = $2`,
        [JSON.stringify(updatedContent), row.id]
      );
      enrichedCount++;
    }
  }

  console.log(`   ✔ Successfully enriched ${enrichedCount} opportunities with authentic text from search_document.`);
  await pool.end();
}

run().catch((err) => {
  console.error("Enrichment failed:", err);
  process.exit(1);
});
