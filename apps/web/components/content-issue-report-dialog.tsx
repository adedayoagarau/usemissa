"use client";

import Link from "next/link";
import { CheckCircle2, Flag } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const ISSUES = [
  ["deadline-or-status", "Deadline or submission status"],
  ["fee-or-eligibility", "Fee or eligibility"],
  ["broken-official-link", "Broken official link"],
  ["ranking-data", "Ranking information"],
  ["duplicate-record", "Duplicate listing"],
  ["other", "Something else"],
] as const;

export function ContentIssueReportDialog({
  subjectType,
  subjectId,
  subjectName,
  subjectPath,
  signedIn,
  allowedIssues,
}: {
  subjectType: "opportunity" | "journal";
  subjectId: string;
  subjectName: string;
  subjectPath: string;
  signedIn: boolean;
  allowedIssues?: readonly (typeof ISSUES)[number][0][];
}) {
  const issues = allowedIssues
    ? ISSUES.filter(([value]) => allowedIssues.includes(value))
    : ISSUES;
  const [open, setOpen] = useState(false);
  const [issueType, setIssueType] = useState<(typeof ISSUES)[number][0]>(issues[0]?.[0] ?? "other");
  const [correction, setCorrection] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setError("");
    const response = await fetch("/api/me/content-issues", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        subjectType,
        subjectId,
        subjectPath,
        issueType,
        correction,
        evidenceUrl: evidenceUrl || undefined,
        idempotencyKey: crypto.randomUUID(),
      }),
    }).catch(() => null);
    const payload = (await response?.json().catch(() => ({}))) as { error?: string };
    if (!response?.ok) {
      setState("error");
      setError(payload.error ?? "The correction could not be saved. Try again.");
      return;
    }
    setState("sent");
  }

  function reset(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen && state === "sent") {
      setState("idle");
      setCorrection("");
      setEvidenceUrl("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger
        render={
          <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" />
        }
      >
        <Flag aria-hidden="true" className="size-4" />
        Report incorrect information
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report incorrect information</DialogTitle>
          <DialogDescription>
            Tell us what needs correcting on {subjectName}. We review reports against the official source.
          </DialogDescription>
        </DialogHeader>

        {!signedIn ? (
          <div className="space-y-4">
            <p className="text-sm text-foreground">Log in so we can keep your report with the review record.</p>
            <Button render={<Link href={`/login?next=${encodeURIComponent(subjectPath)}`} />} className="w-full">
              Log in to report
            </Button>
          </div>
        ) : state === "sent" ? (
          <div className="py-4 text-center" role="status">
            <CheckCircle2 aria-hidden="true" className="mx-auto size-8 text-primary" />
            <p className="mt-3 font-medium text-foreground">Thanks. We’ll review this.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor={`issue-type-${subjectId}`} className="text-sm font-medium">What is incorrect?</label>
              <select
                id={`issue-type-${subjectId}`}
                value={issueType}
                onChange={(event) => setIssueType(event.target.value as typeof issueType)}
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {issues.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`correction-${subjectId}`} className="text-sm font-medium">What should it say?</label>
              <Textarea
                id={`correction-${subjectId}`}
                value={correction}
                onChange={(event) => setCorrection(event.target.value.slice(0, 2_000))}
                placeholder="Give us the correct information"
                rows={4}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`evidence-${subjectId}`} className="text-sm font-medium">Official supporting URL <span className="font-normal text-muted-foreground">(optional)</span></label>
              <Input
                id={`evidence-${subjectId}`}
                type="url"
                inputMode="url"
                value={evidenceUrl}
                onChange={(event) => setEvidenceUrl(event.target.value.slice(0, 1_000))}
                placeholder="https://official-website.org/page"
              />
            </div>
            {state === "error" ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter className="mx-0 mb-0 px-0 pb-0">
              <Button type="submit" disabled={state === "sending" || !correction.trim()}>
                {state === "sending" ? "Sending…" : "Send report"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
