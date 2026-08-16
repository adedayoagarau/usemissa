"use client";

import { useRef, useState } from "react";
import { MessageCircle } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ContactField = "senderName" | "senderEmail" | "message";

export function ProfileContactDialog({
  displayName,
  userId,
}: {
  displayName: string;
  userId: string;
}) {
  const requestId = useRef("");
  const [open, setOpen] = useState(false);
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<ContactField, string>>
  >({});
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  function clearFieldError(field: ContactField) {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setError("");
  }

  function reset() {
    requestId.current = "";
    setSenderName("");
    setSenderEmail("");
    setMessage("");
    setWebsite("");
    setFieldErrors({});
    setError("");
    setSending(false);
    setSent(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setError("");
    setSending(true);
    if (!requestId.current) requestId.current = crypto.randomUUID();
    try {
      const response = await fetch(
        `/api/profile/${encodeURIComponent(userId)}/contact`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            senderName,
            senderEmail,
            message,
            website,
            idempotencyKey: requestId.current,
          }),
        },
      );
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        field?: string;
      };
      if (!response.ok) {
        if (
          body.field === "senderName" ||
          body.field === "senderEmail" ||
          body.field === "message"
        ) {
          setFieldErrors({ [body.field]: body.error ?? "Check this field." });
        } else {
          setError(body.error ?? "We could not send your message. Try again.");
        }
        return;
      }
      setSent(true);
    } catch {
      setError("We could not send your message. Try again.");
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
      <DialogTrigger render={<Button type="button" />}>
        <MessageCircle aria-hidden="true" />
        Get in touch
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {sent ? (
          <>
            <DialogHeader>
              <DialogTitle>Message sent.</DialogTitle>
              <DialogDescription>
                Your message is on its way to {displayName}.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button type="button" />}>Done</DialogClose>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>Get in touch with {displayName}</DialogTitle>
              <DialogDescription>
                Send a message through Missa. Their email address stays private.
              </DialogDescription>
            </DialogHeader>
            <FieldGroup className="py-6">
              <Field data-invalid={Boolean(fieldErrors.senderName)}>
                <FieldLabel htmlFor="profile-contact-name">
                  Your name
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="profile-contact-name"
                    name="senderName"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={100}
                    value={senderName}
                    aria-invalid={Boolean(fieldErrors.senderName)}
                    onChange={(event) => {
                      setSenderName(event.target.value);
                      clearFieldError("senderName");
                    }}
                  />
                  <FieldError>{fieldErrors.senderName}</FieldError>
                </FieldContent>
              </Field>
              <Field data-invalid={Boolean(fieldErrors.senderEmail)}>
                <FieldLabel htmlFor="profile-contact-email">
                  Your email
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="profile-contact-email"
                    name="senderEmail"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={320}
                    value={senderEmail}
                    aria-invalid={Boolean(fieldErrors.senderEmail)}
                    aria-describedby="profile-contact-email-help"
                    onChange={(event) => {
                      setSenderEmail(event.target.value);
                      clearFieldError("senderEmail");
                    }}
                  />
                  <FieldDescription id="profile-contact-email-help">
                    They can reply to this address.
                  </FieldDescription>
                  <FieldError>{fieldErrors.senderEmail}</FieldError>
                </FieldContent>
              </Field>
              <Field data-invalid={Boolean(fieldErrors.message)}>
                <FieldLabel htmlFor="profile-contact-message">
                  Message
                </FieldLabel>
                <FieldContent>
                  <Textarea
                    id="profile-contact-message"
                    name="message"
                    required
                    minLength={20}
                    maxLength={2_000}
                    rows={7}
                    value={message}
                    aria-invalid={Boolean(fieldErrors.message)}
                    onChange={(event) => {
                      setMessage(event.target.value);
                      clearFieldError("message");
                    }}
                  />
                  <FieldDescription>{message.length} / 2,000</FieldDescription>
                  <FieldError>{fieldErrors.message}</FieldError>
                </FieldContent>
              </Field>
              <div className="sr-only" aria-hidden="true">
                <label htmlFor="profile-contact-website">Website</label>
                <input
                  id="profile-contact-website"
                  name="website"
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
                {sending ? "Sending…" : "Send message"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
