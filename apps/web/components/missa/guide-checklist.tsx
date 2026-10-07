"use client";

import { useId, useState, useSyncExternalStore, type ReactNode } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import styles from "./guide-article.module.css";

export interface GuideChecklistItem {
  content: ReactNode;
  text: string;
}

// Ticks live in localStorage. When storage is blocked they live in memory for
// this visit instead, so the list still works.
const memory = new Map<string, string>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readStored(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? memory.get(key) ?? "[]";
  } catch {
    return memory.get(key) ?? "[]";
  }
}

function writeStored(key: string, value: string) {
  memory.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Kept in memory for this visit.
  }
  for (const listener of listeners) listener();
}

function parseChecked(raw: string, length: number): boolean[] {
  try {
    const stored: unknown = JSON.parse(raw);
    if (Array.isArray(stored))
      return Array.from({ length }, (_, index) => stored[index] === true);
  } catch {
    // Unreadable value: start unticked.
  }
  return Array.from({ length }, () => false);
}

/**
 * A checklist from a guide. Ticks stay in this browser only, so a reader can
 * work through it before an application. Copy puts the list in their notes.
 */
export function GuideChecklist({
  items,
  storageKey,
}: {
  items: GuideChecklistItem[];
  storageKey: string;
}) {
  const headingId = useId();
  const raw = useSyncExternalStore(
    subscribe,
    () => readStored(storageKey),
    () => "[]",
  );
  const checked = parseChecked(raw, items.length);
  const [copied, setCopied] = useState(false);

  function update(index: number, value: boolean) {
    const next = checked.map((item, i) => (i === index ? value : item));
    writeStored(storageKey, JSON.stringify(next));
  }

  async function copy() {
    const text = items.map((item) => `- [ ] ${item.text}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      setCopied(false);
    }
  }

  const done = checked.filter(Boolean).length;

  return (
    <section className={styles.checklist} aria-labelledby={headingId}>
      <div className={styles.checklistHeader}>
        <div>
          <p id={headingId} className={styles.checklistTitle}>
            Checklist
          </p>
          <span className={styles.checklistCount} aria-live="polite">
            {done} of {items.length} done
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {done ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => writeStored(storageKey, "[]")}
            >
              Clear
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={copy}>
            {copied ? "Copied" : "Copy list"}
          </Button>
        </div>
      </div>
      <ul className={styles.checklistItems}>
        {items.map((item, index) => (
          <li key={index}>
            <label data-checked={checked[index] ? "true" : undefined}>
              <Checkbox
                checked={checked[index] ?? false}
                onCheckedChange={(value) => update(index, value === true)}
              />
              <span>{item.content}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
