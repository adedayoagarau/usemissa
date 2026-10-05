/**
 * Compares recorded reading decisions with cited facts from the magazine and
 * residency indexes. Read-only. Index facts belong to an organization profile
 * and reach an opportunity through a confirmed profile link (or, for
 * residencies, the cited open-call URL), so a disagreement can mean the call
 * page and the directory differ, not only that the reading was wrong.
 */
import type { Queryable } from "@missa/decisions";

const Q = (name: string) => `opportunity.reading.${name}`;

/** Answers that mean "the page does not say": they count against coverage, not agreement. */
export const READING_ABSTAIN_ANSWERS: Readonly<
  Record<string, readonly string[]>
> = {
  [Q("fee_status")]: ["unstated"],
  [Q("artist_payment")]: ["none-stated"],
};

export interface ReadingTruth {
  opportunityId: string;
  questionKey: string;
  /** Answers consistent with the cited fact. */
  expected: string[];
  /** e.g. "magazine.fee". */
  source: string;
  url: string | null;
}

export interface ReadingDecisionRow {
  subjectId: string;
  questionKey: string;
  questionKind: string;
  answer: string | null;
  /** As recorded: for a Noul, the probability of true. */
  probability: number | null;
  route: string;
}

type FactSources = Record<string, { url?: string } | undefined>;

export interface MagazineTruthRow {
  opportunityId: string;
  chargesReadingFee: boolean | null;
  payKind: string | null;
  simultaneousPolicy: string | null;
  blindReading: boolean | null;
  factSources: FactSources;
}

export interface ResidencyTruthRow {
  opportunityId: string;
  hasStipend: boolean | null;
  applicationFeeAmount: number | null;
  meals: string | null;
  hasMeals: boolean | null;
  hasPrivateStudio: boolean | null;
  housing: string | null;
  wheelchair: string | null;
  factSources: FactSources;
}

function cited(
  sources: FactSources,
  fact: string,
): { cited: boolean; url: string | null } {
  const entry = sources?.[fact];
  return { cited: Boolean(entry), url: entry?.url ?? null };
}

const bool = (value: boolean) => [value ? "true" : "false"];

export function magazineReadingTruths(row: MagazineTruthRow): ReadingTruth[] {
  const truths: ReadingTruth[] = [];
  const add = (fact: string, question: string, expected: string[] | null) => {
    const source = cited(row.factSources, fact);
    if (!source.cited || !expected) return;
    truths.push({
      opportunityId: row.opportunityId,
      questionKey: Q(question),
      expected,
      source: `magazine.${fact}`,
      url: source.url,
    });
  };
  if (row.chargesReadingFee !== null)
    add(
      "fee",
      "fee_status",
      row.chargesReadingFee ? ["paid", "waiver-available"] : ["no-fee"],
    );
  const pay: Record<string, string[]> = {
    cash: ["cash"],
    copies_only: ["contributor-copies"],
    unpaid: ["exposure-only"],
  };
  if (row.payKind) add("pay", "artist_payment", pay[row.payKind] ?? null);
  // "conditional" is neither a plain yes nor a plain no, so it is not compared.
  if (row.simultaneousPolicy === "allowed")
    add("simultaneous", "simultaneous_allowed", ["true"]);
  if (row.simultaneousPolicy === "forbidden")
    add("simultaneous", "simultaneous_allowed", ["false"]);
  if (row.blindReading !== null)
    add("blind", "blind_review", bool(row.blindReading));
  return truths;
}

export function residencyReadingTruths(row: ResidencyTruthRow): ReadingTruth[] {
  const truths: ReadingTruth[] = [];
  const add = (fact: string, question: string, expected: string[]) => {
    const source = cited(row.factSources, fact);
    if (!source.cited) return;
    truths.push({
      opportunityId: row.opportunityId,
      questionKey: Q(question),
      expected,
      source: `residency.${fact}`,
      url: source.url,
    });
  };
  if (row.hasStipend !== null)
    add("stipend", "stipend_paid_to_artist", bool(row.hasStipend));
  if (row.applicationFeeAmount !== null)
    add(
      "applicationFee",
      "fee_status",
      row.applicationFeeAmount > 0 ? ["paid", "waiver-available"] : ["no-fee"],
    );
  const meals =
    row.meals === "all" || row.meals === "some"
      ? true
      : row.meals === "none"
        ? false
        : row.hasMeals;
  if (meals !== null) add("meals", "meals_provided", bool(meals));
  // The directory records private versus shared studios; either is a studio.
  if (row.hasPrivateStudio !== null) add("studio", "studio_provided", ["true"]);
  if (row.housing)
    add("housing", "housing_provided", bool(!/^no housing/i.test(row.housing)));
  if (row.wheelchair)
    add(
      "wheelchair",
      "wheelchair_access_stated",
      bool(!/^not accessible$/i.test(row.wheelchair.trim())),
    );
  return truths;
}

