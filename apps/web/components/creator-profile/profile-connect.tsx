"use client";

import { useEffect, useId, useState } from "react";
import { Check, Mail, Plus, Send } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import styles from "./profile-connect.module.css";
import { Sp } from "@/components/missa/spelling";

export const INQUIRY_TOPIC_OPTIONS = [
  { value: "commission", label: "A commission" },
  { value: "booking", label: "A booking or reading" },
  { value: "publication", label: "Publication or rights" },
  { value: "collaboration", label: "A collaboration" },
  { value: "other", label: "Something else" },
] as const;

type Viewer = {
  signedIn: boolean;
  isOwner: boolean;
  following: boolean;
  inquiries: boolean;
  senderName: string;
  senderEmail: string;
  organizations: { id: string; name: string }[];
};

function shortDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
}

type InviteOption = {
  organizationId: string;
  organizationName: string;
  opportunityId: string;
  title: string;
  deadline?: string;
  invited: boolean;
};

/**
 * Follow, write and invite on a public profile. On the live page these talk to
 * Missa; in a preview or sample they open the same forms but never send, and
 * say so.
 */
export function ProfileConnect({
  handle,
  name,
  inquiries,
  contactHref,
  live,
  sample,
}: {
  handle?: string;
  name: string;
  inquiries: boolean;
  contactHref?: string;
  /** True only on the published `/@handle` page. */
  live: boolean;
  sample?: boolean;
}) {
  const [viewer, setViewer] = useState<Viewer | null>(null);
  // On the live page, wait for the viewer before acting on Follow, so a
  // signed-in member is never sent to sign in by a fast click.
  const [viewerSettled, setViewerSettled] = useState(!live || !handle);
  const [following, setFollowing] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [writing, setWriting] = useState(false);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!live || !handle) return;
    let active = true;
    fetch(`/api/profiles/${encodeURIComponent(handle)}/viewer`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: Viewer | null) => {
        if (!active) return;
        if (data) {
          setViewer(data);
          setFollowing(data.following);
        }
        setViewerSettled(true);
      })
      .catch(() => {
        if (active) setViewerSettled(true);
      });
    return () => {
      active = false;
    };
  }, [handle, live]);

  const isOwner = viewer?.isOwner ?? false;
  const canWrite = inquiries && (viewer?.inquiries ?? true) && !isOwner;
  const canInvite = (viewer?.organizations.length ?? 0) > 0;

  const toggleFollow = async () => {
    if (!live || !handle) {
      setNotice(
        sample
          ? "This is a sample profile, so following is off."
          : "Visitors can follow you once your profile is published.",
      );
      return;
    }
    if (!viewer?.signedIn) {
      window.location.assign(
        `/login?next=${encodeURIComponent(`/@${handle}`)}`,
      );
      return;
    }
    setPending(true);
    setNotice("");
    try {
      const response = await fetch(
        `/api/profiles/${encodeURIComponent(handle)}/follow`,
        { method: following ? "DELETE" : "POST" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error);
      setFollowing(data.following);
      setNotice(
        data.following
          ? `You're following ${name}.`
          : `You've unfollowed ${name}.`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error && error.message
          ? error.message
          : "Could not update. Please try again.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      {canWrite ? (
        <Button data-tone="primary" onClick={() => setWriting(true)}>
          <Mail aria-hidden="true" />
          Get in touch
        </Button>
      ) : (
        contactHref &&
        !isOwner && (
          <a href={contactHref} className={buttonVariants()}>
            <Mail aria-hidden="true" />
            Get in touch
          </a>
        )
      )}
      {!isOwner && (
        <Button
          variant="outline"
          aria-pressed={following}
          disabled={pending || !viewerSettled}
          onClick={toggleFollow}
        >
          {following ? (
            <Check aria-hidden="true" />
          ) : (
            <Plus aria-hidden="true" />
          )}
          {following ? "Following" : "Follow"}
        </Button>
      )}
      {canInvite && (
        <Button variant="outline" onClick={() => setInviting(true)}>
          <Send aria-hidden="true" />
          Invite to apply
        </Button>
      )}
      <span role="status" className={styles.notice}>
        {notice}
      </span>
      <InquiryDialog
        open={writing}
        onOpenChange={setWriting}
        handle={live ? handle : undefined}
        name={name}
        sample={sample}
        defaultName={viewer?.senderName ?? ""}
        defaultEmail={viewer?.senderEmail ?? ""}
      />
      {canInvite && handle && (
        <InviteDialog
          open={inviting}
          onOpenChange={setInviting}
          handle={handle}
          name={name}
        />
      )}
    </>
  );
}

