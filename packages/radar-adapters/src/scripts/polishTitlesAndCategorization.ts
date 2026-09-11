/**
 * Polish opportunity titles, discipline categorizations, and organization names.
 * 
 * 1. Suppresses directory/aggregate crawler listings (city filter pages, search result URLs).
 * 2. Contextualizes vague single-word/generic titles with their host organizations.
 * 3. Normalizes disciplines to clean kebab-case slugs and corrects literary/visual arts misclassifications.
 * 4. Resolves placeholder organization names ('b', ' ', 'Creative Organization', 'Www').
 */

import { Pool } from "pg";
import { cleanTitleOrLabel } from "../cleanText.js";

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
});

function toTitleCase(str: string): string {
  if (!str) return "";
  const minorWords = new Set(["a", "an", "the", "and", "but", "or", "for", "nor", "on", "at", "to", "from", "by", "in", "of"]);
  return str
    .split(/\s+/)
    .map((word, i) => {
      const lower = word.toLowerCase();
      if (i > 0 && minorWords.has(lower)) return lower;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

async function run() {
  console.log("=== 1. SUPPRESSING AGGREGATE DIRECTORY / SEARCH PAGES ===");
  const suppressed = await pool.query(`
    update opportunities
    set publication_state = 'suppressed', status = 'closed', updated_at = now()
    where publication_state = 'published'
      and (
        guidelines_url ~* '(artconnect\\.com/opportunities\\?|transartists\\.org/en/call-artists|opencallradar\\.com/about|fundsforngos\\.org/category/|/category/|/opportunities$|/search$)'
        or title in (
          'About', 'Privacy Policy', 'Terms of Service', 'Contact Us', 'Cookie Policy',
          'Opportunities', 'ArtConnect Opportunities', 'Dance/USA Opportunities', 'Jobs', 'Job',
          'Award or Prize', 'Grant / Stipend', 'Residency', 'ArtConnect'
        )
        or title ~* '^[A-Z][a-z]+,\\s+[A-Z]{2},\\s+United States$'
        or title ~* '^(Hamburg|Bosa|Shanghai|Kowloon|Roma|Arbon|England),\\s+[A-Za-z\\s]+$'
      )
    returning id, title, guidelines_url;
  `);
  console.log(`Suppressed ${suppressed.rows.length} crawler aggregate / directory listings.`);
  for (const r of suppressed.rows) {
    console.log(`  - Suppressed [${r.id}]: "${r.title}" (${r.guidelines_url})`);
  }

  console.log("\n=== 2. FIXING PLACEHOLDER ORGANIZATION NAMES ===");
  await pool.query(`
    update radar_organizations
    set data = jsonb_set(data, '{name}', '"ArtConnect"')
    where id = 'org_artconn_3e4e244173eda2fe';
  `);
  await pool.query(`
    update radar_organizations
    set data = jsonb_set(data, '{name}', '"Curatorspace"')
    where id = 'org_cs_cc7819055cde3194';
  `);
  await pool.query(`
    update radar_organizations
    set data = jsonb_set(data, '{name}', '"Grants.gov"')
    where id = 'org_ca710b2a574f332244a38b51';
  `);
  await pool.query(`
    update radar_organizations
    set data = jsonb_set(data, '{name}', '"Playbill"')
    where id = 'org_1162b98e05ac040cc54a7409';
  `);
  await pool.query(`
    update radar_organizations
    set data = jsonb_set(data, '{name}', '"Res Artis"')
    where id = 'org_c5bce68f0d3831e0575b5823';
  `);
  await pool.query(`
    update radar_organizations
    set data = jsonb_set(data, '{name}', '"Curatorspace"')
    where id = 'org_cs_33e75ff09dd601bb';
  `);

  console.log("Updated core placeholder organizations ('b' -> 'ArtConnect', ' ' -> 'Curatorspace', etc.).");

  console.log("\n=== 3. CONTEXTUALIZING GENERIC TITLES ===");
  const genericUpdates = [
    { id: "opp_subm_1276", title: "North American Review: Nonfiction Submissions", discipline: "nonfiction" },
    { id: "opp_subm_345041", title: "Five Minutes: 2026 Submissions", discipline: "all-disciplines" },
    { id: "opp_b3672f38-72e9-45da-a3e9-74a90c58130a", title: "Emerging Digital Artist Award 2026", discipline: "digital-art", type: "award" },
    { id: "opp_87316a4e-b378-4df4-9a25-7d82a0649593", title: "Storyknife: 2027 Writers Residency", discipline: "literature" },
    { id: "opp_ce3b7a1f-c691-476e-8393-390931a1b7da", title: "Vashon Artist Residency 2027", discipline: "visual-arts" },
    { id: "opp_rivet_40bdc049", title: "Access Arts: Artist in Residence", discipline: "visual-arts" },
    { id: "opp_subm_348218", title: "L.E. Phillips Memorial Public Library: Call for Artists", discipline: "visual-arts" },
    { id: "opp_a9f22cbd-4989-420a-883a-60ca2153f98b", title: "Studio Ofo: Grants Program", discipline: "visual-arts" },
    { id: "opp_0ef71670-4415-4ffd-9ad5-7e8e164e5d75", title: "Studio Ofo: Grants Program", discipline: "all-disciplines" },
    { id: "opp_rivet_0a366e42", title: "Phoenix Athens: Open Call Residency", discipline: "visual-arts" },
    { id: "opp_rivet_c3652029", title: "Art Business Incubator: Open Call", discipline: "visual-arts" },
    { id: "opp_5fd4d8b2-7d9e-4e35-b33d-906c8b988628", title: "Artis: Artist-in-Residence", discipline: "visual-arts" },
    { id: "opp_4dbd9f70-768b-4482-b04a-0dba81a03cda", title: "Harvard Radcliffe Institute Fellowship Program", discipline: "all-disciplines" },
    { id: "opp_b2d2d516-8d29-4cd3-8c35-63c8a23275fd", title: "Researcher to Reader Conference: Call for Papers", discipline: "literature" },
    { id: "opp_04a60ac5-68c0-47ae-83a3-e6ba964f6d6b", title: "Pollock-Krasner Foundation Grants", discipline: "visual-arts" },
    { id: "opp_cs_11042", title: "Curatorspace: Music Open Call", discipline: "music" },
    { id: "opp_cs_11069", title: "Collect Art: Open Call — Identity", discipline: "visual-arts" },
    { id: "opp_8f5fbb66-ab9a-4511-811d-345e7be61ae1", title: "Dance/NYC 2026-2028 Dance Program", discipline: "dance" },
    { id: "opp_cc53d822-9322-4e16-b3f0-cb1c85ccc06b", title: "Artis 2027 Artist-in-Residence", discipline: "visual-arts" },
    { id: "opp_57bd6503-75f3-48bc-b6c1-d4dad5c151bd", title: "Villa Medici 2027-2028 Fellowships", discipline: "all-disciplines" },
    { id: "opp_subm_217967", title: "Intima: Academic Writing Submissions", discipline: "essay" },
  ];

  for (const item of genericUpdates) {
    const fields = [`title = $1`, `updated_at = now()`];
    const params: unknown[] = [item.title, item.id];
    if (item.discipline) {
      fields.push(`discipline = $${params.length + 1}`);
      params.push(item.discipline);
      fields.push(`genres = ARRAY[$${params.length + 1}]::text[]`);
      params.push(item.discipline);
    }
    if (item.type) {
      fields.push(`type = $${params.length + 1}`);
      params.push(item.type);
    }

    await pool.query(
      `update opportunities set ${fields.join(", ")} where id = $2`,
      params,
    );
    console.log(`  ✓ Updated [${item.id}] -> "${item.title}"`);
  }

  // Capitalize all-lowercase published titles
  const lowerTitles = await pool.query(`
    select id, title
    from opportunities
    where publication_state = 'published'
      and title ~ '^[a-z]'
      and title !~ '[A-Z]'
  `);
  console.log(`Found ${lowerTitles.rows.length} all-lowercase titles to capitalize.`);
  for (const r of lowerTitles.rows) {
    const capitalized = toTitleCase(r.title);
    await pool.query(`update opportunities set title = $1, updated_at = now() where id = $2`, [capitalized, r.id]);
  }
  console.log(`Capitalized ${lowerTitles.rows.length} titles to proper title casing.`);

  console.log("\n=== 4. NORMALIZING DISCIPLINE SLUGS ===");
  const slugNormalizations: Record<string, string> = {
    "visual_art": "visual-arts",
    "visual art": "visual-arts",
    "visual arts": "visual-arts",
    "visual_arts": "visual-arts",
    "Visual Arts": "visual-arts",
    "Visual arts": "visual-arts",
    "all_disciplines": "all-disciplines",
    "all disciplines": "all-disciplines",
    "Poetry": "poetry",
    "Fiction": "fiction",
    "Photography": "photography",
    "Architecture": "architecture",
    "Design": "design",
    "Research": "research",
    "Performing Arts": "performing-arts",
    "performing arts": "performing-arts",
    "Digital / New Media": "digital-art",
    "Media & Digital Art": "digital-art",
    "digital art": "digital-art",
    "Flash Fiction": "flash-fiction",
    "flash fiction": "flash-fiction",
    "short story": "short-story",
    "literary fiction": "literature",
    "literary-fiction": "literature",
    "Writing & literature": "literature",
    "contemporary art": "visual-arts",
    "socially engaged arts": "all-disciplines",
    "cross-disciplinary": "all-disciplines",
    "multidisciplinary": "all-disciplines",
    "residency": "all-disciplines",
  };

  for (const [from, to] of Object.entries(slugNormalizations)) {
    const res = await pool.query(
      `update opportunities set discipline = $1, updated_at = now() where discipline = $2`,
      [to, from],
    );
    if (res.rowCount && res.rowCount > 0) {
      console.log(`  ✓ Normalized "${from}" -> "${to}" (${res.rowCount} rows)`);
    }
  }

  console.log("\n=== 5. CORRECTING DISCIPLINE MISALIGNMENTS ===");
  // Correct literary calls misaligned to film/dance/theatre/acting/music
  const literaryFix = await pool.query(`
    update opportunities
    set discipline = case
      when title ~* '(poetry|poem|chapbook)' then 'poetry'
      when title ~* '(fiction|short stor|novella)' and title !~* 'nonfiction' then 'fiction'
      when title ~* '(nonfiction|essay|memoir|prose)' then 'essay'
      else 'literature'
    end,
    updated_at = now()
    where publication_state = 'published'
      and (
        title ~* '(poetry|poem|fiction|short stor|essay|prose|manuscript|novella|chapbook|writing)'
        and discipline in ('film', 'dance', 'acting', 'theatre', 'music')
        and title !~* '(screenplay|dance|theatre|theater|play|song|libretto|score|choreograph)'
      )
    returning id, title, discipline;
  `);
  console.log(`Corrected ${literaryFix.rows.length} literary calls misaligned to film/dance/etc.`);
  for (const r of literaryFix.rows) {
    console.log(`  ✓ [${r.id}] "${r.title}" -> ${r.discipline}`);
  }

  // Correct visual arts calls misaligned to dance/acting/music
  const visualFix = await pool.query(`
    update opportunities
    set discipline = 'visual-arts', updated_at = now()
    where publication_state = 'published'
      and (
        title ~* '(ceramics|sculpture|printmaking|painting|drawing|illustration|exhibition|mural)'
        and discipline in ('dance', 'acting', 'music')
        and title !~* '(dance|acting|music|performance)'
      )
    returning id, title, discipline;
  `);
  console.log(`Corrected ${visualFix.rows.length} visual arts calls misaligned to dance/acting/etc.`);
  for (const r of visualFix.rows) {
    console.log(`  ✓ [${r.id}] "${r.title}" -> ${r.discipline}`);
  }

  console.log("\nTitle and categorization polish complete!");
}

run().catch((err) => {
  console.error("Error polishing titles and categorization:", err);
  process.exit(1);
}).finally(() => pool.end());
