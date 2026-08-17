"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

const reasons = [
  ["impersonation", "This Profile is impersonating someone"],
  ["rights", "This Profile uses Work without permission"],
  ["abusive-content", "This Profile contains abusive content"],
  ["spam", "This Profile is spam"],
  ["other", "Something else"],
] as const;

export function ProfileReportDialog({ userId }: { userId: string }) {
  const requestId = useRef("");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  function reset() {
    requestId.current = "";
    setReason("");
    setNote("");
    setWebsite("");
    setError("");
    setFieldError("");
    setSending(false);
    setSent(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldError("");
    if (!reason) {
      setFieldError("Choose a reason for your report.");
      return;
    }
    setSending(true);
    if (!requestId.current) requestId.current = crypto.randomUUID();
    try {
      const response = await fetch(
        `/api/profile/${encodeURIComponent(userId)}/report`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason,
            note,
            website,
            idempotencyKey: requestId.current,
          }),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        field?: string;
      };
      if (!response.ok) {
        if (payload.field === "reason" || payload.field === "note")
          setFieldError(payload.error ?? "Check your report.");
        else
          setError(
            payload.error ?? "We could not send your report. Try again.",
          );
        return;
      }
      setSent(true);
    } catch {
      setError("We could not send your report. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen && sent) reset();
      }}
    >
      <DialogTrigger render={<Button type="button" variant="link" size="sm" />}>
        Report Profile
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {sent ? (
          <>
            <DialogHeader>
              <DialogTitle>Report sent.</DialogTitle>
              <DialogDescription>
                Missa will review this Profile. We do not tell the creator who
                sent a report.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button type="button" />}>Done</DialogClose>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>Report this Profile</DialogTitle>
              <DialogDescription>
                Tell us what is wrong. Reports are private.
              </DialogDescription>
            </DialogHeader>
            <FieldGroup className="py-6">
              <Field data-invalid={Boolean(fieldError)}>
                <FieldLabel>Reason</FieldLabel>
                <FieldContent>
                  <RadioGroup
                    value={reason}
                    onValueChange={(value) => {
                      setReason(String(value));
                      setFieldError("");
                    }}
                    aria-invalid={Boolean(fieldError)}
                  >
                    {reasons.map(([value, label]) => (
                      <label
                        key={value}
                        className="flex min-h-11 items-center gap-3"
                      >
                        <RadioGroupItem value={value} />
                        <span>{label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                  <FieldError>{fieldError}</FieldError>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="profile-report-note">
                  Details{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </FieldLabel>
                <FieldContent>
                  <Textarea
                    id="profile-report-note"
                    rows={5}
                    maxLength={2_000}
                    value={note}
                    onChange={(event) => {
                      setNote(event.target.value);
                      setFieldError("");
                    }}
                  />
                  <FieldDescription>{note.length} / 2,000</FieldDescription>
                </FieldContent>
              </Field>
              <div className="sr-only" aria-hidden="true">
                <label htmlFor="profile-report-website">Website</label>
                <input
                  id="profile-report-website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                />
              </div>
              {error ? (
                <p role="alert" className="text-destructive">
                  {error}
                </p>
              ) : null}
            </FieldGroup>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancel
              </DialogClose>
              <Button type="submit" disabled={sending}>
                {sending ? "Sending…" : "Send report"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
