import { promises as fs } from "node:fs";
import path from "node:path";

const repositoryRoot = process.cwd();
const webRoot = path.join(repositoryRoot, "apps/web");
const studioRoot = path.join(webRoot, "components/shadcn-studio");
const policyPath = path.join(webRoot, "component-policy.json");
const cataloguePath = path.join(webRoot, "component-catalogue.json");
const baselinePath = path.join(webRoot, "component-policy-baseline.json");
const writeCatalogue = process.argv.includes("--write-catalogue");
const writeBaseline = process.argv.includes("--write-baseline");

// Counts read from the authenticated Shadcn Studio component index on 2026-09-03.
// They are evidence of catalogue availability, not approval or local installation.
const observedStudioCounts = {
  accordion: 16,
  alert: 30,
  "aspect-ratio": 7,
  autocomplete: 10,
  avatar: 21,
  badge: 24,
  breadcrumb: 8,
  button: 55,
  "button-group": 16,
  calendar: 25,
  card: 17,
  carousel: 12,
  checkbox: 19,
  "code-block": 7,
  collapsible: 10,
  combobox: 14,
  command: 14,
  "context-menu": 9,
  "data-table": 13,
  "date-picker": 13,
  dialog: 26,
  drawer: 15,
  "dropdown-menu": 16,
  form: 10,
  input: 46,
  "input-mask": 6,
  "input-otp": 10,
  kanban: 4,
  kbd: 8,
  label: 9,
  list: 10,
  menubar: 8,
  "navigation-menu": 9,
  pagination: 15,
  "phone-input": 9,
  popover: 15,
  progress: 23,
  "radio-group": 15,
  rating: 8,
  resizable: 9,
  "scroll-area": 6,
  select: 38,
  separator: 14,
  sheet: 7,
  skeleton: 12,
  slider: 19,
  sonner: 20,
  sortable: 5,
  spinner: 10,
  stepper: 12,
  switch: 20,
  table: 16,
  tabs: 29,
  textarea: 21,
  toggle: 14,
  "toggle-group": 16,
  tooltip: 17,
  typography: 15,
};

const policy = JSON.parse(await fs.readFile(policyPath, "utf8"));

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (
      [
        ".next",
        "node_modules",
        "outputs",
        "playwright-report",
        "test-results",
      ].includes(entry.name)
    )
      continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute)));
    else files.push(absolute);
  }
  return files;
}

