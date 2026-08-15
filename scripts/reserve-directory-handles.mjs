import { readFile } from "node:fs/promises";
import {
  parseDirectoryHandleRecommendationsCsv,
  reserveDirectoryHandleCandidates,
  selectDirectoryHandleReservations,
} from "../packages/radar-adapters/dist/src/directoryHandleReservations.js";

const EXPECTED_ROW_COUNT = 1976;

function argumentValue(argumentsList, name) {
  const index = argumentsList.indexOf(name);
  return index >= 0 ? argumentsList[index + 1] : undefined;
}

const argumentsList = process.argv.slice(2);
const inputPath = argumentValue(argumentsList, "--input");
const apply = argumentsList.includes("--apply");
const expectedRows = Number(
  argumentValue(argumentsList, "--expected-rows") ?? EXPECTED_ROW_COUNT,
);

if (!inputPath || !Number.isInteger(expectedRows) || expectedRows < 1) {
  console.error(
    "Usage: npm run handles:reserve -- --input /path/to/final.csv [--apply] [--expected-rows 1976]",
  );
  process.exit(2);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required.");
  process.exit(2);
}

const rows = parseDirectoryHandleRecommendationsCsv(
  await readFile(inputPath, "utf8"),
);
if (rows.length !== expectedRows) {
  console.error(
    `Expected ${expectedRows} recommendation rows; received ${rows.length}.`,
  );
  process.exit(2);
}

const selection = selectDirectoryHandleReservations(rows);
const exclusionCounts = Object.fromEntries(
  selection.exclusions.reduce((counts, exclusion) => {
    counts.set(exclusion.reason, (counts.get(exclusion.reason) ?? 0) + 1);
    return counts;
  }, new Map()),
);

console.log(
  JSON.stringify(
    {
      inputPath,
      writesDatabase: apply,
      totalRows: rows.length,
      eligibleReservations: selection.candidates.length,
      excludedRows: selection.exclusions.length,
      exclusionCounts,
      confidence: Object.fromEntries(
        selection.candidates.reduce((counts, candidate) => {
          const row = rows.find(
            (current) => current.profileId === candidate.profileId,
          );
          const confidence = row?.suggestionConfidence ?? "unknown";
          counts.set(confidence, (counts.get(confidence) ?? 0) + 1);
          return counts;
        }, new Map()),
      ),
    },
    null,
    2,
  ),
);

const result = await reserveDirectoryHandleCandidates({
  connectionString,
  candidates: selection.candidates,
  dryRun: !apply,
});
console.log(JSON.stringify(result, null, 2));
