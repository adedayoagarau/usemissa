import { mkdir, readdir, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import {
  DIRECTORY_IDENTITY_CONFIDENCE_THRESHOLD,
  deriveDirectoryHandleCandidates,
  normalizeHandle,
  planDirectoryReservation,
  proposeIdentityConfidenceThreshold,
  RESERVED_HANDLE_WORDS,
  type DirectoryReservationPlan,
} from "@missa/radar-engine";

interface GaryProfileRow {
  id: string;
  name: string;
  websiteUrl: string | null;
  normalizedWebsiteUrl: string | null;
  identityStatus: string;
  identityConfidence: string;
}

interface PlanRow {
  profileId: string;
  name: string;
  websiteUrl: string | null;
  candidateA: string;
  candidateB: string;
  decision: DirectoryReservationPlan["decision"];
  reason: string;
}

const repoRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const outputDirectory = resolve(repoRoot, "apps/web/outputs");

function candidateCell(
  candidate: ReturnType<typeof deriveDirectoryHandleCandidates>["name"],
): string {
  return candidate?.values.join("|") ?? "";
}

function csvCell(value: string | null): string {
  const text = value ?? "";
  return /[",\n\r]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csvReport(rows: readonly PlanRow[]): string {
  const header = [
    "profileId",
    "name",
    "websiteUrl",
    "candidateA",
    "candidateB",
    "decision",
    "reason",
  ];
  const body = rows.map((row) =>
    [
      row.profileId,
      row.name,
      row.websiteUrl,
      row.candidateA,
      row.candidateB,
      row.decision,
      row.reason,
    ]
      .map(csvCell)
      .join(","),
  );
  return [header.join(","), ...body, ""].join("\n");
}

async function topLevelRouteWords(appDirectory: string): Promise<Set<string>> {
  const routeWords = new Set<string>();

  async function walk(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(path);
        continue;
      }
      if (entry.name !== "page.tsx" && entry.name !== "route.ts") continue;
      const routeDirectory = relative(appDirectory, directory);
      const firstSegment = routeDirectory
        .split("/")
        .find(
          (segment) =>
            segment &&
            !/^\([^)]*\)$/u.test(segment) &&
            !/^\[.*\]$/u.test(segment),
        );
      const normalized = firstSegment ? normalizeHandle(firstSegment) : null;
      if (normalized) routeWords.add(normalized);
    }
  }

  await walk(appDirectory);
  return routeWords;
}

function confidenceDistribution(
  rows: readonly GaryProfileRow[],
): Array<{ confidence: string; count: number }> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const numeric = Number(row.identityConfidence);
    const key = Number.isFinite(numeric) ? numeric.toFixed(3) : "invalid";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([left], [right]) =>
      left.localeCompare(right, "en", { numeric: true }),
    )
    .map(([confidence, count]) => ({ confidence, count }));
}

