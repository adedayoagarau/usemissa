"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { Bookmark, Copy, Download, X } from "lucide-react";
import type { ManuscriptMatchCard } from "@missa/radar-adapters";
import { CountBadge } from "@/components/missa/count-badge";
import { RankingTierBadge } from "@/components/missa/ranking-indicators";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import type { ShortlistControls } from "./manuscript-match-results";
import styles from "./manuscript-match-wizard.module.css";

/** What the shortlist keeps about a magazine; enough to list and export it. */
export interface SavedMagazine {
  profileId: string;
  name: string;
  slug: string;
  websiteUrl: string | null;
  tier: ManuscriptMatchCard["prestigeTier"];
}

/*
 * The shortlist is a per-browser convenience, so it lives in localStorage.
 * Storage can be missing or blocked (private windows, previews); every read
 * and write is guarded and the page works with an empty list.
 */
const STORAGE_KEY = "missa:manuscript-shortlist";
const EMPTY: SavedMagazine[] = [];
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedList: SavedMagazine[] = EMPTY;

function parse(raw: string | null): SavedMagazine[] {
  if (!raw) return EMPTY;
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return EMPTY;
    return value.filter(
      (entry): entry is SavedMagazine =>
        typeof entry?.profileId === "string" &&
        typeof entry?.name === "string" &&
        typeof entry?.slug === "string",
    );
  } catch {
    return EMPTY;
  }
}

function readShortlist(): SavedMagazine[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return cachedList;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedList = parse(raw);
  }
  return cachedList;
}

function writeShortlist(list: SavedMagazine[]) {
  cachedList = list;
  try {
    cachedRaw = JSON.stringify(list);
    window.localStorage.setItem(STORAGE_KEY, cachedRaw);
  } catch {
    // Keep the in-memory list for this visit.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useShortlist() {
  const list = useSyncExternalStore(subscribe, readShortlist, () => EMPTY);
  const ids = useMemo(
    () => new Set(list.map((entry) => entry.profileId)),
    [list],
  );

  const toggle = useCallback((card: ManuscriptMatchCard) => {
    const current = readShortlist();
    const exists = current.some((entry) => entry.profileId === card.profileId);
    writeShortlist(
      exists
        ? current.filter((entry) => entry.profileId !== card.profileId)
        : [
            ...current,
            {
              profileId: card.profileId,
              name: card.name,
              slug: card.slug,
              websiteUrl: card.websiteUrl,
              tier: card.prestigeTier,
            },
          ],
    );
  }, []);

  const remove = useCallback((profileId: string) => {
    writeShortlist(
      readShortlist().filter((entry) => entry.profileId !== profileId),
    );
  }, []);

  const clear = useCallback(() => writeShortlist(EMPTY), []);

  const controls: ShortlistControls = useMemo(
    () => ({ isSaved: (profileId) => ids.has(profileId), toggle }),
    [ids, toggle],
  );

  return { list, controls, remove, clear };
}

function journalUrl(slug: string) {
  return `${window.location.origin}/journal/${slug}`;
}

function tierLabel(tier: SavedMagazine["tier"]) {
  return tier === "unranked" ? "Unranked" : tier.replace("tier_", "Tier ");
}

function csvCell(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function ShortlistSheet({
  list,
  onRemove,
  onClear,
}: {
  list: SavedMagazine[];
  onRemove: (profileId: string) => void;
  onClear: () => void;
}) {
  const copyList = () => {
    const text = list
      .map((entry) =>
        [entry.name, journalUrl(entry.slug), entry.websiteUrl]
          .filter(Boolean)
          .join(" — "),
      )
      .join("\n");
    navigator.clipboard?.writeText(text).then(
      () => toast.success("Shortlist copied."),
      () => toast.error("Copy failed. Try downloading the list instead."),
    );
  };

  const downloadCsv = () => {
    const rows = [
      ["Magazine", "Missa tier", "Missa page", "Website"],
      ...list.map((entry) => [
        entry.name,
        tierLabel(entry.tier),
        journalUrl(entry.slug),
        entry.websiteUrl ?? "",
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "missa-shortlist.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button type="button" variant="outline">
            <Bookmark aria-hidden="true" />
            Shortlist
            {list.length ? (
              <CountBadge
                count={list.length}
                label="magazines on your shortlist"
              />
            ) : null}
          </Button>
        }
      />
      <SheetContent side="right" surface="canvas" className={styles.sheet}>
        <SheetHeader className={styles.shortlistHeader}>
          <SheetTitle>Your shortlist</SheetTitle>
          <SheetDescription>
            Saved in this browser. Copy or download it to plan your submissions.
          </SheetDescription>
        </SheetHeader>

        {list.length ? (
          <>
            <ul className={styles.shortlistItems}>
              {list.map((entry) => (
                <li key={entry.profileId}>
                  <div className={styles.compactIdentity}>
                    <Link
                      href={`/journal/${entry.slug}`}
                      className={`${styles.shortlistName} font-heading`}
                    >
                      {entry.name}
                    </Link>
                    {entry.tier !== "unranked" ? (
                      <RankingTierBadge tier={entry.tier} />
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${entry.name} from your shortlist`}
                    onClick={() => onRemove(entry.profileId)}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
            <div className={styles.shortlistActions}>
              <Button type="button" variant="outline" onClick={copyList}>
                <Copy aria-hidden="true" />
                Copy list
              </Button>
              <Button type="button" variant="outline" onClick={downloadCsv}>
                <Download aria-hidden="true" />
                Download CSV
              </Button>
              <Button type="button" variant="ghost" onClick={onClear}>
                Clear
              </Button>
            </div>
          </>
        ) : (
          <Empty className={styles.shortlistEmpty}>
            <EmptyHeader>
              <EmptyTitle>No magazines yet</EmptyTitle>
              <EmptyDescription>
                Select Shortlist on any magazine to keep it here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </SheetContent>
    </Sheet>
  );
}
