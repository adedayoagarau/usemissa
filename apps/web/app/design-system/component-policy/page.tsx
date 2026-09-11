import type { Metadata } from "next";
import Link from "next/link";

import catalogue from "@/component-catalogue.json";
import policy from "@/component-policy.json";

export const metadata: Metadata = {
  title: "Component policy · Missa design system",
  description: "The machine-readable map from product intent to approved Missa and Shadcn Studio components.",
  robots: { index: false, follow: false },
};

function formatName(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[._-]/g, " ")
    .replace(/^./, (character) => character.toUpperCase());
}

function describeEntry(value: unknown) {
  if (Array.isArray(value)) return value.join(" + ");
  if (!value || typeof value !== "object") return String(value);
  const entry = value as Record<string, unknown>;
  return [entry.semantic, entry.primitive, entry.base, entry.composition, entry.variant, entry.disclosure, entry.container]
    .flatMap((part) => (Array.isArray(part) ? part : part ? [part] : []))
    .join(" · ");
}

export default function ComponentPolicyPage() {
  const semanticEntries = Object.entries(policy.semanticComponents);

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground sm:px-10 lg:px-16 lg:py-14">
      <div className="mx-auto max-w-7xl">
        <header className="border-b border-border pb-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link className="text-sm font-medium text-primary underline-offset-4 hover:underline" href="/design-system">
              Back to selected system
            </Link>
            <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
              Policy {policy.version}
            </span>
          </div>
          <p className="mt-10 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Missa component policy</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Product intent chooses the component.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground">
            This catalogue connects Missa semantics to installed primitives and the local licensed Studio library. A
            registry item is source material; Missa tokens, content rules, and accessibility determine whether it is
            approved for product use.
          </p>
        </header>

        <dl className="grid border-b border-border sm:grid-cols-2 lg:grid-cols-4">
          <div className="border-b border-border py-6 sm:border-b-0 sm:border-e sm:pe-6">
            <dt className="text-sm text-muted-foreground">Studio families</dt>
            <dd className="mt-2 font-mono text-3xl">{catalogue.familyCount}</dd>
          </div>
          <div className="border-b border-border py-6 sm:border-b-0 sm:border-e sm:px-6">
            <dt className="text-sm text-muted-foreground">Installed variants</dt>
            <dd className="mt-2 font-mono text-3xl">{catalogue.variantCount}</dd>
          </div>
          <div className="border-b border-border py-6 sm:border-b-0 sm:border-e sm:px-6">
            <dt className="text-sm text-muted-foreground">Studio variants observed</dt>
            <dd className="mt-2 font-mono text-3xl">{catalogue.studioObservedVariantCount}</dd>
          </div>
          <div className="py-6 lg:ps-6">
            <dt className="text-sm text-muted-foreground">Semantic mappings</dt>
            <dd className="mt-2 font-mono text-3xl">{semanticEntries.length}</dd>
          </div>
        </dl>

        <section className="py-12" aria-labelledby="intent-heading">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Decision map</p>
          <h2 id="intent-heading" className="mt-3 text-2xl font-semibold tracking-tight">Intent → approved construction</h2>
          <div className="mt-6 overflow-hidden rounded-xl border border-border">
            <table className="w-full border-collapse text-start text-sm">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr><th className="px-4 py-3 text-start font-medium">User intent</th><th className="px-4 py-3 text-start font-medium">Use</th></tr>
              </thead>
              <tbody>
                {Object.entries(policy.intents).map(([intent, entry]) => (
                  <tr className="border-t border-border" key={intent}>
                    <th className="px-4 py-3 text-start font-medium">{formatName(intent)}</th>
                    <td className="px-4 py-3 text-muted-foreground">{describeEntry(entry)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border-t border-border py-12" aria-labelledby="semantic-heading">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Missa semantics</p>
          <h2 id="semantic-heading" className="mt-3 text-2xl font-semibold tracking-tight">Approved domain components</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {semanticEntries.map(([name, rawEntry]) => {
              const entry = rawEntry as Record<string, unknown>;
              const candidates = [
                ...((entry.studioCandidates as string[] | undefined) ?? []),
                ...((entry.studioReferences as string[] | undefined) ?? []),
              ];
              return (
                <article className="rounded-xl border border-border bg-card p-5" key={name}>
                  <h3 className="font-semibold">{formatName(name)}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Base: {String(entry.base ?? "composition")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Motion: {formatName(String(entry.motion))}</p>
                  {candidates.length > 0 && (
                    <p className="mt-4 font-mono text-xs leading-5 text-primary">{candidates.join(" · ")}</p>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="border-t border-border py-12" aria-labelledby="catalogue-heading">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Installed source</p>
          <h2 id="catalogue-heading" className="mt-3 text-2xl font-semibold tracking-tight">Complete Studio catalogue</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Every identifier below resolves to checked-in source under <code className="font-mono text-xs">components/shadcn-studio</code>. These are available for evaluation, not automatically approved for product use.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {catalogue.families.map((family) => (
              <details className="rounded-xl border border-border bg-card p-4" key={family.family}>
                <summary className="cursor-pointer font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {formatName(family.family)} <span className="font-mono text-xs text-muted-foreground">{family.count} local / {family.studioObservedCount ?? "—"} Studio</span>
                </summary>
                <p className="mt-4 break-words font-mono text-xs leading-6 text-muted-foreground">{family.variants.join(" · ") || "No numbered local variants"}</p>
              </details>
            ))}
          </div>
        </section>

        <footer className="border-t border-border py-8 text-sm leading-6 text-muted-foreground">
          Inventory generated from local source and verified against the authenticated Studio catalogue on {catalogue.observedAt}.
          {" "}{catalogue.note}
        </footer>
      </div>
    </main>
  );
}
