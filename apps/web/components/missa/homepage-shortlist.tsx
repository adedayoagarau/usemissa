"use client";

import Link from "next/link";
import { Bookmark, X } from "lucide-react";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { SaveOpportunityButton } from "@/components/save-opportunity-button";
import { useSignedIn } from "@/lib/browserSession";
import {
  SHORTLIST_STORAGE_KEY,
  emptyShortlist,
  isShortlisted,
  parseShortlist,
  removeFromShortlist,
  serializeShortlist,
  shortlistCountLabel,
  toggleShortlist,
  type ShortlistEntry,
  type ShortlistState,
} from "@/lib/homepageShortlist";
import styles from "./homepage-shortlist.module.css";

/** Where sign-up and log-in return to; the shortlist sync runs on any page. */
const KEEP_SHORTLIST_NEXT = encodeURIComponent("/opportunities");

// --- store -----------------------------------------------------------------

const listeners = new Set<() => void>();
const serverSnapshot = emptyShortlist();
let cachedRaw: string | null | undefined;
let cachedState: ShortlistState = serverSnapshot;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(SHORTLIST_STORAGE_KEY);
  } catch {
    return null;
  }
}

function getSnapshot(): ShortlistState {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedState = parseShortlist(raw);
  }
  return cachedState;
}

function write(state: ShortlistState) {
  try {
    if (state.items.length === 0) {
      window.localStorage.removeItem(SHORTLIST_STORAGE_KEY);
    } else {
      window.localStorage.setItem(SHORTLIST_STORAGE_KEY, serializeShortlist(state));
    }
  } catch {
    // Private mode or blocked storage: keep the in-memory copy for this page.
    cachedRaw = serializeShortlist(state);
    cachedState = state;
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === SHORTLIST_STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useShortlist() {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
  return {
    state,
    toggle: (entry: Omit<ShortlistEntry, "addedAt">) =>
      write(toggleShortlist(getSnapshot(), entry)),
    remove: (id: string) => write(removeFromShortlist(getSnapshot(), id)),
    clear: () => write(emptyShortlist()),
  };
}

// --- controls ---------------------------------------------------------------

export type ShortlistItem = {
  id: string;
  title: string;
  organizationName?: string | null;
  deadline: { date?: string | null };
};

export function ShortlistToggle({ item }: { item: ShortlistItem }) {
  const { state, toggle } = useShortlist();
  const on = isShortlisted(state, item.id);
  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      aria-pressed={on}
      aria-label={
        on ? `Remove ${item.title} from your shortlist` : `Shortlist ${item.title}`
      }
      title={on ? "Remove from shortlist" : "Shortlist this call"}
      className={styles.toggle}
      data-on={on || undefined}
      onClick={() =>
        toggle({
          id: item.id,
          title: item.title,
          organization: item.organizationName ?? null,
          deadline: item.deadline.date ?? null,
        })
      }
    >
      <Bookmark aria-hidden="true" />
    </Button>
  );
}

/**
 * Signed in: the real Tracker save. Signed out: the browser shortlist. The
 * control swaps once the session loads, so a returning creator never sees a
 * shortlist they already outgrew.
 */
export function ShortlistSaveControl({
  item,
  signedIn,
}: {
  item: ShortlistItem;
  signedIn: boolean;
}) {
  if (signedIn) {
    return (
      <SaveOpportunityButton opportunityId={item.id} className={styles.save} />
    );
  }
  return <ShortlistToggle item={item} />;
}

// --- the bar ----------------------------------------------------------------

export function ShortlistBar() {
  const signedIn = useSignedIn();
  const { state, remove, clear } = useShortlist();
  const count = state.items.length;
  if (signedIn || count === 0) {
    return (
      <p className="sr-only" role="status" aria-live="polite">
        {signedIn ? "" : "Your shortlist is empty."}
      </p>
    );
  }
  return (
    <section className={styles.bar} aria-labelledby="homepage-shortlist-heading">
      <div className={styles.summary}>
        <Bookmark aria-hidden="true" className={styles.summaryIcon} />
        <h2 id="homepage-shortlist-heading" className={styles.heading}>
          Shortlist
        </h2>
        <p role="status" aria-live="polite" className={styles.count}>
          {shortlistCountLabel(count)} on this device. Create an account to keep
          {count === 1 ? " it and its deadline." : " them and their deadlines."}
        </p>
      </div>
      <ul className={styles.items} aria-label="Shortlisted calls">
        {state.items.map((item) => (
          <li key={item.id} className={styles.item}>
            <Link href={`/opportunities/${encodeURIComponent(item.id)}`}>
              {item.title}
            </Link>
            <button
              type="button"
              className={styles.remove}
              aria-label={`Remove ${item.title}`}
              onClick={() => remove(item.id)}
            >
              <X aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <div className={styles.actions}>
        <Link
          href={`/signup?next=${KEEP_SHORTLIST_NEXT}`}
          className={buttonVariants({ variant: "default" })}
        >
          {count === 1 ? "Create an account to keep it" : "Create an account to keep them"}
        </Link>
        <Link href={`/login?next=${KEEP_SHORTLIST_NEXT}`} className={styles.textLink}>
          Log in
        </Link>
        <button type="button" className={styles.textLink} onClick={clear}>
          Clear
        </button>
      </div>
    </section>
  );
}

// --- conversion -------------------------------------------------------------

/**
 * Mounted once in the root layout. When a device that holds a shortlist is
 * signed in, every shortlisted call is saved to the Tracker and the browser
 * copy is cleared. Runs wherever the sign-up flow lands.
 */
export function ShortlistSync() {
  const signedIn = useSignedIn();
  const { state, clear } = useShortlist();
  const running = useRef(false);
  const pending = state.items;

  useEffect(() => {
    if (!signedIn || pending.length === 0 || running.current) return;
    running.current = true;
    let cancelled = false;
    (async () => {
      let saved = 0;
      let failed = 0;
      for (const item of pending) {
        try {
          const response = await fetch("/api/me/tracker", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              opportunityId: item.id,
              journeyId: window.crypto.randomUUID(),
            }),
          });
          if (response.ok) saved += 1;
          else if (response.status === 401) {
            // The hint was stale; keep the shortlist for next time.
            running.current = false;
            return;
          } else failed += 1;
        } catch {
          failed += 1;
        }
      }
      if (cancelled) return;
      clear();
      if (saved > 0) {
        toast.success(
          `${shortlistCountLabel(saved)} from your shortlist ${saved === 1 ? "is" : "are"} now in your Tracker.`,
        );
      }
      if (failed > 0) {
        toast.error(
          `${shortlistCountLabel(failed)} could not be saved. You can save ${failed === 1 ? "it" : "them"} again from the opportunity page.`,
        );
      }
      running.current = false;
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn, pending, clear]);

  return null;
}