const familyNames = (await fs.readdir(studioRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const families = [];
for (const family of familyNames) {
  const directory = path.join(studioRoot, family);
  const variants = (await fs.readdir(directory))
    .filter((name) => new RegExp(`^${family}-\\d+\\.tsx$`).test(name))
    .map((name) => name.replace(/\.tsx$/, ""))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  families.push({
    family,
    count: variants.length,
    studioObservedCount: observedStudioCounts[family] ?? null,
    notInstalledCount: Math.max(
      0,
      (observedStudioCounts[family] ?? variants.length) - variants.length,
    ),
    variants,
  });
}

const catalogue = {
  generatedFrom: "apps/web/components/shadcn-studio",
  verifiedAgainst: "https://shadcnstudio.com/components",
  observedAt: "2026-09-03",
  note: "WebMCP was advertised but exposed no tools; category identity was verified from the authenticated rendered DOM and exact variants were inventoried from checked-in source.",
  familyCount: families.length,
  variantCount: families.reduce((sum, family) => sum + family.count, 0),
  studioObservedVariantCount: Object.values(observedStudioCounts).reduce(
    (sum, count) => sum + count,
    0,
  ),
  families,
};

if (writeCatalogue) {
  await fs.writeFile(cataloguePath, `${JSON.stringify(catalogue, null, 2)}\n`);
}

const sourceFiles = (await walk(webRoot)).filter((file) =>
  /\.(?:css|mjs|js|jsx|ts|tsx)$/.test(file),
);
const excludedPrefixes = [
  "components/ui/",
  "components/shadcn-studio/",
  "components/design-system/",
  "app/design-system/",
];

const findings = [];
function record(file, rule, detail) {
  const relative = path.relative(webRoot, file).split(path.sep).join("/");
  findings.push(
    `${relative}|${rule}|${detail.trim().replace(/\s+/g, " ").slice(0, 180)}`,
  );
}

for (const file of sourceFiles) {
  const relative = path.relative(webRoot, file).split(path.sep).join("/");
  const source = await fs.readFile(file, "utf8");
  const isExcluded = excludedPrefixes.some((prefix) =>
    relative.startsWith(prefix),
  );

  for (const primitive of policy.importPolicy.restrictedPrimitives) {
    const importPattern = new RegExp(
      `@/components/ui/${primitive}(?:["'])`,
      "g",
    );
    if (!isExcluded && importPattern.test(source))
      record(file, "direct-domain-primitive-import", primitive);
  }

  if (
    /(?:from\s+|import\s*\()["']@\/components\/shadcn-studio\//.test(source)
  ) {
    const allowed = policy.importPolicy.studioImportsAllowedOnlyIn.some(
      (prefix) => relative.startsWith(`${prefix}/`),
    );
    if (!allowed)
      record(
        file,
        "studio-import-outside-adapter",
        "Import Studio variants only through design review or Missa semantic components",
      );
  }

  if (!isExcluded) {
    for (const line of source.split("\n")) {
      if (/#[0-9a-fA-F]{3,8}\b/.test(line)) record(file, "raw-color", line);
      if (/font-family\s*:/.test(line)) record(file, "raw-font-family", line);
      if (/animate-\[|animation\s*:(?!\s*none)/.test(line))
        record(file, "unapproved-motion", line);
    }
  }
}

const uniqueFindings = [...new Set(findings)].sort();
if (writeBaseline) {
  const baseline = {
    generatedAt: "2026-09-03",
    note: "Existing migration debt. Entries may be removed but not added. Do not copy these patterns into new UI.",
    findings: uniqueFindings,
  };
  await fs.writeFile(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
}

let baseline = { findings: [] };
try {
  baseline = JSON.parse(await fs.readFile(baselinePath, "utf8"));
} catch {
  if (!writeBaseline)
    throw new Error(
      "Missing component-policy-baseline.json. Run with --write-baseline once after reviewing current debt.",
    );
}

const baselineSet = new Set(baseline.findings);
const newFindings = uniqueFindings.filter(
  (finding) => !baselineSet.has(finding),
);

const semanticNames = Object.keys(policy.semanticComponents);
const invalidStudioCandidates = [];
const availableVariants = new Set(
  families.flatMap((family) => family.variants),
);
for (const name of semanticNames) {
  const entry = policy.semanticComponents[name];
  for (const candidate of [
    ...(entry.studioCandidates ?? []),
    ...(entry.studioReferences ?? []),
  ]) {
    if (!availableVariants.has(candidate))
      invalidStudioCandidates.push(`${name}: ${candidate}`);
  }
}

const errors = [];
if (catalogue.variantCount === 0)
  errors.push("The local Studio catalogue is empty.");
if (invalidStudioCandidates.length)
  errors.push(
    `Unknown Studio candidates:\n${invalidStudioCandidates.join("\n")}`,
  );
if (newFindings.length)
  errors.push(
    `New design-system policy violations:\n${newFindings.join("\n")}`,
  );

for (const entrypoint of policy.instructionEntrypoints ?? []) {
  const entrypointPath = path.join(repositoryRoot, entrypoint);
  let source;
  try {
    source = await fs.readFile(entrypointPath, "utf8");
  } catch {
    errors.push(`Missing design-system instruction entrypoint: ${entrypoint}`);
    continue;
  }
  const missingReferences = [
    "DESIGN.md",
    "apps/web/component-policy.json",
  ].filter((reference) => !source.includes(reference));
  if (missingReferences.length) {
    errors.push(
      `${entrypoint} must reference: ${missingReferences.join(", ")}`,
    );
  }
}

if (errors.length) {
  console.error(errors.join("\n\n"));
  process.exitCode = 1;
} else {
  console.log(
    `Design-system policy passed: ${catalogue.familyCount} Studio families, ${catalogue.variantCount} variants, ${semanticNames.length} semantic mappings, ${policy.instructionEntrypoints.length} instruction entrypoints, no new violations.`,
  );
}