/** One truth per opportunity and question; sources that disagree are dropped. */
export function mergeReadingTruths(truths: ReadingTruth[]): {
  truths: ReadingTruth[];
  conflicts: number;
} {
  const byKey = new Map<string, ReadingTruth | null>();
  let conflicts = 0;
  for (const truth of truths) {
    const key = `${truth.opportunityId}|${truth.questionKey}`;
    const existing = byKey.get(key);
    if (existing === undefined) {
      byKey.set(key, truth);
      continue;
    }
    if (existing === null) continue;
    const same =
      [...existing.expected].sort().join(",") ===
      [...truth.expected].sort().join(",");
    if (!same) {
      byKey.set(key, null);
      conflicts += 1;
    }
  }
  return {
    truths: [...byKey.values()].filter(
      (truth): truth is ReadingTruth => truth !== null,
    ),
    conflicts,
  };
}

/** Probability of the answer that was reported (Noul rows record P(true)). */
export function reportedProbability(
  decision: ReadingDecisionRow,
): number | null {
  if (decision.probability === null || !Number.isFinite(decision.probability))
    return null;
  if (decision.questionKind === "noul")
    return decision.answer === "false"
      ? 1 - decision.probability
      : decision.probability;
  return decision.probability;
}

export interface CalibrationItem {
  probability: number;
  correct: boolean;
}

export interface CalibrationBucket {
  lower: number;
  upper: number;
  count: number;
  meanProbability: number | null;
  accuracy: number | null;
}

export const DEFAULT_CALIBRATION_EDGES = [0, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 1];

/** Buckets are [lower, upper); the last one includes 1. */
export function calibrationBuckets(
  items: CalibrationItem[],
  edges: number[] = DEFAULT_CALIBRATION_EDGES,
): CalibrationBucket[] {
  const buckets = edges.slice(0, -1).map((lower, index) => ({
    lower,
    upper: edges[index + 1]!,
    count: 0,
    sumProbability: 0,
    correct: 0,
  }));
  for (const item of items) {
    const p = Math.min(1, Math.max(0, item.probability));
    const index = buckets.findIndex(
      (bucket, i) =>
        p >= bucket.lower && (p < bucket.upper || i === buckets.length - 1),
    );
    const bucket = buckets[index === -1 ? 0 : index]!;
    bucket.count += 1;
    bucket.sumProbability += p;
    if (item.correct) bucket.correct += 1;
  }
  return buckets.map((bucket) => ({
    lower: bucket.lower,
    upper: bucket.upper,
    count: bucket.count,
    meanProbability: bucket.count ? bucket.sumProbability / bucket.count : null,
    accuracy: bucket.count ? bucket.correct / bucket.count : null,
  }));
}

/** Count-weighted mean gap between stated probability and observed accuracy. */
export function expectedCalibrationError(
  buckets: CalibrationBucket[],
): number | null {
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  if (total === 0) return null;
  return buckets.reduce(
    (sum, bucket) =>
      bucket.count === 0
        ? sum
        : sum +
          (bucket.count / total) *
            Math.abs(bucket.accuracy! - bucket.meanProbability!),
    0,
  );
}

export interface ReadingQuestionAgreement {
  questionKey: string;
  /** Cited facts about opportunities that have reading decisions. */
  truths: number;
  /** Of those, how many have a decision for this question. */
  decided: number;
  /** Decisions that state an answer (not "not stated"). */
  stated: number;
  agree: number;
  disagree: number;
  /** stated / truths. */
  coverage: number | null;
  /** agree / stated. */
  agreement: number | null;
  /** Decisions routed to apply or reject, and how many of those agree. */
  confident: number;
  confidentAgree: number;
}

