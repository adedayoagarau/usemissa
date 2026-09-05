import pg from 'pg';

const { Client } = pg;

async function run() {
  const isDryRun = process.argv.includes('--dry-run');

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required to run diversity opportunity enrichment.');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('=== OPPORTUNITY DIVERSITY & IDENTITY ENRICHMENT ===');
    console.log(`Mode: ${isDryRun ? 'DRY-RUN (Preview changes)' : 'PERSIST (Updating Neon DB)'}\n`);

    const query = `
      SELECT o.id, o.title, coalesce(o.genres, '{}') as genres, o.search_document,
             p.name as org_name, obs.source_summary as org_summary
      FROM opportunities o
      LEFT JOIN gary_profiles p ON p.id = o.organization_id
      LEFT JOIN (
        SELECT DISTINCT ON (profile_id) profile_id, source_summary 
        FROM gary_profile_observations 
        ORDER BY profile_id, observed_at DESC
      ) obs ON obs.profile_id = p.id
      ORDER BY o.title ASC
    `;

    const res = await client.query(query);
    console.log(`Evaluated ${res.rows.length} total opportunities in database.`);

    const updates = [];
    const stats = {
      lgbtq: 0,
      bipoc: 0,
      women: 0,
      disability: 0,
      totalEnriched: 0
    };

    for (const opp of res.rows) {
      const combined = [
        opp.title,
        opp.search_document,
        opp.org_name,
        opp.org_summary
      ].filter(Boolean).join(' ').toLowerCase();

      const existing = new Set(opp.genres);
      const toAdd = new Set();

      // Normalize any lowercase or variant tags already present
      if (existing.has('lgbtq') || existing.has('lgbtqia') || existing.has('queer')) {
        toAdd.add('LGBTQ+');
        toAdd.add('Queer');
      }
      if (existing.has('bipoc') || existing.has('writers of color')) {
        toAdd.add('BIPOC');
        toAdd.add('Writers of Color');
      }
      if (existing.has('women') || existing.has('non-binary')) {
        toAdd.add('Women');
        toAdd.add('Non-Binary');
      }

      // LGBTQ+ / Queer
      if (/(lgbtq|\blgbt\b|\bqueer\b|transgender|\btrans writers\b|\btrans poets\b|\bgay writers\b|\blesbian\b|\btwo-spirit\b|\btransfeminist\b)/i.test(combined)) {
        toAdd.add('LGBTQ+');
        toAdd.add('Queer');
      }

      // BIPOC / Writers of Color
      if (/(bipoc|\bblack writers\b|\bblack poets\b|\bindigenous writers\b|\bindigenous poets\b|\bwriters of color\b|\bpoets of color\b|\bfirst nations\b|\bnative american\b|\baapi\b|\basian american\b|\blatinx\b|\blatino writers\b|\blatina writers\b)/i.test(combined)) {
        toAdd.add('BIPOC');
        toAdd.add('Writers of Color');
      }

      // Women / Non-Binary
      if (/(\bwomen writers\b|\bwomen poets\b|\bwomen-only\b|\bnon-binary\b|\bfemale-identifying\b|\bwoman-identifying\b|\bfeminist\b)/i.test(combined)) {
        toAdd.add('Women');
        toAdd.add('Non-Binary');
      }

      // Disability / Neurodivergent
      if (/(\bdisabled writers\b|\bdisabled artists\b|\bdisability\b|\bneurodivergent\b|\bdeaf writers\b|\bblind writers\b|\bchronic illness\b)/i.test(combined)) {
        toAdd.add('Disability');
        toAdd.add('Neurodivergent');
      }

      // Emerging Writers / First Book
      if (/(\bemerging writers\b|\bemerging poets\b|\bfirst book\b|\bdebut collection\b|\bdebut novel\b|\bfirst chapbook\b)/i.test(combined)) {
        toAdd.add('Emerging');
      }

      const additions = Array.from(toAdd).filter(tag => !existing.has(tag));
      if (additions.length > 0) {
        if (additions.includes('LGBTQ+')) stats.lgbtq++;
        if (additions.includes('BIPOC')) stats.bipoc++;
        if (additions.includes('Women')) stats.women++;
        if (additions.includes('Disability')) stats.disability++;
        if (additions.includes('Emerging')) stats.emerging = (stats.emerging || 0) + 1;
        stats.totalEnriched++;

        const merged = Array.from(new Set([...opp.genres, ...additions]));
        updates.push({ id: opp.id, title: opp.title, additions, newGenres: merged });
      }
    }

    console.log(`Found ${updates.length} opportunities needing diversity tag enrichment.`);
    console.log(` - LGBTQ+ / Queer additions: ${stats.lgbtq}`);
    console.log(` - BIPOC / Writers of Color additions: ${stats.bipoc}`);
    console.log(` - Women / Non-Binary additions: ${stats.women}`);
    console.log(` - Disability / Neurodivergent additions: ${stats.disability}\n`);

    if (!isDryRun && updates.length > 0) {
      console.log('Persisting updates to database in transactions...');
      await client.query('BEGIN');
      for (const u of updates) {
        await client.query(
          'UPDATE opportunities SET genres = $1, updated_at = now() WHERE id = $2',
          [u.newGenres, u.id]
        );
      }
      await client.query('COMMIT');
      console.log('✓ Successfully committed diversity tag updates.');
    } else if (isDryRun) {
      console.log('Dry run complete. No database changes were made.');
    }

    // Verify current state of diversity counts
    const counts = await client.query(`
      SELECT unnest(genres) as tag, count(*) as opp_count
      FROM opportunities
      WHERE genres && ARRAY['LGBTQ+', 'Queer', 'BIPOC', 'Writers of Color', 'Women', 'Non-Binary', 'Disability', 'Neurodivergent']
      GROUP BY tag
      ORDER BY opp_count DESC
    `);
    console.log('\nCurrent Diversity Tag Totals Across All Opportunities:');
    console.table(counts.rows);

  } finally {
    await client.end();
  }
}

run().catch(err => {
  console.error('Fatal error during diversity enrichment:', err);
  process.exit(1);
});
