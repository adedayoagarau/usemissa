/**
 * High-performance batched database content sanitization script:
 * Permanently cleans HTML entities (&#160;, &#183;, &amp;, &quot;, &apos;, etc.),
 * repairs spaced crawler headers ("O U R  T A S T E B U D S :"), and normalizes
 * formatting across PostgreSQL tables:
 *   1. opportunity_contents (content->>'description', content->>'summary')
 *   2. opportunities (title, search_document)
 *   3. radar_organizations (data->>'biography', data->>'description')
 */

import { Pool } from "pg";
import { cleanCrawledText, cleanTitleOrLabel, decodeHtmlEntities } from "../cleanText.js";

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
});

const BATCH_SIZE = 100;

function recursivelySanitize(
  obj: unknown,
  keyContext?: string,
): { value: unknown; modified: boolean } {
  if (typeof obj === "string") {
    let cleaned: string;
    if (keyContext && /^(?:title|name|label|sourceName)$/i.test(keyContext)) {
      cleaned = cleanTitleOrLabel(obj);
    } else if (keyContext && /^(?:sourceUrl|url|applyUrl|website|link)$/i.test(keyContext)) {
      cleaned = decodeHtmlEntities(obj).trim();
    } else {
      cleaned = cleanCrawledText(obj);
    }
    return { value: cleaned, modified: cleaned !== obj };
  }

  if (Array.isArray(obj)) {
    let arrayModified = false;
    const newArr = obj.map((item) => {
      const res = recursivelySanitize(item, keyContext);
      if (res.modified) arrayModified = true;
      return res.value;
    });
    return { value: arrayModified ? newArr : obj, modified: arrayModified };
  }

  if (obj && typeof obj === "object") {
    let objModified = false;
    const newObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const res = recursivelySanitize(v, k);
      if (res.modified) objModified = true;
      newObj[k] = res.value;
    }
    return { value: objModified ? newObj : obj, modified: objModified };
  }

  return { value: obj, modified: false };
}

async function sanitizeOpportunityContents() {
  console.log("=== Sanitizing opportunity_contents ===");
  const res = await pool.query(`
    select opportunity_id, content
    from opportunity_contents
    where content::text ~ '&[a-zA-Z0-9#]+;'
       or content::text ~ '([A-Z]\\s+){2,}[A-Z]\\s*:'
       or content::text ~ '\\u00a0';
  `);
  console.log(`Found ${res.rows.length} opportunity_contents rows needing cleanup.`);

  const updates: Array<{ id: string; content: string }> = [];
  for (const row of res.rows) {
    if (!row.content || typeof row.content !== "object") continue;
    const { value, modified } = recursivelySanitize(row.content);
    if (modified) {
      updates.push({ id: row.opportunity_id, content: JSON.stringify(value) });
    }
  }

  console.log(`Prepared ${updates.length} rows to update in opportunity_contents.`);

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const chunk = updates.slice(i, i + BATCH_SIZE);
    const ids = chunk.map((c) => c.id);
    const contents = chunk.map((c) => c.content);

    await pool.query(
      `
      update opportunity_contents as oc
      set content = u.content::jsonb, updated_at = now()
      from (
        select unnest($1::text[]) as id, unnest($2::text[]) as content
      ) as u
      where oc.opportunity_id = u.id;
      `,
      [ids, contents],
    );
    process.stdout.write(`Updated ${Math.min(i + BATCH_SIZE, updates.length)} / ${updates.length}\r`);
  }
  console.log(`\nSuccessfully updated ${updates.length} rows in opportunity_contents.`);
}

async function sanitizeOpportunities() {
  console.log("\n=== Sanitizing opportunities (titles & search_documents) ===");
  const res = await pool.query(`
    select id, title, search_document
    from opportunities
    where title ~ '&[a-zA-Z0-9#]+;'
       or title ~ '\\u00a0'
       or search_document ~ '&[a-zA-Z0-9#]+;'
       or search_document ~ '([A-Z]\\s+){2,}[A-Z]\\s*:'
       or search_document ~ '\\u00a0';
  `);
  console.log(`Found ${res.rows.length} opportunities needing cleanup.`);

  const updates: Array<{ id: string; title: string; searchDoc: string | null }> = [];
  for (const row of res.rows) {
    const cleanTitle = cleanTitleOrLabel(row.title);
    const cleanDoc = row.search_document ? cleanCrawledText(row.search_document) : null;

    if (cleanTitle !== row.title || cleanDoc !== row.search_document) {
      updates.push({ id: row.id, title: cleanTitle, searchDoc: cleanDoc });
    }
  }

  console.log(`Prepared ${updates.length} rows to update in opportunities.`);

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const chunk = updates.slice(i, i + BATCH_SIZE);
    const ids = chunk.map((c) => c.id);
    const titles = chunk.map((c) => c.title);
    const docs = chunk.map((c) => c.searchDoc);

    await pool.query(
      `
      update opportunities as o
      set title = u.title, search_document = u.search_doc
      from (
        select unnest($1::text[]) as id, unnest($2::text[]) as title, unnest($3::text[]) as search_doc
      ) as u
      where o.id = u.id;
      `,
      [ids, titles, docs],
    );
    process.stdout.write(`Updated ${Math.min(i + BATCH_SIZE, updates.length)} / ${updates.length}\r`);
  }
  console.log(`\nSuccessfully updated ${updates.length} rows in opportunities.`);
}

async function sanitizeRadarOrganizations() {
  console.log("\n=== Sanitizing radar_organizations ===");
  const res = await pool.query(`
    select id, data
    from radar_organizations
    where data::text ~ '&[a-zA-Z0-9#]+;'
       or data::text ~ '\\u00a0';
  `);
  console.log(`Found ${res.rows.length} radar_organizations needing cleanup.`);

  const updates: Array<{ id: string; data: string }> = [];
  for (const row of res.rows) {
    if (!row.data || typeof row.data !== "object") continue;
    const { value, modified } = recursivelySanitize(row.data);
    if (modified) {
      updates.push({ id: row.id, data: JSON.stringify(value) });
    }
  }

  console.log(`Prepared ${updates.length} rows to update in radar_organizations.`);

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const chunk = updates.slice(i, i + BATCH_SIZE);
    const ids = chunk.map((c) => c.id);
    const dataList = chunk.map((c) => c.data);

    await pool.query(
      `
      update radar_organizations as ro
      set data = u.data::jsonb, updated_at = now()
      from (
        select unnest($1::text[]) as id, unnest($2::text[]) as data
      ) as u
      where ro.id = u.id;
      `,
      [ids, dataList],
    );
    process.stdout.write(`Updated ${Math.min(i + BATCH_SIZE, updates.length)} / ${updates.length}\r`);
  }
  console.log(`\nSuccessfully updated ${updates.length} rows in radar_organizations.`);
}

async function run() {
  try {
    await sanitizeOpportunityContents();
    await sanitizeOpportunities();
    await sanitizeRadarOrganizations();
    console.log("\nAll database content sanitization complete.");
  } catch (err) {
    console.error("Error during content sanitization:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
