import type { ProfileCard, ProfileKind } from "@missa/radar-adapters";
import { getSemanticUrlForProfile } from "@missa/radar-adapters";
import Link from "next/link";
import { Search, Building2, BookOpen, Sparkles, Trophy, Palette, ArrowRight } from "lucide-react";
import { MagazineScheduleBadge } from "./ui/magazine-schedule-badge";

export const KIND_METADATA: Record<string, { label: string; plural: string; path: string; icon: typeof Building2; countLabel: string }> = {
  gallery: { label: "Art Gallery", plural: "Galleries & Arts Organizations", path: "/organizations", icon: Palette, countLabel: "galleries" },
  organization: { label: "Organization", plural: "Organizations", path: "/organizations", icon: Building2, countLabel: "organizations" },
  all: { label: "All Institutions", plural: "All Directory", path: "/directory", icon: Building2, countLabel: "9,120+ institutions" },
  residency_center: { label: "Artist Residency", plural: "Residencies", path: "/residencies", icon: Sparkles, countLabel: "985 centers" },
  literary_magazine: { label: "Literary Journal", plural: "Literary Journals", path: "/journals", icon: BookOpen, countLabel: "1,680+ magazines" },
  grant_foundation: { label: "Grant Foundation", plural: "Grants & Foundations", path: "/grants", icon: Trophy, countLabel: "725 foundations" },
  visual_arts_organization: { label: "Arts Organization", plural: "Galleries & Nonprofits", path: "/organizations", icon: Palette, countLabel: "5,430 organizations" },
  small_press: { label: "Small Press", plural: "Independent Presses", path: "/presses", icon: BookOpen, countLabel: "296 presses" },
};

function safeHostname(url?: string | null): string {
  if (!url) return "Verified directory";
  try {
    const formatted = url.startsWith("http") ? url : `https://${url}`;
    return new URL(formatted).hostname.replace(/^www\./, "");
  } catch {
    return "Verified directory";
  }
}

interface InstitutionDirectoryViewProps {
  eyebrow?: string;
  title: string;
  description: string;
  basePath: string;
  items: ProfileCard[];
  total: number;
  page: number;
  pageSize: number;
  query?: string;
  activeKind?: ProfileKind;
  showKindFilterTabs?: boolean;
}

