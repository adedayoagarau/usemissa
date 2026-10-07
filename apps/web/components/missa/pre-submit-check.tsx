"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleAlert, CircleCheck, Eye, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { PreSubmitCheck as Check } from "@/lib/pre-submit-check";
import { SheetSectionHeading } from "./sheet-section-heading";

const STATUS = {
  passed: { label: "Passed", icon: CircleCheck, tone: "text-success" },
  attention: {
    label: "Needs attention",
    icon: CircleAlert,
    tone: "text-ochre-deep",
  },
  manual: { label: "Check manually", icon: Eye, tone: "text-information" },
} as const;

/**
 * Before you submit: the checks Missa can make from the Library and the
 * listing, with the ones it cannot make labelled "Check manually". Each
 * status is spelled out next to its icon; colour never carries it alone.
 */
export function PreSubmitCheck({
  opportunityId,
  refreshKey = 0,
}: {
  opportunityId: string;
  refreshKey?: number;
}) {
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/me/applications/${encodeURIComponent(opportunityId)}/pre-submit`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error();
      setChecks(((await response.json()) as { checks: Check[] }).checks);
      setError(false);
    } catch {
      setError(true);
    }
  }, [opportunityId]);

  useEffect(() => {
    // Recheck whenever preparation changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external fetch synchronizes check state
    void load();
  }, [load, refreshKey]);

  const attention =
    checks?.filter((check) => check.status === "attention").length ?? 0;
  return (
    <section aria-labelledby="sheet-presubmit-title" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <SheetSectionHeading id="sheet-presubmit-title" eyebrow="Check">
            Before you submit
          </SheetSectionHeading>
          <p className="text-sm text-muted-foreground">
            {checks
              ? attention
                ? `${attention} ${attention === 1 ? "thing needs" : "things need"} attention.`
                : "Nothing needs attention in what Missa can check."
              : "What Missa can check from your Library and the listing."}
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => void load()}
          aria-label="Check again"
        >
          <RefreshCw />
          Check again
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          Checks could not load. Try again.
        </p>
      ) : !checks ? (
        <div role="status" aria-label="Loading checks">
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (
        <PreSubmitCheckList checks={checks} />
      )}
    </section>
  );
}

/** The checks themselves, each status spelled out beside its icon. */
export function PreSubmitCheckList({ checks }: { checks: Check[] }) {
  return (
    <ul className="divide-y divide-border">
      {checks.map((check) => {
        const status = STATUS[check.status];
        const Icon = status.icon;
        return (
          <li key={check.id} className="flex gap-3 py-3">
            <Icon
              className={`mt-0.5 size-5 shrink-0 ${status.tone}`}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                <span className="font-medium">{check.label}</span>
                <span className={`text-xs font-medium ${status.tone}`}>
                  {status.label}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">{check.detail}</p>
              {check.items?.length ? (
                <ul className="list-disc space-y-0.5 ps-5 text-sm">
                  {check.items.map((item) => (
                    <li key={item} className="break-words">
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
