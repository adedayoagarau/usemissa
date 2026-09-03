"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bookmark, CalendarDays, Search } from "lucide-react";
import type { TrackerProductItem } from "@/components/tracker-product";
import styles from "./saved-opportunities.module.css";

function formatDeadline(item: TrackerProductItem): string {
  if (item.deadline) {
    return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(`${item.deadline}T12:00:00`));
  }
  if (item.deadlineKind === "rolling") return "Rolling deadline";
  if (item.deadlineKind === "until-filled") return "Until filled";
  if (item.deadlineKind === "conflicting") return "Deadline needs confirmation";
  return "Deadline not listed";
}

function typeLabel(value: string): string {
  return value.replaceAll("-", " ").replace(/^./u, (character) => character.toUpperCase());
}

export function SavedOpportunities({ initialItems }: { initialItems: TrackerProductItem[] }) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"all" | "soon" | "undated">("all");
  const items = useMemo(() => initialItems.filter((item) => {
    const matchesQuery = `${item.title} ${item.organizationName ?? ""} ${item.type}`.toLocaleLowerCase("en").includes(query.trim().toLocaleLowerCase("en"));
    const matchesScope = scope === "all" || (scope === "soon" ? item.daysToDeadline !== undefined && item.daysToDeadline >= 0 && item.daysToDeadline <= 14 : !item.deadline);
    return matchesQuery && matchesScope;
  }).sort((a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999")), [initialItems, query, scope]);

  return <div className={styles.product}>
    <header className={styles.header}>
      <div>
        <h1>Saved</h1>
        <p>Your private shortlist. Review fit here, then move serious applications into preparation in Tracker.</p>
      </div>
      <Link href="/opportunities">Find opportunities <ArrowRight aria-hidden="true" /></Link>
    </header>

    {initialItems.length ? <>
      <div className={styles.tools}>
        <label><Search aria-hidden="true" /><span className="sr-only">Search saved opportunities</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search saved opportunities" /></label>
        <div role="group" aria-label="Filter saved opportunities">
          {([['all', 'All'], ['soon', 'Closing in 14 days'], ['undated', 'No date']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={scope === value} onClick={() => setScope(value)}>{label}</button>)}
        </div>
      </div>
      <div className={styles.resultHeading} role="status" aria-live="polite"><h2>{items.length} saved {items.length === 1 ? "opportunity" : "opportunities"}</h2><span>Sorted by deadline</span></div>
      {items.length ? <div className={styles.grid}>{items.map((item) => <article key={item.opportunityId} className={styles.card}>
        <div className={styles.cardTop}><span className={styles.mark}><Bookmark aria-hidden="true" /></span><span data-urgent={item.daysToDeadline !== undefined && item.daysToDeadline >= 0 && item.daysToDeadline <= 7 || undefined}>{item.daysToDeadline !== undefined && item.daysToDeadline >= 0 ? `${item.daysToDeadline} days left` : typeLabel(item.type)}</span></div>
        <div><h3>{item.title}</h3><p>{item.organizationName ?? "Organization not listed"}</p></div>
        <dl><div><dt><CalendarDays aria-hidden="true" />Deadline</dt><dd>{formatDeadline(item)}</dd></div><div><dt>Type</dt><dd>{typeLabel(item.type)}</dd></div></dl>
        <div className={styles.actions}><Link href={`/opportunities/${encodeURIComponent(item.opportunityId)}`}>Review opportunity <ArrowRight aria-hidden="true" /></Link><Link href="/tracker">Open in Tracker</Link></div>
      </article>)}</div> : <section className={styles.empty}><Search aria-hidden="true" /><h2>No saved opportunities match</h2><p>Clear the search or choose a different deadline view.</p><button type="button" onClick={() => { setQuery(""); setScope("all"); }}>Show everything saved</button></section>}
    </> : <section className={styles.empty}><Bookmark aria-hidden="true" /><h2>Save opportunities worth another look</h2><p>Your shortlist stays private. Saving does not start an application or confirm eligibility.</p><Link href="/opportunities">Browse opportunities</Link></section>}
  </div>;
}