export function InstitutionDirectoryView({
  eyebrow = "Missa Directory",
  title,
  description,
  basePath,
  items,
  total,
  page,
  pageSize,
  query = "",
  activeKind,
  showKindFilterTabs = true,
}: InstitutionDirectoryViewProps) {
  const pageCount = Math.ceil(total / pageSize);

  const buildHref = (nextPage: number, nextKind?: string, nextQuery?: string) => {
    const params = new URLSearchParams();
    const effectiveKind = nextKind !== undefined ? nextKind : (activeKind || "");
    const effectiveQuery = nextQuery !== undefined ? nextQuery : query;
    if (effectiveKind) params.set("kind", effectiveKind);
    if (effectiveQuery) params.set("q", effectiveQuery);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const tabs = [
    { kind: "", label: "All (9,123)", path: "/directory" },
    { kind: "residency_center", label: "Residencies (985)", path: "/residencies" },
    { kind: "literary_magazine", label: "Journals (1,687)", path: "/journals" },
    { kind: "grant_foundation", label: "Grants (725)", path: "/grants" },
    { kind: "visual_arts_organization", label: "Visual Arts (5,430)", path: "/organizations" },
    { kind: "small_press", label: "Presses (296)", path: "/presses" },
  ];

  return (
    <div className="mx-auto min-h-screen max-w-7xl min-w-0 px-4 py-10 sm:px-6 sm:py-14">
      {/* Header */}
      <header className="max-w-3xl">
        <p className="font-mono text-xs font-semibold tracking-wider text-primary uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
          {description}
        </p>
      </header>

      {/* Semantic Vertical Navigation Tabs */}
      {showKindFilterTabs ? (
        <nav className="mt-8 flex flex-wrap items-center gap-2 border-b border-border pb-4" aria-label="Directory categories">
          {tabs.map((tab) => {
            const isSelected = activeKind === tab.kind || (!activeKind && tab.kind === "");
            return (
              <Link
                key={tab.label}
                href={tab.path}
                className={`inline-flex items-center rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      ) : null}

      {/* Search & Filter Bar */}
      <form
        action={basePath}
        method="get"
        className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center"
        role="search"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id="directory-search"
            name="q"
            defaultValue={query}
            placeholder={`Search ${activeKind ? KIND_METADATA[activeKind]?.plural.toLowerCase() : "institutions, residencies, presses..."}`}
            className="min-h-11 w-full rounded-xl border border-input bg-card pl-10 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>
        {activeKind ? <input type="hidden" name="kind" value={activeKind} /> : null}
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary"
        >
          Search
        </button>
      </form>

      {/* Count Ledger */}
      <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground" role="status" aria-live="polite">
        <span>
          <strong>{total.toLocaleString()}</strong> verified {total === 1 ? "profile" : "profiles"}
          {query ? ` matching “${query}”` : ""}
        </span>
        {pageCount > 1 ? (
          <span>
            Page {page} of {pageCount}
          </span>
        ) : null}
      </div>

      {/* Cards Grid */}
      {items.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const detailUrl = getSemanticUrlForProfile(item.kind, item.slug);
            const kindMeta = KIND_METADATA[item.kind] || KIND_METADATA.all;
            const Icon = kindMeta.icon;

            return (
              <Link
                key={item.id}
                href={detailUrl}
                className="group flex flex-col justify-between rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-sm"
              >
                <div>
                  <div className="flex items-start gap-3.5">
                    {item.mediaUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.mediaUrl}
                        alt={item.mediaAlt || item.name}
                        loading="lazy"
                        decoding="async"
                        className="size-12 shrink-0 rounded-lg border border-border/60 object-cover"
                      />
                    ) : (
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/30 text-muted-foreground">
                        <Icon className="size-5 opacity-70" aria-hidden="true" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-block font-mono text-[11px] font-medium tracking-wide text-primary uppercase">
                          {kindMeta.label}
                        </span>
                        {item.schedule ? (
                          <MagazineScheduleBadge schedule={item.schedule} />
                        ) : null}
                      </div>
                      <h2 className="mt-0.5 font-heading text-base font-semibold leading-snug text-foreground break-words group-hover:text-primary">
                        {item.name}
                      </h2>
                    </div>
                  </div>

                  {item.summary ? (
                    <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {item.summary}
                    </p>
                  ) : null}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  <span className="truncate">
                    {item.websiteUrl ? (
                      <span className="hover:underline">
                        {safeHostname(item.websiteUrl)}
                      </span>
                    ) : (
                      "Verified directory"
                    )}
                  </span>
                  <span className="flex items-center gap-1 font-medium text-foreground opacity-70 group-hover:opacity-100">
                    View profile <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mt-12 rounded-xl border border-dashed border-border p-12 text-center">
          <Building2 className="mx-auto size-8 text-muted-foreground/60" aria-hidden="true" />
          <h2 className="mt-3 text-base font-semibold text-foreground">No profiles match these filters</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting your search terms or view the full institutional directory.
          </p>
          <Link
            href={basePath}
            className="mt-4 inline-flex items-center rounded-lg bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80"
          >
            Clear filters
          </Link>
        </div>
      )}

      {/* Pagination Controls */}
      {pageCount > 1 ? (
        <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
          {page > 1 ? (
            <Link
              href={buildHref(page - 1)}
              className="inline-flex min-h-9 items-center rounded-lg border border-border px-3.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              Previous
            </Link>
          ) : null}
          <span className="px-2 text-xs text-muted-foreground">
            Page {page} of {pageCount}
          </span>
          {page < pageCount ? (
            <Link
              href={buildHref(page + 1)}
              className="inline-flex min-h-9 items-center rounded-lg border border-border px-3.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              Next
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
