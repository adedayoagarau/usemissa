"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Filter, RefreshCw } from "lucide-react";
import {
  MISSA_TAXONOMY,
  taxonomyTermById,
  type TaxonomyFacetKey,
} from "@missa/taxonomy";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import styles from "./opportunity-catalogue-filters.module.css";
import type { OpportunityFacetCounts } from "@/lib/opportunityFacetCounts";

const visibleFacets = MISSA_TAXONOMY.facets
  .filter((facet) => facet.userVisible)
  .sort((a, b) => a.sortOrder - b.sortOrder);

function termsForFacet(facet: TaxonomyFacetKey) {
  return MISSA_TAXONOMY.terms
    .filter((term) => term.selectable && term.facet === facet)
    .sort((a, b) => a.preferredLabel.localeCompare(b.preferredLabel));
}

function FilterPanel({
  locations,
  facetCounts,
  onDone,
}: {
  locations: Array<{ value: string; label: string }>;
  facetCounts: OpportunityFacetCounts;
  onDone?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const selectedTypes = searchParams.getAll("type");
  const selectedTerms = searchParams.getAll("taxonomy");
  function navigate(next: URLSearchParams) {
    next.delete("cursor");
    const query = next.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
      onDone?.();
    });
  }

  function toggleValue(key: string, value: string, checked: boolean) {
    const next = new URLSearchParams(searchParams.toString());
    const retained = next
      .getAll(key)
      .filter((candidate) => candidate !== value);
    next.delete(key);
    for (const candidate of retained) next.append(key, candidate);
    if (checked) next.append(key, value);
    if (key === "taxonomy") {
      if (next.getAll("taxonomy").length > 0) {
        next.set("taxonomyDescendants", "1");
        next.set("taxonomyVersion", String(MISSA_TAXONOMY.scheme.version));
      } else {
        next.delete("taxonomyDescendants");
        next.delete("taxonomyVersion");
      }
    }
    navigate(next);
  }

  function setFacet(facet: TaxonomyFacetKey, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    const retained = next
      .getAll("taxonomy")
      .filter((termId) => taxonomyTermById(termId)?.facet !== facet);
    next.delete("taxonomy");
    for (const termId of retained) next.append("taxonomy", termId);
    if (value) next.append("taxonomy", value);
    if (retained.length || value) {
      next.set("taxonomyDescendants", "1");
      next.set("taxonomyVersion", String(MISSA_TAXONOMY.scheme.version));
    } else {
      next.delete("taxonomyDescendants");
      next.delete("taxonomyVersion");
    }
    navigate(next);
  }

  function update(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    navigate(next);
  }

  function clearAll() {
    const next = new URLSearchParams(searchParams.toString());
    for (const key of [
      "type",
      "discipline",
      "genre",
      "taxonomy",
      "taxonomyDescendants",
      "taxonomyVersion",
      "location",
      "fee",
      "feeToggle",
      "verified",
      "openNow",
      "deadlineWithinDays",
      "maxFeeCents",
      "simultaneous",
    ])
      next.delete(key);
    navigate(next);
  }

  return (
    <form className={styles.panel} onSubmit={(event) => event.preventDefault()}>
      <div className={styles.heading}>
        <h2>Search filters</h2>
        <button type="button" onClick={clearAll}>
          Clear all
        </button>
      </div>

      <fieldset className={styles.group}>
        <legend>Opportunity type</legend>
        <div className={styles.checkList}>
          {facetCounts.types.map(({ value, label, count }) => (
            <label key={value} className={styles.checkRow}>
              <Checkbox
                checked={selectedTypes.includes(value)}
                onCheckedChange={(checked) =>
                  toggleValue("type", value, checked === true)
                }
              />
              <span>{label}</span>
              <small>{count.toLocaleString()}</small>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend>Categories</legend>
        <div className={styles.checkList}>
          {facetCounts.practices.map((term) => (
            <label key={term.value} className={styles.checkRow}>
              <Checkbox
                checked={selectedTerms.includes(term.value)}
                onCheckedChange={(checked) =>
                  toggleValue("taxonomy", term.value, checked === true)
                }
              />
              <span>{term.label}</span>
              <small>{term.count.toLocaleString()}</small>
            </label>
          ))}
        </div>
      </fieldset>

      <label className={styles.selectField}>
        <span>Location or eligibility reach</span>
        <select
          value={searchParams.get("location") ?? ""}
          onChange={(event) => update("location", event.target.value)}
        >
          <option value="">Anywhere</option>
          {locations.map((location) => (
            <option key={location.value} value={location.value}>
              {location.label}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.selectField}>
        <span>Deadline</span>
        <select
          value={searchParams.get("deadlineWithinDays") ?? ""}
          onChange={(event) => update("deadlineWithinDays", event.target.value)}
        >
          <option value="">Any time</option>
          <option value="7">Next 7 days</option>
          <option value="30">Next 30 days</option>
          <option value="90">Next 90 days</option>
        </select>
      </label>

      <label className={styles.selectField}>
        <span>Fee</span>
        <select
          value={searchParams.get("fee") ?? ""}
          onChange={(event) => update("fee", event.target.value)}
        >
          <option value="">Any fee</option>
          <option value="no-fee">No fee</option>
          <option value="paid">Application fee</option>
          <option value="unknown">Fee not listed</option>
        </select>
      </label>

      <details className={styles.more}>
        <summary>
          <span>
            <strong>More category filters</strong>
            <small>Keep each category separate.</small>
          </span>
          <ChevronDown aria-hidden="true" />
        </summary>
        <div className={styles.moreFields}>
          {visibleFacets
            .filter((facet) => facet.key !== "practice-family")
            .map((facet) => {
              const selected =
                selectedTerms.find(
                  (termId) => taxonomyTermById(termId)?.facet === facet.key,
                ) ?? "";
              return (
                <label key={facet.key} className={styles.selectField}>
                  <span>{facet.label}</span>
                  <select
                    value={selected}
                    onChange={(event) =>
                      setFacet(facet.key, event.target.value)
                    }
                  >
                    <option value="">Any</option>
                    {termsForFacet(facet.key).map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.preferredLabel}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
        </div>
      </details>

      <div className={styles.status} aria-live="polite">
        {pending ? (
          <>
            <RefreshCw className="animate-spin" aria-hidden="true" />
            Updating results…
          </>
        ) : null}
      </div>
      <Button type="button" className={styles.doneButton} onClick={onDone}>
        Show opportunities
      </Button>
    </form>
  );
}

export function OpportunityCatalogueFilters({
  locations,
  activeFilterCount,
  facetCounts,
}: {
  locations: Array<{ value: string; label: string }>;
  activeFilterCount: number;
  facetCounts: OpportunityFacetCounts;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className={styles.root}>
      <aside className={styles.sidebar} aria-label="Opportunity filters">
        <FilterPanel locations={locations} facetCounts={facetCounts} />
      </aside>
      <div className={styles.mobileControls}>
        <Button
          type="button"
          variant="outline"
          onClick={() => setSheetOpen(true)}
        >
          <Filter aria-hidden="true" />
          Filters
          {activeFilterCount ? (
            <span className={styles.count}>{activeFilterCount}</span>
          ) : null}
        </Button>
      </div>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className={styles.sheet}>
          <SheetHeader>
            <SheetTitle>Filter opportunities</SheetTitle>
            <SheetDescription>
              Use the details that matter for this search.
            </SheetDescription>
          </SheetHeader>
          <div className={styles.sheetBody}>
            <FilterPanel
              locations={locations}
              facetCounts={facetCounts}
              onDone={() => setSheetOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