export interface ReadingEvaluation {
  opportunitiesWithDecisions: number;
  truthsWithoutDecisions: number;
  questions: ReadingQuestionAgreement[];
  calibration: CalibrationBucket[];
  expectedCalibrationError: number | null;
}

export function evaluateReading(
  decisions: ReadingDecisionRow[],
  truths: ReadingTruth[],
  edges: number[] = DEFAULT_CALIBRATION_EDGES,
): ReadingEvaluation {
  const decisionByKey = new Map<string, ReadingDecisionRow>();
  const decidedSubjects = new Set<string>();
  for (const decision of decisions) {
    decidedSubjects.add(decision.subjectId);
    decisionByKey.set(
      `${decision.subjectId}|${decision.questionKey}`,
      decision,
    );
  }

  const rows = new Map<string, ReadingQuestionAgreement>();
  const items: CalibrationItem[] = [];
  let truthsWithoutDecisions = 0;
  for (const truth of truths) {
    if (!decidedSubjects.has(truth.opportunityId)) {
      truthsWithoutDecisions += 1;
      continue;
    }
    const row =
      rows.get(truth.questionKey) ??
      ({
        questionKey: truth.questionKey,
        truths: 0,
        decided: 0,
        stated: 0,
        agree: 0,
        disagree: 0,
        coverage: null,
        agreement: null,
        confident: 0,
        confidentAgree: 0,
      } satisfies ReadingQuestionAgreement);
    rows.set(truth.questionKey, row);
    row.truths += 1;

    const decision = decisionByKey.get(
      `${truth.opportunityId}|${truth.questionKey}`,
    );
    if (!decision || decision.answer === null) continue;
    row.decided += 1;
    if (READING_ABSTAIN_ANSWERS[truth.questionKey]?.includes(decision.answer))
      continue;
    row.stated += 1;
    const correct = truth.expected.includes(decision.answer);
    if (correct) row.agree += 1;
    else row.disagree += 1;
    if (decision.route === "apply" || decision.route === "reject") {
      row.confident += 1;
      if (correct) row.confidentAgree += 1;
    }
    const probability = reportedProbability(decision);
    if (probability !== null) items.push({ probability, correct });
  }

  const questions = [...rows.values()]
    .map((row) => ({
      ...row,
      coverage: row.truths ? row.stated / row.truths : null,
      agreement: row.stated ? row.agree / row.stated : null,
    }))
    .sort((left, right) => left.questionKey.localeCompare(right.questionKey));
  const calibration = calibrationBuckets(items, edges);
  return {
    opportunitiesWithDecisions: decidedSubjects.size,
    truthsWithoutDecisions,
    questions,
    calibration,
    expectedCalibrationError: expectedCalibrationError(calibration),
  };
}

const toNumber = (value: unknown): number | null =>
  value === null || value === undefined || value === "" ? null : Number(value);

/** Latest Jev reading decision per opportunity and question. */
export async function loadReadingDecisions(
  db: Queryable,
): Promise<ReadingDecisionRow[]> {
  const result = await db.query(
    `select distinct on (subject_id, question_key)
       subject_id as "subjectId", question_key as "questionKey",
       question_kind as "questionKind", answer, probability, route
     from data_decisions
     where subject_type = 'opportunity'
       and question_key like 'opportunity.reading.%'
       and decider_kind = 'jev'
     order by subject_id, question_key, question_version desc, created_at desc`,
  );
  return (result.rows as Array<Record<string, unknown>>).map((row) => ({
    subjectId: String(row.subjectId),
    questionKey: String(row.questionKey),
    questionKind: String(row.questionKind),
    answer: row.answer === null ? null : String(row.answer),
    probability: toNumber(row.probability),
    route: String(row.route),
  }));
}

