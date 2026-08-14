import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readWaitlistPublicationMatchReport } from "../packages/radar-adapters/dist/src/waitlistInvites.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString)
  throw new Error("DATABASE_URL is required for waitlist:publication-match");

const report = await readWaitlistPublicationMatchReport(connectionString);
const outputDirectory = resolve(process.cwd(), "apps/web/outputs");
await mkdir(outputDirectory, { recursive: true });
await writeFile(
  resolve(outputDirectory, "waitlist-publication-matches.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

const headers = [
  "waitlistSignupId",
  "emailDomain",
  "matchedProfileId",
  "matchedProfileName",
  "reservedHandle",
  "status",
];
const csv = [
  headers.join(","),
  ...report.rows.map((row) =>
    headers
      .map((key) => {
        const value = String(row[key] ?? "");
        return /[",\n\r]/u.test(value)
          ? `"${value.replaceAll('"', '""')}"`
          : value;
      })
      .join(","),
  ),
  "",
].join("\n");
await writeFile(
  resolve(outputDirectory, "waitlist-publication-matches.csv"),
  csv,
  "utf8",
);
console.log(
  JSON.stringify(
    {
      readOnly: true,
      available: report.available,
      rows: report.rows.length,
      warnings: report.warnings,
      freeMailDomains: report.freeMailDomains,
    },
    null,
    2,
  ),
);
