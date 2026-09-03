"use client";

import { useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Filter, RefreshCw, RotateCcw } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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

function DesktopFilters({
  locations,
  facetCounts,
  activeFilterCount,
}: {
  locations: Array<{ value: string; label: string }>;
  facetCounts: OpportunityFacetCounts;
  activeFilterCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedTypes = searchParams.getAll("type");
  const selectedTerms = searchParams.getAll("taxonomy");

  function navigate(next: URLSearchParams) {
    next.delete("cursor");
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function toggle(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    const values = next.getAll(key);
    const selected = values.includes(value);
    next.delete(key);
    for (const candidate of values.filter((candidate) => candidate !== value))
      next.append(key, candidate);
    if (!selected) next.append(key, value);
    if (key === "taxonomy") {
      if (next.getAll(key).length) {
        next.set("taxonomyDescendants", "1");
        next.set("taxonomyVersion", String(MISSA_TAXONOMY.scheme.version));
      } else {
        next.delete("taxonomyDescendants");
        next.delete("taxonomyVersion");
      }
    }
    navigate(next);
  }

  function setValue(key: string, value?: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    navigate(next);
  }

  function setDeadline(value?: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("deadline");
    next.delete("deadlineWithinDays");
    if (value === "rolling") next.set("deadline", value);
    else if (value) next.set("deadlineWithinDays", value);
    navigate(next);
  }

  function clearAll() {
    const next = new URLSearchParams(searchParams.toString());
    for (const key of ["type", "taxonomy", "taxonomyDescendants", "taxonomyVersion", "location", "fee", "deadlineWithinDays", "deadline"])
      next.delete(key);
    navigate(next);
  }

  function menu(label: string, selectedCount: number, content: ReactNode) {
    return (
      <Popover>
        <PopoverTrigger render={<Button type="button" variant="outline" className={styles.filterTrigger} />}>
          {label}{selectedCount ? <span className={styles.triggerCount}>{selectedCount}</span> : null}
          <ChevronDown aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent align="start" className={styles.optionPopover}>{content}</PopoverContent>
      </Popover>
    );
  }

  const deadline = searchParams.get("deadlineWithinDays");
  const deadlineKind = searchParams.get("deadline");
  const fee = searchParams.get("fee");
  const location = searchParams.get("location");

  return (
    <div className={styles.desktopFilterBar} aria-label="Opportunity filters">
      {menu("Type", selectedTypes.length, <Command>
        <CommandInput placeholder="Find a type…" />
        <CommandList><CommandEmpty>No types found.</CommandEmpty><CommandGroup>
          {facetCounts.types.map((option) => <CommandItem key={option.value} value={option.label} data-checked={selectedTypes.includes(option.value)} onSelect={() => toggle("type", option.value)}>
            <Checkbox checked={selectedTypes.includes(option.value)} aria-hidden="true" tabIndex={-1} />
            <span>{option.label}</span><span className={styles.optionCount}>{option.count.toLocaleString()}</span>
          </CommandItem>)}
        </CommandGroup></CommandList>
      </Command>)}
      {menu("Discipline", selectedTerms.length, <Command>
        <CommandInput placeholder="Find a discipline…" />
        <CommandList><CommandEmpty>No disciplines found.</CommandEmpty><CommandGroup>
          {facetCounts.practices.map((option) => <CommandItem key={option.value} value={option.label} data-checked={selectedTerms.includes(option.value)} onSelect={() => toggle("taxonomy", option.value)}>
            <Checkbox checked={selectedTerms.includes(option.value)} aria-hidden="true" tabIndex={-1} />
            <span>{option.label}</span><span className={styles.optionCount}>{option.count.toLocaleString()}</span>
          </CommandItem>)}
        </CommandGroup></CommandList>
      </Command>)}
      {menu(location ? "Location · 1" : "Location", 0, <Command>
        <CommandInput placeholder="Find a location…" />
        <CommandList><CommandEmpty>No locations found.</CommandEmpty><CommandGroup>
          <CommandItem value="Anywhere" data-checked={!location} onSelect={() => setValue("location")}><span>Anywhere</span></CommandItem>
          {locations.map((option) => <CommandItem key={option.value} value={option.label} data-checked={location === option.value} onSelect={() => setValue("location", option.value)}><span>{option.label}</span></CommandItem>)}
        </CommandGroup></CommandList>
      </Command>)}
      {menu("Deadline", deadline || deadlineKind ? 1 : 0, <Command><CommandList><CommandGroup>
        {[["", "Any time"], ["7", "Closing this week"], ["30", "Next 30 days"], ["90", "Next 90 days"], ["rolling", "Rolling / year-round"]].map(([value, label]) => <CommandItem key={label} data-checked={value === "rolling" ? deadlineKind === value : (deadline ?? "") === value} onSelect={() => setDeadline(value)}>{label}</CommandItem>)}
      </CommandGroup></CommandList></Command>)}
      {menu("Fee", fee ? 1 : 0, <Command><CommandList><CommandGroup>
        {[["", "Any fee"], ["no-fee", "No fee"], ["paid", "Application fee"], ["unknown", "Fee not listed"]].map(([value, label]) => <CommandItem key={label} data-checked={(fee ?? "") === value} onSelect={() => setValue("fee", value)}>{label}</CommandItem>)}
      </CommandGroup></CommandList></Command>)}
      {activeFilterCount ? <Button type="button" variant="ghost" className={styles.resetButton} onClick={clearAll}><RotateCcw aria-hidden="true" />Reset <span>{activeFilterCount}</span></Button> : null}
    </div>
  );
}

function FilterPanel({
  locations,
  facetCounts,
  onDone,
  resultCount,
}: {
  locations: Array<{ value: string; label: string }>;
  facetCounts: OpportunityFacetCounts;
  onDone?: () => void;
  resultCount?: number;
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

  function updateDeadline(value: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("deadline");
    next.delete("deadlineWithinDays");
    if (value === "rolling") next.set("deadline", value);
    else if (value) next.set("deadlineWithinDays", value);
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
      "deadline",
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
                aria-label={label}
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
          value={searchParams.get("deadline") ?? searchParams.get("deadlineWithinDays") ?? ""}
          onChange={(event) => updateDeadline(event.target.value)}
        >
          <option value="">Any time</option>
          <option value="7">Closing this week</option>
          <option value="30">Next 30 days</option>
          <option value="90">Next 90 days</option>
          <option value="rolling">Rolling / year-round</option>
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
        Show {resultCount?.toLocaleString() ?? ""} opportunities
      </Button>
    </form>
  );
}

export function OpportunityCatalogueFilters({
  locations,
  activeFilterCount,
  facetCounts,
  resultCount,
  placement = "all",
}: {
  locations: Array<{ value: string; label: string }>;
  activeFilterCount: number;
  facetCounts: OpportunityFacetCounts;
  resultCount: number;
  placement?: "all" | "desktop" | "mobile";
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className={`${styles.root} ${placement === "desktop" ? styles.desktopRoot : placement === "mobile" ? styles.mobileRoot : ""}`}>
      {placement !== "mobile" ? <div className={styles.desktopControls}>
        <DesktopFilters locations={locations} facetCounts={facetCounts} activeFilterCount={activeFilterCount} />
      </div> : null}
      {placement !== "desktop" ? <div className={styles.mobileControls}>
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
      </div> : null}
      {placement !== "desktop" ? <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
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
              resultCount={resultCount}
            />
          </div>
        </SheetContent>
      </Sheet> : null}
    </div>
  );
}
