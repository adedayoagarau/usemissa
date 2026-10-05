#!/usr/bin/env node
/**
 * Proposes values for database fields that are empty, "unknown" or free text,
 * by asking Jev the database question set (@missa/decisions sets/database).
 * Every answer is recorded in data_decisions; no data table is written.
 *
 * Decisions run in shadow unless DECISIONS_MODE_DATABASE_BACKFILL=live. Only
 * live rows routed to apply can later be written, by
 * scripts/jev-apply-decisions.mjs. Without JEV_API_KEY nothing is asked and
 * the script reports how many records each question would cover.
 *
 * Usage:
 *   node scripts/jev-propose-backfills.mjs [--question=<task>[,<task>]]
 *     [--limit=200] [--dry-run]
 *
 * Tasks: country, payment_type, eligibility_rule_key, prestige_tier,
 * editorial_archetype, profile_kind, media_candidate_kind,
 * media_surface_kind, taxonomy_phrase.
 * --dry-run asks Jev (when configured) but records into memory, not Postgres.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { CANONICAL_COUNTRIES, COUNTRY_ALIASES } from "@missa/contracts";
import {
  DATABASE_DECISION_SCOPE,
  EDITORIAL_ARCHETYPES,
  ELIGIBILITY_RULE_KEYS,
  countryQuestion,
  countryState,
  createMemoryDecisionLedger,
  createPostgresDecisionLedger,
  decide,
  decisionModeFromEnv,
  editorialArchetype,
  editorialArchetypeState,
  eligibilityRuleKey,
  eligibilityRuleState,
  findCountryCandidates,
  isCanonicalEligibilityRuleKey,
  jevClientFromEnv,
  mediaCandidateKind,
  mediaCandidateState,
  mediaSurfaceKind,
  mediaSurfaceState,
  normalizePaymentTypeText,
  paymentTypeNormalisation,
  paymentTypeState,
  prestigeTier,
  prestigeTierState,
  profileKind,
  profileKindState,
  taxonomyPhraseState,
  taxonomyPhraseSubjectId,
  taxonomyQuestion,
} from "@missa/decisions";
import {
  normalizeTaxonomyPhrase,
  resolveTaxonomyPhrase,
} from "@missa/taxonomy";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function readDatabaseUrl() {
  if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL.trim();
  try {
    const env = readFileSync(join(repoRoot, ".env.local"), "utf8");
    const match = env.match(/^DATABASE_URL\s*=\s*(.*)$/m);
    if (match?.[1]) return match[1].trim().replace(/^["']|["']$/g, "");
  } catch {
    // fall through
  }
  throw new Error("DATABASE_URL missing from env or .env.local");
}

function argValue(name) {
  const prefix = `--${name}=`;
  return process.argv
    .find((arg) => arg.startsWith(prefix))
    ?.slice(prefix.length);
}

const dryRun = process.argv.includes("--dry-run");
const limit = Math.max(
  1,
  Math.min(5000, Number(argValue("limit") ?? 200) || 200),
);
const canonicalRuleKeys = Object.keys(ELIGIBILITY_RULE_KEYS).filter(
  isCanonicalEligibilityRuleKey,
);

/**
 * Each task selects records whose field is empty, unknown or free text, and
 * turns one row into one decide() call: subject id, compact state and the
 * questions to ask. A task returns null for a row it should not ask about.
 */
