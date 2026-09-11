"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  Sparkles,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  Send,
  Mail,
  Copy,
  Check,
} from "lucide-react";
import type { EditorialIntelligenceFullProfile } from "@missa/radar-adapters";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TrackerResponseForecasterProps {
  opportunityId: string;
  organizationName: string;
  submittedAt: string | null;
  myStatus: string;
  className?: string;
}

export function TrackerResponseForecaster({
  opportunityId,
  organizationName,
  submittedAt,
  myStatus,
  className,
}: TrackerResponseForecasterProps) {
  const [intel, setIntel] = useState<EditorialIntelligenceFullProfile | null>(
    null,
  );
  const [copiedWithdrawal, setCopiedWithdrawal] = useState(false);

  useEffect(() => {
    let active = true;
    async function fetchTelemetry() {
      try {
        const res = await fetch(
          `/api/rankings/magazines/${encodeURIComponent(opportunityId)}/intelligence`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as EditorialIntelligenceFullProfile;
        if (active) setIntel(data);
      } catch {
        // Fallback silently if no profile mapping exists
      }
    }
    fetchTelemetry();
    return () => {
      active = false;
    };
  }, [opportunityId]);

  if (!intel?.telemetry) return null;

  const { telemetry } = intel;
  const medianDays = telemetry.medianResponseDays || 45;
  const fastestDays = telemetry.fastestResponseDays || 5;
  const overdueThreshold = Math.round(medianDays * 1.75);

  let daysElapsed = 0;
  if (submittedAt) {
    const subDate = new Date(
      submittedAt.length === 10 ? `${submittedAt}T12:00:00Z` : submittedAt,
    );
    const now = new Date();
    daysElapsed = Math.max(
      0,
      Math.round((now.getTime() - subDate.getTime()) / (1000 * 60 * 60 * 24)),
    );
  }

  const isAwaiting = ["submitted", "awaiting", "in-review", "under-review"].includes(
    myStatus,
  );
  const isAccepted = myStatus === "accepted";
  const isSaved = ["saved", "interested", "preparing", "draft-started"].includes(
    myStatus,
  );

  const progressPercent = Math.min(
    100,
    Math.round((daysElapsed / overdueThreshold) * 100),
  );

  const copyWithdrawalTemplate = () => {
    const text = `Dear Editors at [Journal Name],\n\nThank you so much for considering my submission titled "[Piece Title]". I am writing to politely withdraw this submission from consideration, as it has been accepted for publication elsewhere.\n\nThank you for your time and editorial care, and I hope to submit to you again in a future reading cycle.\n\nWarm regards,\n[Your Name]`;
    navigator.clipboard.writeText(text);
    setCopiedWithdrawal(true);
    toast.success("Simultaneous withdrawal email template copied to clipboard!");
    setTimeout(() => setCopiedWithdrawal(false), 3000);
  };

  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/40 p-5 shadow-sm space-y-4",
        className,
      )}
    >
      {/* 1. Free Cap Early Alert for Saved Opportunities */}
      {isSaved && telemetry.freeCapStatus === "at_risk" && (
        <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-primary)] p-3.5 text-xs text-[var(--text-primary)]">
          <ShieldAlert className="size-4 shrink-0 text-[var(--text-primary)] mt-0.5" />
          <div>
            <span className="font-semibold text-[var(--text-primary)]">
              Submittable Free Cap Closes Fast
            </span>
            <p className="mt-0.5 text-[var(--text-secondary)]">
              {organizationName}&apos;s monthly free cap typically exhausts within{" "}
              <strong>{telemetry.submittableFreeCapDepletionDays ?? 3} days</strong>{" "}
              of opening. Prepare your manuscript early to avoid paid fees.
            </p>
          </div>
        </div>
      )}

      {/* 2. Response Telemetry Forecaster for Submitted Works */}
      {isAwaiting && submittedAt && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-[var(--text-secondary)]" />
              <h4 className="font-sans text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Submission Response Forecaster
              </h4>
            </div>
            <span className="font-mono text-xs font-medium text-[var(--text-primary)]">
              Day {daysElapsed} / {medianDays}d Median
            </span>
          </div>

          {/* Progress Timeline */}
          <div className="space-y-1.5">
            <div className="h-2 w-full rounded-full bg-[var(--surface-secondary)] overflow-hidden border border-[var(--border-subtle)]">
              <div
                className="h-full bg-[var(--text-primary)] transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between font-mono text-[10px] text-[var(--text-muted)]">
              <span>Day 0</span>
              <span>Fastest ({fastestDays}d)</span>
              <span>Median ({medianDays}d)</span>
              <span>Inquiry Threshold ({overdueThreshold}d)</span>
            </div>
          </div>

          {/* Status Diagnostic */}
          <div className="rounded-[var(--radius-sm)] bg-[var(--surface-primary)] p-3 text-xs border border-[var(--border-subtle)]">
            {daysElapsed < medianDays ? (
              <p className="text-[var(--text-secondary)]">
                🟢 <strong className="text-[var(--text-primary)]">On Track:</strong>{" "}
                Currently in normal review queue. Decision expected in approximately{" "}
                <strong className="text-[var(--text-primary)]">
                  {Math.max(1, medianDays - daysElapsed)} days
                </strong>{" "}
                based on historic {medianDays}-day median turnaround.
              </p>
            ) : daysElapsed <= overdueThreshold ? (
              <p className="text-[var(--text-secondary)]">
                🟡 <strong className="text-[var(--text-primary)]">Second-Round Review:</strong>{" "}
                Submission has passed median turnaround ({daysElapsed} days). Often indicates work is held for editorial meeting or final tier deliberation.
              </p>
            ) : (
              <p className="text-[var(--text-secondary)]">
                ⚠️ <strong className="text-[var(--text-primary)]">Follow-Up Eligible:</strong>{" "}
                Past typical {overdueThreshold}-day cycle. Friendly inquiry is permitted under journal guidelines.
              </p>
            )}
          </div>
        </div>
      )}

      {/* 3. Acceptance Simultaneous Submissions Helper */}
      {isAccepted && (
        <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 space-y-3">
          <div className="flex items-center gap-2 text-[var(--text-primary)]">
            <CheckCircle className="size-4" />
            <h4 className="font-serif text-sm font-semibold">
              Congratulations on your acceptance!
            </h4>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            If this piece was submitted simultaneously to other journals, remember to promptly withdraw it from their queues.
          </p>

          <button
            type="button"
            onClick={copyWithdrawalTemplate}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-1.5 font-sans text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]/80 transition"
          >
            {copiedWithdrawal ? (
              <Check className="size-3.5 text-[var(--text-primary)]" />
            ) : (
              <Copy className="size-3.5" />
            )}
            {copiedWithdrawal
              ? "Template Copied!"
              : "Copy Polite Withdrawal Email Template"}
          </button>
        </div>
      )}
    </div>
  );
}