function InquiryDialog({
  open,
  onOpenChange,
  handle,
  name,
  sample,
  defaultName,
  defaultEmail,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Absent in previews and samples: the form never sends. */
  handle?: string;
  name: string;
  sample?: boolean;
  defaultName: string;
  defaultEmail: string;
}) {
  const ids = {
    name: useId(),
    email: useId(),
    topic: useId(),
    message: useId(),
  };
  const [form, setForm] = useState({
    name: "",
    email: "",
    topic: "commission",
    message: "",
    website: "",
  });
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "sending" }
    | { kind: "sent"; text: string }
    | { kind: "error"; text: string }
  >({ kind: "idle" });
  const first = name.split(" ")[0] || name;
  const value = (key: "name" | "email") =>
    form[key] || (key === "name" ? defaultName : defaultEmail);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = { ...form, name: value("name"), email: value("email") };
    if (!handle) {
      setState({
        kind: "sent",
        text: sample
          ? "This is a sample profile, so nothing was sent."
          : "This is a preview, so nothing was sent. Visitors can write to you once you publish.",
      });
      return;
    }
    setState({ kind: "sending" });
    try {
      const response = await fetch(
        `/api/profiles/${encodeURIComponent(handle)}/inquiries`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error);
      setState({
        kind: "sent",
        text: `Sent. ${first} will reply to ${payload.email} if they'd like to take it further.`,
      });
      setForm((current) => ({ ...current, message: "" }));
    } catch (error) {
      setState({
        kind: "error",
        text:
          error instanceof Error && error.message
            ? error.message
            : "Your message wasn't sent. Please try again.",
      });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setState({ kind: "idle" });
      }}
    >
      <DialogContent className={styles.dialog}>
        <DialogTitle className="font-heading">Write to {first}</DialogTitle>
        <DialogDescription>
          Your message goes to {first}&rsquo;s Missa inbox. Their email address
          stays private; they reply to you directly if they choose.
        </DialogDescription>
        {state.kind === "sent" ? (
          <div className={styles.done}>
            <p role="status">{state.text}</p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : (
          <form className={styles.form} onSubmit={submit} noValidate={false}>
            <div className={styles.pair}>
              <Field>
                <FieldLabel htmlFor={ids.name}>Your name</FieldLabel>
                <Input
                  id={ids.name}
                  required
                  maxLength={120}
                  autoComplete="name"
                  value={value("name")}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={ids.email}>Your email</FieldLabel>
                <Input
                  id={ids.email}
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                  value={value("email")}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor={ids.topic}>What it&rsquo;s about</FieldLabel>
              <NativeSelect
                id={ids.topic}
                value={form.topic}
                className={styles.select}
                onChange={(event) =>
                  setForm({ ...form, topic: event.target.value })
                }
              >
                {INQUIRY_TOPIC_OPTIONS.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor={ids.message}>Message</FieldLabel>
              <Textarea
                id={ids.message}
                required
                minLength={10}
                maxLength={4000}
                rows={6}
                value={form.message}
                aria-describedby={`${ids.message}-hint`}
                onChange={(event) =>
                  setForm({ ...form, message: event.target.value })
                }
              />
              <FieldDescription id={`${ids.message}-hint`}>
                Say who you are, what you have in mind and any dates or fees.
              </FieldDescription>
            </Field>
            <input
              className={styles.trap}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              name="website"
              value={form.website}
              onChange={(event) =>
                setForm({ ...form, website: event.target.value })
              }
            />
            {state.kind === "error" && (
              <FieldError role="alert">{state.text}</FieldError>
            )}
            <div className={styles.actions}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={state.kind === "sending"}>
                {state.kind === "sending" ? "Sending…" : "Send message"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InviteDialog({
  open,
  onOpenChange,
  handle,
  name,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handle: string;
  name: string;
}) {
  const ids = { call: useId(), message: useId() };
  const [options, setOptions] = useState<InviteOption[] | null>(null);
  const [choice, setChoice] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "loading-failed" }
    | { kind: "sending" }
    | { kind: "sent" }
    | { kind: "error"; text: string }
  >({ kind: "idle" });
  const first = name.split(" ")[0] || name;

  useEffect(() => {
    if (!open || options) return;
    let active = true;
    fetch(`/api/profiles/${encodeURIComponent(handle)}/invitations`)
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data: { options: InviteOption[] }) => {
        if (!active) return;
        setOptions(data.options);
        setChoice(
          data.options.find((item) => !item.invited)?.opportunityId ?? "",
        );
      })
      .catch(() => {
        if (active) setState({ kind: "loading-failed" });
      });
    return () => {
      active = false;
    };
  }, [handle, open, options]);

  const selected = options?.find((item) => item.opportunityId === choice);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setState({ kind: "sending" });
    try {
      const response = await fetch(
        `/api/profiles/${encodeURIComponent(handle)}/invitations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationId: selected.organizationId,
            opportunityId: selected.opportunityId,
            message,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error);
      setOptions(
        (current) =>
          current?.map((item) =>
            item.opportunityId === selected.opportunityId
              ? { ...item, invited: true }
              : item,
          ) ?? null,
      );
      setState({ kind: "sent" });
    } catch (error) {
      setState({
        kind: "error",
        text:
          error instanceof Error && error.message
            ? error.message
            : "The invitation wasn't sent. Please try again.",
      });
    }
  };

  const available = options?.filter((item) => !item.invited) ?? [];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next && state.kind === "sent") {
          setState({ kind: "idle" });
          setMessage("");
          setChoice(available[0]?.opportunityId ?? "");
        }
      }}
    >
      <DialogContent className={styles.dialog}>
        <DialogTitle className="font-heading">
          Invite {first} to apply
        </DialogTitle>
        <DialogDescription>
          {`${first} gets the call and your note in their profile inbox and by email. An invitation isn’t a promise of acceptance; your usual guidelines and deadline apply.`}
        </DialogDescription>
        {state.kind === "sent" ? (
          <div className={styles.done}>
            <p role="status">
              Invitation sent for {selected?.title ?? "your call"}.
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : state.kind === "loading-failed" ? (
          <p role="alert" className={styles.error}>
            Your open calls couldn&rsquo;t be loaded. Close this and try again.
          </p>
        ) : !options ? (
          <p role="status" className={styles.hint}>
            Loading your open calls…
          </p>
        ) : available.length === 0 ? (
          <p className={styles.hint}>
            {options.length
              ? `${first} already has an invitation for each of your open calls.`
              : <Sp>Your organization has no open, published calls right now.</Sp>}
          </p>
        ) : (
          <form className={styles.form} onSubmit={submit}>
            <Field>
              <FieldLabel htmlFor={ids.call}>Call</FieldLabel>
              <NativeSelect
                id={ids.call}
                value={choice}
                className={styles.select}
                onChange={(event) => setChoice(event.target.value)}
              >
                {available.map((item) => (
                  <NativeSelectOption
                    key={item.opportunityId}
                    value={item.opportunityId}
                  >
                    {item.title}
                    {item.deadline
                      ? ` · closes ${shortDate(item.deadline)}`
                      : ""}
                    {new Set(available.map((o) => o.organizationId)).size > 1
                      ? ` · ${item.organizationName}`
                      : ""}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor={ids.message}>
                Note to {first}{" "}
                <span className={styles.optional}>· optional</span>
              </FieldLabel>
              <Textarea
                id={ids.message}
                maxLength={1000}
                rows={4}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </Field>
            {state.kind === "error" && (
              <FieldError role="alert">{state.text}</FieldError>
            )}
            <div className={styles.actions}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={state.kind === "sending" || !selected}
              >
                {state.kind === "sending" ? "Sending…" : "Send invitation"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