const TASKS = {
  country: {
    sql: `SELECT o.id, o.title, o.location, o.guidelines_url,
                 org.data->>'name' AS organization_name,
                 org.data->>'country' AS organization_country,
                 org.data->>'city' AS organization_city,
                 profile.country_code AS profile_country_code,
                 profile.country AS profile_country,
                 profile.city AS profile_city
            FROM opportunities o
            LEFT JOIN radar_organizations org ON org.id = o.organization_id
            LEFT JOIN LATERAL (
              SELECT gp.country_code, gp.country, gp.city
                FROM opportunity_profile_links link
                JOIN gary_profiles gp ON gp.id = link.profile_id
               WHERE link.opportunity_id = o.id AND link.status = 'confirmed'
               ORDER BY link.confidence DESC
               LIMIT 1
            ) profile ON true
           WHERE o.country_code IS NULL
           ORDER BY o.id
           LIMIT $1`,
    build(row) {
      const candidates = findCountryCandidates({
        texts: [
          { label: "location", text: row.location },
          { label: "organizationCountry", text: row.organization_country },
          { label: "organizationCity", text: row.organization_city },
          { label: "profileCountry", text: row.profile_country },
          { label: "profileCity", text: row.profile_city },
        ],
        codes: [
          { label: "profileCountryCode", code: row.profile_country_code },
        ],
        countries: CANONICAL_COUNTRIES,
        aliases: COUNTRY_ALIASES,
      });
      const question = countryQuestion(candidates);
      if (!question) return null;
      return {
        subjectId: row.id,
        evidenceUrl: row.guidelines_url,
        questions: [question],
        state: countryState({
          title: row.title,
          location: row.location,
          organizationName: row.organization_name,
          organizationCountry: row.organization_country ?? row.profile_country,
          organizationCity: row.organization_city ?? row.profile_city,
          sourceUrl: row.guidelines_url,
          candidates,
        }),
      };
    },
  },
  payment_type: {
    sql: `SELECT p.opportunity_id, p.metadata->>'payment_type_previous' AS raw,
                 p.payment_amount_cents, p.payment_currency, p.source_url, o.title
            FROM opportunity_call_profiles p
            JOIN opportunities o ON o.id = p.opportunity_id
           WHERE p.payment_type = 'unknown' AND p.metadata ? 'payment_type_previous'
           ORDER BY p.opportunity_id
           LIMIT $1`,
    build(row) {
      if (!row.raw || normalizePaymentTypeText(row.raw) !== null) return null;
      return {
        subjectId: row.opportunity_id,
        evidenceUrl: row.source_url,
        questions: [paymentTypeNormalisation],
        state: paymentTypeState({
          rawPaymentType: row.raw,
          paymentAmountCents: row.payment_amount_cents,
          paymentCurrency: row.payment_currency,
          title: row.title,
        }),
      };
    },
  },
  eligibility_rule_key: {
    sql: `SELECT r.id, r.rule_key, r.description, r.value
            FROM opportunity_eligibility_rules r
           WHERE NOT (r.rule_key = ANY($2::text[]))
           ORDER BY r.id
           LIMIT $1`,
    params: [canonicalRuleKeys],
    build(row) {
      return {
        subjectId: row.id,
        questions: [eligibilityRuleKey],
        state: eligibilityRuleState({
          ruleKey: row.rule_key,
          description: row.description,
          value: row.value,
        }),
      };
    },
  },
  prestige_tier: {
    sql: `SELECT i.profile_id, i.prestige_tier, gp.name
            FROM gary_profile_intelligence i
            JOIN gary_profiles gp ON gp.id = i.profile_id
           ORDER BY i.profile_id
           LIMIT $1`,
    build(row) {
      return {
        subjectId: row.profile_id,
        questions: [prestigeTier],
        state: prestigeTierState({
          label: row.prestige_tier,
          profileName: row.name,
        }),
      };
    },
  },
  editorial_archetype: {
    sql: `SELECT i.profile_id, i.editorial_archetype, gp.name, gp.profile_kind,
                 gp.website_url
            FROM gary_profile_intelligence i
            JOIN gary_profiles gp ON gp.id = i.profile_id
           WHERE NOT (i.editorial_archetype = ANY($2::text[]))
           ORDER BY i.profile_id
           LIMIT $1`,
    params: [
      Object.keys(EDITORIAL_ARCHETYPES).filter((key) => key !== "unspecified"),
    ],
    build(row) {
      return {
        subjectId: row.profile_id,
        evidenceUrl: row.website_url,
        questions: [editorialArchetype],
        state: editorialArchetypeState({
          label: row.editorial_archetype,
          profileName: row.name,
          profileKind: row.profile_kind,
          websiteUrl: row.website_url,
        }),
      };
    },
  },
  profile_kind: {
    sql: `SELECT gp.id, gp.name, gp.website_url, i.editorial_archetype,
                 calls.titles, calls.types
            FROM gary_profiles gp
            LEFT JOIN gary_profile_intelligence i ON i.profile_id = gp.id
            LEFT JOIN LATERAL (
              SELECT array_agg(o.title ORDER BY o.created_at DESC) AS titles,
                     array_agg(o.type ORDER BY o.created_at DESC) AS types
                FROM (
                  SELECT o.title, o.type, o.created_at
                    FROM opportunity_profile_links link
                    JOIN opportunities o ON o.id = link.opportunity_id
                   WHERE link.profile_id = gp.id AND link.status = 'confirmed'
                   ORDER BY o.created_at DESC
                   LIMIT 5
                ) o
            ) calls ON true
           WHERE gp.profile_kind = 'organization'
           ORDER BY gp.id
           LIMIT $1`,
    build(row) {
      return {
        subjectId: row.id,
        evidenceUrl: row.website_url,
        questions: [profileKind],
        state: profileKindState({
          name: row.name,
          websiteUrl: row.website_url,
          archetype: row.editorial_archetype,
          opportunityTitles: row.titles ?? [],
          opportunityTypes: row.types ?? [],
        }),
      };
    },
  },
  media_candidate_kind: {
    sql: `SELECT c.id, c.resolved_url, c.page_url, c.source_role, c.alt, c.caption,
                 c.title, c.width, c.height, c.mime_type,
                 o.title AS opportunity_title, org.data->>'name' AS organization_name
            FROM opportunity_media_candidates c
            JOIN opportunities o ON o.id = c.opportunity_id
            LEFT JOIN radar_organizations org ON org.id = o.organization_id
           WHERE c.candidate_kind = 'unknown'
           ORDER BY c.id
           LIMIT $1`,
    build(row) {
      return {
        subjectId: row.id,
        evidenceUrl: row.page_url,
        questions: [mediaCandidateKind],
        state: mediaCandidateState({
          url: row.resolved_url,
          pageUrl: row.page_url,
          sourceRole: row.source_role,
          alt: row.alt,
          caption: row.caption,
          title: row.title,
          width: row.width,
          height: row.height,
          mimeType: row.mime_type,
          opportunityTitle: row.opportunity_title,
          organizationName: row.organization_name,
        }),
      };
    },
  },
  media_surface_kind: {
    sql: `SELECT a.id, a.url, a.alt, a.kind, a.width, a.height, a.source_url,
                 a.inheritance_level,
                 COALESCE(a.metadata->>'candidateKind', a.metadata->>'candidate_kind') AS candidate_kind
            FROM opportunity_identity_assets a
           WHERE a.kind IN ('hero', 'opportunity-cover')
           ORDER BY a.id
           LIMIT $1`,
    build(row) {
      return {
        subjectId: row.id,
        evidenceUrl: row.source_url,
        questions: [mediaSurfaceKind],
        state: mediaSurfaceState({
          url: row.url,
          alt: row.alt,
          storedKind: row.kind,
          candidateKind: row.candidate_kind,
          width: row.width,
          height: row.height,
          sourceUrl: row.source_url,
          inheritanceLevel: row.inheritance_level,
        }),
      };
    },
  },
  taxonomy_phrase: {
    sql: `SELECT t.opportunity_id, t.source_phrase, o.title, o.type,
                 array_agg(DISTINCT t.term_id) AS term_ids
            FROM opportunity_taxonomy_terms t
            JOIN opportunities o ON o.id = t.opportunity_id
           WHERE t.certainty = 'inferred' AND t.source_phrase IS NOT NULL
           GROUP BY t.opportunity_id, t.source_phrase, o.title, o.type
           ORDER BY t.opportunity_id, t.source_phrase
           LIMIT $1`,
    build(row) {
      const resolution = resolveTaxonomyPhrase(row.source_phrase);
      if (resolution.status !== "ambiguous") return null;
      const question = taxonomyQuestion(resolution.candidates);
      if (!question) return null;
      return {
        subjectId: taxonomyPhraseSubjectId(
          row.opportunity_id,
          normalizeTaxonomyPhrase(row.source_phrase),
        ),
        questions: [question],
        state: taxonomyPhraseState({
          sourcePhrase: row.source_phrase,
          opportunityTitle: row.title,
          opportunityType: row.type,
          otherTerms: row.term_ids ?? [],
        }),
      };
    },
  },
};

