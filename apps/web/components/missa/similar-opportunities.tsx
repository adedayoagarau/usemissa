"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BookmarkPlus, Check, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import type { SimilarMatch, SimilarReason } from "@/lib/similar-opportunities";
import { SheetSectionHeading } from "./sheet-section-heading";

const HEADINGS: Record<SimilarReason, { title: string; description: string }> =
  {
    declined: {
      title: "Similar open calls",
      description:
        "Calls that ask for the same kind of work. Missa looks beyond this organization first.",
    },
    missed: {
      title: "Still open: similar calls",
      description:
        "This deadline has passed. These calls ask for the same kind of work and leave time to prepare.",
    },
    record: {
      title: "Similar open calls",
      description:
        "Calls that ask for the same kind of work, with time to prepare.",
    },
  };

function closes(match: SimilarMatch): string {
  if (!match.deadline)
    return match.deadlineKind === "rolling" ? "Rolling" : "Deadline not listed";
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${match.deadline.slice(0, 10)}T12:00:00Z`));
}

/**
 * Recovery after a decline or a missed deadline. Matches come from shared
 * taxonomy, form and timing, and each shows why it was chosen. Saving adds
 * the call to Tracker; hiding affects this application's suggestions only.
 */
export function SimilarOpportunities({
  opportunityId,
}: {
  opportunityId: string;
}) {
  const [data, setData] = useState<{
    reason: SimilarReason;
    matches: SimilarMatch[];
  } | null>(null);
  const [saved, setSaved] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState<string>();

  const load = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/me/applications/${encodeURIComponent(opportunityId)}/similar`,
        { cache: "no-store" },
      );
      if (!response.ok) return;
      setData(await response.json());
    } catch {
      // Suggestions are optional; the record works without them.
    }
  }, [opportunityId]);

  useEffect(() => {
    // Load suggestions for this application.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external fetch synchronizes suggestion state
    void load();
  }, [load]);

  if (!data?.matches.length) return null;
  const heading = HEADINGS[data.reason];

  async function save(match: SimilarMatch) {
    setBusy(match.id);
    try {
      const response = await fetch("/api/me/tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId: match.id }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok)
        throw new Error(result.error ?? "This call could not be saved.");
      setSaved((current) => new Set(current).add(match.id));
      toast.success(`${match.title} is in your Tracker`);
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "This call could not be saved.",
      );
    } finally {
      setBusy(undefined);
    }
  }

  async function hide(match: SimilarMatch) {
    setBusy(match.id);
    try {
      const response = await fetch(
        `/api/me/applications/${encodeURIComponent(opportunityId)}/similar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ opportunityId: match.id }),
        },
      );
      if (!response.ok) throw new Error();
      setData((current) =>
        current
          ? {
              ...current,
              matches: current.matches.filter((item) => item.id !== match.id),
            }
          : current,
      );
      toast.success("Hidden from these suggestions");
    } catch {
      toast.error("That suggestion could not be hidden.");
    } finally {
      setBusy(undefined);
    }
  }

  return (
    <section aria-labelledby="sheet-similar-title" className="space-y-4">
      <SheetSectionHeading id="sheet-similar-title" eyebrow="Similar open calls">
        {heading.title}
      </SheetSectionHeading>
      <p className="text-sm text-muted-foreground">{heading.description}</p>
      <ul className="divide-y divide-border border-y border-border">
        {data.matches.map((match) => (
          <li key={match.id} className="space-y-3 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <Link
                  href={`/opportunities/${encodeURIComponent(match.id)}`}
                  className="font-heading text-lg leading-snug break-words hover:text-primary"
                >
                  {match.title}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {match.organizationName ? `${match.organizationName} · ` : ""}
                  <span className="font-mono tabular-nums">
                    {closes(match)}
                  </span>
                </p>
              </div>
              <ArrowUpRight
                className="mt-1 size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
            <ul
              className="space-y-1 text-sm"
              aria-label={`Why ${match.title} was suggested`}
            >
              {match.reasons.map((reason) => (
                <li key={reason} className="flex gap-2">
                  <Check
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  {reason}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3">
              {saved.has(match.id) ? (
                <Link
                  href={`/tracker?application=${encodeURIComponent(match.id)}`}
                  className={buttonVariants({ variant: "outline" })}
                >
                  In your Tracker
                </Link>
              ) : (
                <Button
                  variant="outline"
                  disabled={busy === match.id}
                  aria-busy={busy === match.id || undefined}
                  onClick={() => void save(match)}
                >
                  <BookmarkPlus />
                  Save to Tracker
                </Button>
              )}
              <Button
                variant="ghost"
                disabled={busy === match.id}
                onClick={() => void hide(match)}
              >
                <EyeOff />
                Not for me
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
