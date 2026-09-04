import Link from "next/link";
import { ArrowRight, ArrowUpRight, Search } from "lucide-react";
import {
  getSemanticUrlForProfile,
  type ProfileCard,
  type ProfileKind,
} from "@missa/radar-adapters";
import { KIND_METADATA } from "./institution-directory-view";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Empty, EmptyHeader, EmptyDescription } from "./ui/empty";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";
import styles from "./directory-browse-view.module.css";

export function DirectoryBrowseView({
  items,
  total,
  page,
  pageSize,
  query,
  activeKind,
  loadFailed = false,
}: {
  items: ProfileCard[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
  activeKind?: ProfileKind;
  loadFailed?: boolean;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  function href(nextPage = 1, kind = activeKind ?? "", search = query) {
    const params = new URLSearchParams();
    if (kind) params.set("kind", kind);
    if (search) params.set("q", search);
    if (nextPage > 1) params.set("page", String(nextPage));
    return `/directory${params.size ? `?${params}` : ""}`;
  }
  const categories = [
    ["", "All organizations"],
    ["residency_center", "Residencies"],
    ["literary_magazine", "Journals"],
    ["small_press", "Presses"],
    ["grant_foundation", "Foundations"],
    ["visual_arts_organization", "Galleries & arts organizations"],
  ];
  return (
    <main id="main-content" className={styles.main}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Directory</p>
        <h1 className="font-sans">Find your creative community.</h1>
        <p>
          Explore residencies, journals, presses and arts organizations
          worldwide.
        </p>
      </header>
      <nav aria-label="Directory categories" className={styles.categories}>
        {categories.map(([kind, label]) => (
          <Link
            key={kind}
            href={href(1, kind)}
            aria-current={(activeKind ?? "") === kind ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      <form
        action="/directory"
        method="get"
        role="search"
        className={styles.search}
      >
        <Search size={18} aria-hidden="true" />
        <label className="sr-only" htmlFor="directory-search">
          Search organizations
        </label>
        <Input
          key={`${query}:${activeKind}`}
          id="directory-search"
          name="q"
          defaultValue={query}
          placeholder="Search by name or interest…"
          className={styles.input}
        />
        {activeKind && <input type="hidden" name="kind" value={activeKind} />}
        <Button
          type="submit"
          aria-label="Search organizations"
          title="Search organizations"
          className={styles.submit}
        >
          <ArrowUpRight size={18} aria-hidden="true" />
        </Button>
      </form>
      <div className={styles.ledger}>
        <p role="status">
          {loadFailed ? (
            "Directory unavailable"
          ) : (
            <>
              {items.length
                ? `${((page - 1) * pageSize + 1).toLocaleString()}–${((page - 1) * pageSize + items.length).toLocaleString()} of `
                : ""}
              {total.toLocaleString()} profiles
              {query && (
                <>
                  {" "}
                  matching <strong>“{query}”</strong>
                </>
              )}
            </>
          )}
        </p>
        {query || activeKind ? (
          <Link href="/directory">Clear filters</Link>
        ) : (
          <span>Alphabetical order</span>
        )}
      </div>
      {items.length ? (
        <div className={styles.grid}>
          {items.map((item) => {
            const meta = KIND_METADATA[item.kind] ?? KIND_METADATA.all;
            const Icon = meta.icon;
            return (
              <Card key={item.id} className={styles.card}>
                <div className={styles.identity}>
                  <Avatar className={styles.icon}>
                    {item.mediaUrl && (
                      <AvatarImage
                        src={item.mediaUrl}
                        alt=""
                        className={styles.logo}
                        loading="lazy"
                      />
                    )}
                    <AvatarFallback className={styles.logoFallback}>
                      <Icon size={22} aria-hidden="true" />
                    </AvatarFallback>
                  </Avatar>
                  <span className={styles.kind}>{meta.label}</span>
                </div>
                <h2 className="font-sans">
                  <Link
                    href={getSemanticUrlForProfile(item.kind, item.slug)}
                    className={styles.profileLink}
                  >
                    {item.name.trim() || "Organization profile"}
                  </Link>
                </h2>
                {item.summary ? (
                  <p className={styles.summary}>{item.summary}</p>
                ) : null}
                <div className={styles.footer}>
                  <span>
                    {[
                      ...new Set(
                        item.genres.map((genre) =>
                          genre
                            .replace(/[-_]/g, " ")
                            .replace(/\b\w/g, (letter) => letter.toUpperCase()),
                        ),
                      ),
                    ]
                      .slice(0, 2)
                      .join(" · ") || meta.plural}
                  </span>
                  <span className={styles.view}>
                    View profile <ArrowRight size={16} aria-hidden="true" />
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Empty className={styles.empty}>
          <EmptyHeader>
            <h2 className="font-sans">
              {loadFailed
                ? "We couldn’t load the directory"
                : page > 1 && total > 0
                  ? "You’ve reached the end"
                  : "No organizations found"}
            </h2>
            <EmptyDescription>
              {loadFailed
                ? "Please try again in a moment."
                : "Try a different name or explore another category."}
            </EmptyDescription>
          </EmptyHeader>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={loadFailed ? href(page) : href(1, "", "")} />}
          >
            {loadFailed ? "Try again" : "Browse all organizations"}
          </Button>
        </Empty>
      )}
      {!loadFailed && pages > 1 && (
        <Pagination aria-label="Directory pages" className={styles.pagination}>
          <PaginationContent>
            <PaginationItem>
              {page > 1 ? (
                <PaginationPrevious
                  href={href(page - 1)}
                  className={styles.pageButton}
                />
              ) : (
                <Button variant="ghost" disabled>
                  Previous
                </Button>
              )}
            </PaginationItem>
            <PaginationItem>
              <span className={styles.pageCount}>
                Page {page.toLocaleString()} of {pages.toLocaleString()}
              </span>
            </PaginationItem>
            <PaginationItem>
              {page < pages ? (
                <PaginationNext
                  href={href(page + 1)}
                  className={styles.pageButton}
                />
              ) : (
                <Button variant="ghost" disabled>
                  Next
                </Button>
              )}
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </main>
  );
}
