"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";
import type {
  CategoryCounts,
  MagazineIndexAnalytics,
  MagazineIndexCoverage,
} from "@missa/radar-adapters";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

/*
 * Ordered categories share one hue, lighter to darker (validated for both
 * themes against the card surface); "not recorded" is a quiet neutral.
 */
const STEP = {
  light: "color-mix(in srgb, var(--chart-1) 45%, var(--card))",
  middle: "color-mix(in srgb, var(--chart-1) 70%, var(--card))",
  full: "var(--chart-1)",
  neutral: "color-mix(in srgb, var(--muted-foreground) 30%, var(--card))",
};

const SEGMENT_GAP = { stroke: "var(--card)", strokeWidth: 2 };

/** The charts show settled facts; they draw at once, with no entry animation. */
const STATIC = { isAnimationActive: false } as const;

function Figure({
  title,
  caption,
  children,
  table,
  legend,
}: {
  title: string;
  caption: string;
  children: React.ReactNode;
  table: { head: string[]; rows: Array<Array<string | number>> };
  legend?: Array<{ label: string; color: string }>;
}) {
  return (
    <figure className="space-y-3 rounded-xl border border-border bg-card p-5">
      <figcaption className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm leading-6 text-muted-foreground">{caption}</p>
      </figcaption>
      <div aria-hidden="true" className="space-y-3">
        {children}
        {legend ? <Legend items={legend} /> : null}
      </div>
      <div className="sr-only">
        <table>
          <caption>{title}</caption>
          <thead>
            <tr>
              {table.head.map((cell) => (
                <th key={cell} scope="col">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr key={String(row[0])}>
                {row.map((cell, index) =>
                  index === 0 ? (
                    <th key={index} scope="row">
                      {cell}
                    </th>
                  ) : (
                    <td key={index}>{cell}</td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

/** Legend in the categories' own order, in text tokens beside each swatch. */
function Legend({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-2.5 shrink-0 rounded-[2px]"
            style={{ background: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

const percentOf = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : 0;

/** Share of each category among magazines where the fact is recorded. */
function shares(counts: CategoryCounts, keys: string[]) {
  const recorded = keys.reduce((sum, key) => sum + (counts[key] ?? 0), 0);
  return {
    recorded,
    values: Object.fromEntries(
      keys.map((key) => [key, percentOf(counts[key] ?? 0, recorded)]),
    ),
  };
}

export function TierChart({
  tiers,
}: {
  tiers: MagazineIndexAnalytics["tiers"];
}) {
  const config = {
    count: { label: "Magazines", color: STEP.full },
  } satisfies ChartConfig;
  return (
    <Figure
      title="How the magazines spread across tiers"
      caption="Most magazines sit in the fourth tier. The upper tiers are reserved for magazines whose honours and recorded policies are both strong."
      table={{
        head: ["Tier", "Magazines"],
        rows: tiers.map((t) => [t.tier, t.count]),
      }}
    >
      <ChartContainer config={config} className="aspect-auto h-56 w-full">
        <BarChart
          data={tiers}
          margin={{ top: 20, right: 8, left: 8, bottom: 0 }}
        >
          <CartesianGrid vertical={false} />
          <XAxis dataKey="tier" tickLine={false} axisLine={false} />
          <YAxis hide />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideIndicator />}
          />
          <Bar
            {...STATIC}
            dataKey="count"
            fill="var(--color-count)"
            radius={[4, 4, 0, 0]}
            maxBarSize={56}
          >
            <LabelList
              dataKey="count"
              position="top"
              className="fill-foreground"
              fontSize={12}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </Figure>
  );
}

type ComparisonKey = "fees" | "pay" | "response";

const COMPARISONS: Record<
  ComparisonKey,
  { title: string; keys: Array<{ key: string; label: string; color: string }> }
> = {
  fees: {
    title: "Reading fees",
    keys: [
      { key: "free", label: "No fee", color: STEP.light },
      { key: "charges", label: "Charges a fee", color: STEP.full },
    ],
  },
  pay: {
    title: "Paying contributors",
    keys: [
      { key: "unpaid", label: "Unpaid", color: STEP.light },
      { key: "copies", label: "Copies only", color: STEP.middle },
      { key: "cash", label: "Pays in cash", color: STEP.full },
    ],
  },
  response: {
    title: "Time to reply",
    keys: [
      { key: "under3", label: "Under 3 months", color: STEP.light },
      { key: "between3and6", label: "3 to 6 months", color: STEP.middle },
      { key: "over6", label: "Over 6 months", color: STEP.full },
    ],
  },
};

export function ComparisonChart({
  kind,
  counts,
}: {
  kind: ComparisonKey;
  counts: { top: CategoryCounts; rest: CategoryCounts };
}) {
  const spec = COMPARISONS[kind];
  const keys = spec.keys.map((k) => k.key);
  const top = shares(counts.top, keys);
  const rest = shares(counts.rest, keys);
  const data = [
    { group: "Fifty most honoured", ...top.values },
    { group: "Everyone else", ...rest.values },
  ];
  const config = Object.fromEntries(
    spec.keys.map((k) => [k.key, { label: k.label, color: k.color }]),
  ) satisfies ChartConfig;

  return (
    <Figure
      title={spec.title}
      legend={spec.keys.map((k) => ({ label: k.label, color: k.color }))}
      caption={`Share of magazines where this is recorded: ${top.recorded} of the fifty most honoured, and ${rest.recorded} others.`}
      table={{
        head: ["Group", ...spec.keys.map((k) => k.label)],
        rows: data.map((row) => [
          row.group,
          ...keys.map(
            (key) => `${(row as Record<string, number | string>)[key]}%`,
          ),
        ]),
      }}
    >
      <ChartContainer config={config} className="aspect-auto h-40 w-full">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
        >
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis
            type="category"
            dataKey="group"
            width={128}
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                formatter={(value, name) => (
                  <span className="flex w-full justify-between gap-4">
                    <span className="text-muted-foreground">
                      {config[String(name) as keyof typeof config]?.label ??
                        name}
                    </span>
                    <span className="font-mono text-foreground tabular-nums">
                      {value}%
                    </span>
                  </span>
                )}
              />
            }
          />
          {spec.keys.map((k, index) => (
            <Bar
              {...STATIC}
              key={k.key}
              dataKey={k.key}
              stackId="share"
              fill={`var(--color-${k.key})`}
              {...SEGMENT_GAP}
              radius={
                index === 0
                  ? [4, 0, 0, 4]
                  : index === spec.keys.length - 1
                    ? [0, 4, 4, 0]
                    : 0
              }
              maxBarSize={28}
            />
          ))}
        </BarChart>
      </ChartContainer>
    </Figure>
  );
}

export function FlashLeadersChart({
  flash,
}: {
  flash: MagazineIndexAnalytics["flash"];
}) {
  const config = {
    selections: { label: "Selections", color: STEP.full },
  } satisfies ChartConfig;
  return (
    <Figure
      title="Flash fiction’s most anthologised magazines"
      caption={`Pieces chosen for Best Microfiction and Best Small Fictions since ${flash.firstEdition}.`}
      table={{
        head: ["Magazine", "Selections"],
        rows: flash.leaders.map((l) => [l.name, l.selections]),
      }}
    >
      <ChartContainer config={config} className="aspect-auto h-80 w-full">
        <BarChart
          data={flash.leaders}
          layout="vertical"
          margin={{ top: 0, right: 32, left: 0, bottom: 0 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={128}
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideIndicator />}
          />
          <Bar
            {...STATIC}
            dataKey="selections"
            fill="var(--color-selections)"
            radius={[0, 4, 4, 0]}
            maxBarSize={18}
          >
            <LabelList
              dataKey="selections"
              position="right"
              className="fill-foreground"
              fontSize={12}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </Figure>
  );
}

const PILLAR_NAMES: Record<string, string> = {
  accolades: "Honours",
  pay: "Pay",
  turnaround: "Reply time",
  fees: "Fees",
  respect: "Submission policy",
  formatEthics: "Archive and ethics",
};

export function CoverageChart({
  coverage,
}: {
  coverage: MagazineIndexCoverage;
}) {
  const total = coverage.magazineCounts.overall;
  const data = Object.entries(coverage.pillars).map(([key, counts]) => ({
    pillar: PILLAR_NAMES[key] ?? key,
    recorded: percentOf(counts.recorded, total),
    partial: percentOf(counts.partial, total),
    unknown: percentOf(counts.unknown, total),
  }));
  const config = {
    recorded: { label: "Recorded", color: STEP.full },
    partial: { label: "Partly recorded", color: STEP.light },
    unknown: { label: "Not recorded", color: STEP.neutral },
  } satisfies ChartConfig;
  return (
    <Figure
      title="How much of each measure is on record"
      legend={[
        { label: "Recorded", color: STEP.full },
        { label: "Partly recorded", color: STEP.light },
        { label: "Not recorded", color: STEP.neutral },
      ]}
      caption={`Across the ${total.toLocaleString()} magazines in the ${coverage.year} index.`}
      table={{
        head: ["Measure", "Recorded", "Partly recorded", "Not recorded"],
        rows: data.map((d) => [
          d.pillar,
          `${d.recorded}%`,
          `${d.partial}%`,
          `${d.unknown}%`,
        ]),
      }}
    >
      <ChartContainer config={config} className="aspect-auto h-72 w-full">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
        >
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis
            type="category"
            dataKey="pillar"
            width={128}
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                formatter={(value, name) => (
                  <span className="flex w-full justify-between gap-4">
                    <span className="text-muted-foreground">
                      {config[String(name) as keyof typeof config]?.label ??
                        name}
                    </span>
                    <span className="font-mono text-foreground tabular-nums">
                      {value}%
                    </span>
                  </span>
                )}
              />
            }
          />
          <Bar
            {...STATIC}
            dataKey="recorded"
            stackId="c"
            fill="var(--color-recorded)"
            {...SEGMENT_GAP}
            radius={[4, 0, 0, 4]}
            maxBarSize={20}
          />
          <Bar
            {...STATIC}
            dataKey="partial"
            stackId="c"
            fill="var(--color-partial)"
            {...SEGMENT_GAP}
            maxBarSize={20}
          />
          <Bar
            {...STATIC}
            dataKey="unknown"
            stackId="c"
            fill="var(--color-unknown)"
            {...SEGMENT_GAP}
            radius={[0, 4, 4, 0]}
            maxBarSize={20}
          />
        </BarChart>
      </ChartContainer>
    </Figure>
  );
}