async function main() {
  const requested =
    argValue("question")
      ?.split(",")
      .map((key) => key.trim())
      .filter(Boolean) ?? Object.keys(TASKS);
  const unknown = requested.filter((key) => !Object.hasOwn(TASKS, key));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown task: ${unknown.join(", ")}. Tasks: ${Object.keys(TASKS).join(", ")}`,
    );
  }

  const client = jevClientFromEnv();
  const mode = decisionModeFromEnv(DATABASE_DECISION_SCOPE);
  const pool = new pg.Pool({ connectionString: readDatabaseUrl(), max: 2 });
  const ledger = dryRun
    ? createMemoryDecisionLedger()
    : createPostgresDecisionLedger(pool);
  console.log(
    `=== Jev database proposals (${mode}${dryRun ? ", dry run" : ""}${client.available ? "" : ", Jev not configured"}) ===`,
  );

  try {
    for (const key of requested) {
      const task = TASKS[key];
      const { rows } = await pool.query(task.sql, [
        limit,
        ...(task.params ?? []),
      ]);
      const counts = {
        selected: rows.length,
        asked: 0,
        apply: 0,
        review: 0,
        reject: 0,
        unavailable: 0,
        errors: 0,
      };
      for (const row of rows) {
        const decision = task.build(row);
        if (!decision) continue;
        counts.asked += 1;
        if (!client.available) continue;
        const result = await decide({
          client,
          ledger,
          mode,
          subjectId: decision.subjectId,
          state: decision.state,
          questions: decision.questions,
          evidenceUrl: decision.evidenceUrl ?? null,
        });
        if (result.error) {
          counts.errors += 1;
          console.warn(`  ${key} ${decision.subjectId}: ${result.error}`);
        }
        for (const outcome of Object.values(result.outcomes))
          counts[outcome.route] += 1;
      }
      console.log(
        `${key}: ${client.available ? "" : "would ask "}${JSON.stringify(counts)}`,
      );
    }
    if (dryRun && client.available) {
      console.log(
        `Recorded in memory only: ${ledger.records.length} decisions`,
      );
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
