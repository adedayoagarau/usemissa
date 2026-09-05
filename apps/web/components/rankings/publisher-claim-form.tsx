"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import Link from "next/link";
import { ShieldCheck, CheckCircle2, ArrowRight, Building, Mail, User, Info, DollarSign, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PublisherClaimFormProps {
  initialMagazines: Array<{ profileId: string; name: string; slug: string }>;
  preselectedProfileId?: string;
}

export function PublisherClaimForm({
  initialMagazines,
  preselectedProfileId,
}: PublisherClaimFormProps) {
  const [profileId, setProfileId] = useState(preselectedProfileId || initialMagazines[0]?.profileId || "");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [editorialRole, setEditorialRole] = useState("Editor-in-Chief");
  const [payDetails, setPayDetails] = useState("");
  const [feeWaiver, setFeeWaiver] = useState("");
  const [turnaroundCommitment, setTurnaroundCommitment] = useState("");
  const [notes, setNotes] = useState("");

  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedMag = initialMagazines.find((m) => m.profileId === profileId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId || !contactEmail || !contactName) {
      toast.error("Please fill in all required fields.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/rankings/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profileId,
            magazineName: selectedMag?.name || "Unknown Magazine",
            contactName,
            contactEmail,
            editorialRole,
            contributorPayDetails: payDetails,
            feeWaiverPolicy: feeWaiver,
            turnaroundCommitment,
            notes,
          }),
        });

        if (!res.ok) throw new Error("Submission failed");
        setSubmitted(true);
        toast.success("Claim request submitted successfully!");
      } catch (err) {
        console.error(err);
        toast.error("Could not submit claim request. Please check your connection.");
      }
    });
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center sm:p-12">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="size-8" />
        </div>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
          Verification Request Received
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Thank you for verifying <strong>{selectedMag?.name || "your publication"}</strong>. Our curatorial editorial team will review your masthead email and domain within 2 business days.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/rankings/magazines"
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent-deep transition-colors"
          >
            Back to Rankings
          </Link>
          <Link
            href="/journals"
            className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Explore Directory
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      {/* Magazine Selector */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-foreground">
          Select Publication to Claim *
        </label>
        <select
          value={profileId}
          onChange={(e) => setProfileId(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {initialMagazines.map((m) => (
            <option key={m.profileId} value={m.profileId}>
              {m.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Can't find your journal? Make sure your publication is listed in Missa's general directory.
        </p>
      </div>

      {/* Editor Name & Role */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-foreground">
            Your Name *
          </label>
          <input
            type="text"
            required
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="e.g. Jane Doe"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-foreground">
            Masthead Role *
          </label>
          <input
            type="text"
            required
            value={editorialRole}
            onChange={(e) => setEditorialRole(e.target.value)}
            placeholder="e.g. Managing Editor, Fiction Editor"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      {/* Official Masthead Email */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-foreground">
          Official Masthead Email *
        </label>
        <input
          type="email"
          required
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          placeholder="editor@yourjournal.org"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="text-xs text-muted-foreground">
          Please use an institutional, university (.edu), or custom publication domain email whenever possible for fastest verification.
        </p>
      </div>

      {/* Editorial Fact Verifications */}
      <div className="border-t border-border pt-6 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">
          Editorial & Submission Policy Updates
        </h3>

        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground">
            Contributor Payment Policy
          </label>
          <input
            type="text"
            value={payDetails}
            onChange={(e) => setPayDetails(e.target.value)}
            placeholder="e.g. $50 per poem, $100 per short story upon publication"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground">
            Fee Waivers & Subsidized Submissions
          </label>
          <input
            type="text"
            value={feeWaiver}
            onChange={(e) => setFeeWaiver(e.target.value)}
            placeholder="e.g. Free submissions for BIPOC and low-income writers on the 1st of each month"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground">
            Expected Editorial Turnaround
          </label>
          <input
            type="text"
            value={turnaroundCommitment}
            onChange={(e) => setTurnaroundCommitment(e.target.value)}
            placeholder="e.g. 60–90 days; queries welcome after 120 days"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground">
            Additional Editorial Notes or Prize Evidence
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any recent Best American, Pushcart, or Whiting citations you'd like our team to verify and append to your profile..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <Link
          href="/rankings/magazines"
          className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </Link>
        <Button type="submit" disabled={isPending} className="gap-2">
          <ShieldCheck className="size-4" />
          <span>{isPending ? "Submitting..." : "Submit Verification Claim"}</span>
        </Button>
      </div>
    </form>
  );
}
