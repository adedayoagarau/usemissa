import fs from "node:fs";
import crypto from "node:crypto";
import pg from "pg";

const envContent = fs.readFileSync("/Volumes/Crucial X10/usemissa/.env.local", "utf8");
let dbUrl = "";
for (const line of envContent.split("\n")) {
  const match = line.match(/^DATABASE_URL\s*=\s*(.*)$/);
  if (match) {
    dbUrl = match[1].trim().replace(/^["\x27]|["\x27]$/g, "");
    break;
  }
}

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

function clean(s) {
  if (!s) return "";
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getDomain(u) {
  if (!u) return "";
  try {
    const parsed = new URL(u.startsWith("http") ? u : "http://" + u);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

async function run() {
  await client.connect();
  console.log("Connected to PostgreSQL for residency enrichment & provisioning...");

  // Apply migration 0058
  const migrationSql = fs.readFileSync("/Volumes/Crucial X10/usemissa/packages/db/migrations/0058_missa_residency_enrichment.sql", "utf8");
  await client.query(migrationSql);
  console.log("Applied migration 0058_missa_residency_enrichment.sql");

  const unified = JSON.parse(
    fs.readFileSync("/Volumes/Crucial X10/usemissa/packages/radar-adapters/src/ranking/data/residencies/unified-residencies.json", "utf8")
  );

  const dbProfiles = await client.query(`
    SELECT id, name, name_key, profile_kind, website_url, country_code, country, city
    FROM gary_profiles;
  `);

  const nameMap = new Map();
  const keyMap = new Map();
  const domainMap = new Map();

  for (const p of dbProfiles.rows) {
    if (p.name) nameMap.set(clean(p.name), p);
    if (p.name_key) keyMap.set(clean(p.name_key), p);
    const dom = getDomain(p.website_url);
    if (dom) domainMap.set(dom, p);
  }

  let matchedCount = 0;
  let provisionedCount = 0;
  let reviewsInserted = 0;
  let rankingsInserted = 0;

  for (const item of unified) {
    const kName = clean(item.name);
    const dom = getDomain(item.website);

    let profile = nameMap.get(kName) || keyMap.get(kName) || (dom ? domainMap.get(dom) : null);

    if (!profile) {
      // Provision Net-New Profile
      const autoId = `org_residency_${kName.slice(0, 30)}_${crypto.randomUUID().slice(0, 6)}`;
      const identityKey = `profile:residency_center:${item.name.toLowerCase()}`;
      
      // Derive city and country from location string
      let city = null;
      let country = "United States";
      let countryCode = "US";

      if (item.location) {
        const parts = item.location.split(",").map(s => s.trim());
        if (parts.length >= 2) {
          city = parts[0];
          const lastPart = parts[parts.length - 1];
          if (lastPart && !["United States", "USA", "US"].includes(lastPart)) {
            country = lastPart;
            countryCode = "INT";
          }
        }
      }

      const res = await client.query(`
        INSERT INTO gary_profiles (
          id, identity_key, canonical_key, profile_kind, name_key, name, website_url,
          country_code, country, city, identity_status, identity_confidence,
          first_seen_at, last_seen_at, created_at, updated_at
        ) VALUES ($1, $2, $2, 'residency_center', $3, $4, $5, $6, $7, $8, 'confirmed', 0.950, NOW(), NOW(), NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
        RETURNING id, name, name_key, website_url, profile_kind;
      `, [autoId, identityKey, item.name.toLowerCase().replace(/[^a-z0-9]+/g, "_"), item.name, item.website, countryCode, country, city]);

      profile = res.rows[0];
      nameMap.set(kName, profile);
      provisionedCount++;
    } else {
      matchedCount++;
      // Update website_url or location if missing
      if (!profile.website_url && item.website) {
        await client.query(`UPDATE gary_profiles SET website_url = $1 WHERE id = $2`, [item.website, profile.id]);
      }
    }

    // Insert community reviews if present
    if (item.reviews && item.reviews.length > 0) {
      for (const rev of item.reviews) {
        const reviewId = `rev_${crypto.randomUUID().replace(/-/g, "")}`;
        await client.query(`
          INSERT INTO missa_residency_reviews (
            id, profile_id, author_name, review_title, review_body, rating_score, date_published, source
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'ratemyartistresidency.com')
          ON CONFLICT (id) DO NOTHING;
        `, [reviewId, profile.id, rev.author, rev.name || "Resident Review", rev.body, rev.rating, rev.date]);
        reviewsInserted++;
      }
    }

    // Compute Missa Residency Index (MRI) Composite Score (0–100)
    // 1. Funding Score (Max 35): Free/Subsidized (25 pts), Stipend (10 pts)
    const isFree = Boolean(item.acaStewardship?.isFree || item.callInfo?.price === 0 || ["macdowell", "yaddo", "ucross", "fine-arts-work-center", "hedgebrook"].some(k => item.slug?.includes(k)));
    const hasStipend = Boolean(item.acaStewardship?.hasStipend || ["fine-arts-work-center", "macdowell", "headlands"].some(k => item.slug?.includes(k)));
    const fundingScore = (isFree ? 25 : 5) + (hasStipend ? 10 : 0);

    // 2. Community Rating Score (Max 30): RMAR Rating normalized to 30 pts
    let ratingScore = 18; // baseline neutral
    if (item.rmarRating != null) {
      ratingScore = Math.min(30, Math.round((item.rmarRating / 5.0) * 30 * 10) / 10);
    }

    // 3. Facilities & Solitude Score (Max 20): Meals (10 pts), Private Studio (10 pts)
    const hasMeals = Boolean(item.acaStewardship?.hasMeals || ["macdowell", "yaddo", "ucross", "vcca"].some(k => item.slug?.includes(k)));
    const hasPrivateStudio = Boolean(item.acaStewardship?.hasPrivateStudio || true);
    const facilitiesScore = (hasMeals ? 10 : 4) + (hasPrivateStudio ? 10 : 6);

    // 4. Access & Prestige Score (Max 15): Longevity (5 pts), Verified Multi-Source (5 pts), Open Call Active (5 pts)
    const accessScore = 5 + (item.sources?.length > 1 ? 5 : 0) + (item.callInfo ? 5 : 2);

    const totalScore = Math.min(100, fundingScore + ratingScore + facilitiesScore + accessScore);

    let prestigeTier = "Tier 3 (Emerging & Regional)";
    if (totalScore >= 80) prestigeTier = "Tier 1 (Flagship Fellowship)";
    else if (totalScore >= 65) prestigeTier = "Tier 2 (High Distinction)";

    const foundingYear = item.foundingDate ? parseInt(item.foundingDate, 10) : null;

    await client.query(`
      INSERT INTO missa_residency_rankings (
        profile_id, prestige_tier, total_score, funding_score, rating_score, facilities_score, access_score,
        rmar_rating, rmar_ratings_count, rmar_reviews_count, is_fully_funded, has_stipend, has_meals,
        has_private_studio, disciplines, founding_year, location, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
      ON CONFLICT (profile_id) DO UPDATE SET
        prestige_tier = EXCLUDED.prestige_tier,
        total_score = EXCLUDED.total_score,
        rmar_rating = EXCLUDED.rmar_rating,
        rmar_ratings_count = EXCLUDED.rmar_ratings_count,
        rmar_reviews_count = EXCLUDED.rmar_reviews_count,
        is_fully_funded = EXCLUDED.is_fully_funded,
        has_stipend = EXCLUDED.has_stipend,
        has_meals = EXCLUDED.has_meals,
        location = EXCLUDED.location,
        updated_at = NOW();
    `, [
      profile.id,
      prestigeTier,
      totalScore,
      fundingScore,
      ratingScore,
      facilitiesScore,
      accessScore,
      item.rmarRating,
      item.rmarRatingsCount || 0,
      item.rmarReviewsCount || (item.reviews?.length || 0),
      isFree,
      hasStipend,
      hasMeals,
      hasPrivateStudio,
      item.acaDisciplines || "Multidisciplinary, Literature, Visual Arts",
      foundingYear,
      item.location || profile.city || profile.country || "United States",
    ]);

    rankingsInserted++;
  }

  console.log("\n=== Enrichment & Provisioning Summary ===");
  console.log("Matched & Enriched Existing Missa Profiles:", matchedCount);
  console.log("Provisioned Net-New Canonical Profiles:", provisionedCount);
  console.log("Inserted Community Resident Reviews:", reviewsInserted);
  console.log("Computed & Stored Residency Rankings (MRI):", rankingsInserted);

  await client.end();
}

run().catch(console.error);
