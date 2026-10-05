/**
 * Shadow reading pass: asks Jev the reading questions about each published
 * opportunity's stored page text and records the answers in data_decisions.
 * It only reads opportunities; it never updates them. Recorded decisions are
 * always shadow, whatever DECISIONS_MODE says, until a reviewed apply step
 * exists.
 */
import {
  createPostgresDecisionLedger,
  decide,
  readingEvidenceLength,
  readingQuestions,
  readingStateFromOpportunity,
  type DecisionLedger,
  type JevClient,
  type Queryable,
  type QuestionDefinition,
  type ReadingState,
} from "@missa/decisions";

export interface ReadingCandidate {
  id: string;
  title: string;
  type: string | null;
  organizationName: string | null;
  pageText: string | null;
  pageUrl: string | null;
  guidelinesUrl: string | null;
  submissionUrl: string | null;
  sourceUrl: string | null;
  eligibility: Array<{ description?: string | null; value?: string | null }>;
  requiredMaterials: Array<{
    label?: string | null;
    description?: string | null;
  }>;
  eligibilitySummary: string | null;
  rightsSummary: string | null;
}

export interface ReadingCandidateQuery {
  /** Keyset cursor: only ids after this one. */
  afterId?: string | null;
  limit: number;
  /** Only opportunities changed at or after this time. */
  since?: string | null;
  ids?: string[] | null;
}

/** Snapshot text is kept to this many characters when loaded; the state builder trims further. */
const PAGE_TEXT_LOAD_LIMIT = 40_000;

async function hasSnapshotTable(db: Queryable): Promise<boolean> {
  const result = await db.query(
    "select to_regclass('public.radar_snapshots') is not null as present",
  );
  return Boolean(
    (result.rows[0] as { present?: boolean } | undefined)?.present,
  );
}

/**
 * Published opportunities with the text Missa stored about them: the fetched
 * page behind their latest version, eligibility rules, required materials and
 * call-profile summaries.
 */
export async function loadReadingCandidates(
  db: Queryable,
  query: ReadingCandidateQuery,
  options: { snapshots?: boolean } = {},
): Promise<ReadingCandidate[]> {
  const snapshots = options.snapshots ?? (await hasSnapshotTable(db));
  const result = await db.query(
    `select o.id, o.title, o.type,
       coalesce(org.data->>'name', v.fields->>'organizationName') as "organizationName",
       ${snapshots ? `left(snap.data->>'content', ${PAGE_TEXT_LOAD_LIMIT})` : "null::text"} as "pageText",
       ${snapshots ? "snap.data->>'url'" : "null::text"} as "pageUrl",
       o.guidelines_url as "guidelinesUrl", o.submission_url as "submissionUrl",
       s.url as "sourceUrl",
       coalesce((select json_agg(json_build_object('description', r.description, 'value', r.value) order by r.sort_order)
                 from opportunity_eligibility_rules r where r.opportunity_id = o.id), '[]'::json) as eligibility,
       coalesce((select json_agg(json_build_object('label', m.label, 'description', m.description) order by m.sort_order)
                 from opportunity_required_materials m where m.opportunity_id = o.id), '[]'::json) as "requiredMaterials",
       p.eligibility_summary as "eligibilitySummary", p.rights_summary as "rightsSummary"
     from opportunities o
     join opportunity_sources s on s.id = o.source_id
     left join radar_organizations org on org.id = o.organization_id
     left join opportunity_call_profiles p on p.opportunity_id = o.id
     left join lateral (
       select fields, source_snapshot_id from opportunity_versions
       where opportunity_id = o.id order by created_at desc, id desc limit 1
     ) v on true
     ${snapshots ? "left join radar_snapshots snap on snap.id = v.source_snapshot_id" : ""}
     where o.publication_state = 'published'
       and ($1::text is null or o.id > $1)
       and ($2::timestamptz is null or coalesce(o.last_changed_at, o.updated_at) >= $2)
       and ($3::text[] is null or o.id = any($3))
     order by o.id
     limit $4`,
    [
      query.afterId ?? null,
      query.since ?? null,
      query.ids && query.ids.length > 0 ? query.ids : null,
      Math.max(1, query.limit),
    ],
  );
  return result.rows as ReadingCandidate[];
}

