"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import type { MyStatus } from "@missa/radar-engine";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS } from "@/lib/statusLabels";

export type EmailEvidence = {
  id: string;
  subject: string;
  senderDomain?: string;
  receivedAt: string;
  proposedStatus?: MyStatus;
  revision?: number;
};

/** The calendar day an email arrived, in the creator's own timezone. */
export function emailDay(receivedAt: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(receivedAt));
}

/**
 * A matching email suggests what happened; the creator decides. Nothing in
 * the Tracker changes until they confirm, and "Not this application" closes
 * the suggestion without touching the record.
 */
export function ApplicationEmailEvidence({
  opportunityId,
  beforeSubmission,
  busy,
  onConfirmSubmission,
  onReviewResponse,
}: {
  opportunityId: string;
  beforeSubmission: boolean;
  busy: boolean;
  onConfirmSubmission: (evidence: EmailEvidence) => Promise<boolean>;
  onReviewResponse: (evidence: EmailEvidence) => void;
}) {
  const [items, setItems] = useState<EmailEvidence[]>([]);
  const [dismissing, setDismissing] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/me/email-candidates?opportunity=${encodeURIComponent(opportunityId)}`,
        { cache: "no-store" },
      );
      if (!response.ok) return;
      const body = (await response.json()) as { candidates: EmailEvidence[] };
      setItems(body.candidates.filter((candidate) => candidate.proposedStatus));
    } catch {
      // Email evidence is optional context; the record works without it.
    }
  }, [opportunityId]);

  useEffect(() => {
    // Load pending email evidence for this application.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external fetch synchronizes evidence state
    void load();
  }, [load]);

  const evidence = items.find((item) =>
    beforeSubmission
      ? item.proposedStatus === "submitted" || item.proposedStatus === "received"
      : item.proposedStatus !== "submitted",
  );
  if (!evidence) return null;

  async function dismiss(item: EmailEvidence) {
    setDismissing(true);
    const key = `${item.id}:${crypto.randomUUID()}`;
    try {
      const response = await fetch(
        `/api/me/email-candidates/${encodeURIComponent(item.id)}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "Idempotency-Key": key },
          body: JSON.stringify({
            kind: "ignore",
            idempotencyKey: key,
            ...(item.revision ? { expectedRevision: item.revision } : {}),
          }),
        },
      );
      if (!response.ok) throw new Error();
      setItems((current) => current.filter((candidate) => candidate.id !== item.id));
      toast.success("Email set aside. Your application is unchanged.");
    } catch {
      toast.error("That email could not be set aside. Try again from Inbox.");
    } finally {
      setDismissing(false);
    }
  }

  const dayLabel = new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  }).format(new Date(evidence.receivedAt));
  const isSubmission = beforeSubmission;

  return (
    <section
      aria-labelledby="record-email-evidence-title"
      className="space-y-4 rounded-xl border border-border p-6"
    >
      <div className="flex gap-3">
        <Mail className="mt-0.5 size-5 shrink-0 text-information" aria-hidden="true" />
        <div className="min-w-0 space-y-1">
          <h3 id="record-email-evidence-title" className="text-base font-semibold">
            {isSubmission
              ? "Confirmation email found"
              : `Email update found · ${evidence.proposedStatus ? STATUS_LABELS[evidence.proposedStatus] : "Response"}`}
          </h3>
          <p className="truncate text-sm">{evidence.subject}</p>
          <p className="text-xs text-muted-foreground">
            {evidence.senderDomain ? `${evidence.senderDomain} · ` : ""}
            <span className="font-mono tabular-nums">{dayLabel}</span>
            {" · "}Nothing changes until you confirm.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        {isSubmission ? (
          <Button
            variant="outline"
            disabled={busy || dismissing}
            aria-busy={busy || undefined}
            onClick={() =>
              void onConfirmSubmission({ ...evidence }).then((ok) => {
                if (ok) setItems((current) => current.filter((item) => item.id !== evidence.id));
              })
            }
          >
            Record as submitted on {dayLabel}
          </Button>
        ) : (
          <Button
            variant="outline"
            disabled={busy || dismissing}
            onClick={() => onReviewResponse(evidence)}
          >
            Review and record
          </Button>
        )}
        <Button
          variant="ghost"
          disabled={busy || dismissing}
          aria-busy={dismissing || undefined}
          onClick={() => void dismiss(evidence)}
        >
          Not this application
        </Button>
      </div>
    </section>
  );
}
