"use client";

import * as React from "react";
import { useState } from "react";
import { Clock, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MagazineTelemetrySummary } from "@missa/radar-adapters";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ReportResponseDialogProps {
  profileId: string;
  magazineName: string;
  trigger?: React.ReactNode;
  onSuccess?: (
    newMedianDays: number | null,
    telemetrySummary?: MagazineTelemetrySummary,
  ) => void;
}

export function ReportResponseDialog({
  profileId,
  magazineName,
  trigger,
  onSuccess,
}: ReportResponseDialogProps) {
  const [open, setOpen] = useState(false);
  const [genre, setGenre] = useState<string>("fiction");
  const [submittedDate, setSubmittedDate] = useState<string>("");
  const [decisionDate, setDecisionDate] = useState<string>("");
  const [outcome, setOutcome] = useState<string>("rejected");
  const [rejectionType, setRejectionType] = useState<string>("form");
  const [feePaidDollars, setFeePaidDollars] = useState<string>("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Compute calculated days
  const d1 = new Date(submittedDate).getTime();
  const d2 = new Date(decisionDate).getTime();
  const calculatedDays =
    !isNaN(d1) && !isNaN(d2) && d2 >= d1
      ? Math.round((d2 - d1) / (1000 * 60 * 60 * 24))
      : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/rankings/report-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          genre,
          submittedDate,
          decisionDate:
            outcome === "pending" || !decisionDate ? null : decisionDate,
          responseDays:
            outcome === "pending" || calculatedDays <= 0
              ? null
              : calculatedDays,
          outcome,
          rejectionType: outcome === "rejected" ? rejectionType : null,
          feePaidCents: Math.round(parseFloat(feePaidDollars || "0") * 100),
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        message?: string;
        newMedianDays?: number | null;
        telemetrySummary?: MagazineTelemetrySummary;
      };
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit telemetry.");
      }

      setSuccessMsg(data.message || "Thank you! Your report has been logged.");
      if (onSuccess) {
        onSuccess(data.newMedianDays ?? null, data.telemetrySummary);
      }
      setTimeout(() => {
        setOpen(false);
        setSuccessMsg(null);
      }, 1500);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {trigger ? (
        <div
          onClick={() => setOpen(true)}
          className="inline-block cursor-pointer"
        >
          {trigger}
        </div>
      ) : (
        <Button
          type="button"
          variant="accentOutline"
          size="sm"
          onClick={() => setOpen(true)}
        >
          <Clock className="size-3.5" aria-hidden="true" />
          <span>Report Turnaround Speed</span>
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="size-5 text-primary" aria-hidden="true" />
              <span>Report Submission Outcome</span>
            </DialogTitle>
            <DialogDescription>
              Help keep Missa response times and transparency scores accurate
              for <strong className="text-foreground">{magazineName}</strong>.
              All reports are strictly anonymous.
            </DialogDescription>
          </DialogHeader>

          {successMsg ? (
            <div className="flex items-center gap-2.5 rounded-lg border border-information/30 bg-information-subtle p-3 text-sm text-information">
              <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
              <span>{successMsg}</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error ? (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
                  <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              ) : null}

              {/* Genre */}
              <div>
                <label className="text-xs font-semibold tracking-wider text-foreground uppercase">
                  Genre Submitted
                </label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <option value="fiction">Fiction</option>
                  <option value="poetry">Poetry</option>
                  <option value="nonfiction">Nonfiction</option>
                  <option value="hybrid">Hybrid / Flash</option>
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold tracking-wider text-foreground uppercase">
                    Date Sent
                  </label>
                  <input
                    type="date"
                    required
                    value={submittedDate}
                    onChange={(e) => setSubmittedDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold tracking-wider text-foreground uppercase">
                    Decision Date
                  </label>
                  <input
                    type="date"
                    value={decisionDate}
                    onChange={(e) => setDecisionDate(e.target.value)}
                    disabled={outcome === "pending"}
                    required={outcome !== "pending"}
                    className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Turnaround speed indicator */}
              {outcome !== "pending" && calculatedDays > 0 ? (
                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2.5 text-xs text-muted-foreground">
                  <span>Calculated turnaround:</span>
                  <span className="font-mono font-semibold text-foreground">
                    {calculatedDays} days (~{Math.round(calculatedDays / 30)}{" "}
                    months)
                  </span>
                </div>
              ) : null}

              {/* Outcome */}
              <div>
                <label className="text-xs font-semibold tracking-wider text-foreground uppercase">
                  Outcome
                </label>
                <div className="mt-1.5 grid grid-cols-4 gap-2">
                  {[
                    { id: "accepted", label: "Accepted" },
                    { id: "rejected", label: "Rejected" },
                    { id: "withdrawn", label: "Withdrawn" },
                    { id: "pending", label: "Pending" },
                  ].map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setOutcome(o.id)}
                      className={`rounded-lg border py-1.5 text-xs font-medium transition-colors ${
                        outcome === o.id
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:bg-muted"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rejection Type (if rejected) */}
              {outcome === "rejected" ? (
                <div>
                  <label className="text-xs font-semibold tracking-wider text-foreground uppercase">
                    Rejection Character
                  </label>
                  <select
                    value={rejectionType}
                    onChange={(e) => setRejectionType(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <option value="form">Standard Form Rejection</option>
                    <option value="tiered_personal">
                      Tiered / Encouraging Rejection
                    </option>
                    <option value="editor_note">
                      Personal Note from Editor
                    </option>
                  </select>
                </div>
              ) : null}

              {/* Submission Fee */}
              <div>
                <label className="text-xs font-semibold tracking-wider text-foreground uppercase">
                  Submission Fee Paid (USD)
                </label>
                <div className="relative mt-1">
                  <span className="absolute top-2 left-3 text-sm text-muted-foreground">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={feePaidDollars}
                    onChange={(e) => setFeePaidDollars(e.target.value)}
                    className="w-full rounded-lg border border-border bg-card py-2 pr-3 pl-7 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  />
                </div>
              </div>

              <DialogFooter className="mt-5 gap-2 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={loading}>
                  <Send className="size-3.5" aria-hidden="true" />
                  <span>{loading ? "Recording..." : "Log Response Data"}</span>
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
