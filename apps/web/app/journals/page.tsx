import type { ProfileCard, ProfileKind } from "@missa/radar-adapters";
import Link from "next/link";
import { getProfileRepository } from "@/lib/profileRepository";
import { PublicSiteShell } from "@/components/public-site-shell";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 48;

function profileKind(value: string | undefined): ProfileKind | undefined {
  return value === "literary_magazine" || value === "small_press"
    ? value
    : undefined;
}

function imageAlt(profile: Pick<ProfileCard, "name" | "mediaAlt">): string {
  return profile.mediaAlt || `${profile.name} logo`;
}

function mediaSrc(id: string): string {
  return `/api/journals/${encodeURIComponent(id)}/media`;
}

export default async function JournalsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; kind?: string; page?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const repository = getProfileRepository();
  const query = params.q?.trim() ?? "";
  const kind = profileKind(params.kind);
  const page = Math.max(Number(params.page ?? "1") || 1, 1);
  const result = repository
    ? await repository.browse({
        query: query || undefined,
        kind,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      })
    : null;
  const pageCount = result ? Math.ceil(result.total / PAGE_SIZE) : 0;
  const hasFilters = Boolean(query || kind);
  const pageHref = (value: number) => {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    if (kind) search.set("kind", kind);
    search.set("page", String(value));
    return `/journals?${search.toString()}`;
  };

  return (
    <PublicSiteShell current="Journals & presses">
      <main
        id="main-content"
        className="mx-auto min-h-screen max-w-6xl min-w-0 px-4 py-12 sm:px-6 sm:py-16"
      >
        <header>
          <p className="text-sm font-semibold tracking-[0.2em] text-primary uppercase">
            Missa directory
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Journals & small presses
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-7 text-muted-foreground">
            Explore literary journals and small presses, then open their
            profiles and related opportunities.
          </p>
        </header>

        <form
          action="/journals"
          method="get"
          className="mt-8 flex min-w-0 flex-col items-stretch gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3"
          role="search"
          aria-label="Search journals and small presses"
        >
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 sm:min-w-72 sm:flex-none">
            <span className="text-sm font-medium text-foreground">Search</span>
            <input
              id="journal-search"
              name="q"
              defaultValue={query}
              placeholder="Search a journal or press"
              className="min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3.5 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 sm:min-w-52">
            <span className="text-sm font-medium text-foreground">
              Profile type
            </span>
            <select
              id="journal-kind"
              name="kind"
              defaultValue={kind ?? ""}
              className="min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3.5 text-base text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <option value="">Journals and presses</option>
              <option value="literary_magazine">Journals</option>
              <option value="small_press">Small presses</option>
            </select>
          </label>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Search
          </button>
        </form>

        {result ? (
          <p
            className="mt-8 text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            {result.total.toLocaleString()}{" "}
            {result.total === 1 ? "profile" : "profiles"} · page {page} of{" "}
            {Math.max(pageCount, 1)}
          </p>
        ) : null}

        {!repository ? (
          <section
            className="mt-8 rounded-xl border border-destructive/40 bg-destructive/5 p-6"
            role="alert"
            aria-live="assertive"
          >
            <h2 className="text-xl font-semibold text-foreground">
              The directory is temporarily unavailable
            </h2>
            <p className="mt-2 max-w-2xl leading-6 text-muted-foreground">
              No profile records can be read right now. Please try again later.
            </p>
          </section>
        ) : result?.items.length ? (
          <section className="mt-4" aria-labelledby="journal-results-heading">
            <h2 id="journal-results-heading" className="sr-only">
              Directory profiles
            </h2>
            <div className="grid min-w-0 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {result.items.map((item) => (
                <Link
                  key={item.id}
                  href={`/journals/${encodeURIComponent(item.id)}`}
                  className="group block min-h-11 min-w-0 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/60 hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  <div className="flex min-w-0 items-start gap-4">
                    {item.mediaUrl ? (
                      // Directory media is served through Missa's source-preserving media route.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mediaSrc(item.id)}
                        alt={imageAlt(item)}
                        loading="lazy"
                        decoding="async"
                        className="size-14 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="size-14 shrink-0 rounded-lg bg-muted"
                      />
                    )}
                    <div className="min-w-0">
                      <h3 className="font-semibold break-words text-foreground">
                        {item.name}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.kind === "small_press"
                          ? "Small press"
                          : "Literary journal"}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 line-clamp-3 text-sm leading-6 break-words text-muted-foreground">
                    {item.summary?.trim() ||
                      "Unknown — no description is available in the published profile."}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <section
            className="mt-8 rounded-xl border border-dashed border-border p-8"
            role="status"
            aria-live="polite"
          >
            <h2 className="text-xl font-semibold text-foreground">
              {hasFilters
                ? "No profiles match these filters"
                : "No profiles are available yet"}
            </h2>
            <p className="mt-2 max-w-2xl leading-6 text-muted-foreground">
              {hasFilters
                ? "Try a different search or clear the filters to browse the full directory."
                : "The directory will show journals and small presses when published profile records are available."}
            </p>
            {hasFilters ? (
              <Link
                href="/journals"
                className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-border px-4 font-medium text-foreground underline decoration-accent-tint underline-offset-4 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                Clear search and filters
              </Link>
            ) : null}
          </section>
        )}

        {result && pageCount > 1 ? (
          <nav
            className="mt-8 flex flex-wrap gap-3"
            aria-label="Journal directory pages"
          >
            {page > 1 ? (
              <Link
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border px-4 font-medium text-foreground hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                href={pageHref(page - 1)}
                aria-label="Go to previous page"
                rel="prev"
              >
                Previous
              </Link>
            ) : null}
            {page < pageCount ? (
              <Link
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border px-4 font-medium text-foreground hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                href={pageHref(page + 1)}
                aria-label="Go to next page"
                rel="next"
              >
                Next
              </Link>
            ) : null}
          </nav>
        ) : null}
      </main>
    </PublicSiteShell>
  );
}