async function run(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to run handles:plan");
  }

  const pool = new Pool({
    connectionString,
    max: 2,
    connectionTimeoutMillis: 5_000,
  });
  try {
    const tableResult = await pool.query<{
      handles: string | null;
      aliases: string | null;
    }>(`
      select
        to_regclass('public.handles') as handles,
        to_regclass('public.handle_aliases') as aliases
    `);
    const tables = tableResult.rows[0];
    const namespaceTablesAvailable = Boolean(tables?.handles && tables.aliases);

    const profileResult = await pool.query<GaryProfileRow>(`
      select
        id,
        name,
        website_url as "websiteUrl",
        normalized_website_url as "normalizedWebsiteUrl",
        identity_status as "identityStatus",
        identity_confidence::text as "identityConfidence"
      from gary_profiles
      order by id
    `);
    const profiles = profileResult.rows;

    const occupiedKeys = new Set<string>();
    if (namespaceTablesAvailable) {
      const occupiedResult = await pool.query<{ key: string }>(`
        select handle_key as key from handles
        union
        select alias_key as key from handle_aliases
      `);
      for (const row of occupiedResult.rows) occupiedKeys.add(row.key);
    }

    const derivedByProfile = profiles.map((profile) => ({
      profile,
      candidates: deriveDirectoryHandleCandidates(profile),
    }));
    const ownersByKey = new Map<string, Set<string>>();
    for (const { profile, candidates } of derivedByProfile) {
      const keys = new Set([
        ...(candidates.name?.values ?? []),
        ...(candidates.domain?.values ?? []),
      ]);
      for (const key of keys) {
        const owners = ownersByKey.get(key) ?? new Set<string>();
        owners.add(profile.id);
        ownersByKey.set(key, owners);
      }
    }
    const collidingKeys = new Set(
      [...ownersByKey.entries()]
        .filter(([, owners]) => owners.size > 1)
        .map(([key]) => key),
    );

    const appDirectory = resolve(repoRoot, "apps/web/app");
    const discoveredRouteWords = await topLevelRouteWords(appDirectory);
    const missingRouteWords = [...discoveredRouteWords]
      .filter((word) => !RESERVED_HANDLE_WORDS.has(word))
      .sort();
    const namespaceAvailable =
      namespaceTablesAvailable && missingRouteWords.length === 0;

    const planned = derivedByProfile.map(({ profile }) => {
      const plan = planDirectoryReservation(profile, {
        occupiedKeys,
        collidingKeys,
        namespaceAvailable,
        identityConfidenceThreshold: DIRECTORY_IDENTITY_CONFIDENCE_THRESHOLD,
      });
      const row: PlanRow = {
        profileId: profile.id,
        name: profile.name,
        websiteUrl: profile.websiteUrl,
        candidateA: candidateCell(plan.candidates.name),
        candidateB: candidateCell(plan.candidates.domain),
        decision: plan.decision,
        reason: plan.reason,
      };
      return { row, plan };
    });
    const rows = planned.map(({ row }) => row);
    const totals = rows.reduce(
      (result, row) => ({
        ...result,
        [row.decision]: result[row.decision] + 1,
      }),
      { "auto-mint": 0, review: 0, blocked: 0 },
    );
    const distribution = confidenceDistribution(profiles);
    const proposedThreshold = proposeIdentityConfidenceThreshold(
      profiles.map((profile) => profile.identityConfidence),
    );
    const report = {
      generatedAt: new Date().toISOString(),
      phase: "phase-1-dry-run",
      writesDatabase: false,
      identityConfidence: {
        configuredThreshold: DIRECTORY_IDENTITY_CONFIDENCE_THRESHOLD,
        proposedThreshold,
        distribution,
      },
      namespace: {
        handlesTablePresent: Boolean(tables?.handles),
        aliasesTablePresent: Boolean(tables?.aliases),
        collisionCheckAvailable: namespaceTablesAvailable,
        discoveredTopLevelRouteWords: [...discoveredRouteWords].sort(),
        missingRouteWords,
      },
      totals,
      rows,
    };

    await mkdir(outputDirectory, { recursive: true });
    await writeFile(
      resolve(outputDirectory, "handles-plan.json"),
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8",
    );
    await writeFile(
      resolve(outputDirectory, "handles-plan.csv"),
      csvReport(rows),
      "utf8",
    );

    console.log(`handles:plan (read-only) wrote ${rows.length} profile rows`);
    console.log(`auto-mint: ${totals["auto-mint"]}`);
    console.log(`review: ${totals.review}`);
    console.log(`blocked: ${totals.blocked}`);
    console.log(
      `identity confidence threshold: ${DIRECTORY_IDENTITY_CONFIDENCE_THRESHOLD}`,
    );
    console.log(
      `proposed threshold from observed distribution: ${proposedThreshold}`,
    );
    for (const bucket of distribution) {
      console.log(`identity confidence ${bucket.confidence}: ${bucket.count}`);
    }
    if (!namespaceTablesAvailable) {
      console.log(
        "warning: handles/handle_aliases are not present; namespace collisions remain review-only",
      );
    }
    if (missingRouteWords.length) {
      console.log(
        `warning: route words missing from reserved list: ${missingRouteWords.join(", ")}`,
      );
    }
  } finally {
    await pool.end();
  }
}

try {
  await run();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
