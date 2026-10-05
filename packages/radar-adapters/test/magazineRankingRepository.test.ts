import test from "node:test";
import assert from "node:assert/strict";
import {
  MIN_REPORTS_FOR_MEDIAN,
  assignMissaTier,
  computeTurnaroundScore,
} from "@missa/radar-engine";
import {
  refreshTurnaroundFromReports,
  rerankYearGenre,
} from "../src/ranking/magazineRankingRepository.js";

type Row = {
  profile_id: string;
  name: string;
  genre: string;
  ranking_year: number;
  rank_position: number;
  total_score: number;
  accolades_score: number;
  pay_score: number;
  turnaround_score: number;
  fees_score: number;
  respect_score: number;
  format_ethics_score: number;
  response_time_band: string | null;
  median_response_days: number | null;
  telemetry_reports: number;
  prestige_tier: string;
  pillar_status: Record<string, string>;
  coverage: number;
};

const unknownStatus = {
  accolades: "recorded",
  pay: "unknown",
  turnaround: "unknown",
  fees: "unknown",
  respect: "unknown",
  formatEthics: "unknown",
};

function row(
  profileId: string,
  name: string,
  rank: number,
  accolades: number,
): Row {
  const total = accolades + 7.5 + 7.5 + 7.5 + 5.5 + 2.5;
  return {
    profile_id: profileId,
    name,
    genre: "overall",
    ranking_year: 2026,
    rank_position: rank,
    total_score: total,
    accolades_score: accolades,
    pay_score: 7.5,
    turnaround_score: 7.5,
    fees_score: 7.5,
    respect_score: 5.5,
    format_ethics_score: 2.5,
    response_time_band: null,
    median_response_days: null,
    telemetry_reports: 0,
    prestige_tier: assignMissaTier(total),
    pillar_status: { ...unknownStatus },
    coverage: 0.4,
  };
}

/** A tiny in-memory stand-in for the four queries the report path issues. */
function fakeDb(
  rows: Row[],
  reports: { count: number; median: number | null },
) {
  return {
    rows,
    async query(text: string, params: unknown[] = []) {
      if (text.includes("FROM missa_submission_telemetry")) {
        return {
          rows: [{ reports: reports.count, median_days: reports.median }],
        };
      }
      if (text.includes("MAX(ranking_year)")) {
        return { rows: [{ year: 2026 }] };
      }
      if (text.startsWith("SELECT genre, accolades_score")) {
        return { rows: rows.filter((r) => r.profile_id === params[0]) };
      }
      if (
        text
          .trim()
          .startsWith(
            "UPDATE missa_magazine_rankings\n       SET median_response_days",
          )
      ) {
        const target = rows.find(
          (r) => r.profile_id === params[7] && r.genre === params[9],
        )!;
        target.median_response_days = params[0] as number | null;
        target.telemetry_reports = params[1] as number;
        target.turnaround_score = params[2] as number;
        target.total_score = params[3] as number;
        target.prestige_tier = params[4] as string;
        target.pillar_status = JSON.parse(params[5] as string);
        target.coverage = params[6] as number;
        return { rows: [] };
      }
      if (text.includes("SELECT r.profile_id, r.total_score")) {
        return {
          rows: rows.filter(
            (r) => r.ranking_year === params[0] && r.genre === params[1],
          ),
        };
      }
      if (text.includes("FROM unnest")) {
        const ids = params[2] as string[];
        const ranks = params[3] as number[];
        ids.forEach((id, index) => {
          rows.find(
            (r) => r.profile_id === id && r.genre === params[1],
          )!.rank_position = ranks[index]!;
        });
        return { rows: [] };
      }
      throw new Error(`Unexpected query: ${text.slice(0, 80)}`);
    },
  };
}

test("a recorded median rescored with the engine's bands moves rank and tier", async () => {
  const rows = [row("a", "Alpha", 1, 30), row("b", "Bravo", 2, 28)];
  const db = fakeDb(rows, { count: MIN_REPORTS_FOR_MEDIAN, median: 25 });

  const median = await refreshTurnaroundFromReports(db as never, "b");

  assert.equal(median, 25);
  const bravo = rows.find((r) => r.profile_id === "b")!;
  const expected = computeTurnaroundScore({
    medianResponseDays: 25,
    responseTimeBand: null,
  });
  assert.equal(bravo.turnaround_score, expected.score);
  assert.equal(bravo.turnaround_score, 15);
  assert.equal(bravo.pillar_status.turnaround, "recorded");
  assert.equal(bravo.total_score, 28 + 7.5 + 15 + 7.5 + 5.5 + 2.5);
  assert.equal(bravo.prestige_tier, assignMissaTier(bravo.total_score));
  assert.equal(bravo.telemetry_reports, MIN_REPORTS_FOR_MEDIAN);
  // 65.5 now beats Alpha's 53, so the two swap places.
  assert.equal(bravo.rank_position, 1);
  assert.equal(rows.find((r) => r.profile_id === "a")!.rank_position, 2);
});

test("below the report threshold no median is recorded and the band still counts", async () => {
  const rows = [row("a", "Alpha", 1, 30)];
  rows[0]!.response_time_band = "3_to_6_months";
  const db = fakeDb(rows, { count: MIN_REPORTS_FOR_MEDIAN - 1, median: 10 });

  const median = await refreshTurnaroundFromReports(db as never, "a");

  assert.equal(median, null);
  assert.equal(rows[0]!.median_response_days, null);
  assert.equal(rows[0]!.turnaround_score, 6);
  assert.equal(rows[0]!.pillar_status.turnaround, "partial");
});

test("re-ranking breaks score ties by accolades, then name", async () => {
  const rows = [
    row("z", "Zulu", 1, 20),
    row("m", "Mike", 2, 20),
    row("h", "Hotel", 3, 25),
  ];
  rows[2]!.total_score = rows[0]!.total_score; // tie on total, Hotel has more accolades
  const db = fakeDb(rows, { count: 0, median: null });

  await rerankYearGenre(db as never, 2026, "overall");

  const order = [...rows]
    .sort((a, b) => a.rank_position - b.rank_position)
    .map((r) => r.name);
  assert.deepEqual(order, ["Hotel", "Mike", "Zulu"]);
});