export function readingInputFromCandidate(candidate: ReadingCandidate): {
  state: ReadingState;
  evidenceUrl: string | null;
} {
  const evidenceUrl =
    candidate.pageUrl ??
    candidate.guidelinesUrl ??
    candidate.submissionUrl ??
    candidate.sourceUrl ??
    null;
  const eligibility = [
    ...(candidate.eligibility ?? []),
    ...(candidate.eligibilitySummary
      ? [{ description: candidate.eligibilitySummary }]
      : []),
  ];
  const state = readingStateFromOpportunity({
    title: candidate.title,
    organizationName: candidate.organizationName,
    type: candidate.type,
    url: evidenceUrl,
    pageText: candidate.pageText,
    guidelines: candidate.rightsSummary,
    eligibility,
    requiredMaterials: candidate.requiredMaterials ?? [],
  });
  return { state, evidenceUrl };
}

export interface ReadingPassOptions {
  db: Queryable;
  client: JevClient;
  /** Defaults to data_decisions through `db`. */
  ledger?: DecisionLedger;
  /** Most opportunities to consider. Default 100. */
  limit?: number;
  batchSize?: number;
  since?: string | null;
  ids?: string[] | null;
  /** Build states and count them; no Jev calls and no writes. */
  dryRun?: boolean;
  /** Skip records with less evidence text than this. Default 200. */
  minEvidenceChars?: number;
  questions?: readonly QuestionDefinition[];
  log?: (line: string) => void;
}

export interface ReadingPassSummary {
  dryRun: boolean;
  considered: number;
  skippedThinText: number;
  decided: number;
  failed: number;
  recordedAnswers: number;
  stateChars: { total: number; max: number };
  routes: Record<string, Record<string, number>>;
  answers: Record<string, Record<string, number>>;
  errors: Array<{ opportunityId: string; error: string }>;
}

function bump(
  table: Record<string, Record<string, number>>,
  key: string,
  value: string,
) {
  const row = (table[key] ??= {});
  row[value] = (row[value] ?? 0) + 1;
}

export async function runReadingPass(
  options: ReadingPassOptions,
): Promise<ReadingPassSummary> {
  const dryRun = options.dryRun ?? false;
  const limit = Math.max(0, options.limit ?? 100);
  const batchSize = Math.max(1, Math.min(options.batchSize ?? 50, 500));
  const minEvidence = options.minEvidenceChars ?? 200;
  const questions = [...(options.questions ?? readingQuestions)];
  const ledger = dryRun
    ? undefined
    : (options.ledger ?? createPostgresDecisionLedger(options.db));
  const log = options.log ?? (() => {});
  const snapshots = await hasSnapshotTable(options.db);
  if (!snapshots)
    log("radar_snapshots is missing: reading stored rules and summaries only.");

  const summary: ReadingPassSummary = {
    dryRun,
    considered: 0,
    skippedThinText: 0,
    decided: 0,
    failed: 0,
    recordedAnswers: 0,
    stateChars: { total: 0, max: 0 },
    routes: {},
    answers: {},
    errors: [],
  };

  let afterId: string | null = null;
  while (summary.considered < limit) {
    const batch = await loadReadingCandidates(
      options.db,
      {
        afterId,
        limit: Math.min(batchSize, limit - summary.considered),
        since: options.since,
        ids: options.ids,
      },
      { snapshots },
    );
    if (batch.length === 0) break;
    afterId = batch[batch.length - 1]!.id;

    for (const candidate of batch) {
      summary.considered += 1;
      const { state, evidenceUrl } = readingInputFromCandidate(candidate);
      const evidence = readingEvidenceLength(state);
      if (evidence < minEvidence) {
        summary.skippedThinText += 1;
        continue;
      }
      const size = JSON.stringify(state).length;
      summary.stateChars.total += size;
      summary.stateChars.max = Math.max(summary.stateChars.max, size);
      if (dryRun) continue;

      // Shadow only: this pass records what the page says and never acts.
      const result = await decide({
        client: options.client,
        ledger,
        mode: "shadow",
        subjectId: candidate.id,
        state: state as unknown as Record<string, unknown>,
        questions,
        evidenceUrl,
      });
      if (result.error) {
        summary.failed += 1;
        summary.errors.push({
          opportunityId: candidate.id,
          error: result.error,
        });
        log(`${candidate.id}: ${result.error}`);
      }
      let answered = false;
      for (const outcome of Object.values(result.outcomes)) {
        bump(summary.routes, outcome.questionKey, outcome.route);
        if (outcome.route === "unavailable") continue;
        answered = true;
        if (ledger && !result.error) summary.recordedAnswers += 1;
        if (outcome.answer !== null)
          bump(summary.answers, outcome.questionKey, outcome.answer);
      }
      if (answered) summary.decided += 1;
    }
    if (batch.length < batchSize) break;
  }
  return summary;
}
