import pg from "pg";
import {
  MISSA_TAXONOMY,
  validateTaxonomyCatalog,
} from "@missa/taxonomy";

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed the Missa taxonomy");
}

const validation = validateTaxonomyCatalog(MISSA_TAXONOMY);
if (!validation.valid) {
  throw new Error(`Taxonomy is invalid:\n${validation.errors.join("\n")}`);
}

function normalizeLabel(value) {
  return value
    .normalize("NFKD")
    .toLocaleLowerCase("en")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

async function upsert(client, sql, values) {
  await client.query(sql, values);
}

const client = new Client({ connectionString: databaseUrl });
await client.connect();

try {
  await client.query("begin");

  await upsert(
    client,
    `insert into taxonomy_schemes
       (id, key, label, description, version, status, updated_at)
     values ($1, $2, $3, $4, $5, 'draft', now())
     on conflict (id) do update set
       key = excluded.key,
       label = excluded.label,
       description = excluded.description,
       version = excluded.version,
       updated_at = now()`,
    [
      MISSA_TAXONOMY.scheme.id,
      MISSA_TAXONOMY.scheme.key,
      MISSA_TAXONOMY.scheme.label,
      MISSA_TAXONOMY.scheme.description,
      MISSA_TAXONOMY.scheme.version,
    ],
  );

  for (const facet of MISSA_TAXONOMY.facets) {
    await upsert(
      client,
      `insert into taxonomy_facets
         (id, scheme_id, key, label, description, selection_mode, user_visible, sort_order, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, now())
       on conflict (id) do update set
         key = excluded.key,
         label = excluded.label,
         description = excluded.description,
         selection_mode = excluded.selection_mode,
         user_visible = excluded.user_visible,
         sort_order = excluded.sort_order,
         updated_at = now()`,
      [
        facet.id,
        MISSA_TAXONOMY.scheme.id,
        facet.key,
        facet.label,
        facet.description,
        facet.selectionMode,
        facet.userVisible,
        facet.sortOrder,
      ],
    );
  }

  const facetIds = new Map(
    MISSA_TAXONOMY.facets.map((facet) => [facet.key, facet.id]),
  );
  for (const term of MISSA_TAXONOMY.terms) {
    await upsert(
      client,
      `insert into taxonomy_terms
         (id, facet_id, slug, preferred_label, description, status,
          selectable, culturally_sensitive, updated_at)
       values ($1, $2, $3, $4, $5, 'active', $6, $7, now())
       on conflict (id) do update set
         facet_id = excluded.facet_id,
         slug = excluded.slug,
         preferred_label = excluded.preferred_label,
         description = excluded.description,
         selectable = excluded.selectable,
         culturally_sensitive = excluded.culturally_sensitive,
         updated_at = now()`,
      [
        term.id,
        facetIds.get(term.facet),
        term.slug,
        term.preferredLabel,
        term.description ?? null,
        term.selectable,
        term.culturallySensitive,
      ],
    );

    const labels = [
      { value: term.preferredLabel, kind: "preferred" },
      ...term.aliases.map((value) => ({ value, kind: "alias" })),
    ];
    for (const label of labels) {
      await upsert(
        client,
        `insert into taxonomy_term_labels
           (term_id, language_code, label, normalized_label, kind)
         values ($1, 'en', $2, $3, $4)
         on conflict (term_id, language_code, normalized_label) do update set
           label = excluded.label,
           kind = excluded.kind`,
        [term.id, label.value, normalizeLabel(label.value), label.kind],
      );
    }

    const legacyValues = new Set([
      term.preferredLabel,
      term.slug,
      ...term.aliases,
    ]);
    for (const legacyValue of legacyValues) {
      await upsert(
        client,
        `insert into taxonomy_external_mappings
           (term_id, namespace, external_value, normalized_value,
            mapping_type, confidence, verified_at, updated_at)
         values ($1, 'legacy-value', $2, $3, $4, $5, now(), now())
         on conflict (namespace, normalized_value, term_id) do update set
           external_value = excluded.external_value,
           mapping_type = excluded.mapping_type,
           confidence = excluded.confidence,
           verified_at = now(),
           updated_at = now()`,
        [
          term.id,
          legacyValue,
          normalizeLabel(legacyValue),
          legacyValue === term.preferredLabel ? "exact" : "legacy",
          legacyValue === term.preferredLabel ? 100 : 90,
        ],
      );
    }

    await upsert(
      client,
      `insert into taxonomy_term_revisions
         (term_id, scheme_version, change_kind, snapshot, change_note)
       select $1, $2, 'created', $3::jsonb, 'Initial Missa taxonomy seed'
       where not exists (
         select 1 from taxonomy_term_revisions
         where term_id = $1 and scheme_version = $2 and change_kind = 'created'
       )`,
      [term.id, MISSA_TAXONOMY.scheme.version, JSON.stringify(term)],
    );
  }

  for (const term of MISSA_TAXONOMY.terms) {
    for (const broaderTermId of term.broaderTermIds) {
      await upsert(
        client,
        `insert into taxonomy_term_relations
           (subject_term_id, object_term_id, relation_type, weight)
         values ($1, $2, 'broader', 100)
         on conflict (subject_term_id, object_term_id, relation_type)
         do update set weight = excluded.weight`,
        [term.id, broaderTermId],
      );
    }
  }

  await client.query(
    `update opportunity_sources
     set canonical_url = coalesce(canonical_url, url),
         normalized_url = coalesce(normalized_url, url),
         updated_at = now()
     where canonical_url is null or normalized_url is null`,
  );

  const mappingRows = await client.query(
    `select term_id, normalized_value
     from taxonomy_external_mappings
     where namespace = 'legacy-value' and mapping_type in ('exact', 'legacy')`,
  );
  const termIdsByValue = new Map();
  for (const row of mappingRows.rows) {
    const termIds = termIdsByValue.get(row.normalized_value) ?? [];
    termIds.push(row.term_id);
    termIdsByValue.set(row.normalized_value, termIds);
  }

  const opportunityRows = await client.query(
    `select id, discipline, genres from opportunities`,
  );
  let opportunityAssignments = 0;
  for (const opportunity of opportunityRows.rows) {
    const values = [
      ...(opportunity.discipline
        ? [{ value: opportunity.discipline, primary: true }]
        : []),
      ...((opportunity.genres ?? []).map((value) => ({ value, primary: false }))),
    ];
    for (const { value, primary } of values) {
      for (const termId of termIdsByValue.get(normalizeLabel(value)) ?? []) {
        await upsert(
          client,
          `insert into opportunity_taxonomy_terms
             (opportunity_id, term_id, source_phrase, normalized_phrase,
              assignment_origin, certainty, "primary", updated_at)
           values ($1, $2, $3, $4, 'backfill', 'inferred', $5, now())
           on conflict (opportunity_id, term_id) do nothing`,
          [opportunity.id, termId, value, normalizeLabel(value), primary],
        );
        opportunityAssignments += 1;
      }
    }
  }

  const preferenceRows = await client.query(
    `select account_id, disciplines, genres from opportunity_preferences`,
  );
  let preferenceAssignments = 0;
  for (const preference of preferenceRows.rows) {
    for (const value of [
      ...(preference.disciplines ?? []),
      ...(preference.genres ?? []),
    ]) {
      for (const termId of termIdsByValue.get(normalizeLabel(value)) ?? []) {
        await upsert(
          client,
          `insert into account_taxonomy_preferences
             (account_id, term_id, preference, weight, origin, updated_at)
           values ($1, $2, 'include', 100, 'legacy-backfill', now())
           on conflict (account_id, term_id) do nothing`,
          [preference.account_id, termId],
        );
        preferenceAssignments += 1;
      }
    }
  }

  await client.query("commit");
  process.stdout.write(
    `${JSON.stringify({
      scheme: MISSA_TAXONOMY.scheme.key,
      version: MISSA_TAXONOMY.scheme.version,
      facets: MISSA_TAXONOMY.facets.length,
      terms: MISSA_TAXONOMY.terms.length,
      opportunityAssignments,
      preferenceAssignments,
    })}\n`,
  );
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  await client.end();
}
