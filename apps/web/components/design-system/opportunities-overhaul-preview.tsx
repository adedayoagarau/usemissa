"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, Filter, LoaderCircle, Search, SlidersHorizontal } from "lucide-react";
import { MissaWordmark } from "@/components/missa-wordmark";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { OpportunityCard, OpportunityDetail } from "@/components/opportunity-disclosure/opportunity-disclosure";
import { opportunityFixtureById, opportunityFixtures, opportunityFixtureScenarios } from "@/components/opportunity-disclosure/fixtures";
import styles from "./opportunities-overhaul-preview.module.css";

type ReviewState = "results" | "loading" | "empty" | "error";
const typeOptions = ["All", "Magazine", "Open call", "Residency", "Contest", "Commission"] as const;

function FilterControls({ groupName, selectedType, setSelectedType }: { groupName: string; selectedType: string; setSelectedType: (value: string) => void }) {
  return <fieldset className={styles.filters}><legend>Opportunity type</legend>{typeOptions.map((option) => <label key={option}><input type="radio" name={groupName} value={option} checked={selectedType === option} onChange={() => setSelectedType(option)} /><span>{option}</span></label>)}</fieldset>;
}

export function OpportunitiesOverhaulPreview({ selectedFixtureId }: { selectedFixtureId?: string }) {
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [reviewState, setReviewState] = useState<ReviewState>("results");
  const selectedFixture = selectedFixtureId ? opportunityFixtureById(selectedFixtureId) : undefined;
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return opportunityFixtures.filter(({ opportunity }) => {
      const type = opportunity.type.replace(/-/gu, " ").replace(/^./u, (letter) => letter.toUpperCase());
      const typeMatches = selectedType === "All" || type === selectedType;
      const queryMatches = !normalized || [opportunity.title, opportunity.organizationName, opportunity.discipline, ...opportunity.genres].filter(Boolean).join(" ").toLocaleLowerCase().includes(normalized);
      return typeMatches && queryMatches;
    });
  }, [query, selectedType]);

  if (selectedFixture) return <div className={styles.shell} data-density="comfortable"><a href="#phase-one-main" className={styles.skipLink}>Skip to opportunity</a><header className={styles.header}><MissaWordmark size="app" /><p>Phase 1 · disclosure reference</p><Link href="/design-system/opportunities-overhaul">All fixtures</Link></header><main id="phase-one-main" className={styles.detailMain}><OpportunityDetail opportunity={selectedFixture.opportunity} backHref="/design-system/opportunities-overhaul" /></main></div>;

  const activeResults = reviewState === "results" ? filtered : [];
  return <div className={styles.shell} data-density="comfortable">
    <a href="#phase-one-main" className={styles.skipLink}>Skip to opportunities</a>
    <header className={styles.header}><MissaWordmark size="app" /><p>Phase 1 · disclosure reference</p><Link href="/design-system">Design system index</Link></header>
    <main id="phase-one-main" className={styles.main}>
      <section className={styles.intro} aria-labelledby="phase-one-title"><div><p className={styles.eyebrow}>Opportunity discovery</p><h1 id="phase-one-title">Find the call worth preparing for.</h1></div><p>Scan decisive facts, understand what is unknown, then open the complete source-backed record before committing your time.</p></section>
      <section className={styles.reviewBar} aria-label="Fixture review controls"><div><strong>Review states</strong><span>{opportunityFixtureScenarios.length} disclosure scenarios</span></div><div className={styles.stateButtons}>{(["results", "loading", "empty", "error"] as const).map((state) => <button key={state} type="button" aria-pressed={reviewState === state} onClick={() => setReviewState(state)}>{state === "results" ? "Results" : state === "empty" ? "No results" : state === "error" ? "Recoverable error" : "Loading"}</button>)}</div></section>
      <section className={styles.searchArea} aria-labelledby="phase-one-search-label"><label id="phase-one-search-label" htmlFor="phase-one-search">Search opportunities</label><div className={styles.searchField} role="search"><Search aria-hidden="true" /><input id="phase-one-search" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setReviewState("results"); }} placeholder="Title, organization, or practice" /></div></section>
      <div className={styles.workspace}>
        <aside className={styles.sidebar} aria-label="Opportunity filters"><div className={styles.filterHeading}><SlidersHorizontal aria-hidden="true" /><h2>Refine</h2></div><FilterControls groupName="phase-one-type-desktop" selectedType={selectedType} setSelectedType={(value) => { setSelectedType(value); setReviewState("results"); }} /></aside>
        <section className={styles.results} aria-labelledby="phase-one-results-title" aria-live="polite"><div className={styles.resultsHeader}><div><p className={styles.eyebrow}>Curated catalogue</p><h2 id="phase-one-results-title">{reviewState === "results" ? `${activeResults.length} opportunity ${activeResults.length === 1 ? "fixture" : "fixtures"}` : reviewState === "loading" ? "Loading opportunities" : reviewState === "empty" ? "No opportunities found" : "Opportunities unavailable"}</h2></div><Sheet><SheetTrigger render={<Button type="button" variant="outline" className={styles.mobileFilter}><Filter aria-hidden="true" />Filters{selectedType === "All" ? "" : " · 1"}</Button>} /><SheetContent side="bottom" className={styles.sheetContent}><SheetHeader><SheetTitle>Filter opportunities</SheetTitle><SheetDescription>Choose one opportunity type. Closing returns focus to the Filters button.</SheetDescription></SheetHeader><FilterControls groupName="phase-one-type-mobile" selectedType={selectedType} setSelectedType={(value) => { setSelectedType(value); setReviewState("results"); }} /><SheetFooter><SheetClose render={<Button type="button">Done</Button>} /></SheetFooter></SheetContent></Sheet></div>
          {reviewState === "loading" ? <div className={styles.statePanel} role="status"><LoaderCircle className={styles.spinner} aria-hidden="true" /><h3>Loading opportunities</h3><p>The result count will update when the catalogue is ready.</p></div> : reviewState === "empty" || (reviewState === "results" && activeResults.length === 0) ? <div className={styles.statePanel}><Search aria-hidden="true" /><h3>No opportunities match this view</h3><p>Clear the search or choose another type to return to the full fixture catalogue.</p><button type="button" onClick={() => { setQuery(""); setSelectedType("All"); setReviewState("results"); }}>Clear filters</button></div> : reviewState === "error" ? <div className={styles.statePanel} role="alert"><AlertCircle aria-hidden="true" /><h3>Opportunities could not be loaded</h3><p>Your filters are unchanged. Try the catalogue again.</p><button type="button" onClick={() => setReviewState("results")}>Try again</button></div> : <><div className={styles.resultGrid}>{activeResults.map(({ id, opportunity }) => <OpportunityCard key={id} opportunity={opportunity} href={`/design-system/opportunities-overhaul?fixture=${encodeURIComponent(id)}`} />)}</div><div className={styles.pagination} aria-label="Pagination status"><p>Showing all {activeResults.length} deterministic fixtures</p><button type="button" disabled>Load more</button></div></>}
        </section>
      </div>
    </main>
  </div>;
}