/** Cited index facts for opportunities linked to a ranked profile. */
export async function loadReadingTruths(
  db: Queryable,
): Promise<{ truths: ReadingTruth[]; conflicts: number }> {
  const magazines = await db.query(
    `select distinct on (l.opportunity_id, r.profile_id)
       l.opportunity_id as "opportunityId",
       r.charges_reading_fee as "chargesReadingFee", r.pay_kind as "payKind",
       r.simultaneous_policy as "simultaneousPolicy", r.blind_reading as "blindReading",
       r.fact_sources as "factSources"
     from opportunity_profile_links l
     join missa_magazine_rankings r on r.profile_id = l.profile_id
     where l.status = 'confirmed'
     order by l.opportunity_id, r.profile_id, r.ranking_year desc, (r.genre = 'overall') desc`,
  );
  const residencyColumns = `r.profile_id as "profileId",
       r.has_stipend as "hasStipend", r.application_fee_amount as "applicationFeeAmount",
       r.meals, r.has_meals as "hasMeals", r.has_private_studio as "hasPrivateStudio",
       r.housing, r.wheelchair, r.fact_sources as "factSources"`;
  const residencies = await db.query(
    `select l.opportunity_id as "opportunityId", ${residencyColumns}
     from missa_residency_rankings r
     join opportunity_profile_links l on l.profile_id = r.profile_id and l.status = 'confirmed'
     union all
     select o.id as "opportunityId", ${residencyColumns}
     from missa_residency_rankings r
     join opportunities o
       on r.open_call_url is not null
      and rtrim(lower(r.open_call_url), '/') in (
        rtrim(lower(coalesce(o.guidelines_url, '')), '/'),
        rtrim(lower(coalesce(o.submission_url, '')), '/'))`,
  );

  const truths: ReadingTruth[] = [];
  for (const row of magazines.rows as MagazineTruthRow[]) {
    truths.push(...magazineReadingTruths(row));
  }
  const seen = new Set<string>();
  for (const row of residencies.rows as Array<
    ResidencyTruthRow & { profileId: string }
  >) {
    const key = `${row.opportunityId}|${row.profileId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    truths.push(
      ...residencyReadingTruths({
        ...row,
        applicationFeeAmount: toNumber(row.applicationFeeAmount),
      }),
    );
  }
  return mergeReadingTruths(truths);
}

const percent = (value: number | null) =>
  value === null ? "—" : `${(value * 100).toFixed(1)}%`;

export function formatReadingEvaluation(
  evaluation: ReadingEvaluation,
  conflicts = 0,
): string {
  const lines: string[] = [];
  lines.push(
    `Opportunities with reading decisions: ${evaluation.opportunitiesWithDecisions}`,
  );
  lines.push(
    `Cited facts compared: ${evaluation.questions.reduce((sum, row) => sum + row.truths, 0)}` +
      ` (skipped ${evaluation.truthsWithoutDecisions} on opportunities not yet read; ${conflicts} conflicting sources dropped)`,
  );
  lines.push("");
  lines.push(
    [
      "question".padEnd(46),
      "facts".padStart(6),
      "stated".padStart(7),
      "agree".padStart(6),
      "coverage".padStart(9),
      "agreement".padStart(10),
      "confident".padStart(10),
      "conf.agree".padStart(11),
    ].join(" "),
  );
  for (const row of evaluation.questions) {
    lines.push(
      [
        row.questionKey.padEnd(46),
        String(row.truths).padStart(6),
        String(row.stated).padStart(7),
        String(row.agree).padStart(6),
        percent(row.coverage).padStart(9),
        percent(row.agreement).padStart(10),
        String(row.confident).padStart(10),
        percent(
          row.confident ? row.confidentAgree / row.confident : null,
        ).padStart(11),
      ].join(" "),
    );
  }
  lines.push("");
  lines.push(
    "Calibration (probability of the reported answer vs observed agreement)",
  );
  lines.push(
    [
      "bucket".padEnd(12),
      "n".padStart(6),
      "mean p".padStart(8),
      "observed".padStart(9),
    ].join(" "),
  );
  for (const bucket of evaluation.calibration) {
    lines.push(
      [
        `${bucket.lower.toFixed(2)}–${bucket.upper.toFixed(2)}`.padEnd(12),
        String(bucket.count).padStart(6),
        percent(bucket.meanProbability).padStart(8),
        percent(bucket.accuracy).padStart(9),
      ].join(" "),
    );
  }
  lines.push(
    `Expected calibration error: ${percent(evaluation.expectedCalibrationError)}`,
  );
  return lines.join("\n");
}
